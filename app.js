// =========================================================
// CONSOL // FRONTEND REACTIVE APPLICATION (ECONOMIC EDITION)
// =========================================================

let ws = null;
let currentSession = null;
let activeTokens = [];
let burnCount = 0;
let udpPackets = 0;
let audioEnabled = true;
let currentGameliftMode = 'EMULATOR';
let currentPlayerId = null;

// Oscilloscope Canvas
const canvas = document.getElementById('oscilloscope');
const ctx = canvas.getContext('2d');
let wavePhase = 0;
let pulseIntensity = 1.0;
let burnSpike = 0;

// 3D Game.cube Canvas
const cubeCanvas = document.getElementById('cubeCanvas');
const cubeCtx = cubeCanvas.getContext('2d');
let cubeRotX = 0.5;
let cubeRotY = 0.8;
let cubePulse = 1.0;
let cubePlayerInside = false;

// Audio
let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) audioCtx = new AudioContext();
  }
}

function playRelayClick() {
  if (!audioEnabled || !audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.04);
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.04);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.05);
  } catch (e) {}
}

function playBurnDischarge() {
  if (!audioEnabled || !audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(550, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.28);
    gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.28);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.29);
  } catch (e) {}
}

function initWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws`;

  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    logTerminal('system', '[WS] Connecté au Hub Local Consol (Economic Edition).');
    document.querySelector('.led-ping').classList.add('active');
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      handleIncomingMessage(msg);
    } catch (e) {
      console.error('Erreur parsing WS message', e);
    }
  };

  ws.onclose = () => {
    logTerminal('system', '[WS] Connexion perdue. Tentative de reconnexion...');
    document.querySelector('.led-ping').classList.remove('active');
    setTimeout(initWebSocket, 2000);
  };
}

function handleIncomingMessage(msg) {
  const { type, payload } = msg;

  if (type === 'init:state') {
    activeTokens = payload.activeTokens || [];
    renderTokensTable();
    burnCount = payload.enclave.burntTokens || 0;
    document.getElementById('badge-total-burned').innerText = burnCount;
    document.getElementById('stat-burnt-tokens').innerText = burnCount;
    currentGameliftMode = payload.gamelift?.mode || 'EMULATOR';
    document.getElementById('badge-gamelift-mode').innerText = currentGameliftMode;
    if (payload.economic) {
      document.getElementById('badge-cost-saved').innerText = payload.economic.totalCostAvoidedUsd;
      document.getElementById('stat-opt-count').innerText = payload.economic.totalOperationsOptimized;
    }
    if (payload.activePatchVersion) {
      document.getElementById('badge-patch-version').innerText = `v${payload.activePatchVersion}`;
    }
    if (payload.intelSource) renderIntelSource(payload.intelSource);
  } else if (type === 'economic:dial') {
    pulseIntensity = 4.5;
    playRelayClick();
    document.getElementById('badge-cost-saved').innerText = `$${payload.totalSavedUsd.toFixed(4)}`;
    document.getElementById('disp-routing').innerText = `${payload.decision} (Économisé: +$${payload.savingUsd.toFixed(4)})`;
    logTerminal('cordial', `[DIAL ÉCONOMIQUE] Décision: ${payload.decision} | Coût AWS évité: +$${payload.savingUsd.toFixed(4)} | Token: ${payload.token.tokenId}`);
    activeTokens.push(payload.token);
    renderTokensTable();
  } else if (type === 'patch:deployed') {
    pulseIntensity = 5.5;
    burnSpike = 1.0;
    playBurnDischarge();
    document.getElementById('badge-patch-version').innerText = `v${payload.activeVersion}`;
    logTerminal('burn', `[PATCH DÉPLOYÉ] Game.cube mis à jour vers v${payload.activeVersion} ! Jeton de déploiement brûlé.`);
  } else if (type === 'dialogue:handshake') {
    pulseIntensity = 3.5;
    playRelayClick();
    logTerminal('cordial', `[ÉCHANGE CORDIAL] ${payload.dialogue.salutation} (Token: ${payload.token.tokenId})`);
    activeTokens.push(payload.token);
    renderTokensTable();
  } else if (type === 'session:created') {
    pulseIntensity = 4.0;
    playRelayClick();
    currentSession = payload.session;
    updateSessionKeys(currentSession);
    logTerminal('session', `[GAMESESSION] Créée : ${currentSession.GameSessionId}`);
    if (payload.token) {
      activeTokens.push(payload.token);
      renderTokensTable();
    }
  } else if (type === 'player:connected') {
    pulseIntensity = 4.5;
    playRelayClick();
    const ps = payload.playerSession;
    currentPlayerId = ps.PlayerId;
    document.getElementById('disp-player-session').innerText = ps.PlayerSessionId;
    logTerminal('session', `[JOUEUR] Connecté : ${ps.PlayerId} -> Admission: ${ps.PlayerSessionId}`);
    if (payload.token) {
      activeTokens.push(payload.token);
      renderTokensTable();
    }
  } else if (type === 'token:burnt') {
    pulseIntensity = 6.0;
    burnSpike = 1.0;
    playBurnDischarge();
    burnCount++;
    document.getElementById('badge-total-burned').innerText = burnCount;
    document.getElementById('stat-burnt-tokens').innerText = burnCount;
    activeTokens = activeTokens.filter(t => t.tokenId !== payload.tokenId);
    renderTokensTable();
    logTerminal('burn', `[TOKEN BURN] Jeton ${payload.tokenId} détruit (${payload.reason}). Preuve: ${payload.burnProof?.slice(0, 16)}...`);
  } else if (type === 'gamecube:burnout') {
    cubePulse = 3.0;
    cubePlayerInside = true;
    playBurnDischarge();
    document.getElementById('cube-access').innerText = 'DÉVERROUILLÉ (ACTIVE)';
    document.getElementById('cube-access').className = 'text-green';
    logTerminal('burn', `[GAME.CUBE BURNOUT] Accès gameplay déverrouillé pour ${payload.burnRecord.metadata.unlockedBy}!`);
  } else if (type === 'udp:packet') {
    udpPackets++;
    pulseIntensity = 5.0;
    cubePulse = 2.0;
    playRelayClick();
    logTerminal('session', `[UDP :7777] Paquet reçu: ${payload.cmd} (${payload.rinfo.address}:${payload.rinfo.port})`);
  } else if (type === 'gamelift:mode') {
    currentGameliftMode = payload.mode;
    document.getElementById('badge-gamelift-mode').innerText = currentGameliftMode;
    logTerminal('system', `[MODE] Bascule vers: ${currentGameliftMode}`);
  }
}

function renderIntelSource(intel) {
  const container = document.getElementById('intel-turns-list');
  if (!intel || !intel.dialogueTurns) return;

  container.innerHTML = intel.dialogueTurns.map(t => `
    <div style="margin-bottom:6px; padding:4px; background:rgba(0,0,0,0.3); border-left:2px solid var(--cyan);">
      <strong>Tour ${t.turn} : ${t.theme}</strong>
      <div style="color:#94a3b8;">${t.summary}</div>
    </div>
  `).join('');
}

function updateSessionKeys(session) {
  if (!session) return;
  document.getElementById('disp-session-id').innerText = session.GameSessionId;
  document.getElementById('disp-dns').innerText = session.DnsName || 'N/A';
  document.getElementById('disp-ip').innerText = session.IpAddress || '127.0.0.1';
  document.getElementById('disp-port').innerText = `${session.Port || 7777} (UDP Actif)`;
}

function renderTokensTable() {
  const tbody = document.getElementById('tokens-tbody');
  document.getElementById('stat-active-tokens').innerText = activeTokens.length;

  if (activeTokens.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-muted">Aucun jeton actif</td></tr>';
    return;
  }

  const now = Date.now();
  tbody.innerHTML = activeTokens.map(t => {
    const remainingSec = Math.max(0, Math.round((t.expiresAt - now) / 1000));
    return `
      <tr>
        <td><strong>${t.tokenId}</strong></td>
        <td><span class="panel-tag">${t.type}</span></td>
        <td><span class="${remainingSec < 15 ? 'text-red' : 'text-cyan'}">${remainingSec}s</span></td>
        <td>
          <button class="btn btn-burn" onclick="burnToken('${t.tokenId}')">
            &times; BURN
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

window.burnToken = async function(tokenId) {
  initAudio();
  try {
    const res = await fetch('/api/token/burn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokenId, reason: 'MANUAL_DASHBOARD_BURN' })
    });
    const data = await res.json();
    if (!data.success) alert(`Erreur de burn: ${data.error}`);
  } catch (err) {
    alert(`Erreur réseau: ${err.message}`);
  }
};

function logTerminal(cls, text) {
  const container = document.getElementById('terminal-logs');
  const div = document.createElement('div');
  div.className = `log-entry ${cls}`;
  div.innerText = `[${new Date().toLocaleTimeString()}] ${text}`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

// 3D Game.cube Renderer
function renderGameCube() {
  cubeCtx.fillStyle = '#04080d';
  cubeCtx.fillRect(0, 0, cubeCanvas.width, cubeCanvas.height);

  const cx = cubeCanvas.width / 2;
  const cy = cubeCanvas.height / 2;
  const size = 50 * cubePulse;

  const vertices = [
    [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
    [-1, -1, 1],  [1, -1, 1],  [1, 1, 1],  [-1, 1, 1]
  ];

  const cosY = Math.cos(cubeRotY), sinY = Math.sin(cubeRotY);
  const cosX = Math.cos(cubeRotX), sinX = Math.sin(cubeRotX);

  const projected = vertices.map(v => {
    let x = v[0] * cosY - v[2] * sinY;
    let z = v[0] * sinY + v[2] * cosY;
    let y = v[1] * cosX - z * sinX;
    z = v[1] * sinX + z * cosX;

    const scale = 200 / (z + 4);
    return [cx + x * size * scale * 0.015, cy + y * size * scale * 0.015];
  });

  const edges = [
    [0,1], [1,2], [2,3], [3,0],
    [4,5], [5,6], [6,7], [7,4],
    [0,4], [1,5], [2,6], [3,7]
  ];

  cubeCtx.strokeStyle = cubePlayerInside ? '#10b981' : (cubePulse > 1.5 ? '#ef4444' : '#06b6d4');
  cubeCtx.lineWidth = 1.5;
  for (const edge of edges) {
    const p1 = projected[edge[0]];
    const p2 = projected[edge[1]];
    cubeCtx.beginPath();
    cubeCtx.moveTo(p1[0], p1[1]);
    cubeCtx.lineTo(p2[0], p2[1]);
    cubeCtx.stroke();
  }

  if (cubePlayerInside) {
    cubeCtx.fillStyle = '#10b981';
    cubeCtx.beginPath();
    cubeCtx.arc(cx, cy, 8, 0, Math.PI * 2);
    cubeCtx.fill();
  }

  cubeRotY += 0.015;
  cubeRotX += 0.008;
  if (cubePulse > 1.0) cubePulse -= 0.04;

  requestAnimationFrame(renderGameCube);
}

// Oscilloscope Loop
function renderOscilloscope() {
  ctx.fillStyle = '#04080d';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const midY = canvas.height / 2;

  // CANAL 1 (Vert) : Enclave Locale
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.7)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let x = 0; x < canvas.width; x++) {
    const angle = (x * 0.02) + wavePhase;
    const y = midY - 15 + Math.sin(angle) * 12;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // CANAL 2 (Cyan) : Réseau & Ping AWS us-east-2
  ctx.strokeStyle = '#06b6d4';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x < canvas.width; x++) {
    const angle = (x * 0.04) - (wavePhase * 1.5);
    const amp = 18 * pulseIntensity;
    const y = midY + Math.sin(angle) * amp;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // CANAL 3 (Rouge) : Pics de Burn
  if (burnSpike > 0.05) {
    ctx.strokeStyle = `rgba(239, 68, 68, ${burnSpike})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let x = 0; x < canvas.width; x++) {
      const spikeFactor = Math.sin((x * 0.1) + wavePhase * 3) * (40 * burnSpike);
      const y = midY + spikeFactor;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    burnSpike *= 0.92;
  }

  wavePhase += 0.08;
  if (pulseIntensity > 1.0) pulseIntensity -= 0.03;

  requestAnimationFrame(renderOscilloscope);
}

// Latency poller
async function checkAwsLatency() {
  try {
    const res = await fetch('/api/gamelift/latency');
    const data = await res.json();
    document.getElementById('badge-aws-ping').innerText = `${data.latencyMs} ms`;
  } catch (e) {
    document.getElementById('badge-aws-ping').innerText = 'N/A';
  }
}

// Button Bindings
document.getElementById('btn-cordial-handshake').addEventListener('click', async () => {
  initAudio();
  await fetch('/api/dialogue/cordial', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId: 'analogue-dashboard-ui' })
  });
});

document.getElementById('btn-dial-economic').addEventListener('click', async () => {
  initAudio();
  await fetch('/api/economic/dial', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resource: 'game.cube', priority: 'NORMAL', durationSec: 300 })
  });
});

document.getElementById('btn-deploy-patch').addEventListener('click', async () => {
  initAudio();
  try {
    // 1. Mint patch token pour v0.1.3
    const mintRes = await fetch('/api/patch/mint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patchId: 'patch_gamecube_002' })
    });
    const mintData = await mintRes.json();
    if (!mintData.token) throw new Error(mintData.error);

    // 2. Déployer et brûler le token
    const deployRes = await fetch('/api/patch/deploy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patchId: 'patch_gamecube_002', tokenId: mintData.token.tokenId })
    });
    const deployData = await deployRes.json();
    if (!deployData.success) throw new Error(deployData.error);
  } catch (err) {
    alert(`Erreur de déploiement de patch: ${err.message}`);
  }
});

document.getElementById('btn-create-session').addEventListener('click', async () => {
  initAudio();
  await fetch('/api/session/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Intel-Economic-Party', maxPlayers: 8 })
  });
});

document.getElementById('btn-connect-player').addEventListener('click', async () => {
  initAudio();
  if (!currentSession) {
    alert('Veuillez d\'abord créer une GameSession');
    return;
  }
  const pid = `salib-player-${Math.floor(Math.random() * 900 + 100)}`;
  await fetch('/api/player/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      gameSessionId: currentSession.GameSessionId,
      playerId: pid
    })
  });
});

document.getElementById('btn-enter-cube').addEventListener('click', async () => {
  initAudio();
  const gameplayToken = activeTokens.find(t => t.type === 'GAMEPLAY_ACCESS_TOKEN');
  if (!gameplayToken) {
    alert('Aucun GAMEPLAY_ACCESS_TOKEN actif. Cliquez d\'abord sur "RÉSERVER JOUEUR".');
    return;
  }

  const userId = gameplayToken.metadata?.userId || currentPlayerId || 'salib-player';
  const res = await fetch('/api/gamecube/burnout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tokenId: gameplayToken.tokenId,
      userId,
      coordinates: { x: 10, y: 5, z: -2 }
    })
  });
  const data = await res.json();
  if (!data.success) {
    alert(`Échec Burn-out Unlocked: ${data.error}`);
  }
});

document.getElementById('btn-toggle-mode').addEventListener('click', async () => {
  initAudio();
  const nextMode = currentGameliftMode === 'EMULATOR' ? 'LIVE_AWS' : 'EMULATOR';
  await fetch('/api/gamelift/mode', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: nextMode })
  });
});

document.getElementById('btn-toggle-audio').addEventListener('click', () => {
  initAudio();
  audioEnabled = !audioEnabled;
  document.getElementById('btn-toggle-audio').innerText = audioEnabled ? '♫ AUDIO: ON' : '♫ AUDIO: OFF';
});

// Refresh table TTL countdown
setInterval(() => {
  if (activeTokens.length > 0) renderTokensTable();
}, 1000);

// Init
window.addEventListener('DOMContentLoaded', () => {
  initWebSocket();
  renderGameCube();
  renderOscilloscope();
  checkAwsLatency();
  setInterval(checkAwsLatency, 10000);
  setInterval(() => {
    document.getElementById('footer-time').innerText = new Date().toISOString().replace('T', ' ').slice(0, 19);
  }, 1000);
});
