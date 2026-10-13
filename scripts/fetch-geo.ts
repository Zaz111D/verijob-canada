/**
 * Correspondance municipalité (subdivision de recensement, SDR) → RMR.
 *
 * Sources (Statistique Canada, Recensement 2021, licence ouverte) :
 * - tableau 98-10-0002 : toutes les SDR du Canada ;
 * - tableau 98-10-0003 : chaque RMR / AR suivie des SDR qui la composent.
 * Une SDR absente de toute RMR est « hors RMR » : le gel des EIMT bas salaire ne s'y applique pas.
 *
 * Produit : apps/pwa/public/data/cma-lookup.json
 */
import { cityKey, type CmaLookup, type Rules } from '../packages/core/src';
import { download } from './lib/http';
import { STATCAN_OL, writeDataFile, type WrittenFile } from './lib/output';
import { parseCsv, unzipOne } from './lib/tabular';

const ALL_CSD_URL = 'https://www150.statcan.gc.ca/n1/tbl/csv/98100002-eng.zip';
const CMA_CSD_URL = 'https://www150.statcan.gc.ca/n1/tbl/csv/98100003-eng.zip';

/** Codes SGC des provinces → codes à 2 lettres. */
export const SGC_PROVINCE: Record<string, string> = {
  '10': 'NL', '11': 'PE', '12': 'NS', '13': 'NB', '24': 'QC', '35': 'ON',
  '46': 'MB', '47': 'SK', '48': 'AB', '59': 'BC', '60': 'YT', '61': 'NT', '62': 'NU',
};

interface Csd { name: string; province: string; dguid: string }

export interface GeoStats {
  csdCount: number;
  inCma: number;
  outside: number;
  ambiguous: number;
  cmaMatched: number;
  file: WrittenFile;
}

/** Lignes (GEO, DGUID) d'un tableau StatCan zippé. */
async function readTable(url: string): Promise<Array<{ geo: string; dguid: string }>> {
  const csv = unzipOne(await download(url), (n) => n.endsWith('.csv') && !n.includes('MetaData'));
  const rows = parseCsv(csv);
  const header = rows[0]!;
  const gi = header.indexOf('GEO');
  const di = header.indexOf('DGUID');
  return rows.slice(1).filter((r) => r[di]).map((r) => ({ geo: r[gi]!, dguid: r[di]! }));
}

/** SDR : DGUID « 2021A0005 » + code SDR à 7 chiffres (2 premiers = province). */
function asCsd(row: { geo: string; dguid: string }): Csd | undefined {
  const m = /^2021A0005(\d{2})\d{5}$/.exec(row.dguid);
  const province = m && SGC_PROVINCE[m[1]!];
  return province ? { name: row.geo, province, dguid: row.dguid } : undefined;
}

export async function fetchGeo(rules: Rules): Promise<{ lookup: CmaLookup; stats: GeoStats }> {
  console.log('▶ Géographie : municipalités → RMR (Statistique Canada)');
  const all = (await readTable(ALL_CSD_URL)).map(asCsd).filter((c): c is Csd => !!c);
  const nested = await readTable(CMA_CSD_URL);

  // Nom de RMR du tableau → nom de RMR de rules.json (« Ottawa - Gatineau (Ontario part) » → « Ottawa - Gatineau »).
  const toRulesName = (tableName: string): string | undefined => {
    const k = cityKey(tableName);
    const cmas = rules.lmiaLowWage.cmas;
    // Égalité exacte d'abord (évite de confondre « Saint John » et « St. John's »),
    // puis préfixe (« Greater Sudbury / Grand Sudbury » → « Greater Sudbury »).
    return (
      cmas.find((c) => cityKey(c.name) === k) ??
      cmas.find((c) => k.startsWith(`${cityKey(c.name)} `))
    )?.name;
  };

  const csdToCma = new Map<string, string>();
  const tableCmas = new Set<string>();
  let parent: string | undefined;
  for (const row of nested) {
    if (row.dguid.startsWith('2021S0503')) {
      tableCmas.add(row.geo);
      parent = toRulesName(row.geo);
      if (!parent) throw new Error(`RMR du tableau 98-10-0003 absente de rules.json : « ${row.geo} »`);
    } else if (row.dguid.startsWith('2021S0504')) {
      parent = undefined; // agglomération de recensement (AR) : hors RMR
    } else if (parent && asCsd(row)) {
      csdToCma.set(row.dguid, parent);
    }
  }

  const matched = new Set(csdToCma.values());
  const missing = rules.lmiaLowWage.cmas.filter((c) => !matched.has(c.name)).map((c) => c.name);
  if (missing.length) throw new Error(`RMR de rules.json sans municipalité trouvée : ${missing.join(', ')}`);

  // Construction de la table de recherche, avec détection des homonymes contradictoires.
  const lookup: CmaLookup = {};
  for (const csd of all) {
    const value = csdToCma.get(csd.dguid) ?? '-';
    const prov = (lookup[csd.province] ??= {});
    const key = cityKey(csd.name);
    if (!key) continue;
    prov[key] = prov[key] === undefined || prov[key] === value ? value : '?';
  }

  const values = Object.values(lookup).flatMap((p) => Object.values(p));
  const recordCount = values.length;
  const file = writeDataFile(
    'cma-lookup.json',
    {
      name: 'Municipalités (SDR) et RMR — Recensement 2021',
      publisher: 'Statistique Canada',
      url: 'https://www150.statcan.gc.ca/t1/tbl1/fr/tv.action?pid=9810000301',
      licence: STATCAN_OL,
      files: [ALL_CSD_URL, CMA_CSD_URL],
    },
    recordCount,
    lookup,
  );
  const stats: GeoStats = {
    csdCount: all.length,
    inCma: values.filter((v) => v !== '-' && v !== '?').length,
    outside: values.filter((v) => v === '-').length,
    ambiguous: values.filter((v) => v === '?').length,
    cmaMatched: matched.size,
    file,
  };
  console.log(`  ${stats.csdCount} municipalités, ${stats.inCma} dans une RMR, ${stats.outside} hors RMR, ${stats.ambiguous} ambiguës`);
  return { lookup, stats };
}
