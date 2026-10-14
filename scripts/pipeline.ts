/**
 * Pipeline de données VériJob : télécharge, normalise et publie les données utilisées hors ligne par la PWA,
 * puis écrit un rapport de contrôle (docs/data-report.md).
 *
 * Usage : npm run data                 (8 derniers trimestres EIMT)
 *         npm run data -- --quarters=4
 * Les téléchargements sont mis en cache dans data/raw/ (supprimer le dossier pour tout retélécharger).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { NocData, Rules } from '../packages/core/src';
import { todayIso } from '../packages/core/src';
import { buildDesignated, type DesignatedStats } from './build-designated';
import { fetchExpressEntry, type ExpressEntryStats } from './fetch-express-entry';
import { fetchPostings, type PostingsStats } from './fetch-postings';
import { fetchGeo, type GeoStats } from './fetch-geo';
import { fetchLmia, type LmiaStats } from './fetch-lmia';
import { fetchWages, type WagesStats } from './fetch-wages';
import { DOCS_DIR, ROOT } from './lib/paths';
import type { WrittenFile } from './lib/output';

// Sur Cloudflare (Workers Builds : WORKERS_CI, Pages : CF_PAGES), les serveurs de construction sont bloqués
// par Statistique Canada : on reprend les données déjà préparées par GitHub Actions (release « site-latest »).
if (process.env.WORKERS_CI || process.env.CF_PAGES) {
  console.log('▶ Construction Cloudflare : données reprises de la release « site-latest » (GitHub Actions)');
  const { execFileSync } = await import('node:child_process');
  execFileSync(process.execPath, [join(ROOT, 'scripts', 'fetch-built-site.mjs'), '--data-only'], { stdio: 'inherit' });
  process.exit(0);
}

const rules = JSON.parse(readFileSync(join(ROOT, 'data', 'rules.json'), 'utf8')) as Rules;
const nocData = JSON.parse(readFileSync(join(ROOT, 'data', 'noc.json'), 'utf8')) as NocData;
const quarters = Number(/--quarters=(\d+)/.exec(process.argv.join(' '))?.[1] ?? 8);
const today = todayIso();

const designated = buildDesignated(rules, today); // en premier : échoue vite si un fichier curé est invalide
const geo = await fetchGeo(rules);
const lmia = await fetchLmia(rules, nocData, geo.lookup, quarters);
const wages = await fetchWages(nocData);
const ee = await fetchExpressEntry(rules);
// Offres du mois (données ouvertes) : une erreur ne bloque pas le reste, l'appli fonctionne sans.
let postings: PostingsStats | { error: string };
try { postings = await fetchPostings(rules, nocData, geo.lookup); } catch (e) {
  postings = { error: e instanceof Error ? e.message : String(e) };
  console.warn(`  ⚠ Offres du Guichet-Emplois non mises à jour : ${postings.error}`);
}

writeFileSync(join(DOCS_DIR, 'data-report.md'), report(geo.stats, lmia, wages.stats, designated, ee, postings));
console.log('✔ Terminé. Rapport : docs/data-report.md');

// ---------------------------------------------------------------------------

function n(x: number): string {
  return x.toLocaleString('fr-CA');
}
function kb(b: number): string {
  return `${n(Math.round(b / 1024))} Ko`;
}
function pct(a: number, total: number): string {
  return total ? `${Math.round((100 * a) / total)} %` : '–';
}

function report(g: GeoStats, l: LmiaStats, w: WagesStats, d: DesignatedStats, ee: ExpressEntryStats, p: PostingsStats | { error: string }): string {
  const files: WrittenFile[] = [g.file, ...l.files, w.file, ...d.files, ...(ee.file ? [ee.file] : []), ...('file' in p ? [p.file] : [])];
  const totalPos = l.geo.positionsCma + l.geo.positionsOutside + l.geo.positionsUnknown;
  const totalRec = l.geo.cma + l.geo.outside + l.geo.unknown;
  const recurringTargets = l.recurring.slice(0, 20);
  return `# Rapport de contrôle des données

> Généré automatiquement par \`npm run data\` le ${today}. Ne pas modifier à la main.

## 1. Fichiers publiés (\`apps/pwa/public/data/\`)

| Fichier | Enregistrements | Taille | Taille compressée (gzip) |
|---|---:|---:|---:|
${files.map((f) => `| ${f.file} | ${n(f.records)} | ${kb(f.bytes)} | ${kb(f.gzipBytes)} |`).join('\n')}
| **Total** | | **${kb(files.reduce((s, f) => s + f.bytes, 0))}** | **${kb(files.reduce((s, f) => s + f.gzipBytes, 0))}** |

Chaque fichier contient \`{ source, fetchedAt, recordCount, data }\`. L'appli ne charge le fichier d'une province que lorsqu'on en a besoin.

## 2. EIMT — listes d'employeurs (EDSC)

| Trimestre | Lignes positives | Postes approuvés | Lignes négatives | Postes refusés | Lignes ignorées |
|---|---:|---:|---:|---:|---:|
${l.quarters.map((q) => `| ${q.quarter} | ${n(q.posRows)} | ${n(q.posPositions)} | ${n(q.negRows)} | ${n(q.negPositions)} | ${n(q.skippedRows)} |`).join('\n')}

${l.missingQuarters.length ? `⚠ Trimestres sans liste négative publiée : ${l.missingQuarters.join(', ')}\n\n` : ''}- Enregistrements (employeur × province × code postal) : **${n(l.records)}** — employeurs distincts (clé de nom) : **${n(l.distinctEmployers)}**
- Adresses réparées (apostrophe abîmée « � » à la source) : ${n(l.repairedAddresses)}
- Postes approuvés par volet : ${Object.entries(l.streamPositions).sort((a, b) => b[1] - a[1]).map(([s, v]) => `${s} ${n(v)}`).join(' · ')}
  (PA = agriculture primaire, PTAS et volet agricole confondus ; LW = bas salaire ; HW = haut salaire ; GTS = talents mondiaux ; PR = résidence permanente seulement)

### Situation par rapport aux RMR (gel des EIMT bas salaire)

| Situation | Enregistrements | Postes approuvés |
|---|---:|---:|
| Dans une RMR | ${n(l.geo.cma)} (${pct(l.geo.cma, totalRec)}) | ${n(l.geo.positionsCma)} (${pct(l.geo.positionsCma, totalPos)}) |
| Hors RMR (municipalité connue) | ${n(l.geo.outside)} (${pct(l.geo.outside, totalRec)}) | ${n(l.geo.positionsOutside)} (${pct(l.geo.positionsOutside, totalPos)}) |
| Inconnue (ville non reconnue) | ${n(l.geo.unknown)} (${pct(l.geo.unknown, totalRec)}) | ${n(l.geo.positionsUnknown)} (${pct(l.geo.positionsUnknown, totalPos)}) |

### Métiers TEER 4–5 les plus fréquents (postes approuvés, tous trimestres retenus)

| CNP | Métier | Postes |
|---|---|---:|
${l.topTeer45.map((t) => `| ${t.noc} | ${t.title} | ${n(t.positions)} |`).join('\n')}

### Aperçu « recruteurs récurrents » (métiers ciblés, EIMT positives sur ≥ 2 trimestres)

${n(l.recurring.length)} employeurs. Les 20 premiers :

| Employeur | Province | Ville | RMR | Trimestres | Postes | Volets | CNP |
|---|---|---|---|---:|---:|---|---|
${recurringTargets.map((r) => `| ${r.name.replace(/\|/g, '/')} | ${r.province} | ${r.city.replace(/\|/g, '/')} | ${r.g === '-' ? 'hors RMR' : r.g === '?' ? '?' : r.g} | ${r.quarters} | ${n(r.positions)} | ${r.streams.join(', ')} | ${r.nocs.join(', ')} |`).join('\n')}

## 3. Municipalités → RMR (Statistique Canada, Recensement 2021)

- Municipalités (SDR) : ${n(g.csdCount)} — dans une RMR : ${n(g.inCma)} — hors RMR : ${n(g.outside)} — noms ambigus : ${n(g.ambiguous)}
- RMR de \`rules.json\` retrouvées dans le tableau officiel : ${g.cmaMatched} / ${rules.lmiaLowWage.cmas.length}

## 4. Salaires Job Bank (${w.year})

- ${w.nocs} métiers ciblés couverts, ${n(w.entries)} valeurs (Canada + provinces).
${w.missing.length ? `- ⚠ Métiers sans données salariales : ${w.missing.join(', ')}\n` : ''}
## 5. Employeurs désignés FCIP / RCIP (relevés manuels)

| Communauté | Programme | Employeurs | « Ne recrute pas » | Retirés du programme | Relevé le |
|---|---|---:|---:|---:|---|
${d.byCommunity.map((c) => `| ${c.community} | ${c.program} | ${n(c.employers)} | ${c.notHiring} | ${c.withdrawn} | ${c.recordedAt} |`).join('\n')}

- Métiers prioritaires relevés : ${d.priorities}
- Communautés sans relevé pour l'instant (${d.communitiesWithoutData.length}) : ${d.communitiesWithoutData.join(', ') || 'aucune'}
${d.stale.length ? `- ⚠ Relevés de plus de 90 jours à refaire : ${d.stale.join(', ')}\n` : ''}
## 6. Entrée express — rondes d'invitations (IRCC)

${ee.error ? `⚠ Non mises à jour : ${ee.error} (l'appli lit alors le fichier officiel en direct).` : `- ${ee.rounds} rondes gardées, la plus récente le ${ee.latest}.`}

## 7. Offres du Guichet-Emplois (données ouvertes, mensuelles)

${'error' in p ? `⚠ Non mises à jour : ${p.error}` : `- Mois ${p.month} : ${n(p.total)} offres au total, ${n(p.kept)} pour les métiers suivis, ${n(p.rows)} gardées en détail (les plus récentes par métier et province).`}
`;
}
