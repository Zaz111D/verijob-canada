/**
 * Offres récentes, TOUS métiers, dans les villes et régions qui peinent à recruter (onglet « Régions ») :
 * pilotes PICR / PICRF, programme REDI de l'Ontario (Kenora…), régions du Québec hors Montréal et Laval.
 *
 * Une requête Adzuna par ville (rules.regions.places[].towns, rayon 30 km, 30 derniers jours). On ne garde que les
 * annonces dont le lieu appartient bien à une région de la liste (même province, nom de ville ou de région) :
 * si Adzuna ne connaît pas la ville, il peut renvoyer des annonces d'ailleurs.
 * Contrôle anti-arnaque sur chaque annonce ; métier suivi reconnu dans le titre quand c'est possible.
 *
 * Produit : apps/pwa/public/data/region-offers.json
 */
import { analyzeOffer, detectNocInText, normalize, placeOf, type NocData, type RegionOffer, type Rules } from '../packages/core/src';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { adzunaClient, adzunaKeys, baseOffer, clean, type AdzunaJob } from './lib/adzuna';
import { OUT_DIR } from './lib/paths';
import { writeDataFile, type WrittenFile } from './lib/output';

const MAX_DAYS_OLD = 30;
const PER_PAGE = 50;
const DISTANCE_KM = 30;
/** Au plus, par région (les plus récentes) : le fichier reste léger sur un téléphone. */
const MAX_PER_PLACE = 60;
const SNIPPET = 220;

export interface RegionOffersStats { queries: number; seen: number; kept: number; skipped?: string; file?: WrittenFile }

/** Requêtes : « kenora:Dryden ». */
export function regionQueryKeys(rules: Rules): string[] {
  return rules.regions.places.flatMap((p) => p.towns.map((t) => `${p.id}:${t}`));
}

/** Annonce Adzuna → offre publiée, ou null si son lieu n'est dans aucune région de la liste. */
export function toRegionOffer(j: AdzunaJob, ctx: { rules: Rules; nocData: NocData; intlIds: Set<string> }): RegionOffer | null {
  if (!j.id || !j.redirect_url) return null;
  const base = baseOffer(j);
  const where = [base.location, ...(j.location?.area ?? []).slice(2)].join(', ');
  const place = base.province && placeOf(ctx.rules, where, base.province);
  if (!place) return null;
  const snippet = clean(j.description);
  const signals = analyzeOffer(`${base.title}.\n${snippet}`, { rules: ctx.rules, nocData: ctx.nocData }).signals;
  const noc = detectNocInText(ctx.nocData, normalize(base.title))?.code;
  return {
    ...base,
    place: place.id,
    ...(noc ? { noc } : {}),
    snippet: snippet.length > SNIPPET ? `${snippet.slice(0, SNIPPET - 1).replace(/\s+\S*$/, '')}…` : snippet,
    scam: signals.map((s) => s.id),
    ...(signals.length ? { scamWhy: signals.map((s) => (s.evidence[0] ?? '').slice(0, 160)) } : {}),
    ...(ctx.intlIds.has(j.id) ? { intl: true as const } : {}),
  };
}

/** Garde les plus récentes de chaque région. */
export function capPerPlace(offers: RegionOffer[], max = MAX_PER_PLACE): RegionOffer[] {
  const count = new Map<string, number>();
  return [...offers].sort((a, b) => b.date.localeCompare(a.date)).filter((o) => {
    const n = (count.get(o.place) ?? 0) + 1;
    count.set(o.place, n);
    return n <= max;
  });
}

/**
 * @param opts.onlyKeys  n'exécuter que ces requêtes (villes ajoutées depuis la dernière mise à jour) ;
 * @param opts.base      offres déjà publiées à garder.
 */
export async function fetchRegionOffers(
  rules: Rules, nocData: NocData,
  opts: { onlyKeys?: string[]; base?: { offers: RegionOffer[]; keys: string[] } } = {},
): Promise<RegionOffersStats> {
  console.log('▶ Offres des villes en région (tous métiers, API Adzuna)');
  const keys = adzunaKeys();
  if (!keys) {
    console.log('  (clés ADZUNA_APP_ID / ADZUNA_APP_KEY absentes : étape sautée)');
    return { queries: 0, seen: 0, kept: 0, skipped: 'clés absentes' };
  }
  const intlPath = join(OUT_DIR, 'international-offers.json');
  const intlIds = new Set<string>(existsSync(intlPath) ? (JSON.parse(readFileSync(intlPath, 'utf8')).data as Array<{ id: string }>).map((o) => o.id) : []);
  const api = adzunaClient(keys);
  const offers = new Map<string, RegionOffer>((opts.base?.offers ?? []).map((o) => [o.id, o]));
  let seen = 0;
  const wanted = opts.onlyKeys ?? regionQueryKeys(rules);
  for (const key of wanted) {
    const town = key.slice(key.indexOf(':') + 1);
    const { results } = await api.search({ where: town, distance: String(DISTANCE_KM), max_days_old: String(MAX_DAYS_OLD), results_per_page: String(PER_PAGE) });
    seen += results.length;
    for (const j of results) {
      const o = toRegionOffer(j, { rules, nocData, intlIds });
      if (o && !offers.has(o.id)) offers.set(o.id, o);
    }
  }
  const list = capPerPlace([...offers.values()]);
  const file = writeDataFile('region-offers.json', {
    name: 'Offres récentes dans les villes en région (annonces Adzuna, lien direct)',
    publisher: 'Adzuna (annonces) — tri par région et contrôle anti-arnaque par VériJob',
    url: 'https://www.adzuna.ca/',
    licence: 'Conditions de l’API Adzuna : affichage avec la mention « Adzuna » liée à adzuna.ca',
    // Villes déjà interrogées : une ville ajoutée plus tard sera interrogée dès l'envoi de code suivant.
    keys: [...new Set([...(opts.base?.keys ?? []), ...wanted])].sort(),
  }, list.length, list);
  console.log(`  ${api.count} requêtes, ${seen} annonces lues, ${list.length} gardées (lieu dans une région de la liste)`);
  return { queries: api.count, seen, kept: list.length, file };
}
