/**
 * Salaires Job Bank (EDSC, open.canada.ca) : bas / médian / haut par métier et par province.
 * Sert à la règle anti-arnaque « salaire irréaliste ». On ne garde que les métiers de data/noc.json.
 *
 * Produit : apps/pwa/public/data/wages.json
 */
import type { NocData, WagesData } from '../packages/core/src';
import { download, getJson } from './lib/http';
import { OGL, writeDataFile, type WrittenFile } from './lib/output';
import { parseCsv, toRecords } from './lib/tabular';
import { SGC_PROVINCE } from './fetch-geo';

const WAGES_ID = 'adad580f-76b0-4502-bd05-20c125de9116';

export interface WagesStats { year: string; nocs: number; entries: number; missing: string[]; file: WrittenFile }

const HOURS_PER_YEAR = 2080;

export async function fetchWages(nocData: NocData): Promise<{ wages: WagesData; stats: WagesStats }> {
  console.log('▶ Salaires Job Bank (open.canada.ca)');
  const pkg = await getJson<{ result: { resources: Array<{ url: string; format: string; name?: string; name_translated?: { en?: string } }> } }>(
    `https://open.canada.ca/data/api/action/package_show?id=${WAGES_ID}`,
  );
  // Ressource la plus récente : « 2025 Wages ».
  const latest = pkg.result.resources
    .map((r) => ({ r, year: /^(\d{4})\s+Wages/i.exec((r.name_translated?.en ?? r.name ?? '').trim())?.[1] }))
    .filter((x) => x.year && x.r.format.toUpperCase() === 'CSV')
    .sort((a, b) => b.year!.localeCompare(a.year!))[0];
  if (!latest) throw new Error('Aucune ressource « Wages » trouvée');
  const csv = (await download(latest.r.url, { cacheName: `wages/${latest.year}.csv` })).toString('utf8');
  const recs = toRecords(parseCsv(csv), 0);

  const wanted = new Set(nocData.nocs.map((n) => n.code));
  const wages: WagesData = {};
  const provinceByEr = Object.fromEntries(Object.entries(SGC_PROVINCE).map(([sgc, p]) => [`ER${sgc}`, p]));
  for (const r of recs) {
    const noc = (r['NOC_CNP'] ?? '').replace(/^NOC_/, '');
    if (!wanted.has(noc)) continue;
    // Lignes « province » (ER + 2 chiffres) et « Canada » (ER00) ; on ignore les régions économiques.
    const er = r['ER_Code_Code_RE'] ?? '';
    const area = er === 'ER00' ? 'NAT' : provinceByEr[er];
    const median = Number(r['Median_Wage_Salaire_Median']);
    if (!area || !r['Median_Wage_Salaire_Median'] || !Number.isFinite(median)) continue;
    const annual = r['Annual_Wage_Flag_Salaire_annuel'] === '1';
    const toHourly = (v: string | undefined) => (v ? Number(v) / (annual ? HOURS_PER_YEAR : 1) : null);
    (wages[noc] ??= {})[area] = { low: toHourly(r['Low_Wage_Salaire_Minium']), median: toHourly(r['Median_Wage_Salaire_Median'])!, high: toHourly(r['High_Wage_Salaire_Maximal']) };
  }
  const entries = Object.values(wages).reduce((s, p) => s + Object.keys(p).length, 0);
  const file = writeDataFile(
    'wages.json',
    {
      name: `Salaires Job Bank ${latest.year} (bas, médian, haut — taux horaire)`,
      publisher: 'Emploi et Développement social Canada (EDSC)',
      url: `https://open.canada.ca/data/fr/dataset/${WAGES_ID}`,
      licence: OGL,
      files: [latest.r.url],
    },
    entries,
    wages,
  );
  const missing = [...wanted].filter((n) => !wages[n]);
  console.log(`  ${Object.keys(wages).length} métiers, ${entries} valeurs (année ${latest.year})`);
  return { wages, stats: { year: latest.year!, nocs: Object.keys(wages).length, entries, missing, file } };
}
