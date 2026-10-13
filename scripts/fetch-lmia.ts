/**
 * Listes officielles des employeurs ayant reçu une EIMT positive / négative (EDSC, open.canada.ca).
 *
 * - découverte des fichiers trimestriels par l'API du portail (pas d'URL codée en dur) ;
 * - normalisation : nom (clé de recherche), province, ville, code postal, CNP, volet ;
 * - déduplication : un enregistrement par employeur × province × code postal ;
 * - situation par rapport aux RMR (gel des EIMT bas salaire) grâce à cma-lookup.json.
 *
 * Produit : apps/pwa/public/data/employers-index.json et employers-<PROVINCE>.json
 */
import { employerKey, locateWorkplace, type CmaLookup, type NocData, type ProvinceCode, type Rules } from '../packages/core/src';
import { download, getJson } from './lib/http';
import { OGL, writeDataFile, type WrittenFile } from './lib/output';
import { readXlsx, toRecords } from './lib/tabular';

const POSITIVE_ID = '90fed587-1364-4f33-a9ee-208181dc0b97';
const NEGATIVE_ID = 'f82f66f2-a22b-4511-bccf-e1d74db39ae5';
const API = 'https://open.canada.ca/data/api/action/package_show?id=';

/** Codes courts des volets (pour des fichiers compacts). */
export const STREAMS: Record<string, { code: string; fr: string; en: string }> = {
  'primary agriculture': { code: 'PA', fr: 'Agriculture primaire (PTAS + volet agricole)', en: 'Primary agriculture (SAWP + Agricultural Stream)' },
  'low wage': { code: 'LW', fr: 'Bas salaire', en: 'Low-wage' },
  'high wage': { code: 'HW', fr: 'Haut salaire', en: 'High-wage' },
  'global talent stream': { code: 'GTS', fr: 'Volet des talents mondiaux', en: 'Global Talent Stream' },
  // Libellé français trouvé une fois dans un fichier anglais.
  'talent mondial': { code: 'GTS', fr: 'Volet des talents mondiaux', en: 'Global Talent Stream' },
  'permanent resident only': { code: 'PR', fr: 'Résidence permanente seulement', en: 'Permanent residence only' },
};

const PROVINCES: Record<string, ProvinceCode | 'XX'> = {
  'newfoundland and labrador': 'NL', 'prince edward island': 'PE', 'nova scotia': 'NS', 'new brunswick': 'NB',
  quebec: 'QC', ontario: 'ON', manitoba: 'MB', saskatchewan: 'SK', alberta: 'AB', 'british columbia': 'BC',
  yukon: 'YT', 'northwest territories': 'NT', nunavut: 'NU',
  'employers carrying on business in canada with head office outside of canada': 'XX',
};

/** Entrée compacte : [trimestre, volet, CNP, nb d'EIMT, nb de postes]. */
export type LmiaEntry = [string, string, string, number, number];

export interface EmployerRecord {
  /** Nom affiché (orthographe la plus récente). */
  n: string;
  /** Clé de recherche normalisée (employerKey). */
  k: string;
  /** Ville. */
  c: string;
  /** Code postal (peut être vide). */
  pc: string;
  /** Situation : nom de la RMR, « - » hors RMR, « ? » inconnue. */
  g: string;
  /** EIMT positives. */
  p: LmiaEntry[];
  /** EIMT négatives. */
  x: LmiaEntry[];
}

interface Resource { quarter: string; kind: 'pos' | 'neg'; url: string }

interface CkanResource { url: string; format: string; language?: string[]; name?: string; name_translated?: { en?: string } }

async function listResources(id: string, kind: 'pos' | 'neg'): Promise<Resource[]> {
  const pkg = await getJson<{ result: { resources: CkanResource[] } }>(API + id);
  const out: Resource[] = [];
  for (const r of pkg.result.resources) {
    const name = r.name_translated?.en ?? r.name ?? '';
    const m = /^(\d{4})\s*Q([1-4])/i.exec(name.trim());
    if (m && r.format.toUpperCase() === 'XLSX' && r.language?.includes('en')) {
      out.push({ quarter: `${m[1]}Q${m[2]}`, kind, url: r.url });
    }
  }
  return out;
}

/** « St. John\ufffds, NL A1B 1W3 » → { city, postal }. Le caractère U+FFFD est une apostrophe abîmée à la source. */
export function parseAddress(address: string): { city: string; postal: string; repaired: boolean } {
  const repaired = address.includes('\ufffd');
  const a = address.replace(/\ufffd/g, "'").trim();
  const postal = /([A-Z]\d[A-Z])\s?(\d[A-Z]\d)\s*$/i.exec(a);
  const beforeComma = a.includes(',') ? a.slice(0, a.lastIndexOf(',')) : a.replace(/\s+[A-Z]{2}\s+[A-Z]\d[A-Z].*$/i, '');
  return {
    city: beforeComma.replace(/\s+/g, ' ').trim(),
    postal: postal ? `${postal[1]} ${postal[2]}`.toUpperCase() : '',
    repaired,
  };
}

export interface LmiaStats {
  quarters: Array<{ quarter: string; posRows: number; posPositions: number; negRows: number; negPositions: number; skippedRows: number }>;
  streamPositions: Record<string, number>;
  records: number;
  distinctEmployers: number;
  repairedAddresses: number;
  geo: { cma: number; outside: number; unknown: number; positionsCma: number; positionsOutside: number; positionsUnknown: number };
  topTeer45: Array<{ noc: string; title: string; positions: number }>;
  recurring: Array<{ name: string; province: string; city: string; g: string; quarters: number; positions: number; streams: string[]; nocs: string[] }>;
  files: WrittenFile[];
  missingQuarters: string[];
}

export async function fetchLmia(rules: Rules, nocData: NocData, lookup: CmaLookup, quartersWanted = 8): Promise<LmiaStats> {
  console.log('▶ EIMT : listes d’employeurs positives et négatives (open.canada.ca)');
  const resources = [...(await listResources(POSITIVE_ID, 'pos')), ...(await listResources(NEGATIVE_ID, 'neg'))];
  const quarters = [...new Set(resources.filter((r) => r.kind === 'pos').map((r) => r.quarter))].sort().slice(-quartersWanted);
  const missingQuarters = quarters.filter((q) => !resources.some((r) => r.kind === 'neg' && r.quarter === q));
  console.log(`  trimestres retenus : ${quarters.join(', ')}`);

  const records = new Map<string, EmployerRecord & { province: string }>();
  const nocTitles = new Map<string, string>();
  const qStats: LmiaStats['quarters'] = [];
  const streamPositions: Record<string, number> = {};
  let repairedAddresses = 0;

  for (const quarter of quarters) {
    const qs = { quarter, posRows: 0, posPositions: 0, negRows: 0, negPositions: 0, skippedRows: 0 };
    for (const kind of ['pos', 'neg'] as const) {
      const res = resources.find((r) => r.quarter === quarter && r.kind === kind);
      if (!res) continue;
      const rows = readXlsx(await download(res.url, { cacheName: `lmia/${res.url.split('/').pop()}` }));
      const headerIndex = rows.findIndex((r) => r.some((c) => c.trim() === 'Employer'));
      if (headerIndex < 0) throw new Error(`En-têtes introuvables dans ${res.url}`);
      for (const r of toRecords(rows, headerIndex)) {
        const occ = /^(\d{5})-(.*)$/.exec(r['Occupation'] ?? '');
        const province = PROVINCES[(r['Province/Territory'] ?? '').toLowerCase()];
        const lmias = Number(r[kind === 'pos' ? 'Approved LMIAs' : 'Requested LMIAs']);
        const positions = Number(r[kind === 'pos' ? 'Approved Positions' : 'Requested Positions']);
        if (!occ || !province || !r['Employer'] || !Number.isFinite(positions)) {
          // Lignes de notes en bas de fichier, ou codes CNP 2011 (4 chiffres) des anciens fichiers.
          if (r['Employer']) qs.skippedRows++;
          continue;
        }
        const name = r['Employer']!.replace(/\ufffd/g, "'");
        const addr = parseAddress(r['Address'] ?? '');
        if (addr.repaired) repairedAddresses++;
        const stream = STREAMS[(r['Program Stream'] ?? '').trim().toLowerCase()]?.code ?? (r['Program Stream'] ?? '').trim();
        nocTitles.set(occ[1]!, occ[2]!.trim());
        const k = employerKey(name);
        const id = `${province}|${k}|${addr.postal || addr.city.toLowerCase()}`;
        let rec = records.get(id);
        if (!rec) {
          const where = province === 'XX' ? { kind: 'unknown' as const } : locateWorkplace(rules, addr.city, province, lookup);
          rec = {
            province, n: name, k, c: addr.city, pc: addr.postal, p: [], x: [],
            g: where.kind === 'cma' ? where.cma.name : where.kind === 'outside' ? '-' : '?',
          };
          records.set(id, rec);
        }
        rec.n = name; // trimestres traités dans l'ordre : on garde l'orthographe la plus récente
        (kind === 'pos' ? rec.p : rec.x).push([quarter, stream, occ[1]!, lmias || 0, positions]);
        if (kind === 'pos') {
          qs.posRows++; qs.posPositions += positions;
          streamPositions[stream] = (streamPositions[stream] ?? 0) + positions;
        } else { qs.negRows++; qs.negPositions += positions; }
      }
    }
    qStats.push(qs);
    console.log(`  ${quarter} : ${qs.posRows} lignes positives (${qs.posPositions} postes), ${qs.negRows} négatives`);
  }

  // Écriture : un fichier par province (chargé à la demande par l'appli).
  const byProvince = new Map<string, EmployerRecord[]>();
  for (const { province, ...rec } of records.values()) {
    if (!byProvince.has(province)) byProvince.set(province, []);
    byProvince.get(province)!.push(rec);
  }
  const source = {
    name: 'Programme des travailleurs étrangers temporaires — employeurs ayant reçu une EIMT positive / négative',
    publisher: 'Emploi et Développement social Canada (EDSC)',
    url: `https://open.canada.ca/data/fr/dataset/${POSITIVE_ID}`,
    licence: OGL,
  };
  const files: WrittenFile[] = [];
  for (const [province, recs] of [...byProvince.entries()].sort()) {
    recs.sort((a, b) => a.k.localeCompare(b.k));
    const urls = resources.filter((r) => quarters.includes(r.quarter)).map((r) => r.url);
    files.push(writeDataFile(`employers-${province}.json`, { ...source, files: urls }, recs.length, recs));
  }
  files.unshift(writeDataFile('employers-index.json', source, byProvince.size, {
    quarters: quarters.map((q) => ({
      quarter: q,
      positive: resources.find((r) => r.quarter === q && r.kind === 'pos')?.url ?? null,
      negative: resources.find((r) => r.quarter === q && r.kind === 'neg')?.url ?? null,
    })),
    provinces: Object.fromEntries([...byProvince.entries()].map(([p, r]) => [p, { file: `employers-${p}.json`, records: r.length }])),
    streams: Object.fromEntries(Object.values(STREAMS).map((st) => [st.code, { fr: st.fr, en: st.en }])),
    nocTitles: Object.fromEntries([...nocTitles.entries()].sort()),
    datasets: { positive: `https://open.canada.ca/data/fr/dataset/${POSITIVE_ID}`, negative: `https://open.canada.ca/data/fr/dataset/${NEGATIVE_ID}` },
  }));

  return { ...computeStats(records, nocTitles, nocData), quarters: qStats, streamPositions, repairedAddresses, files, missingQuarters };
}

/** Statistiques de contrôle (affichées dans docs/data-report.md). */
function computeStats(
  records: Map<string, EmployerRecord & { province: string }>,
  nocTitles: Map<string, string>,
  nocData: NocData,
): Pick<LmiaStats, 'records' | 'distinctEmployers' | 'geo' | 'topTeer45' | 'recurring'> {
  const recs = [...records.values()];
  const geo = { cma: 0, outside: 0, unknown: 0, positionsCma: 0, positionsOutside: 0, positionsUnknown: 0 };
  const teer45 = new Map<string, number>();
  const targets = new Set(nocData.nocs.map((n) => n.code));
  const recurring: LmiaStats['recurring'] = [];
  for (const r of recs) {
    const pos = r.p.reduce((s, e) => s + e[4], 0);
    if (r.g === '-') { geo.outside++; geo.positionsOutside += pos; }
    else if (r.g === '?') { geo.unknown++; geo.positionsUnknown += pos; }
    else { geo.cma++; geo.positionsCma += pos; }
    for (const e of r.p) if (e[2][1] === '4' || e[2][1] === '5') teer45.set(e[2], (teer45.get(e[2]) ?? 0) + e[4]);
    const target = r.p.filter((e) => targets.has(e[2]));
    const qs = new Set(target.map((e) => e[0]));
    if (qs.size >= 2) {
      recurring.push({
        name: r.n, province: r.province, city: r.c, g: r.g, quarters: qs.size,
        positions: target.reduce((s, e) => s + e[4], 0),
        streams: [...new Set(target.map((e) => e[1]))], nocs: [...new Set(target.map((e) => e[2]))],
      });
    }
  }
  recurring.sort((a, b) => b.quarters - a.quarters || b.positions - a.positions);
  return {
    records: recs.length,
    distinctEmployers: new Set(recs.map((r) => r.k)).size,
    geo,
    topTeer45: [...teer45.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([noc, positions]) => ({ noc, title: nocTitles.get(noc) ?? '', positions })),
    recurring,
  };
}
