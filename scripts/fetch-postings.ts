/**
 * Offres d'emploi du Guichet-Emplois — DONNÉES OUVERTES (open.canada.ca, licence ouverte, mensuelles).
 * On lit le fichier du dernier mois publié (≈ 45 Mo, UTF-16, séparé par des tabulations), on garde
 * les métiers de data/noc.json, et on publie :
 * - des statistiques par métier et province (nombre d'offres, salaire médian, part sans diplôme…) ;
 * - les offres les plus récentes (au plus PER_GROUP par métier et province), sans employeur ni lien
 *   (le jeu de données ne les contient pas).
 * Ce n'est PAS une lecture du site Job Bank : seulement le fichier publié par EDSC en données ouvertes.
 *
 * Produit : apps/pwa/public/data/postings.json
 */
import {
  computeStats, locateWorkplace, normalize, parseEducation, parseEmploymentType, parseExperience, parsePostingLang,
  parseSalaryPer, parseTerm, PROVINCE_NAMES,
  type CmaLookup, type NocData, type PostingRow, type PostingsData, type ProvinceCode, type Rules,
} from '../packages/core/src';
import { download, getJson } from './lib/http';
import { OGL, writeDataFile, type WrittenFile } from './lib/output';
import { parseCsv, toRecords } from './lib/tabular';

const DATASET_ID = 'ea639e28-c0fc-48bf-b5dd-b8899bd43072';
const PER_GROUP = 6;
const MONTHS: Record<string, string> = {
  january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
  july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
};

export interface PostingsStats { month: string; total: number; kept: number; rows: number; file: WrittenFile }

const provinceByName = new Map<string, ProvinceCode>(
  (Object.entries(PROVINCE_NAMES) as Array<[ProvinceCode, { fr: string; en: string }]>).flatMap(([code, p]) => [[normalize(p.en), code], [normalize(p.fr), code]]),
);

export async function fetchPostings(rules: Rules, nocData: NocData, lookup: CmaLookup): Promise<PostingsStats> {
  console.log('▶ Offres du Guichet-Emplois (données ouvertes, open.canada.ca)');
  const pkg = await getJson<{ result: { resources: Array<{ url: string; format: string; name?: string; name_translated?: { en?: string } }> } }>(
    `https://open.canada.ca/data/api/action/package_show?id=${DATASET_ID}`,
  );
  // Ressource anglaise la plus récente : « September 2026 Job Postings Advertised on… ».
  const latest = pkg.result.resources
    .filter((r) => r.format.toUpperCase() === 'CSV' && /-en-/i.test(r.url))
    .map((r) => {
      const m = /^(\w+)\s+(\d{4})\s+Job Postings/i.exec((r.name_translated?.en ?? r.name ?? '').trim());
      const mm = m ? MONTHS[m[1]!.toLowerCase()] : undefined;
      return { r, month: m && mm ? `${m[2]}-${mm}` : '' };
    })
    .filter((x) => x.month)
    .sort((a, b) => b.month.localeCompare(a.month))[0];
  if (!latest) throw new Error('Aucun fichier mensuel trouvé dans le jeu de données');

  const buf = await download(latest.r.url, { cacheName: `postings/${latest.month}-en.csv` });
  // Fichier en UTF-16 (marque FF FE), colonnes séparées par des tabulations.
  const text = buf[0] === 0xff && buf[1] === 0xfe ? new TextDecoder('utf-16le').decode(buf) : buf.toString('utf8');
  const recs = toRecords(parseCsv(text, '\t'), 0).map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k.trim(), v.trim()])));

  const wanted = new Set(nocData.nocs.map((n) => n.code));
  const rows: PostingRow[] = [];
  for (const r of recs) {
    const noc = r['NOC21 Code'] ?? '';
    if (!wanted.has(noc)) continue;
    const prov = provinceByName.get(normalize(r['Province/Territory'] ?? ''));
    const date = (r['First Posting Date'] ?? '').replace(/\//g, '-');
    if (!prov || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const city = (r['City'] ?? '') === 'NA' ? '' : r['City'] ?? '';
    const loc = city ? locateWorkplace(rules, city, prov, lookup) : { kind: 'unknown' as const };
    const num = (v: string | undefined) => (v && v !== 'NA' && Number.isFinite(Number(v)) ? Number(v) : null);
    rows.push([
      noc,
      r['Job Title'] ?? '',
      date,
      prov,
      city,
      loc.kind === 'cma' ? loc.cma.name : loc.kind === 'outside' ? '-' : '?',
      num(r['Salary Minimum']),
      num(r['Salary Maximum']),
      parseSalaryPer(r['Salary Per'] ?? ''),
      parseEducation(r['Education LOS'] ?? ''),
      parseExperience(r['Experience Level'] ?? ''),
      parseEmploymentType(r['Employment Type'] ?? ''),
      parseTerm(r['Employment Term'] ?? ''),
      parsePostingLang(r['Official Language'] ?? ''),
      num(r['Vacancy Count']) ?? 1,
      r['External Indicator'] === '0' ? 1 : 0,
    ]);
  }

  // Statistiques par métier et province, puis les offres les plus récentes de chaque groupe.
  const groups = new Map<string, PostingRow[]>();
  for (const row of rows) {
    const k = `${row[0]}|${row[3]}`;
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(row);
  }
  const data: PostingsData = { month: latest.month, stats: {}, recent: [] };
  for (const [k, list] of groups) {
    const [noc, prov] = k.split('|') as [string, ProvinceCode];
    (data.stats[noc] ??= {})[prov] = computeStats(list);
    // Offres publiées directement sur le Guichet-Emplois d'abord (champs plus complets), puis les plus récentes.
    data.recent.push(...[...list].sort((a, b) => b[15] - a[15] || b[2].localeCompare(a[2])).slice(0, PER_GROUP));
  }
  const file = writeDataFile(
    'postings.json',
    {
      name: `Offres d'emploi affichées sur le Guichet-Emplois — ${latest.month}`,
      publisher: 'Emploi et Développement social Canada (EDSC)',
      url: `https://open.canada.ca/data/fr/dataset/${DATASET_ID}`,
      licence: OGL,
      files: [latest.r.url],
    },
    data.recent.length,
    data,
  );
  console.log(`  ${latest.month} : ${recs.length} offres au total, ${rows.length} pour les métiers suivis, ${data.recent.length} gardées en détail`);
  return { month: latest.month, total: recs.length, kept: rows.length, rows: data.recent.length, file };
}
