/**
 * Accès commun à l'API officielle d'Adzuna (accès gratuit de base : 25 requêtes par minute, 250 par jour,
 * 1000 par semaine). Clés dans les secrets GitHub ADZUNA_APP_ID et ADZUNA_APP_KEY.
 * Conditions d'affichage : chaque annonce porte la mention « Adzuna » liée à adzuna.ca.
 */
import { normalize, PROVINCE_NAMES, type ProvinceCode } from '../../packages/core/src';
import { USER_AGENT } from './http';

export const ADZUNA_API = 'https://api.adzuna.com/v1/api/jobs/ca/search/';
const PAUSE_MS = 3000; // 25 requêtes par minute au plus : on reste très en dessous

export interface AdzunaJob {
  id?: string; title?: string; description?: string; created?: string; redirect_url?: string;
  salary_min?: number; salary_max?: number; salary_is_predicted?: string | number;
  company?: { display_name?: string }; location?: { display_name?: string; area?: string[] };
}

const provinceByName = new Map<string, ProvinceCode>(
  (Object.entries(PROVINCE_NAMES) as Array<[ProvinceCode, { fr: string; en: string }]>).flatMap(([c, p]) => [[normalize(p.en), c], [normalize(p.fr), c]]),
);
/** L'API renvoie parfois des balises <strong> autour des mots trouvés. */
export const clean = (s = '') => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
export const provinceOf = (j: AdzunaJob) => (j.location?.area ?? []).map((a) => provinceByName.get(normalize(a))).find(Boolean);

/** Champs communs d'une annonce, prêts à publier. */
export function baseOffer(j: AdzunaJob) {
  return {
    id: j.id!,
    title: clean(j.title),
    company: clean(j.company?.display_name),
    location: clean(j.location?.display_name),
    province: provinceOf(j),
    date: (j.created ?? '').slice(0, 10),
    salaryMin: typeof j.salary_min === 'number' ? j.salary_min : null,
    salaryMax: typeof j.salary_max === 'number' ? j.salary_max : null,
    salaryPredicted: String(j.salary_is_predicted) === '1',
    url: j.redirect_url!,
  };
}

export function adzunaKeys(): { id: string; key: string } | undefined {
  const id = process.env.ADZUNA_APP_ID?.trim();
  const key = process.env.ADZUNA_APP_KEY?.trim();
  return id && key ? { id, key } : undefined;
}

/** Client avec pause entre deux appels et compteur de requêtes. */
export function adzunaClient(keys: { id: string; key: string }) {
  let count = 0;
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  return {
    get count() { return count; },
    async search(params: Record<string, string>): Promise<{ results: AdzunaJob[]; total: number }> {
      const q = new URLSearchParams({ app_id: keys.id, app_key: keys.key, sort_by: 'date', 'content-type': 'application/json', ...params });
      if (count) await sleep(PAUSE_MS);
      count++;
      const res = await fetch(`${ADZUNA_API}1?${q}`, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } });
      if (!res.ok) throw new Error(`Adzuna : HTTP ${res.status} (${params.what ?? params.what_phrase ?? ''})`);
      const body = (await res.json()) as { results?: AdzunaJob[]; count?: number };
      return { results: body.results ?? [], total: body.count ?? 0 };
    },
  };
}
