// Récupère le site déjà construit par GitHub Actions (release « site-latest ») et l'extrait
// dans apps/pwa/dist. Utilisé par Cloudflare : ainsi Cloudflare ne contacte aucun site
// gouvernemental (Statistique Canada bloque ses serveurs de construction).
//
// Usage : node scripts/fetch-built-site.mjs              → site complet dans apps/pwa/dist
//         node scripts/fetch-built-site.mjs --data-only  → seulement data/ dans apps/pwa/public/data
//           (utilisé par « npm run data » sur Cloudflare, avant « npm run build »)
// Variable facultative : SITE_ZIP_URL (adresse du zip à télécharger).
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unzipSync } from 'fflate';

const DEFAULT_URL = 'https://github.com/Zaz111D/verijob-canada/releases/download/site-latest/site.zip';
const url = process.env.SITE_ZIP_URL || DEFAULT_URL;
const dataOnly = process.argv.includes('--data-only');
const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'apps', 'pwa', dataOnly ? 'public' : 'dist');

console.log(`↓ ${url}`);
const res = await fetch(url, { headers: { 'User-Agent': 'VeriJobCanada-deploy/0.1' } });
if (!res.ok) {
  console.error(`Échec du téléchargement (HTTP ${res.status}). Le workflow GitHub « Données et déploiement » a-t-il déjà publié la release site-latest ?`);
  process.exit(1);
}
const buf = new Uint8Array(await res.arrayBuffer());
if (buf[0] !== 0x50 || buf[1] !== 0x4b) {
  console.error('Le fichier reçu n’est pas un zip.');
  process.exit(1);
}
const files = unzipSync(buf);
if (!files['index.html'] || !Object.keys(files).some((f) => f.startsWith('data/'))) {
  console.error('Zip incomplet : index.html ou data/ manquant.');
  process.exit(1);
}
rmSync(dataOnly ? join(out, 'data') : out, { recursive: true, force: true });
let count = 0;
for (const [name, content] of Object.entries(files)) {
  if (name.endsWith('/') || (dataOnly && !name.startsWith('data/'))) continue;
  count++;
  const target = join(out, name);
  if (!target.startsWith(out)) throw new Error(`Chemin suspect dans le zip : ${name}`);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
}
console.log(`✔ ${count} fichiers extraits dans ${dataOnly ? 'apps/pwa/public/data' : 'apps/pwa/dist'}`);
