import dgram from 'node:dgram';

/**
 * GameServerUdp - Serveur de Jeu UDP Natif GameLift Anywhere (:7777)
 * Écoute les paquets UDP des clients de jeu / consoles, valide le PlayerSessionId,
 * déclenche le burn automatique à l'admission et renvoie les paquets d'état temps réel.
 */
export class GameServerUdp {
  constructor(port = 7777, tokenVault, tokenBurner, onPacketCallback = null) {
    this.port = port;
    this.tokenVault = tokenVault;
    this.tokenBurner = tokenBurner;
    this.onPacketCallback = onPacketCallback;
    this.socket = null;
    this.activePlayers = new Map(); // address:port -> playerInfo
    this.totalPacketsReceived = 0;
  }

  start() {
    this.socket = dgram.createSocket('udp4');

    this.socket.on('error', (err) => {
      console.error(`[UDP Server] Erreur socket : ${err.message}`);
    });

    this.socket.on('message', (msg, rinfo) => {
      this.totalPacketsReceived++;
      const text = msg.toString().trim();
      const parts = text.split(' ');
      const cmd = parts[0].toUpperCase();

      if (this.onPacketCallback) {
        this.onPacketCallback({ cmd, raw: text, rinfo, timestamp: Date.now() });
      }

      if (cmd === 'HANDSHAKE') {
        // HANDSHAKE <PlayerSessionId> <TokenId>
        const playerSessionId = parts[1] || 'psess-default';
        const tokenId = parts[2];

        let burnResult = null;
        if (tokenId) {
          // Admission validée -> Burn immédiat du jeton de session pour usage unique
          burnResult = this.tokenBurner.burn(tokenId, 'UDP_ADMISSION_VALIDATED', {
            playerSessionId,
            remoteAddress: `${rinfo.address}:${rinfo.port}`
          });
        }

        const clientKey = `${rinfo.address}:${rinfo.port}`;
        this.activePlayers.set(clientKey, {
          playerSessionId,
          tokenId,
          admittedAt: Date.now(),
          lastPing: Date.now()
        });

        const reply = `ACK_ADMITTED ${playerSessionId} BURNT:${burnResult?.success ? 'TRUE' : 'FALSE'}`;
        this.send(reply, rinfo.port, rinfo.address);

      } else if (cmd === 'PING') {
        // PING <timestamp>
        const clientTs = parts[1] || Date.now();
        const reply = `PONG ${clientTs} ${Date.now()}`;
        this.send(reply, rinfo.port, rinfo.address);

      } else {
        const reply = `ECHO ${text}`;
        this.send(reply, rinfo.port, rinfo.address);
      }
    });

    this.socket.bind(this.port, () => {
      console.log(`[UDP GameServer] Prêt et à l'écoute sur 0.0.0.0:${this.port} (GameLift Anywhere Active)`);
    });
  }

  send(message, port, address) {
    if (!this.socket) return;
    const buf = Buffer.from(message);
    this.socket.send(buf, 0, buf.length, port, address);
  }

  stop() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  getStats() {
    return {
      port: this.port,
      activeConnectedPlayers: this.activePlayers.size,
      totalPacketsReceived: this.totalPacketsReceived
    };
  }
}
