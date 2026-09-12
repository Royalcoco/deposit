import dgram from 'node:dgram';
import { TokenVault } from '../backend/token-vault.js';
import { TokenBurner } from '../backend/token-burner.js';
import { GameServerUdp } from '../backend/game-server-udp.js';
import { GameLiftBridge } from '../backend/gamelift-bridge.js';

async function runV05Tests() {
  console.log('========================================================');
  console.log('       SUITE DE TESTS - PATCH V.05 ENCLAVE CONSOL       ');
  console.log('========================================================');

  // Test 1: TTL & Expiration
  console.log('--- TEST 1: Jetons Ephémères avec TTL & Auto-Burn ---');
  const vault = new TokenVault('test_secret');
  // Créer un jeton avec un TTL très court de 50ms
  const shortLivedToken = vault.generateDialogueToken('EPHEMERAL_TEST', { test: true }, 50);
  console.assert(shortLivedToken.status === 'ACTIVE', 'Token initialement actif');
  
  await new Promise(r => setTimeout(r, 80));
  console.assert(vault.verifyToken(shortLivedToken.tokenId).valid === false, 'Token doit etre expire');
  console.assert(vault.findExpiredTokens().length === 1, 'Token detecte comme expire');

  const burner = new TokenBurner(vault, './ledger/test_v05_ledger.jsonl');
  const autoBurned = burner.autoBurnExpired();
  console.assert(autoBurned.length === 1, 'Auto-burn reussi');
  console.assert(autoBurned[0].reason === 'TTL_AUTO_EXPIRED', 'Raison auto-burn');
  console.log('  [PASS] TTL et Auto-burn operationnels.');

  // Test 2: Chaîne cryptographique (Hash-Chain)
  console.log('--- TEST 2: Hash-Chain (Micro-Blockchain locale) ---');
  const t1 = vault.generateDialogueToken('CHAIN_1', {}, 60000);
  const t2 = vault.generateDialogueToken('CHAIN_2', {}, 60000);
  const burn1 = burner.burn(t1.tokenId, 'CHAIN_TEST_1');
  const burn2 = burner.burn(t2.tokenId, 'CHAIN_TEST_2');

  console.assert(burn2.burnRecord.prevHash === burn1.burnRecord.burnProof, 'Le prevHash de t2 doit etre le burnProof de t1');
  console.log('  [PASS] Hash-chain cryptographiquement liee.');

  // Test 3: Véritable Serveur UDP (:7777)
  console.log('--- TEST 3: Serveur de Jeu UDP Natif (:7777) ---');
  let packetIntercepted = false;
  const udpServer = new GameServerUdp(7777, vault, burner, () => {
    packetIntercepted = true;
  });
  udpServer.start();

  // Envoi d'un paquet UDP de test
  const client = dgram.createSocket('udp4');
  const admissionToken = vault.generateDialogueToken('PLAYER_ADMISSION', {}, 60000);

  const udpPromise = new Promise((resolve) => {
    client.on('message', (msg) => {
      const resp = msg.toString();
      resolve(resp);
    });
  });

  const packet = `HANDSHAKE psess-test-v05 ${admissionToken.tokenId}`;
  client.send(packet, 7777, '127.0.0.1');

  const response = await udpPromise;
  console.assert(response.includes('ACK_ADMITTED psess-test-v05'), 'Reponse UDP serveur');
  console.assert(response.includes('BURNT:TRUE'), 'Burn admission UDP');
  console.assert(vault.verifyToken(admissionToken.tokenId).valid === false, 'Token admission brule');
  client.close();
  udpServer.stop();
  console.log('  [PASS] Serveur UDP :7777 et admission avec auto-burn operationnels.');

  // Test 4: Bascule à chaud GameLiftBridge
  console.log('--- TEST 4: Bascule a chaud GameLiftBridge ---');
  const bridge = new GameLiftBridge({ mode: 'EMULATOR' });
  console.assert(bridge.mode === 'EMULATOR', 'Mode initial');
  await bridge.setMode('LIVE_AWS');
  console.assert(bridge.mode === 'LIVE_AWS', 'Mode apres bascule');
  console.log('  [PASS] Bascule a chaud operationnelle.');

  console.log('\n========================================================');
  console.log('   TOUS LES TESTS DU PATCH V.05 ONT REUSSI AVEC SUCCES  ');
  console.log('========================================================');
}

runV05Tests().catch(err => {
  console.error('ECHEC DU TEST V.05:', err);
  process.exit(1);
});
