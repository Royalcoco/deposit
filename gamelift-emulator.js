import crypto from 'node:crypto';

/**
 * GameLiftEmulator - Émulateur Haute Fidélité GameLift Anywhere
 * Simule le cycle de vie exact des sessions GameLift conformément aux spécifications AWS :
 * CreateGameSession -> ACTIVE -> CreatePlayerSession -> DNS / IP / Port / PlayerSessionId
 */
export class GameLiftEmulator {
  constructor(config = {}) {
    this.region = config.region || 'us-east-2';
    this.endpoint = config.endpoint || 'https://gamelift.us-east-2.amazonaws.com/';
    this.fleetId = config.fleetId || 'fleet-intel-anywhere-001';
    this.location = config.location || 'custom-intel-dev';
    this.computeName = config.computeName || 'IntelDevPC';
    this.computeIp = config.computeIp || '127.0.0.1';
    this.computePort = parseInt(config.computePort || '7777', 10);

    this.gameSessions = new Map();
    this.playerSessions = new Map();
    this.computes = new Map();

    // Enregistrement initial du compute local Intel
    this.computes.set(this.computeName, {
      ComputeName: this.computeName,
      FleetId: this.fleetId,
      IpAddress: this.computeIp,
      Location: this.location,
      OperatingSystem: 'WINDOWS_2022_OR_CLIENT',
      Type: 'ANYWHERE',
      Status: 'ACTIVE',
      RegisteredAt: new Date().toISOString()
    });
  }

  async createGameSession({ name = 'Intel-Dev-GameSession', maxPlayers = 8, creatorId = 'salib-admin' }) {
    const rawId = crypto.randomUUID();
    const gameSessionId = `arn:aws:gamelift:${this.region}:123456789012:gamesession/${this.fleetId}/gsess-${rawId}`;
    const dnsName = `gsess-${rawId.slice(0, 8)}.intel-dev.${this.region}.amazongamelift.com`;

    const session = {
      GameSessionId: gameSessionId,
      Name: name,
      FleetId: this.fleetId,
      Location: this.location,
      Status: 'ACTIVE',
      MaximumPlayerSessionCount: maxPlayers,
      CurrentPlayerSessionCount: 0,
      DnsName: dnsName,
      IpAddress: this.computeIp,
      Port: this.computePort,
      CreatorId: creatorId,
      CreationTime: new Date().toISOString(),
      GameProperties: [
        { Key: 'architecture', Value: 'Intel-Anywhere-Console' },
        { Key: 'protocol', Value: 'DVT/1-UDP' }
      ]
    };

    this.gameSessions.set(gameSessionId, session);
    return { GameSession: session };
  }

  async createPlayerSession({ gameSessionId, playerId = 'player-001', playerData = '' }) {
    const session = this.gameSessions.get(gameSessionId);
    if (!session) {
      throw new Error(`GameSession introuvable: ${gameSessionId}`);
    }

    if (session.CurrentPlayerSessionCount >= session.MaximumPlayerSessionCount) {
      throw new Error(`GameSession pleine (${session.MaximumPlayerSessionCount} joueurs max)`);
    }

    const playerSessionId = `psess-${crypto.randomUUID()}`;
    const playerSession = {
      PlayerSessionId: playerSessionId,
      PlayerId: playerId,
      GameSessionId: session.GameSessionId,
      FleetId: session.FleetId,
      CreationTime: new Date().toISOString(),
      Status: 'RESERVED',
      IpAddress: session.IpAddress,
      DnsName: session.DnsName,
      Port: session.Port,
      PlayerData: playerData
    };

    session.CurrentPlayerSessionCount++;
    this.playerSessions.set(playerSessionId, playerSession);

    return { PlayerSession: playerSession };
  }

  async describeGameSessions() {
    return { GameSessions: Array.from(this.gameSessions.values()) };
  }

  async describePlayerSessions(gameSessionId) {
    const list = Array.from(this.playerSessions.values()).filter(p => p.GameSessionId === gameSessionId);
    return { PlayerSessions: list };
  }

  getOverview() {
    return {
      mode: 'EMULATOR_ANYWHERE',
      region: this.region,
      endpoint: this.endpoint,
      fleetId: this.fleetId,
      location: this.location,
      compute: this.computes.get(this.computeName),
      activeGameSessions: this.gameSessions.size,
      activePlayerSessions: this.playerSessions.size
    };
  }
}
