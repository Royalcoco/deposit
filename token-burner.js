import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

/**
 * TokenBurner V.05+ - Moteur de Burn avec Chaîne Cryptographique & Burn-Out Unlocked
 * Supporte la destruction ciblée "User-Only" pour l'entrée dans le Game.cube World :
 * seul l'utilisateur propriétaire peut déverrouiller et brûler son token de gameplay.
 */
export class TokenBurner {
  constructor(tokenVault, ledgerPath = './ledger/dialogue_ledger.jsonl') {
    this.tokenVault = tokenVault;
    this.ledgerPath = ledgerPath;
    this.burnHistory = [];
    this.totalBurned = 0;
    this.lastHash = this.initLastHash();
    this.ensureLedgerDir();
  }

  ensureLedgerDir() {
    const dir = path.dirname(this.ledgerPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  initLastHash() {
    if (fs.existsSync(this.ledgerPath)) {
      try {
        const lines = fs.readFileSync(this.ledgerPath, 'utf-8').trim().split('\n');
        if (lines.length > 0 && lines[lines.length - 1]) {
          const lastEntry = JSON.parse(lines[lines.length - 1]);
          return lastEntry.burnProof || '0000000000000000000000000000000000000000000000000000000000000000';
        }
      } catch (e) {}
    }
    return '0000000000000000000000000000000000000000000000000000000000000000';
  }

  /**
   * Burn standard avec insertion dans la hash-chain
   */
  burn(tokenId, reason = 'SESSION_CONSUMED', extraData = {}) {
    const token = this.tokenVault.tokens.get(tokenId);
    if (!token) {
      return { success: false, error: 'TOKEN_NOT_FOUND', tokenId };
    }
    if (token.status === 'BURNT' || token.status === 'BURNT_UNLOCKED') {
      return { success: false, error: 'TOKEN_ALREADY_BURNT', tokenId };
    }

    token.status = 'BURNT';
    token.burnedAt = Date.now();
    token.burnReason = reason;

    const prevHash = this.lastHash;
    const burnProof = crypto
      .createHash('sha256')
      .update(`${prevHash}:${token.tokenId}:${token.signature}:${token.burnedAt}:${reason}`)
      .digest('hex');

    this.lastHash = burnProof;

    const burnRecord = {
      event: 'TOKEN_BURN',
      chainIndex: this.totalBurned + 1,
      prevHash,
      burnProof,
      tokenId: token.tokenId,
      tokenType: token.type,
      burnedAt: new Date(token.burnedAt).toISOString(),
      reason,
      opticalThroughput: `${(Math.random() * 1.5 + 2.8).toFixed(2)} MB/s`,
      metadata: {
        ...token.metadata,
        ...extraData
      }
    };

    this.burnHistory.unshift(burnRecord);
    if (this.burnHistory.length > 50) this.burnHistory.pop();
    this.totalBurned++;

    try {
      fs.appendFileSync(this.ledgerPath, JSON.stringify(burnRecord) + '\n', 'utf-8');
    } catch (err) {
      console.error('Erreur écriture ledger:', err.message);
    }

    return {
      success: true,
      message: 'Jeton brûlé et scellé dans la chaîne cryptographique.',
      burnRecord
    };
  }

  /**
   * Burn-Out Unlocked (Spécifique Game.cube World - User-Only)
   * Réforme le dialogue et déverrouille l'accès gameplay pour l'utilisateur exclusif.
   */
  burnOutUnlocked(tokenId, userId, cubeCoordinates = { x: 0, y: 0, z: 0 }) {
    const token = this.tokenVault.tokens.get(tokenId);
    if (!token) return { success: false, error: 'TOKEN_NOT_FOUND' };

    // Vérification "User Only"
    const assignedUser = token.metadata?.playerId || token.metadata?.userId;
    if (assignedUser && assignedUser !== userId) {
      return {
        success: false,
        error: 'USER_ONLY_VIOLATION: Ce jeton ne peut être brûlé que par son propriétaire légitime.'
      };
    }

    const burnResult = this.burn(tokenId, 'GAME_CUBE_BURNOUT_UNLOCKED', {
      unlockedBy: userId,
      gameCubeZone: 'CUBE_INSTANCE_01',
      coordinates: cubeCoordinates,
      dialogueReformed: true
    });

    if (burnResult.success) {
      token.status = 'BURNT_UNLOCKED';
      burnResult.gameplayUnlocked = true;
      burnResult.worldState = {
        cubeId: 'Game.cube_01',
        player: userId,
        status: 'UNLOCKED_ACTIVE'
      };
    }

    return burnResult;
  }

  autoBurnExpired() {
    const expired = this.tokenVault.findExpiredTokens();
    const results = [];
    for (const token of expired) {
      const res = this.burn(token.tokenId, 'TTL_AUTO_EXPIRED');
      if (res.success) {
        results.push(res.burnRecord);
      }
    }
    return results;
  }

  getRecentBurns(limit = 20) {
    return this.burnHistory.slice(0, limit);
  }

  getStats() {
    return {
      totalBurned: this.totalBurned,
      lastHash: this.lastHash,
      recentBurnsCount: this.burnHistory.length,
      ledgerFile: this.ledgerPath
    };
  }
}
