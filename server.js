import express from 'express';
import { createServer } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

import { TokenVault } from './token-vault.js';
import { TokenBurner } from './token-burner.js';
import { CordialHandshake } from './cordial-handshake.js';
import { GameLiftBridge } from './gamelift-bridge.js';
import { GameServerUdp } from './game-server-udp.js';
import { DialogueLoader } from './dialogue-loader.js';
import { TokenEconomicHub } from './token-economic-hub.js';
import { PatchRegistry } from './patch-registry.js';
import { AwsDomainRegistry } from './aws-domain-registry.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const PORT = parseInt(process.env.PORT || '3000', 10);
const UDP_PORT = parseInt(process.env.COMPUTE_PORT || '7777', 10);

const APP_ENV = {
  region: process.env.AWS_REGION || 'us-east-2',
  endpoint: process.env.GAMELIFT_ENDPOINT || 'https://gamelift.us-east-2.amazonaws.com/',
  mode: process.env.GAMELIFT_MODE || 'EMULATOR',
  fleetId: process.env.GAMELIFT_FLEET_ID || 'fleet-intel-anywhere-001',
  location: process.env.GAMELIFT_LOCATION || 'custom-intel-dev',
  computeName: process.env.COMPUTE_NAME || 'IntelDevPC',
  computeIp: process.env.COMPUTE_IP || '127.0.0.1',
  computePort: UDP_PORT,
  masterSecret: process.env.VAULT_MASTER_SECRET || 'vault_secret_salib',
  ledgerPath: path.resolve(ROOT_DIR, process.env.LEDGER_PATH || './ledger/dialogue_ledger.jsonl')
};

// Instanciation du noyau étendu
const tokenVault = new TokenVault(APP_ENV.masterSecret);
const tokenBurner = new TokenBurner(tokenVault, APP_ENV.ledgerPath);
const cordialHandshake = new CordialHandshake(tokenVault, tokenBurner);
const gameLiftBridge = new GameLiftBridge(APP_ENV);
const economicHub = new TokenEconomicHub(tokenVault, tokenBurner);
const patchRegistry = new PatchRegistry(tokenVault, tokenBurner);
const domainRegistry = new AwsDomainRegistry(APP_ENV.region);

// WebSocket Hub & Express
const app = express();
app.use(express.json());
app.use(express.static(path.join(ROOT_DIR, 'public')));

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

function broadcast(type, payload) {
  const message = JSON.stringify({ protocol: 'CONSOL/1', type, timestamp: Date.now(), payload });
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

// Démarrage du Game Server UDP (:7777)
const udpServer = new GameServerUdp(UDP_PORT, tokenVault, tokenBurner, (packetEvent) => {
  broadcast('udp:packet', packetEvent);
});
udpServer.start();

// Boucle d'Auto-Burn (TTL Sweep toutes les 2s)
setInterval(() => {
  const burned = tokenBurner.autoBurnExpired();
  if (burned.length > 0) {
    for (const b of burned) {
      broadcast('token:burnt', b);
    }
  }
}, 2000);

// ================= API REST =================

app.get('/api/status', (req, res) => {
  res.json({
    service: 'GameLift Analogue Consol Hub',
    version: 'V.05-EconomicLayer',
    status: 'ONLINE',
    enclave: tokenVault.getStatus(),
    gamelift: gameLiftBridge.getStatus(),
    burner: tokenBurner.getStats(),
    udpServer: udpServer.getStats(),
    economic: economicHub.getStats(),
    activePatchVersion: patchRegistry.activePatchVersion,
    timestamp: new Date().toISOString()
  });
});

// Source JSON décryptée
app.get('/api/dialogue/source', (req, res) => {
  const intel = DialogueLoader.load();
  if (!intel) return res.status(500).json({ error: 'Intel JSON non disponible' });
  res.json(intel);
});

// Arbitrage Économique & Coût Évité (DIAL LOCAL vs AWS)
app.post('/api/economic/dial', (req, res) => {
  const { resource, priority, durationSec } = req.body;
  const result = economicHub.dial(resource, priority, durationSec);
  broadcast('economic:dial', result);
  res.json(result);
});

app.get('/api/economic/stats', (req, res) => {
  res.json(economicHub.getStats());
});

// Gestion des Patchs Game.cube (Turn 9)
app.get('/api/patch/list', (req, res) => {
  res.json({
    activeVersion: patchRegistry.activePatchVersion,
    patches: patchRegistry.getAllPatches()
  });
});

app.post('/api/patch/mint', (req, res) => {
  try {
    const { patchId } = req.body;
    const result = patchRegistry.mintPatchToken(patchId);
    broadcast('patch:minted', result);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/patch/deploy', (req, res) => {
  try {
    const { patchId, tokenId } = req.body;
    const result = patchRegistry.deployPatch(patchId, tokenId);
    broadcast('patch:deployed', result);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Registre des Domaines & Endpoints AWS (Turn 8)
app.get('/api/domains/registry', (req, res) => {
  res.json(domainRegistry.getRegistry());
});

// Game.cube Burn-Out Unlocked (User-Only)
app.post('/api/gamecube/burnout', (req, res) => {
  const { tokenId, userId, coordinates } = req.body;
  if (!tokenId || !userId) {
    return res.status(400).json({ ok: false, error: 'tokenId et userId requis' });
  }
  const result = tokenBurner.burnOutUnlocked(tokenId, userId, coordinates);
  if (result.success) {
    broadcast('gamecube:burnout', result);
  }
  res.json(result);
});

app.post('/api/gamelift/mode', async (req, res) => {
  try {
    const { mode } = req.body;
    const result = await gameLiftBridge.setMode(mode);
    broadcast('gamelift:mode', result);
    res.json(result);
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

app.get('/api/gamelift/latency', async (req, res) => {
  const result = await gameLiftBridge.measureEndpointLatency();
  res.json(result);
});

app.post('/api/vault/lock', (req, res) => {
  const result = tokenVault.lock();
  broadcast('vault:state', result);
  res.json(result);
});

app.post('/api/vault/unlock', (req, res) => {
  const { secretKey } = req.body;
  const result = tokenVault.unlock(secretKey);
  broadcast('vault:state', result);
  res.json(result);
});

app.post('/api/dialogue/cordial', async (req, res) => {
  try {
    const result = await cordialHandshake.politeHandshake(req.body);
    broadcast('dialogue:handshake', result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/session/create', async (req, res) => {
  try {
    const { name, maxPlayers } = req.body;
    const sessionRes = await gameLiftBridge.createGameSession({
      name: name || 'Intel-Dev-Session',
      maxPlayers: maxPlayers ? parseInt(maxPlayers, 10) : 8
    });

    const token = tokenVault.generateDialogueToken('GAME_SESSION_AUTH', {
      gameSessionId: sessionRes.GameSession?.GameSessionId,
      ip: sessionRes.GameSession?.IpAddress,
      port: sessionRes.GameSession?.Port
    });

    broadcast('session:created', { session: sessionRes.GameSession, token });
    res.json({ ok: true, session: sessionRes.GameSession, token });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/player/connect', async (req, res) => {
  try {
    const { gameSessionId, playerId } = req.body;
    if (!gameSessionId) {
      return res.status(400).json({ ok: false, error: 'gameSessionId requis' });
    }

    const assignedPlayerId = playerId || `salib-player-${Date.now().toString().slice(-4)}`;
    const playerRes = await gameLiftBridge.createPlayerSession({
      gameSessionId,
      playerId: assignedPlayerId
    });

    const playerToken = tokenVault.generateDialogueToken('GAMEPLAY_ACCESS_TOKEN', {
      playerSessionId: playerRes.PlayerSession?.PlayerSessionId,
      playerId: assignedPlayerId,
      userId: assignedPlayerId,
      gameSessionId
    }, 60000);

    broadcast('player:connected', { playerSession: playerRes.PlayerSession, token: playerToken });
    res.json({ ok: true, playerSession: playerRes.PlayerSession, token: playerToken });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/token/burn', (req, res) => {
  const { tokenId, reason } = req.body;
  if (!tokenId) {
    return res.status(400).json({ ok: false, error: 'tokenId requis' });
  }
  const result = tokenBurner.burn(tokenId, reason || 'MANUAL_BURN_REQUEST');
  if (result.success) {
    broadcast('token:burnt', result.burnRecord);
  }
  res.json(result);
});

app.get('/api/tokens', (req, res) => {
  res.json({
    activeTokens: tokenVault.getActiveTokens(),
    allTokens: tokenVault.getAllTokens(),
    recentBurns: tokenBurner.getRecentBurns()
  });
});

app.get('/api/sessions', async (req, res) => {
  try {
    const result = await gameLiftBridge.listSessions();
    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// WebSocket Hub
wss.on('connection', (ws) => {
  ws.send(JSON.stringify({
    protocol: 'CONSOL/1',
    type: 'init:state',
    timestamp: Date.now(),
    payload: {
      version: 'V.05-EconomicLayer',
      enclave: tokenVault.getStatus(),
      gamelift: gameLiftBridge.getStatus(),
      udpServer: udpServer.getStats(),
      economic: economicHub.getStats(),
      activePatchVersion: patchRegistry.activePatchVersion,
      activeTokens: tokenVault.getActiveTokens(),
      recentBurns: tokenBurner.getRecentBurns(10),
      recentDialogues: cordialHandshake.getRecentDialogues(10),
      intelSource: DialogueLoader.load()
    }
  }));

  ws.on('message', async (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.protocol === 'DVT/1') {
        const { type, data = {} } = msg;
        if (type === 'handshake') {
          const hs = await cordialHandshake.politeHandshake(data);
          ws.send(JSON.stringify({ protocol: 'DVT/1', type: 'handshake:ack', data: hs }));
          broadcast('dialogue:handshake', hs);
        } else if (type === 'token.burn') {
          const burnRes = tokenBurner.burn(data.tokenId, data.reason || 'DVT_INJECTED_BURN');
          ws.send(JSON.stringify({ protocol: 'DVT/1', type: 'burn:ack', data: burnRes }));
          if (burnRes.success) broadcast('token:burnt', burnRes.burnRecord);
        } else if (type === 'session.create') {
          const sRes = await gameLiftBridge.createGameSession(data);
          ws.send(JSON.stringify({ protocol: 'DVT/1', type: 'session:ack', data: sRes }));
          broadcast('session:created', sRes);
        }
      }
    } catch (err) {
      ws.send(JSON.stringify({ error: 'Malformed JSON payload', details: err.message }));
    }
  });
});

server.listen(PORT, () => {
  console.log('===========================================================');
  console.log('  GAMELIFT ANALOGUE CONSOL HUB - ECONOMIC LAYER ACTIVE     ');
  console.log('===========================================================');
  console.log(`Console Web  : http://localhost:${PORT}`);
  console.log(`WebSocket    : ws://localhost:${PORT}/ws`);
  console.log(`Serveur UDP  : 0.0.0.0:${UDP_PORT} (Socket Natif Actif)`);
  console.log(`Endpoint AWS : ${APP_ENV.endpoint}`);
  console.log(`Mode Actif   : ${APP_ENV.mode}`);
  console.log('===========================================================');
});
