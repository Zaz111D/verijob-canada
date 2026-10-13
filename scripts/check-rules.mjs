// Contrôle des dates de révision de data/rules.json.
// Usage : npm run check:rules   (code de sortie 1 si une règle est périmée — utile en CI)
import { readFileSync } from 'node:fs';

const rules = JSON.parse(readFileSync(new URL('../data/rules.json', import.meta.url), 'utf8'));
const today = new Date().toISOString().slice(0, 10);
const rows = Object.entries(rules.sources).sort((a, b) => a[1].nextReview.localeCompare(b[1].nextReview));

let stale = 0;
console.log(`rules.json version ${rules.version} — contrôle au ${today}\n`);
for (const [id, s] of rows) {
  const late = today > s.nextReview;
  if (late) stale++;
  console.log(`${late ? '⚠ PÉRIMÉE' : '✔ à jour '}  révision ${s.nextReview}  (vérifiée ${s.verifiedAt})  ${id}`);
}
const cma = rules.lmiaLowWage;
console.log(`\nListe RMR gelées : valable du ${cma.validFrom} au ${cma.validTo} — prochaine MAJ EDSC le ${cma.nextUpdate}`);
if (today > cma.validTo) { console.log('⚠ La liste RMR est expirée.'); stale++; }
process.exit(stale ? 1 : 0);
