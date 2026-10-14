/**
 * Offres ouvertes aux candidats de l'étranger, via l'API officielle d'Adzuna (accès gratuit de base :
 * 250 requêtes par jour, 1000 par semaine ; affichage autorisé avec la mention « Adzuna » liée au site).
 * Clés dans les secrets GitHub ADZUNA_APP_ID et ADZUNA_APP_KEY ; sans clés, l'étape est sautée.
 *
 * Méthode (après diagnostic du 15 oct. 2026) : l'API ne renvoie que le DÉBUT de chaque annonce, où la mention
 * « LMIA » ou « sponsorship » apparaît rarement. On demande donc à Adzuna des EXPRESSIONS EXACTES
 * (« lmia approved », « visa sponsorship »…), qu'il cherche dans l'annonce complète :
 * - tous métiers confondus (le métier est déduit du titre quand c'est possible) ;
 * - puis, pour chaque métier suivi, « métier + lmia / eimt / sponsorship ».
 * VériJob relit ensuite le titre + l'extrait : une annonce qui exige d'être déjà au Canada est écartée ;
 * si la phrase de preuve est dans l'extrait, elle est affichée, sinon l'appli indique l'expression trouvée
 * par Adzuna dans l'annonce complète (à vérifier en ouvrant l'offre). Contrôle anti-arnaque sur chaque annonce.
 *
 * Produit : apps/pwa/public/data/international-offers.json (+ international-diagnostic.json)
 */
import {
  analyzeOffer, classifyInternational, detectNocInText, normalize, PROVINCE_NAMES,
  type InternationalOffer, type NocData, type ProvinceCode, type Rules,
} from '../packages/core/src';
import { USER_AGENT } from './lib/http';
import { writeDataFile, type WrittenFile } from './lib/output';

const API = 'https://api.adzuna.com/v1/api/jobs/ca/search/';
/** Expressions exactes du recrutement international (cherchées par Adzuna dans l'annonce complète). */
const PHRASES = ['lmia approved', 'positive lmia', 'lmia', 'eimt', 'visa sponsorship', 'sponsorship available', 'international applicants', 'temporary foreign worker'];
/** Pour chaque métier suivi : au moins un de ces mots en plus du métier. */
const NOC_WORDS = 'lmia eimt sponsorship';
const MAX_DAYS_OLD = 45;
const PER_PAGE = 50;
const PAUSE_MS = 3000; // 25 requêtes par minute au plus : on reste très en dessous

interface AdzunaJob {
  id?: string; title?: string; description?: string; created?: string; redirect_url?: string;
  salary_min?: number; salary_max?: number; salary_is_predicted?: string | number;
  company?: { display_name?: string }; location?: { display_name?: string; area?: string[] };
}

const provinceByName = new Map<string, ProvinceCode>(
  (Object.entries(PROVINCE_NAMES) as Array<[ProvinceCode, { fr: string; en: string }]>).flatMap(([c, p]) => [[normalize(p.en), c], [normalize(p.fr), c]]),
);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** L'API renvoie parfois des balises <strong> autour des mots trouvés. */
const clean = (s = '') => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

export interface InternationalStats { queries: number; seen: number; kept: number; closed: number; skipped?: string; file?: WrittenFile }

export async function fetchInternational(rules: Rules, nocData: NocData): Promise<InternationalStats> {
  console.log('▶ Offres ouvertes aux candidats de l’étranger (API Adzuna)');
  const id = process.env.ADZUNA_APP_ID?.trim();
  const key = process.env.ADZUNA_APP_KEY?.trim();
  if (!id || !key) {
    console.log('  (clés ADZUNA_APP_ID / ADZUNA_APP_KEY absentes : étape sautée)');
    return { queries: 0, seen: 0, kept: 0, closed: 0, skipped: 'clés absentes' };
  }
  const offers = new Map<string, InternationalOffer>();
  const rejected = new Set<string>();
  const diag: Array<{ query: string; total: number; results: number; kept: number; closed: number }> = [];
  let queries = 0, seen = 0, closed = 0;

  const search = async (label: string, params: Record<string, string>, matched: string, noc?: string) => {
    const q = new URLSearchParams({
      app_id: id, app_key: key, max_days_old: String(MAX_DAYS_OLD), sort_by: 'date',
      results_per_page: String(PER_PAGE), 'content-type': 'application/json', ...params,
    });
    if (queries) await sleep(PAUSE_MS);
    queries++;
    const res = await fetch(`${API}1?${q}`, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } });
    if (!res.ok) throw new Error(`Adzuna : HTTP ${res.status} pour « ${label} »`);
    const body = (await res.json()) as { results?: AdzunaJob[]; count?: number };
    const stat = { query: label, total: body.count ?? 0, results: body.results?.length ?? 0, kept: 0, closed: 0 };
    diag.push(stat);
    for (const j of body.results ?? []) {
      seen++;
      if (!j.id || !j.redirect_url || rejected.has(j.id)) continue;
      const title = clean(j.title), snippet = clean(j.description);
      const text = `${title}.\n${snippet}`;
      const verdict = classifyInternational(text);
      if (verdict.status === 'ferme') { closed++; stat.closed++; rejected.add(j.id); offers.delete(j.id); continue; }
      const existing = offers.get(j.id);
      if (existing) { if (!existing.matched.includes(matched)) existing.matched.push(matched); continue; }
      const area = j.location?.area ?? [];
      offers.set(j.id, {
        id: j.id,
        title,
        company: clean(j.company?.display_name),
        location: clean(j.location?.display_name),
        province: area.map((a) => provinceByName.get(normalize(a))).find(Boolean),
        date: (j.created ?? '').slice(0, 10),
        salaryMin: typeof j.salary_min === 'number' ? j.salary_min : null,
        salaryMax: typeof j.salary_max === 'number' ? j.salary_max : null,
        salaryPredicted: String(j.salary_is_predicted) === '1',
        url: j.redirect_url,
        noc: noc ?? detectNocInText(nocData, normalize(title))?.code ?? '',
        snippet,
        evidence: verdict.evidence,
        matched: [matched],
        caution: verdict.caution,
        scam: analyzeOffer(text, { rules, nocData }).signals.map((s) => s.id),
      });
      stat.kept++;
    }
  };

  for (const p of PHRASES) await search(`« ${p} »`, { what_phrase: p }, p);
  for (const n of nocData.nocs) {
    const what = (n.jobEn ?? n.titleEn).split(/[(/]/)[0]!.trim(); // Adzuna exige tous les mots de « what »
    await search(`${what} + (${NOC_WORDS})`, { what, what_or: NOC_WORDS }, 'lmia / eimt / sponsorship', n.code);
  }

  const list = [...offers.values()].sort((a, b) => b.date.localeCompare(a.date));
  const file = writeDataFile(
    'international-offers.json',
    {
      name: 'Offres ouvertes aux candidats de l’étranger (tri VériJob sur les annonces Adzuna)',
      publisher: 'Adzuna (annonces) — tri et contrôle anti-arnaque par VériJob',
      url: 'https://www.adzuna.ca/',
      licence: 'Conditions de l’API Adzuna : affichage avec la mention « Adzuna » liée à adzuna.ca',
    },
    list.length,
    list,
  );
  writeDataFile(
    'international-diagnostic.json',
    { name: 'Diagnostic du tri des offres internationales', publisher: 'VériJob', url: 'https://www.adzuna.ca/', licence: 'Compteurs seulement' },
    diag.length,
    diag,
  );
  console.log(`  ${queries} requêtes, ${seen} annonces lues, ${list.length} gardées, ${closed} écartées (Canada exigé)`);
  return { queries, seen, kept: list.length, closed, file };
}
