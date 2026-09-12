import readline from 'node:readline';

const BASE_URL = 'http://localhost:3000';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('===========================================================');
console.log('       CONSOL CLI // CONTROLE TERMINAL LOCAL VERROUILLE   ');
console.log('===========================================================');
console.log('Commandes disponibles :');
console.log(' 1 : Statut du hub et du local verrouille');
console.log(' 2 : Echange cordial & salutation');
console.log(' 3 : Creer une GameSession GameLift Anywhere');
console.log(' 4 : Lister les sessions');
console.log(' 5 : Bruler un token (Burn)');
console.log(' 6 : Quitter');
console.log('===========================================================');

async function askCommand() {
  rl.question('\nconsol> ', async (choice) => {
    try {
      if (choice.trim() === '1') {
        const res = await fetch(`${BASE_URL}/api/status`);
        console.log(await res.json());
      } else if (choice.trim() === '2') {
        const res = await fetch(`${BASE_URL}/api/dialogue/cordial`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId: 'cli-terminal' })
        });
        console.log(await res.json());
      } else if (choice.trim() === '3') {
        const res = await fetch(`${BASE_URL}/api/session/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'CLI-Intel-GameSession', maxPlayers: 8 })
        });
        console.log(await res.json());
      } else if (choice.trim() === '4') {
        const res = await fetch(`${BASE_URL}/api/sessions`);
        console.log(await res.json());
      } else if (choice.trim() === '5') {
        rl.question('ID du token à brûler : ', async (tokId) => {
          const res = await fetch(`${BASE_URL}/api/token/burn`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tokenId: tokId.trim(), reason: 'CLI_BURN' })
          });
          console.log(await res.json());
          askCommand();
        });
        return;
      } else if (choice.trim() === '6') {
        rl.close();
        process.exit(0);
      } else {
        console.log('Commande inconnue. Choisissez 1-6.');
      }
    } catch (err) {
      console.error('Erreur (Le serveur est-il bien lance ?):', err.message);
    }
    askCommand();
  });
}

askCommand();
