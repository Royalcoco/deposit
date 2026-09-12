# GUIDE DE LA CONSOLE NAVIGUANTE & DU DIALECTE DEVTOOLS (DVT)

## 1. Accès au Tableau de Bord
Ouvrez votre navigateur sur : `http://localhost:3000`

## 2. Utilisation du Dialecte DVT dans la Console DevTools (F12)
1. Appuyez sur **F12** sur la page du tableau de bord.
2. Basculez dans l'onglet **Console**.
3. Le dialecte DVT est déjà chargé dans le contexte global `window.DVT`.
4. Commandes disponibles :
   - `DVT.connect()` : Connexion au canal WebSocket du hub.
   - `DVT.handshake()` : Déclenche un échange cordial immédiat.
   - `DVT.createSession("NomSession", 8)` : Déclenche la création d'une GameSession.
   - `DVT.burn("tok_...")` : Déclenche le burn d'un token spécifique.
   - `DVT.inspect()` : Affiche les métriques de la console locale.
