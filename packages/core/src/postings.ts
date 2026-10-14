/**
 * Offres récentes du Guichet-Emplois, d'après les DONNÉES OUVERTES officielles
 * (« Offres d'emploi affichées sur le Guichet-Emplois », open.canada.ca, publiées chaque mois).
 *
 * Ce jeu de données donne, pour chaque offre : intitulé, métier (CNP), date de publication, ville,
 * salaire, études et expérience demandées, type de contrat, langue. Il NE donne PAS le nom de
 * l'employeur, ni le lien, ni la description, ni si l'offre est ouverte aux candidats étrangers :
 * l'appli le dit clairement et propose de retrouver l'offre sur le Guichet-Emplois.
 */
import type { Localized, ProvinceCode } from './types';

export type Education = 'aucun' | 'secondaire' | 'metier' | 'college' | 'universite' | 'autre';
export type Experience = '0' | '1-6m' | '7-11m' | '1-2a' | '2-3a' | '3-5a' | '5a+';
export type SalaryPer = 'h' | 'jour' | 'sem' | '2sem' | 'mois' | 'an';
export type Term = 'perm' | 'saison' | 'contrat' | 'occasionnel';
export type EmploymentType = 'plein' | 'partiel' | 'partiel-plein';
export type PostingLang = 'en' | 'fr' | 'en-fr' | 'bil';

/**
 * Offre compacte (tableau pour alléger le fichier) :
 * [CNP, intitulé, date AAAA-MM-JJ, province, ville, RMR (nom, « - » hors RMR, « ? » inconnue),
 *  salaire min, salaire max, unité, études, expérience, type, contrat, langue, postes, publiée directement sur le Guichet-Emplois (1/0)]
 */
export type PostingRow = [
  string, string, string, ProvinceCode, string, string,
  number | null, number | null, SalaryPer | null, Education | null, Experience | null,
  EmploymentType | null, Term | null, PostingLang | null, number, 0 | 1,
];

/** Statistiques d'un métier dans une province, pour le mois publié. */
export interface PostingStats {
  /** Nombre d'offres. */
  n: number;
  /** Nombre de postes. */
  vac: number;
  /** Salaire horaire médian proposé (minimum de la fourchette), si connu. */
  medHourly: number | null;
  /** Part des offres (où l'information existe) sans diplôme exigé / sans expérience exigée, en %. */
  noDegreePct: number | null;
  noExpPct: number | null;
  /** Part des offres saisonnières, en %. */
  seasonalPct: number;
}

export interface PostingsData {
  /** Mois couvert, AAAA-MM. */
  month: string;
  stats: Record<string, Partial<Record<ProvinceCode, PostingStats>>>;
  recent: PostingRow[];
}

// ---------------------------------------------------------------------------
// Libellés (FR / EN) des valeurs du jeu de données
// ---------------------------------------------------------------------------

export const EDUCATION_LABEL: Record<Education, Localized> = {
  aucun: { fr: 'Aucun diplôme exigé', en: 'No degree required' },
  secondaire: { fr: 'Diplôme d’études secondaires', en: 'High school diploma' },
  metier: { fr: 'Certificat de métier', en: 'Trades certificate' },
  college: { fr: 'Diplôme collégial', en: 'College diploma' },
  universite: { fr: 'Diplôme universitaire', en: 'University degree' },
  autre: { fr: 'Autre formation', en: 'Other education' },
};
export const EXPERIENCE_LABEL: Record<Experience, Localized> = {
  '0': { fr: 'Aucune expérience exigée', en: 'No experience required' },
  '1-6m': { fr: '1 à 6 mois d’expérience', en: '1 to 6 months of experience' },
  '7-11m': { fr: '7 à 11 mois d’expérience', en: '7 to 11 months of experience' },
  '1-2a': { fr: '1 à 2 ans d’expérience', en: '1 to 2 years of experience' },
  '2-3a': { fr: '2 à 3 ans d’expérience', en: '2 to 3 years of experience' },
  '3-5a': { fr: '3 à 5 ans d’expérience', en: '3 to 5 years of experience' },
  '5a+': { fr: '5 ans d’expérience ou plus', en: '5 years of experience or more' },
};
export const TERM_LABEL: Record<Term, Localized> = {
  perm: { fr: 'Permanent', en: 'Permanent' },
  saison: { fr: 'Saisonnier', en: 'Seasonal' },
  contrat: { fr: 'Contrat', en: 'Contract' },
  occasionnel: { fr: 'Occasionnel', en: 'Casual' },
};
export const TYPE_LABEL: Record<EmploymentType, Localized> = {
  plein: { fr: 'Temps plein', en: 'Full time' },
  partiel: { fr: 'Temps partiel', en: 'Part time' },
  'partiel-plein': { fr: 'Temps partiel puis plein', en: 'Part time leading to full time' },
};
export const POSTING_LANG_LABEL: Record<PostingLang, Localized> = {
  en: { fr: 'Anglais', en: 'English' },
  fr: { fr: 'Français', en: 'French' },
  'en-fr': { fr: 'Anglais ou français', en: 'English or French' },
  bil: { fr: 'Bilingue', en: 'Bilingual' },
};
const PER_LABEL: Record<SalaryPer, Localized> = {
  h: { fr: '/h', en: '/h' }, jour: { fr: '/jour', en: '/day' }, sem: { fr: '/semaine', en: '/week' },
  '2sem': { fr: '/2 semaines', en: '/2 weeks' }, mois: { fr: '/mois', en: '/month' }, an: { fr: '/an', en: '/year' },
};

// ---------------------------------------------------------------------------
// Conversion des valeurs brutes (utilisée par le pipeline)
// ---------------------------------------------------------------------------

export function parseEducation(v: string): Education | null {
  const s = v.toLowerCase();
  if (!s || s === 'na') return null;
  if (s.startsWith('no degree')) return 'aucun';
  if (s.startsWith('secondary')) return 'secondaire';
  if (s.includes('trades') || s.includes('apprenticeship')) return 'metier';
  if (s.startsWith('college')) return 'college';
  if (s.includes('bachelor') || s.includes('master') || s.includes('university') || s.includes('doctorate')) return 'universite';
  return 'autre';
}
export function parseExperience(v: string): Experience | null {
  const s = v.toLowerCase();
  if (s.startsWith('no experience')) return '0';
  if (s.startsWith('1 to less than 7')) return '1-6m';
  if (s.startsWith('7 months')) return '7-11m';
  if (s.startsWith('1 year')) return '1-2a';
  if (s.startsWith('2 years')) return '2-3a';
  if (s.startsWith('3 years')) return '3-5a';
  if (s.startsWith('5 years')) return '5a+';
  return null;
}
export function parseSalaryPer(v: string): SalaryPer | null {
  return ({ hour: 'h', day: 'jour', week: 'sem', 'bi-weekly': '2sem', month: 'mois', year: 'an' } as Record<string, SalaryPer>)[v.toLowerCase()] ?? null;
}
export function parseTerm(v: string): Term | null {
  const s = v.toLowerCase();
  if (s.startsWith('permanent')) return 'perm';
  if (s.startsWith('seasonal')) return 'saison';
  if (s.startsWith('term')) return 'contrat';
  if (s.startsWith('casual')) return 'occasionnel';
  return null;
}
export function parseEmploymentType(v: string): EmploymentType | null {
  const s = v.toLowerCase();
  if (s.startsWith('part time leading')) return 'partiel-plein';
  if (s.startsWith('part time')) return 'partiel';
  if (s.startsWith('full time')) return 'plein';
  return null;
}
export function parsePostingLang(v: string): PostingLang | null {
  return ({ english: 'en', french: 'fr', 'english or french': 'en-fr', bilingual: 'bil' } as Record<string, PostingLang>)[v.toLowerCase()] ?? null;
}

/** Heures par unité de salaire (pour comparer en taux horaire ; semaine de 40 h). */
const HOURS: Record<SalaryPer, number> = { h: 1, jour: 8, sem: 40, '2sem': 80, mois: 2080 / 12, an: 2080 };

export function hourlyOf(amount: number | null, per: SalaryPer | null): number | null {
  if (amount === null || !per || !Number.isFinite(amount) || amount <= 0) return null;
  return Math.round((amount / HOURS[per]) * 100) / 100;
}

/** Statistiques d'un ensemble d'offres (même métier, même province). */
export function computeStats(rows: PostingRow[]): PostingStats {
  const hourly = rows.map((r) => hourlyOf(r[6], r[8])).filter((x): x is number => x !== null).sort((a, b) => a - b);
  const withEdu = rows.filter((r) => r[9] !== null);
  const withExp = rows.filter((r) => r[10] !== null);
  const pct = (a: number, b: number) => (b ? Math.round((100 * a) / b) : null);
  return {
    n: rows.length,
    vac: rows.reduce((s, r) => s + r[14], 0),
    medHourly: hourly.length ? hourly[Math.floor((hourly.length - 1) / 2)]! : null,
    noDegreePct: pct(withEdu.filter((r) => r[9] === 'aucun').length, withEdu.length),
    noExpPct: pct(withExp.filter((r) => r[10] === '0').length, withExp.length),
    seasonalPct: pct(rows.filter((r) => r[12] === 'saison').length, rows.length) ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Utilisation par l'appli
// ---------------------------------------------------------------------------

export interface PostingView {
  noc: string;
  title: string;
  date: string;
  province: ProvinceCode;
  city: string;
  /** Situation par rapport aux RMR : nom de la RMR, « - » hors RMR, « ? » inconnue. */
  cma: string;
  salary: Localized | null;
  education: Education | null;
  experience: Experience | null;
  type: EmploymentType | null;
  term: Term | null;
  lang: PostingLang | null;
  vacancies: number;
  direct: boolean;
}

function money(n: number, lang: 'fr' | 'en'): string {
  return lang === 'fr'
    ? `${n.toLocaleString('fr-CA', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })} $`
    : `$${n.toLocaleString('en-CA', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
}

export function salaryLabel(min: number | null, max: number | null, per: SalaryPer | null): Localized | null {
  if (min === null || !per) return null;
  const f = (l: 'fr' | 'en') => `${money(min, l)}${max && max > min ? ` – ${money(max, l)}` : ''}${PER_LABEL[per][l]}`;
  return { fr: f('fr'), en: f('en') };
}

/** Offres récentes d'un métier, filtrées par provinces (toutes si la liste est vide), les plus récentes d'abord. */
export function recentPostings(data: PostingsData, noc: string, provinces: ProvinceCode[] = [], limit = 10): PostingView[] {
  return data.recent
    .filter((r) => r[0] === noc && (!provinces.length || provinces.includes(r[3])))
    .sort((a, b) => b[2].localeCompare(a[2]) || b[15] - a[15])
    .slice(0, limit)
    .map((r) => ({
      noc: r[0], title: r[1], date: r[2], province: r[3], city: r[4], cma: r[5],
      salary: salaryLabel(r[6], r[7], r[8]), education: r[9], experience: r[10], type: r[11], term: r[12], lang: r[13],
      vacancies: r[14], direct: r[15] === 1,
    }));
}
