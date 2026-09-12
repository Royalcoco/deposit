/**
 * DVT (DevTools Transport) Dialect V.05 - Client Transport & Injected Floating HUD
 * Permet de piloter la console soit en ligne de commande (F12),
 * soit via un HUD flottant cyberpunk injectable dans n'importe quelle page web !
 */
window.DVT = {
  ws: null,

  connect(url = `ws://${window.location.host}/ws`) {
    this.ws = new WebSocket(url);
    this.ws.onopen = () => console.log('%c[DVT/2] Connecté au Hub Consol Local', 'color: #06b6d4; font-weight: bold;');
    this.ws.onmessage = (e) => console.log('%c[DVT/2 REÇU]', 'color: #10b981;', JSON.parse(e.data));
    this.ws.onclose = () => console.warn('[DVT/2] Déconnecté');
  },

  send(type, data = {}) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("DVT non connecté. Lancez d'abord DVT.connect()");
    }
    this.ws.send(JSON.stringify({
      protocol: 'DVT/1',
      type,
      timestamp: Date.now(),
      data
    }));
  },

  handshake() {
    this.send('handshake', { source: 'DevTools-Console' });
  },

  createSession(name = 'DevTools-GameSession', maxPlayers = 8) {
    this.send('session.create', { name, maxPlayers });
  },

  burn(tokenId, reason = 'DEVTOOLS_MANUAL_BURN') {
    this.send('token.burn', { tokenId, reason });
  },

  /**
   * Injecte un mini HUD flottant semi-transparent dans la page active
   */
  mountHUD() {
    if (document.getElementById('dvt-floating-hud')) return;

    const hud = document.createElement('div');
    hud.id = 'dvt-floating-hud';
    hud.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 280px;
      background: rgba(10, 15, 22, 0.95);
      border: 1px solid #06b6d4;
      border-radius: 6px;
      box-shadow: 0 0 16px rgba(6, 182, 212, 0.4);
      color: #cbd5e1;
      font-family: monospace;
      font-size: 11px;
      padding: 12px;
      z-index: 999999;
    `;

    hud.innerHTML = `
      <div style="display:flex; justify-content:space-between; margin-bottom:8px; border-bottom:1px solid #1e293b; padding-bottom:4px;">
        <span style="color:#06b6d4; font-weight:bold;">// DVT/2 FLOATING HUD</span>
        <span style="cursor:pointer; color:#ef4444;" onclick="document.getElementById('dvt-floating-hud').remove()">[X]</span>
      </div>
      <div style="margin-bottom:6px;">PORT UDP: <strong style="color:#10b981;">7777 ACTIF</strong></div>
      <div style="margin-bottom:10px;">LIAISON: <strong style="color:#f59e0b;">us-east-2.amazonaws.com</strong></div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
        <button style="background:rgba(16,185,129,0.2); border:1px solid #10b981; color:#10b981; padding:4px; border-radius:3px; cursor:pointer;" onclick="DVT.handshake()">HANDSHAKE</button>
        <button style="background:rgba(6,182,212,0.2); border:1px solid #06b6d4; color:#06b6d4; padding:4px; border-radius:3px; cursor:pointer;" onclick="DVT.createSession()">SESSION</button>
      </div>
    `;

    document.body.appendChild(hud);
    console.log('%c[DVT/2 HUD INJECTÉ] Le panneau flottant est maintenant visible.', 'color: #10b981;');
  }
};

console.log('%c[DVT/2 READY] Tapez DVT.mountHUD() pour afficher le mini-HUD flottant.', 'color: #06b6d4;');
