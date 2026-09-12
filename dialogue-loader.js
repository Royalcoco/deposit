import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const JSON_PATH = path.resolve(__dirname, '../intel/chatgpt_dialogue_decrypted.json');

/**
 * DialogueLoader - Utilitaire JSON partagé à tous les modules serveurs
 * Fournit l'accès direct aux intel et à la base de dialogue décryptée.
 */
export class DialogueLoader {
  static load() {
    try {
      if (fs.existsSync(JSON_PATH)) {
        const raw = fs.readFileSync(JSON_PATH, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error('[DialogueLoader] Erreur de lecture JSON:', e.message);
    }
    return null;
  }

  static getEndpoints() {
    const data = this.load();
    return data?.awsEndpoints || [];
  }

  static getTheFiveKeys() {
    const data = this.load();
    return data?.theFiveKeys || {};
  }
}
