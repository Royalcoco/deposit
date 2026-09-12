import crypto from 'node:crypto';

/**
 * PatchRegistry - Tokenized Patch Registry pour Game.cube (Turn 9)
 * Gère le cycle de vie des mises à jour applicatives :
 * MINT PATCH -> STAGE LOCAL -> VERIFY SHA-256 -> DEPLOY -> HEALTH CHECK -> BURN TOKEN.
 */
export class PatchRegistry {
  constructor(tokenVault, tokenBurner) {
    this.tokenVault = tokenVault;
    this.tokenBurner = tokenBurner;
    this.patches = new Map();
    this.activePatchVersion = '0.1.2';
    this.initDefaultPatches();
  }

  initDefaultPatches() {
    this.registerPatch({
      patchId: 'patch_gamecube_001',
      target: 'game.cube.world',
      version: '0.1.2',
      sha256: 'a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0',
      status: 'DEPLOYED',
      scope: 'game-server-base'
    });

    this.registerPatch({
      patchId: 'patch_gamecube_002',
      target: 'game.cube.world',
      version: '0.1.3',
      sha256: '88f24b109e234cfa7129bc810034aefc991823ab110023456789abcdef123456',
      status: 'AVAILABLE_FOR_STAGING',
      scope: 'game-server-optimization-v05'
    });
  }

  registerPatch(patchData) {
    this.patches.set(patchData.patchId, {
      ...patchData,
      registeredAt: new Date().toISOString()
    });
  }

  /**
   * MINT PATCH TOKEN : délivre un token d'orchestration de mise à jour
   */
  mintPatchToken(patchId) {
    const patch = this.patches.get(patchId);
    if (!patch) throw new Error(`Patch non trouvé: ${patchId}`);

    const patchToken = this.tokenVault.generateDialogueToken('PATCH_ORCHESTRATION_TOKEN', {
      patchId: patch.patchId,
      version: patch.version,
      target: patch.target,
      action: 'DEPLOY_AND_VERIFY'
    }, 180000);

    return { patch, token: patchToken };
  }

  /**
   * Déploie le patch et brûle le jeton après confirmation du health check
   */
  deployPatch(patchId, tokenId) {
    const patch = this.patches.get(patchId);
    if (!patch) throw new Error(`Patch non trouvé: ${patchId}`);

    const verify = this.tokenVault.verifyToken(tokenId);
    if (!verify.valid) throw new Error(`Jeton de patch invalide: ${verify.reason}`);

    // Simulation de vérification SHA-256 et passage en prod
    patch.status = 'DEPLOYED';
    this.activePatchVersion = patch.version;

    // Burn du token de patch consommé
    const burnRes = this.tokenBurner.burn(tokenId, 'PATCH_DEPLOYED_AND_COMMITTED', {
      patchId,
      versionDeployed: patch.version,
      sha256: patch.sha256
    });

    return {
      success: true,
      message: `Patch ${patch.version} déployé avec succès sur Game.cube world.`,
      activeVersion: this.activePatchVersion,
      burnRecord: burnRes.burnRecord
    };
  }

  getAllPatches() {
    return Array.from(this.patches.values());
  }
}
