# INTEL TECHNIQUE : ARCHITECTURE AWS GAMELIFT SERVERS & ANYWHERE

## 1. Chaîne Fondamentale de Connexion
Contrairement aux services web traditionnels, un jeu multijoueur temps réel ne fait pas transiter ses paquets UDP/TCP par l'API de gestion GameLift.
La chaîne d'accès repose sur l'obtention des 5 informations cardinales via l'API `CreatePlayerSession` :
- **GameSessionId** : Identifiant ARN unique de la session de jeu active.
- **DNS Name** : Nom de domaine résolvable pour les flottes avec terminaison TLS.
- **IP Address** : Adresse IP directe du compute (127.0.0.1 en test local, ou IP publique).
- **Port** : Port d'écoute du serveur de jeu (ex: 7777 UDP/TCP).
- **PlayerSessionId** : Jeton d'admission unique délivré au joueur pour validation auprès du serveur.

```
Client (Console / PC)
    │
    │ 1. Demande de partie
    ▼
Backend Local / Hub (localhost:3000)
    │
    │ 2. CreatePlayerSession
    ▼
AWS GameLift (gamelift.us-east-2.amazonaws.com)
    │
    │ 3. Retourne DNS + IP + Port + PlayerSessionId
    ▼
Client
    │
    │ 4. Connexion directe UDP/TCP (Bypass de l'API AWS)
    ▼
Serveur de Jeu (Compute Intel Anywhere :7777)
```

## 2. Flottes Anywhere vs Managed EC2
- **Anywhere** : Vous permet d'enregistrer votre propre machine (Intel PC, serveur Proxmox, NUC) comme compute via `RegisterCompute`. Aucun coût d'instance EC2 n'est facturé ; seul le plan de contrôle GameLift est sollicité.
- **Managed EC2 / Container** : AWS gère l'orchestration, le provisionnement dynamique et le packaging Docker.

## 3. Emplacements Personnalisés (Custom Locations)
Pour une flotte Anywhere, AWS exige un emplacement dont le nom commence obligatoirement par `custom-` (ex: `custom-intel-dev`).
