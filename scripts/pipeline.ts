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
import type { CurrentOffer, NocData, Rules } from '../packages/core/src';
import { todayIso } from '../packages/core/src';
import { buildAfricanRecruiters, type AfricanRecruitersStats } from './build-african-recruiters';
import { buildDesignated, type DesignatedStats } from './build-designated';
import { fetchPermits, type PermitsStats } from './fetch-permits';
import { fetchInternational, type InternationalStats } from './fetch-international';
import { fetchExpressEntry, type ExpressEntryStats } from './fetch-express-entry';
import { fetchProposals, type ProposalsStats } from './fetch-proposals';
import { fetchCurrentOffers, type CurrentOffersStats } from './fetch-current-offers';
import { fetchPostings, type PostingsStats } from './fetch-postings';
import { fetchGeo, type GeoStats } from './fetch-geo';
import { fetchLmia, type LmiaStats } from './fetch-lmia';
import { fetchWages, type WagesStats } from './fetch-wages';
import { DOCS_DIR, OUT_DIR, ROOT } from './lib/paths';
import { reusePrevious } from './lib/previous';
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
const african = buildAfricanRecruiters(today);
const geo = await fetchGeo(rules);
const lmia = await fetchLmia(rules, nocData, geo.lookup, quarters);
const wages = await fetchWages(nocData);
const ee = await fetchExpressEntry(rules);
let proposals: ProposalsStats;
try { proposals = await fetchProposals(rules, today); } catch (e) {
  proposals = { checked: 0, changed: [], error: e instanceof Error ? e.message : String(e) };
  console.warn(`  ⚠ Règles en préparation non vérifiées : ${proposals.error}`);
}
let permits: PermitsStats | { error: string };
try { permits = await fetchPermits(); } catch (e) {
  permits = { error: e instanceof Error ? e.message : String(e) };
  console.warn(`  ⚠ Permis par pays non mis à jour : ${permits.error}`);
}
// Quota gratuit d'Adzuna (250 appels par jour, 1000 par semaine) : l'API n'est appelée que lors de la mise à jour
// hebdomadaire (ADZUNA_REFRESH=true) ou si aucune version n'est encore publiée. Sinon, et en cas d'échec, on garde
// les offres déjà publiées (avec leur vraie date).
type Reused = { reused: string; records: number; error?: string };
const refreshAdzuna = process.env.ADZUNA_REFRESH === 'true';
async function adzunaStep<T>(file: string, label: string, run: () => Promise<T>): Promise<T | Reused | { error: string }> {
  if (!refreshAdzuna) {
    const prev = await reusePrevious(file);
    if (prev) { console.log(`▶ ${label} : version publiée reprise (données du ${prev.fetchedAt}, ${prev.records} offres) — API appelée seulement le lundi`); return { reused: prev.fetchedAt, records: prev.records }; }
  }
  try { return await run(); } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    const prev = await reusePrevious(file);
    console.warn(`  ⚠ ${label} non mises à jour : ${error}${prev ? ` — version du ${prev.fetchedAt} gardée` : ''}`);
    return prev ? { reused: prev.fetchedAt, records: prev.records, error } : { error };
  }
}
const intl = await adzunaStep('international-offers.json', 'Offres ouvertes aux candidats de l’étranger', () => fetchInternational(rules, nocData));
// Après les offres internationales (pour marquer celles qui y figurent).
const current = await currentOffersStep();
/** Offres actuelles : version publiée reprise, mais les métiers AJOUTÉS depuis sont interrogés tout de suite (pas d'attente du lundi). */
async function currentOffersStep() {
  const r = await adzunaStep('current-offers.json', 'Offres actuelles', () => fetchCurrentOffers(rules, nocData));
  if (!('reused' in r) || r.error) return r;
  const prev = JSON.parse(readFileSync(join(OUT_DIR, 'current-offers.json'), 'utf8')) as { source: { nocs?: string[] }; data: CurrentOffer[] };
  const known = new Set(prev.source.nocs ?? prev.data.map((o) => o.noc));
  const missing = nocData.nocs.map((n) => n.code).filter((c) => !known.has(c));
  if (!missing.length) return r;
  console.log(`  métiers ajoutés depuis la dernière mise à jour : ${missing.join(', ')} — interrogés maintenant`);
  try {
    return await fetchCurrentOffers(rules, nocData, { onlyNocs: missing, base: { offers: prev.data, nocs: [...known] } });
  } catch (e) {
    console.warn(`  ⚠ Nouveaux métiers non interrogés : ${e instanceof Error ? e.message : String(e)} — version publiée gardée`);
    return r;
  }
}
// Offres du mois (données ouvertes) : une erreur ne bloque pas le reste, l'appli fonctionne sans.
let postings: PostingsStats | { error: string };
try { postings = await fetchPostings(rules, nocData, geo.lookup); } catch (e) {
  postings = { error: e instanceof Error ? e.message : String(e) };
  console.warn(`  ⚠ Offres du Guichet-Emplois non mises à jour : ${postings.error}`);
}

writeFileSync(join(DOCS_DIR, 'data-report.md'), report(geo.stats, lmia, wages.stats, designated, ee, postings, african, permits, intl, proposals, current));
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

function report(g: GeoStats, l: LmiaStats, w: WagesStats, d: DesignatedStats, ee: ExpressEntryStats, p: PostingsStats | { error: string }, af: AfricanRecruitersStats, pm: PermitsStats | { error: string }, it: InternationalStats | Reused | { error: string }, pr: ProposalsStats, cu: CurrentOffersStats | Reused | { error: string }): string {
  const files: WrittenFile[] = [g.file, ...l.files, w.file, ...d.files, ...(ee.file ? [ee.file] : []), ...('file' in p ? [p.file] : []), af.file, ...('file' in pm ? [pm.file] : []), ...('file' in it && it.file ? [it.file as WrittenFile] : []), ...(pr.file ? [pr.file] : []), ...('file' in cu && cu.file ? [cu.file as WrittenFile] : [])];
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

## 8. Recrutement en Afrique

- Preuves relevées à la main (\`data/manual/recrutement-afrique.csv\`) : ${af.rows} preuves, ${af.employers} employeurs.
- Permis de travail par pays de citoyenneté (IRCC) : ${'error' in pm ? `⚠ non mis à jour : ${pm.error}` : `${pm.countries} pays d'Afrique, jusqu'à ${pm.lastMonth}`}.

## 9. Offres ouvertes aux candidats de l'étranger (API Adzuna, tri VériJob)

${'reused' in it ? `Version publiée gardée (données du ${it.reused}, ${n(it.records)} offres)${it.error ? ` — ⚠ échec de l'API : ${it.error}` : ''}.` : 'error' in it ? `⚠ Non mises à jour : ${it.error}` : it.skipped ? `Étape sautée : ${it.skipped}.` : `- ${it.queries} requêtes, ${n(it.seen)} annonces lues, **${n(it.kept)} ouvertes à l'international**, ${n(it.closed)} écartées (Canada exigé).`}

## 10. Offres actuelles avec lien direct (API Adzuna)

${'reused' in cu ? `Version publiée gardée (données du ${cu.reused}, ${n(cu.records)} offres)${cu.error ? ` — ⚠ échec de l'API : ${cu.error}` : ''}.` : 'error' in cu ? `⚠ Non mises à jour : ${cu.error}` : cu.skipped ? `Étape sautée : ${cu.skipped}.` : `- ${cu.queries} requêtes, ${n(cu.seen)} annonces lues, **${n(cu.kept)} gardées** (titre conforme au métier).`}

## 11. Règles en préparation

${pr.error ? `⚠ Non vérifiées : ${pr.error}` : `- ${pr.checked} page(s) vérifiée(s). ${pr.changed.length ? `**⚠ Page modifiée depuis la dernière vérification : ${pr.changed.join(', ')} — relire et mettre à jour rules.json (proposals).**` : 'Aucune page modifiée.'}`}
`;
}
