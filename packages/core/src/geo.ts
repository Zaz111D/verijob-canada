/**
 * Géographie : provinces, RMR (CMA) et pays africains.
 */
import type { Cma, ProvinceCode, Rules } from './types';
import { escapeRegExp } from './noc';
import { normalize } from './text';

export const PROVINCE_NAMES: Record<ProvinceCode, { fr: string; en: string; patterns: string[] }> = {
  NL: { fr: 'Terre-Neuve-et-Labrador', en: 'Newfoundland and Labrador', patterns: ['terre-neuve', 'newfoundland', 't.-n.-l.'] },
  PE: { fr: 'Île-du-Prince-Édouard', en: 'Prince Edward Island', patterns: ['ile-du-prince-edouard', 'ile du prince edouard', 'prince edward island', 'i.-p.-e.', 'p.e.i.'] },
  NS: { fr: 'Nouvelle-Écosse', en: 'Nova Scotia', patterns: ['nouvelle-ecosse', 'nouvelle ecosse', 'nova scotia', 'n.-e.'] },
  NB: { fr: 'Nouveau-Brunswick', en: 'New Brunswick', patterns: ['nouveau-brunswick', 'nouveau brunswick', 'new brunswick', 'n.-b.'] },
  QC: { fr: 'Québec', en: 'Quebec', patterns: ['quebec', 'qc'] },
  ON: { fr: 'Ontario', en: 'Ontario', patterns: ['ontario'] },
  MB: { fr: 'Manitoba', en: 'Manitoba', patterns: ['manitoba'] },
  SK: { fr: 'Saskatchewan', en: 'Saskatchewan', patterns: ['saskatchewan'] },
  AB: { fr: 'Alberta', en: 'Alberta', patterns: ['alberta'] },
  BC: { fr: 'Colombie-Britannique', en: 'British Columbia', patterns: ['colombie-britannique', 'colombie britannique', 'british columbia'] },
  YT: { fr: 'Yukon', en: 'Yukon', patterns: ['yukon'] },
  NT: { fr: 'Territoires du Nord-Ouest', en: 'Northwest Territories', patterns: ['territoires du nord-ouest', 'northwest territories'] },
  NU: { fr: 'Nunavut', en: 'Nunavut', patterns: ['nunavut'] },
};

/** Abréviations à 2 lettres reconnues uniquement en majuscules dans le texte d'origine (« Calgary, AB »). */
const UPPER_ABBREVIATIONS: ProvinceCode[] = ['NL', 'PE', 'NS', 'NB', 'QC', 'MB', 'SK', 'AB', 'BC', 'YT', 'NT', 'NU'];

/**
 * Détecte la province d'une offre. Cherche d'abord les noms complets, puis les villes des RMR,
 * puis les abréviations en majuscules (« ON » est ignoré : trop ambigu en anglais).
 */
export function detectProvince(rules: Rules, rawText: string): ProvinceCode | undefined {
  const norm = normalize(rawText);
  for (const [code, p] of Object.entries(PROVINCE_NAMES) as Array<[ProvinceCode, (typeof PROVINCE_NAMES)[ProvinceCode]]>) {
    if (p.patterns.some((pat) => wordMatch(norm, pat))) return code;
  }
  // Villes : recherche sensible à la casse (nom propre) sur le texte sans accents,
  // en ignorant les noms qui sont aussi des mots courants (« Mission », « Delta »…).
  const cased = stripAccents(rawText);
  for (const cma of rules.lmiaLowWage.cmas) {
    const names = [cma.name, ...cma.aliases].filter((n) => !AMBIGUOUS_CITY_NAMES.has(n));
    if (names.some((n) => new RegExp(`(^|[^A-Za-z])${escapeRegExp(stripAccents(n))}($|[^A-Za-z])`).test(cased))) {
      return cma.province;
    }
  }
  for (const code of UPPER_ABBREVIATIONS) {
    if (new RegExp(`(^|[^A-Za-z])${code}($|[^A-Za-z])`).test(rawText)) return code;
  }
  return undefined;
}

/** Retrouve la RMR d'une ville (nom officiel ou alias), en tenant compte de la province si connue. */
export function findCma(rules: Rules, city: string, province?: ProvinceCode): Cma | undefined {
  const c = normalizeCity(city);
  return rules.lmiaLowWage.cmas.find(
    (cma) =>
      (!province || cma.province === province) &&
      [cma.name, ...cma.aliases].some((n) => normalizeCity(n) === c),
  );
}

function normalizeCity(s: string): string {
  return normalize(s).replace(/\bst\.?\s/g, 'saint ').replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Noms de villes trop ambigus pour être détectés dans un texte libre (mots courants ou villes homonymes à l'étranger). */
const AMBIGUOUS_CITY_NAMES = new Set([
  'King', 'Mission', 'Delta', 'Richmond', 'London', 'Paradise', 'Lincoln', 'Cambridge', 'Victoria',
  'Windsor', 'Lakeshore', 'Sidney', 'Dundas', 'Aurora', 'Milton', 'Kingston', 'Guelph', 'Pelham',
  'Waterloo', 'Langley', 'Québec', 'Quebec',
]);

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function wordMatch(norm: string, pattern: string): boolean {
  return new RegExp(`(^|[^a-z])${escapeRegExp(pattern)}($|[^a-z])`).test(norm);
}

/** Pays africains (ISO 3166-1 alpha-2). */
export const AFRICAN_COUNTRIES = new Set([
  'DZ', 'AO', 'BJ', 'BW', 'BF', 'BI', 'CV', 'CM', 'CF', 'TD', 'KM', 'CG', 'CD', 'CI', 'DJ', 'EG',
  'GQ', 'ER', 'SZ', 'ET', 'GA', 'GM', 'GH', 'GN', 'GW', 'KE', 'LS', 'LR', 'LY', 'MG', 'MW', 'ML',
  'MR', 'MU', 'MA', 'MZ', 'NA', 'NE', 'NG', 'RW', 'ST', 'SN', 'SC', 'SL', 'SO', 'ZA', 'SS', 'SD',
  'TZ', 'TG', 'TN', 'UG', 'ZM', 'ZW',
]);

export function isAfrican(countryCode?: string): boolean {
  return !!countryCode && AFRICAN_COUNTRIES.has(countryCode.toUpperCase());
}
