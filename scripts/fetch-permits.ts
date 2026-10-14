/**
 * Permis de travail par pays de citoyenneté (IRCC, données ouvertes mensuelles) — pays d'Afrique seulement.
 * - PTET (Programme des travailleurs étrangers temporaires : permis liés à une EIMT ou dispensés) ;
 * - PMI (Programme de mobilité internationale, dont la Mobilité francophone).
 * IRCC arrondit les valeurs et masque celles de 1 à 5 (« -- ») : elles sont comptées 0, donc les totaux
 * annuels sont des ordres de grandeur.
 *
 * Produit : apps/pwa/public/data/permits-africa.json
 */
import type { PermitsData } from '../packages/core/src';
import { download } from './lib/http';
import { OGL, writeDataFile, type WrittenFile } from './lib/output';
import { parseCsv, toRecords } from './lib/tabular';

const BASE = 'https://www.ircc.canada.ca/opendata-donneesouvertes/data/';
const FILES = { tfwp: 'ODP-TR-Work-TFWP-CITZ.csv', imp: 'ODP-TR-Work-IMP-CITZ.csv' } as const;
const DATASET = 'https://open.canada.ca/data/fr/dataset/360024f2-17e9-4558-bfc1-3616485d65b9';

/** Nom IRCC (avant la virgule) → code ISO-2, pour les pays d'Afrique. */
const AFRICA: Record<string, string> = {
  algeria: 'DZ', angola: 'AO', benin: 'BJ', botswana: 'BW', 'burkina-faso': 'BF', 'burkina faso': 'BF', burundi: 'BI',
  'cabo verde': 'CV', 'cape verde': 'CV', cameroon: 'CM', 'central african republic': 'CF', chad: 'TD', comoros: 'KM',
  'ivory coast': 'CI', "cote d'ivoire": 'CI', djibouti: 'DJ', egypt: 'EG', 'equatorial guinea': 'GQ', eritrea: 'ER',
  eswatini: 'SZ', swaziland: 'SZ', ethiopia: 'ET', gabon: 'GA', 'gabon republic': 'GA', gambia: 'GM', ghana: 'GH',
  guinea: 'GN', 'guinea-bissau': 'GW', kenya: 'KE', lesotho: 'LS', liberia: 'LR', libya: 'LY', madagascar: 'MG',
  malawi: 'MW', mali: 'ML', mauritania: 'MR', mauritius: 'MU', morocco: 'MA', mozambique: 'MZ', namibia: 'NA',
  niger: 'NE', nigeria: 'NG', rwanda: 'RW', 'sao tome and principe': 'ST', senegal: 'SN', seychelles: 'SC',
  'sierra leone': 'SL', somalia: 'SO', 'south africa': 'ZA', 'south sudan': 'SS', sudan: 'SD', tanzania: 'TZ',
  togo: 'TG', tunisia: 'TN', uganda: 'UG', zambia: 'ZM', zimbabwe: 'ZW',
};

/** Code ISO-2 d'un nom de pays IRCC (« Cameroon, Federal Republic of »), ou undefined si hors Afrique. */
export function africanIso(irccName: string): string | undefined {
  const full = irccName.toLowerCase().replace(/[’]/g, "'");
  if (full.startsWith('congo')) return full.includes('democratic') ? 'CD' : 'CG';
  return AFRICA[full.split(',')[0]!.trim()];
}

const MONTH: Record<string, string> = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };

export interface PermitsStats { lastMonth: string; countries: number; file: WrittenFile }

export async function fetchPermits(): Promise<PermitsStats> {
  console.log('▶ Permis de travail par pays de citoyenneté (IRCC)');
  const data: PermitsData = { lastMonth: '', tfwp: {}, imp: {} };
  for (const [prog, file] of Object.entries(FILES) as Array<[keyof typeof FILES, string]>) {
    const text = (await download(BASE + file, { cacheName: `ircc/${file}`, refresh: true })).toString('utf8');
    for (const r of toRecords(parseCsv(text, '\t'), 0)) {
      const iso = africanIso(r['EN_COUNTRY_OF_CITIZENSHIP'] ?? '');
      const year = r['EN_YEAR'] ?? '';
      const month = MONTH[(r['EN_MONTH'] ?? '').toLowerCase().slice(0, 3)];
      if (!iso || !/^\d{4}$/.test(year) || !month) continue;
      const n = Number((r['TOTAL'] ?? '').replace(/[^\d]/g, '')) || 0; // « -- » (1 à 5) → 0
      const byYear = (data[prog][iso] ??= {});
      byYear[year] = (byYear[year] ?? 0) + n;
      const ym = `${year}-${month}`;
      if (ym > data.lastMonth) data.lastMonth = ym;
    }
  }
  const countries = new Set([...Object.keys(data.tfwp), ...Object.keys(data.imp)]).size;
  const out = writeDataFile(
    'permits-africa.json',
    {
      name: 'Titulaires de permis de travail (PTET et PMI) par pays de citoyenneté — pays d’Afrique',
      publisher: 'Immigration, Réfugiés et Citoyenneté Canada (IRCC)',
      url: DATASET,
      licence: OGL,
      files: Object.values(FILES).map((f) => BASE + f),
    },
    countries,
    data,
  );
  console.log(`  ${countries} pays d'Afrique, données jusqu'à ${data.lastMonth}`);
  return { lastMonth: data.lastMonth, countries, file: out };
}
