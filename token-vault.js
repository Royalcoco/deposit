import crypto from 'node:crypto';

/**
 * TokenVault - Le "Local Verrouillé" V.05
 * Intègre le support des TTL (Time-To-Live éphémères), la signature HMAC-SHA256
 * et l'inventaire des jetons expirés pour l'auto-burn.
 */
export class TokenVault {
  constructor(masterSecret = 'vault_master_default_seed') {
    this.masterSecret = masterSecret;
    this.isLocked = true;
    this.tokens = new Map();
    this.createdAt = new Date().toISOString();
  }

  lock() {
    this.isLocked = true;
    return { status: 'LOCKED', message: 'Enclave locale hermétiquement verrouillée.' };
  }

  unlock(secretKey) {
    if (secretKey === this.masterSecret) {
      this.isLocked = false;
      return { status: 'UNLOCKED', message: 'Enclave locale déverrouillée.' };
    }
    return { status: 'ERROR', message: 'Clé maîtresse invalide. Le local reste verrouillé.' };
  }

  /**
   * Génère un jeton signé avec TTL (par défaut 60s)
   */
  generateDialogueToken(type, metadata = {}, ttlMs = 60000) {
    const nonce = crypto.randomBytes(16).toString('hex');
    const tokenId = `tok_${type.toLowerCase()}_${Date.now()}_${nonce.slice(0, 8)}`;
    const timestamp = Date.now();
    const expiresAt = timestamp + ttlMs;

    const payload = {
      tokenId,
      type,
      nonce,
      timestamp,
      expiresAt,
      ttlMs,
      metadata,
      status: 'ACTIVE'
    };

    const signature = crypto
      .createHmac('sha256', this.masterSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    const signedToken = {
      ...payload,
      signature,
      proofHash: crypto.createHash('sha256').update(`${tokenId}:${signature}`).digest('hex')
    };

    this.tokens.set(tokenId, signedToken);
    return signedToken;
  }

  verifyToken(tokenId) {
    const token = this.tokens.get(tokenId);
    if (!token) return { valid: false, reason: 'TOKEN_NOT_FOUND' };
    if (token.status === 'BURNT') return { valid: false, reason: 'TOKEN_ALREADY_BURNT' };
    if (Date.now() > token.expiresAt) return { valid: false, reason: 'TOKEN_EXPIRED', token };

    const { signature, proofHash, ...payload } = token;
    const expectedSignature = crypto
      .createHmac('sha256', this.masterSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (signature !== expectedSignature) {
      return { valid: false, reason: 'SIGNATURE_MISMATCH' };
    }

    return { valid: true, token };
  }

  findExpiredTokens() {
    const now = Date.now();
    return Array.from(this.tokens.values()).filter(
      t => t.status === 'ACTIVE' && now > t.expiresAt
    );
  }

  getActiveTokens() {
    const now = Date.now();
    return Array.from(this.tokens.values()).filter(
      t => t.status === 'ACTIVE' && now <= t.expiresAt
    );
  }

  getAllTokens() {
    return Array.from(this.tokens.values());
  }

  getStatus() {
    return {
      status: this.isLocked ? 'VERROUILLE' : 'DEVERROUILLE',
      totalTokens: this.tokens.size,
      activeTokens: this.getActiveTokens().length,
      burntTokens: Array.from(this.tokens.values()).filter(t => t.status === 'BURNT').length,
      enclaveBoot: this.createdAt
    };
  }
}
