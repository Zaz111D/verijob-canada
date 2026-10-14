/**
 * Offres ouvertes aux candidats de l'étranger, via l'API officielle d'Adzuna (accès gratuit de base :
 * 250 requêtes par jour, 1000 par semaine ; affichage autorisé avec la mention « Adzuna » liée au site).
 * Clés dans les secrets GitHub ADZUNA_APP_ID et ADZUNA_APP_KEY ; sans clés, l'étape est sautée.
 *
 * Pour chaque métier de data/noc.json : offres canadiennes des 45 derniers jours qui contiennent le métier ET
 * au moins un mot du recrutement international ; puis tri par VériJob (classifyInternational) et contrôle
 * anti-arnaque (analyzeOffer) sur le titre + l'extrait. Seules les offres « ouvertes » sont publiées.
 *
 * Produit : apps/pwa/public/data/international-offers.json
 */
import {
  analyzeOffer, classifyInternational, normalize, PROVINCE_NAMES,
  type InternationalOffer, type NocData, type ProvinceCode, type Rules,
} from '../packages/core/src';
import { USER_AGENT } from './lib/http';
import { writeDataFile, type WrittenFile } from './lib/output';

const API = 'https://api.adzuna.com/v1/api/jobs/ca/search/1';
/** Mots du recrutement international (au moins un doit figurer dans l'offre). */
const INTERNATIONAL_WORDS = 'lmia eimt sponsorship sponsor visa international foreign immigration';
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
  let queries = 0, seen = 0, closed = 0;
  // Diagnostic publié avec les données : volume par métier et exemples d'extraits non reconnus.
  const perNoc: Array<{ noc: string; what: string; total: number; results: number; open: number; closed: number; unknown: number }> = [];
  const samples: Array<{ noc: string; title: string; snippet: string }> = [];
  for (const n of nocData.nocs) {
    // Mot-clé simple : partie avant « ( » ou « / » (Adzuna exige tous les mots de « what »).
    const what = (n.jobEn ?? n.titleEn).split(/[(/]/)[0]!.trim();
    const stat = { noc: n.code, what, total: 0, results: 0, open: 0, closed: 0, unknown: 0 };
    perNoc.push(stat);
    const params = new URLSearchParams({
      app_id: id, app_key: key, what, what_or: INTERNATIONAL_WORDS, max_days_old: String(MAX_DAYS_OLD),
      sort_by: 'date', results_per_page: String(PER_PAGE), 'content-type': 'application/json',
    });
    if (queries) await sleep(PAUSE_MS);
    queries++;
    const res = await fetch(`${API}?${params}`, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } });
    if (!res.ok) throw new Error(`Adzuna : HTTP ${res.status} pour « ${what} »`);
    const body = (await res.json()) as { results?: AdzunaJob[]; count?: number };
    const results = body.results ?? [];
    stat.total = body.count ?? 0;
    stat.results = results.length;
    for (const j of results) {
      seen++;
      if (!j.id || !j.redirect_url || offers.has(j.id)) continue;
      const title = clean(j.title), snippet = clean(j.description);
      const text = `${title}.\n${snippet}`;
      const verdict = classifyInternational(text);
      if (verdict.status === 'ferme') { closed++; stat.closed++; }
      if (verdict.status === 'inconnu') {
        stat.unknown++;
        if (samples.filter((x) => x.noc === n.code).length < 2) samples.push({ noc: n.code, title, snippet });
      }
      if (verdict.status !== 'ouvert') continue;
      stat.open++;
      const area = j.location?.area ?? [];
      const scam = analyzeOffer(text, { rules, nocData }).signals.map((s) => s.id);
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
        noc: n.code,
        snippet,
        evidence: verdict.evidence,
        caution: verdict.caution,
        scam,
      });
    }
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
  console.log(`  ${queries} requêtes, ${seen} annonces lues, ${list.length} ouvertes à l'international, ${closed} écartées (Canada exigé)`);
  writeDataFile(
    'international-diagnostic.json',
    { name: 'Diagnostic du tri des offres internationales', publisher: 'VériJob', url: 'https://www.adzuna.ca/', licence: 'Extraits d’annonces Adzuna' },
    perNoc.length,
    { perNoc, samples },
  );
  return { queries, seen, kept: list.length, closed, file };
}
