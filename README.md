# CONSOL // Local Naviguant & Analogue GameLift Hub

Système complet de pilotage local, d'échange cordial de tokens, de burn cryptographique anti-rejeu et de liaison bidirectionnelle avec **AWS GameLift Servers Anywhere** (`https://gamelift.us-east-2.amazonaws.com/`).

---

## 🌟 Fonctionnalités Clés

1. **Propriété Locale Naviguante (Dashboard Analogique)** :
   - Interface web rétro-futuriste sur `http://localhost:3000`.
   - Oscilloscope analogique en temps réel (Canvas 60Hz) reflétant l'activité réseau et les fréquences de dialogue.
   - Matrice des 5 clés de connexion : `GameSessionId -> DNS Name -> IP Address -> Port -> PlayerSessionId`.

2. **Local Verrouillé (Token Vault Enclave)** :
   - Enclave hermétique scellée par signature HMAC-SHA256.
   - Protection absolue des secrets d'infrastructure et gestion d'état sécurisé.

3. **Dialogue Cordial & Distribution de Tokens** :
   - Protocole de salutation bienveillante avec temporisation par jitter (15-45ms) pour optimiser les échanges sans saturer les quotas.
   - Distribution de jetons signés pour chaque interaction (`CORDIAL_HANDSHAKE`, `GAME_SESSION_AUTH`, `PLAYER_SESSION_TOKEN`).

4. **Mécanisme de Burn & Versement au Ledger** :
   - Destruction instantanée des tokens après usage (`burn`) pour interdire tout rejeu de paquet.
   - Versement automatique au registre immuable `ledger/dialogue_ledger.jsonl`.
   - Métriques d'optique de flux (throughput MB/s et empreintes SHA-256).

5. **Pont AWS GameLift Hybride (Double Moteur)** :
   - **Mode Émulateur Anywhere** : Fonctionne immédiatement hors-ligne à 100%, idéal pour prototyper et tester sans compte AWS payant.
   - **Mode Live AWS SDK** : Prêt pour la production avec vos clés IAM réelles pour interagir avec `https://gamelift.us-east-2.amazonaws.com/`.

6. **Dialecte DVT (DevTools Transport)** :
   - Script injectable dans l'inspecteur Chrome/Edge/Firefox (`F12 > Console`) pour piloter la console directement depuis le navigateur.

---

## 🚀 Démarrage Rapide

### Option 1 : Double-clic Windows
Double-cliquez simplement sur :
```
start.bat
```
Le script installe les dépendances si nécessaire, démarre le hub et ouvre automatiquement `http://localhost:3000` dans votre navigateur.

### Option 2 : Ligne de commande PowerShell
```powershell
cd C:\Users\salib\Desktop\consol
npm start
```

### Option 3 : Console Interactive (CLI)
Dans une autre fenêtre de terminal :
```powershell
node consol-cli.js
```

---

## 📁 Structure du Projet

```
C:\Users\salib\Desktop\consol\
├── start.bat                     # Lanceur automatique Windows
├── consol-cli.js                 # Terminal interactif en ligne de commande
├── package.json                  # Dépendances Node.js (express, ws, @aws-sdk/client-gamelift)
├── .env                          # Configuration active
├── .env.example                  # Modèle de configuration
├── README.md                     # Ce document
├── backend/
│   ├── server.js                 # Serveur HTTP Express + WebSocket Hub
│   ├── token-vault.js            # Local Verrouillé (Enclave cryptographique HMAC)
│   ├── token-burner.js           # Moteur de Burn et archivage au Ledger
│   ├── cordial-handshake.js      # Protocole de dialogue cordial avec jitter
│   ├── gamelift-bridge.js        # Passerelle unifiée Émulateur / AWS SDK
│   └── gamelift-emulator.js      # Émulateur GameLift Anywhere haute fidélité
├── public/
│   ├── index.html                # Tableau de bord analogique rétro-futuriste
│   ├── style.css                 # Style visuel analogique (Scanlines CRT, néons cyan/ambre/rouge)
│   ├── app.js                    # Moteur frontend réactif (Oscilloscope, WebSocket)
│   └── dvt-client.js             # Dialecte DevTools Transport (DVT/1)
├── ledger/
│   └── dialogue_ledger.jsonl     # Registre d'audit des dialogues et tokens brûlés
├── intel/
│   ├── INTEL_GAMELIFT_ARCHITECTURE.md  # Anatomie complète des sessions GameLift
│   ├── PROTOCOLE_DIALOGUE_ET_BURN.md   # Spécification formelle du dialogue cordial & burn
│   ├── GUIDE_CONSOLE_ET_DEVTOOLS.md    # Manuel du dialecte DevTools F12
│   └── DEPLOIEMENT_ANYWHERE_INTEL.md   # Guide de déploiement réel sur PC Intel
└── test/
    └── verify-hub.js             # Suite de tests d'intégrité automatisés
```

---

## 🧪 Tests de Vérification
Pour valider l'intégrité de tous les sous-systèmes :
```powershell
npm test
```
