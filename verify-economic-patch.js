import { TokenVault } from '../backend/token-vault.js';
import { TokenBurner } from '../backend/token-burner.js';
import { TokenEconomicHub } from '../backend/token-economic-hub.js';
import { PatchRegistry } from '../backend/patch-registry.js';
import { AwsDomainRegistry } from '../backend/aws-domain-registry.js';

async function runEconomicPatchTests() {
  console.log('========================================================');
  console.log('  TEST SUITE : ECONOMIC LAYER, PATCH REGISTRY & DOMAINS ');
  console.log('========================================================');

  const vault = new TokenVault('econ_test_secret');
  const burner = new TokenBurner(vault, './ledger/test_econ_ledger.jsonl');

  // Test 1: Arbitrage Économique & Coût Évité (Turn 7)
  console.log('--- TEST 1: Token Economic Layer & Arbitrage Coût Évité ---');
  const econHub = new TokenEconomicHub(vault, burner);
  const dialResult = econHub.dial('game.cube', 'NORMAL', 300);
  console.assert(dialResult.decision === 'LOCAL', 'Décision doit être LOCAL');
  console.assert(dialResult.savingUsd > 0, 'Le coût évité doit être positif');
  console.assert(econHub.totalCostAvoidedUsd > 0, 'Total coût évité cumulé');
  console.log(`  [PASS] Arbitrage réussi : Décision = ${dialResult.decision}, Coût évité = $${dialResult.savingUsd}`);

  // Test 2: Tokenized Patch Registry (Turn 9)
  console.log('--- TEST 2: Patch Registry pour Game.cube (Patch v0.1.3) ---');
  const patchReg = new PatchRegistry(vault, burner);
  console.assert(patchReg.activePatchVersion === '0.1.2', 'Version initiale');

  // Mint du token de patch
  const mintRes = patchReg.mintPatchToken('patch_gamecube_002');
  console.assert(mintRes.token.type === 'PATCH_ORCHESTRATION_TOKEN', 'Type token patch');

  // Déploiement et burn du token
  const deployRes = patchReg.deployPatch('patch_gamecube_002', mintRes.token.tokenId);
  console.assert(deployRes.success === true, 'Déploiement réussi');
  console.assert(patchReg.activePatchVersion === '0.1.3', 'Version mise à jour vers 0.1.3');
  console.assert(deployRes.burnRecord.burnProof.length === 64, 'Preuve SHA-256 scellée');
  console.log('  [PASS] Patch v0.1.3 déployé avec succès et jeton brûlé.');

  // Test 3: Registre des Domaines & Endpoints AWS (Turn 8)
  console.log('--- TEST 3: AWS Domain & Endpoint Explorer ---');
  const domainReg = new AwsDomainRegistry('us-east-2');
  const regData = domainReg.getRegistry();
  console.assert(regData.endpoints.length >= 3, 'Au moins 3 endpoints enregistrés');
  console.assert(regData.endpoints.some(e => e.domain.includes('gamelift.us-east-2')), 'Endpoint GameLift présent');
  console.log(`  [PASS] Registre AWS : ${regData.endpoints.length} domaines cartographiés.`);

  console.log('\n========================================================');
  console.log('  TOUS LES TESTS DE LA SUITE ÉCONOMIQUE ONT RÉUSSI !    ');
  console.log('========================================================');
}

runEconomicPatchTests().catch(e => {
  console.error('ECHEC DU TEST:', e);
  process.exit(1);
});
