/**
 * Accès aux données. Les règles (rules.json, noc.json) sont incluses dans l'appli ;
 * les fichiers produits par le pipeline sont chargés à la demande depuis ./data/
 * puis gardés en cache par le service worker (hors ligne).
 */
import rulesJson from '../../../data/rules.json';
import nocJson from '../../../data/noc.json';
import {
  filterNews, makeWageLookup, parseExpressEntryRounds,
  type CmaLookup, type ExpressEntryData, type AfricanRecruiter, type InternationalOffer, type NewsItem, type NocData, type PermitsData, type PostingsData, type Prospect, type RawRound, type Rules, type WageLookup, type WagesData,
} from '@verijob/core';

export const rules = rulesJson as unknown as Rules;
export const nocData = nocJson as unknown as NocData;

interface DataFile<T> {
  source: { name: string; publisher: string; url: string; licence: string; files?: string[]; window?: string[] };
  fetchedAt: string;
  recordCount: number;
  data: T;
}

/** [trimestre, volet, CNP, nb d'EIMT, nb de postes] */
export type LmiaEntry = [string, string, string, number, number];
export interface EmployerRecord {
  n: string; k: string; c: string; pc: string; g: string; p: LmiaEntry[]; x: LmiaEntry[];
  /** Ajouté à la lecture : province du fichier. */
  prov?: string;
}
export interface EmployersIndex {
  quarters: Array<{ quarter: string; positive: string | null; negative: string | null }>;
  provinces: Record<string, { file: string; records: number }>;
  streams: Record<string, { fr: string; en: string }>;
  nocTitles: Record<string, string>;
  datasets: { positive: string; negative: string };
}
export interface DesignatedEmployer {
  community: string; province: string; program: 'RCIP' | 'FCIP'; employer: string; k: string;
  sector: string; nocs: string[]; hiring: 'recrute' | 'ne-recrute-pas' | 'inconnu' | 'retire';
  address: string; sourceUrl: string; recordedAt: string;
}

const memo = new Map<string, Promise<unknown>>();

/** Charge un fichier de ./data/ une seule fois par session. */
function load<T>(file: string): Promise<DataFile<T>> {
  if (!memo.has(file)) {
    const p = fetch(`./data/${file}`).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status} pour ${file}`);
      return r.json();
    });
    p.catch(() => memo.delete(file)); // nouvel essai possible plus tard
    memo.set(file, p);
  }
  return memo.get(file) as Promise<DataFile<T>>;
}

export const loadEmployersIndex = () => load<EmployersIndex>('employers-index.json');
export const loadDesignated = () => load<DesignatedEmployer[]>('designated-employers.json');
export const loadCmaLookup = () => load<CmaLookup>('cma-lookup.json');
export const loadProspects = () => load<Prospect[]>('prospects.json');
export interface CommunityPriority { community: string; program: 'RCIP' | 'FCIP'; noc: string; title: string; year: string; sourceUrl: string; recordedAt: string; notes?: string }
export const loadPriorities = () => load<CommunityPriority[]>('community-priorities.json');

export const loadExpressEntry = () => load<ExpressEntryData>('express-entry.json');
export const loadPostings = () => load<PostingsData>('postings.json');
export const loadAfricanRecruiters = () => load<AfricanRecruiter[]>('african-recruiters.json');
export const loadPermits = () => load<PermitsData>('permits-africa.json');
export const loadInternationalOffers = () => load<InternationalOffer[]>('international-offers.json');

// ---------------------------------------------------------------------------
// Lecture EN DIRECT des fichiers officiels (canada.ca autorise la lecture depuis un navigateur).
// Le service worker garde la dernière réponse pour la consultation hors ligne.
// ---------------------------------------------------------------------------

async function getJson(url: string): Promise<unknown> {
  const r = await fetch(url, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

/** Actualités d'IRCC utiles à la recherche d'emploi (fil officiel, filtré par les mots de rules.json). */
export async function fetchLiveNews(lang: 'fr' | 'en'): Promise<NewsItem[]> {
  return filterNews(rules, await getJson(rules.liveNews.url[lang]));
}

/** Rondes Entrée express lues directement sur canada.ca (fichier d'environ 800 Ko). */
export async function fetchLiveRounds(lang: 'fr' | 'en'): Promise<ExpressEntryData> {
  const file = (await getJson(rules.expressEntry.roundsJson[lang])) as { rounds?: RawRound[] };
  const data = parseExpressEntryRounds(rules, { [lang]: file });
  if (!data.rounds.length) throw new Error('Fichier officiel illisible');
  return data;
}

export async function loadEmployers(province: string): Promise<EmployerRecord[]> {
  const f = await load<EmployerRecord[]>(`employers-${province}.json`);
  for (const r of f.data) r.prov = province;
  return f.data;
}

let wageLookup: WageLookup | undefined;
/** Salaires médians (pour la règle « salaire irréaliste ») ; undefined si non disponibles. */
export async function getWageLookup(): Promise<WageLookup | undefined> {
  if (wageLookup) return wageLookup;
  try {
    wageLookup = makeWageLookup((await load<WagesData>('wages.json')).data);
  } catch {
    wageLookup = undefined; // la règle se rabat sur les seuils provinciaux
  }
  return wageLookup;
}
