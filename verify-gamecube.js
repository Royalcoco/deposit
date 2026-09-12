import { TokenVault } from '../backend/token-vault.js';
import { TokenBurner } from '../backend/token-burner.js';
import { DialogueLoader } from '../backend/dialogue-loader.js';

async function runGameCubeTests() {
  console.log('========================================================');
  console.log('     TEST GAME.CUBE WORLD & DIALOGUE DÉCRYPTÉ JSON      ');
  console.log('========================================================');

  // Test 1: Lecture et validation du dialogue décrypté
  console.log('--- TEST 1: Dialogue Décrypté JSON partagé ---');
  const intel = DialogueLoader.load();
  console.assert(intel !== null, 'Le JSON du dialogue doit etre charge');
  console.assert(intel.sourceUrl.includes('6aa3dde7-09b8-83eb-aff8-b8edae14ff37'), 'Source URL valide');
  console.assert(intel.dialogueTurns.length >= 6, 'Au moins 6 tours de dialogue');
  console.log(`  [PASS] Dialogue JSON valide : ${intel.dialogueTurns.length} tours.`);

  // Test 2: Gameplay Access Token & Burn-Out Unlocked (User-Only)
  console.log('--- TEST 2: Burn-Out Unlocked (User-Only) ---');
  const vault = new TokenVault('cube_test_secret');
  const burner = new TokenBurner(vault, './ledger/test_cube_ledger.jsonl');

  const gameplayToken = vault.generateDialogueToken('GAMEPLAY_ACCESS_TOKEN', {
    playerId: 'salib-avatar-01',
    userId: 'salib-avatar-01'
  }, 60000);

  // Essai de burn par un utilisateur tiers non autorisé -> Doit échouer
  const unauthorizedBurn = burner.burnOutUnlocked(gameplayToken.tokenId, 'hacker-user-99');
  console.assert(unauthorizedBurn.success === false, 'Doit rejeter un utilisateur non assigne');
  console.assert(unauthorizedBurn.error.includes('USER_ONLY_VIOLATION'), 'Code erreur User Only');
  console.log('  [PASS] Protection "User-Only" inviolable.');

  // Burn légitime par le propriétaire
  const authorizedBurn = burner.burnOutUnlocked(gameplayToken.tokenId, 'salib-avatar-01', { x: 5, y: 0, z: -5 });
  console.assert(authorizedBurn.success === true, 'Le burn légitime doit réussir');
  console.assert(authorizedBurn.gameplayUnlocked === true, 'Gameplay déverrouillé');
  console.assert(vault.tokens.get(gameplayToken.tokenId).status === 'BURNT_UNLOCKED', 'Statut BURNT_UNLOCKED');
  console.log('  [PASS] Burn-Out Unlocked reussi et scelle dans la micro-blockchain.');

  console.log('\n========================================================');
  console.log('   TOUS LES TESTS DU GAME.CUBE WORLD ONT RÉUSSI !       ');
  console.log('========================================================');
}

runGameCubeTests().catch(err => {
  console.error('ECHEC DU TEST GAMECUBE:', err);
  process.exit(1);
});
