// Récupère le site déjà construit par GitHub Actions (release « site-latest ») et l'extrait
// dans apps/pwa/dist. Utilisé par Cloudflare : ainsi Cloudflare ne contacte aucun site
// gouvernemental (Statistique Canada bloque ses serveurs de construction).
//
// Usage : node scripts/fetch-built-site.mjs              → site complet dans apps/pwa/dist
//         node scripts/fetch-built-site.mjs --data-only  → seulement data/ dans apps/pwa/public/data
//           (utilisé par « npm run data » sur Cloudflare, avant « npm run build »)
// Variable facultative : SITE_ZIP_URL (adresse du zip à télécharger).
//
// Cloudflare lance sa construction dès l'envoi du code, alors que GitHub Actions met environ
// 2 minutes à publier la nouvelle release. Si Cloudflare indique son commit (WORKERS_CI_COMMIT_SHA,
// ou CF_PAGES_COMMIT_SHA), on attend que la release corresponde à ce commit (build-info.json),
// au plus WAIT_MINUTES minutes ; ensuite on déploie la release disponible, avec un avertissement.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { strFromU8, unzipSync } from 'fflate';

const DEFAULT_URL = 'https://github.com/Zaz111D/verijob-canada/releases/download/site-latest/site.zip';
const url = process.env.SITE_ZIP_URL || DEFAULT_URL;
const dataOnly = process.argv.includes('--data-only');
const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'apps', 'pwa', dataOnly ? 'public' : 'dist');
const expected = process.env.WORKERS_CI_COMMIT_SHA || process.env.CF_PAGES_COMMIT_SHA || '';
const WAIT_MINUTES = 12;
const RETRY_SECONDS = 30;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function download() {
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
  let commit = '';
  try { commit = JSON.parse(strFromU8(files['build-info.json'])).commit ?? ''; } catch { /* release antérieure à build-info.json */ }
  return { files, commit };
}

console.log(`↓ ${url}`);
let { files, commit } = await download();
if (expected) {
  const deadline = Date.now() + WAIT_MINUTES * 60_000;
  while (commit !== expected && Date.now() < deadline) {
    console.log(`… la release correspond au commit ${commit.slice(0, 7) || '(inconnu)'}, on attend ${expected.slice(0, 7)} (GitHub Actions construit encore) — nouvel essai dans ${RETRY_SECONDS} s`);
    await sleep(RETRY_SECONDS * 1000);
    ({ files, commit } = await download());
  }
  if (commit === expected) console.log(`✔ Release à jour (commit ${expected.slice(0, 7)})`);
  else console.warn(`⚠ Release toujours sur le commit ${commit.slice(0, 7) || '(inconnu)'} après ${WAIT_MINUTES} min : déploiement de la version disponible. Le workflow GitHub a-t-il échoué ?`);
}
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
