# DÉPLOIEMENT GAMELIFT ANYWHERE SUR MACHINE INTEL

Pour raccorder votre machine Intel physique à une flotte GameLift officielle sous votre compte AWS :

### Étape 1 : Créer la Custom Location
```powershell
aws gamelift create-location `
  --location-name custom-intel-dev `
  --region us-east-2
```

### Étape 2 : Créer la flotte Anywhere
```powershell
aws gamelift create-fleet `
  --name Intel-Dev-Fleet `
  --compute-type ANYWHERE `
  --locations Location=custom-intel-dev `
  --region us-east-2
```

### Étape 3 : Enregistrer votre machine comme Compute
```powershell
aws gamelift register-compute `
  --fleet-id <VOTRE_FLEET_ID> `
  --compute-name IntelDevPC `
  --ip-address 127.0.0.1 `
  --location custom-intel-dev `
  --region us-east-2
```

### Étape 4 : Activer le mode LIVE_AWS dans le .env
Dans le fichier `.env` de votre console :
```ini
GAMELIFT_MODE=LIVE_AWS
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=wJalr...
GAMELIFT_FLEET_ID=<VOTRE_FLEET_ID>
```
