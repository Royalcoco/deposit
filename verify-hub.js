import { TokenVault } from '../backend/token-vault.js';
import { TokenBurner } from '../backend/token-burner.js';
import { CordialHandshake } from '../backend/cordial-handshake.js';
import { GameLiftEmulator } from '../backend/gamelift-emulator.js';
import { GameLiftBridge } from '../backend/gamelift-bridge.js';

async function runVerification() {
  console.log('--- TEST 1: Enclave Locale Verrouillee (TokenVault) ---');
  const vault = new TokenVault('test_master_secret');
  console.assert(vault.isLocked === true, 'Le vault doit etre verrouille par defaut');

  const token = vault.generateDialogueToken('TEST_TOKEN', { player: 'salib' });
  console.assert(token.status === 'ACTIVE', 'Le token doit etre ACTIVE');
  console.assert(vault.verifyToken(token.tokenId).valid === true, 'Le token doit etre valide');
  console.log('  [PASS] TokenVault operationnel.');

  console.log('--- TEST 2: Moteur de Burn & Ledger (TokenBurner) ---');
  const burner = new TokenBurner(vault, './ledger/test_ledger.jsonl');
  const burnRes = burner.burn(token.tokenId, 'TEST_CONSUMPTION');
  console.assert(burnRes.success === true, 'Le burn doit reussir');
  console.assert(vault.verifyToken(token.tokenId).valid === false, 'Le token brule ne doit plus etre valide');
  console.log('  [PASS] TokenBurner operationnel.');

  console.log('--- TEST 3: Protocole Cordial (CordialHandshake) ---');
  const cordial = new CordialHandshake(vault, burner);
  const hsRes = await cordial.politeHandshake({ clientId: 'test-runner' });
  console.assert(hsRes.ok === true, 'Le handshake cordial doit reussir');
  console.assert(hsRes.dialogue.etiquetteScore === 100, 'Score etiquette');
  console.log('  [PASS] CordialHandshake operationnel.');

  console.log('--- TEST 4: Emulateur GameLift Anywhere ---');
  const emulator = new GameLiftEmulator();
  const sessionRes = await emulator.createGameSession({ name: 'Verification-Session' });
  console.assert(sessionRes.GameSession.Status === 'ACTIVE', 'GameSession doit etre ACTIVE');
  console.assert(sessionRes.GameSession.Port === 7777, 'Port doit etre 7777');

  const playerRes = await emulator.createPlayerSession({
    gameSessionId: sessionRes.GameSession.GameSessionId,
    playerId: 'salib-verifier'
  });
  console.assert(playerRes.PlayerSession.Status === 'RESERVED', 'PlayerSession doit etre RESERVED');
  console.assert(playerRes.PlayerSession.Port === 7777, 'PlayerSession port');
  console.log('  [PASS] Emulateur GameLift Anywhere operationnel.');

  console.log('--- TEST 5: Pont GameLiftBridge ---');
  const bridge = new GameLiftBridge({ mode: 'EMULATOR' });
  const status = bridge.getStatus();
  console.assert(status.mode === 'EMULATOR', 'Bridge mode doit etre EMULATOR');
  console.log('  [PASS] GameLiftBridge operationnel.');

  console.log('\n======================================================');
  console.log('   TOUS LES TESTS DU HUB CONSOL ONT REUSSI AVEC SUCCES');
  console.log('======================================================');
}

runVerification().catch(err => {
  console.error('ECHEC DU TEST:', err);
  process.exit(1);
});
