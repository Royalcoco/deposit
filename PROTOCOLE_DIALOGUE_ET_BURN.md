# SPÉCIFICATION DU PROTOCOLE DE DIALOGUE ET DU MÉCANISME DE BURN

## 1. Philosophie du Dialogue Cordial
Pour fluidifier les interactions sans saturer les quotas d'API AWS GameLift (`https://gamelift.us-east-2.amazonaws.com/`), le protocole applique :
- **Un jitter respectueux** (temporisation aléatoire de 15 à 45 ms entre les salutations).
- **Un handshake poli** vérifiant l'état de l'enclave locale avant toute émission de requête.
- **Une attribution de jeton unique** (`CORDIAL_HANDSHAKE`, `GAME_SESSION_AUTH`, `PLAYER_SESSION_TOKEN`).

## 2. Mécanisme de Burn (Destruction Irréversible)
Un jeton de session ne doit pouvoir être utilisé qu'une seule et unique fois.
Dès que la connexion joueur est établie ou que le client termine sa session :
1. Le jeton passe de l'état `ACTIVE` à `BURNT`.
2. Une empreinte de destruction SHA-256 (`burnProof`) est générée.
3. L'événement est versé au fichier `ledger/dialogue_ledger.jsonl`.
4. Tout essai ultérieur de présentation de ce jeton est refusé immédiatement avec le code `TOKEN_ALREADY_BURNT`.
