/**
 * Offres ACTUELLES des métiers suivis, avec un lien direct vers chaque annonce (API Adzuna).
 * Remplace la liste tirée des données ouvertes du Guichet-Emplois, qui n'ont ni lien ni numéro d'offre
 * (vérifié le 16 oct. 2026) et portent sur le mois précédent ; celles-ci restent affichées comme statistiques.
 *
 * Une requête par métier (≈ 21 par semaine), annonces des 21 derniers jours. On ne garde que les annonces
 * dont le TITRE correspond bien au métier (Adzuna trouve le mot n'importe où dans l'annonce).
 * Contrôle anti-arnaque sur chaque annonce ; marque celles déjà reconnues « ouvertes à l'étranger ».
 *
 * Produit : apps/pwa/public/data/current-offers.json
 */
import { analyzeOffer, detectNocInText, normalize, type CurrentOffer, type NocData, type Rules } from '../packages/core/src';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { adzunaClient, adzunaKeys, baseOffer, clean, type AdzunaJob } from './lib/adzuna';
import { OUT_DIR } from './lib/paths';
import { writeDataFile, type WrittenFile } from './lib/output';

const MAX_DAYS_OLD = 21;
const PER_PAGE = 50;
const SNIPPET = 220;

export interface CurrentOffersStats { queries: number; seen: number; kept: number; skipped?: string; file?: WrittenFile }

/** Annonce Adzuna → offre publiée, ou null si le titre ne correspond pas au métier demandé. */
export function toCurrentOffer(j: AdzunaJob, noc: string, ctx: { rules: Rules; nocData: NocData; intlIds: Set<string> }): CurrentOffer | null {
  if (!j.id || !j.redirect_url) return null;
  const title = clean(j.title);
  if (detectNocInText(ctx.nocData, normalize(title))?.code !== noc) return null;
  const snippet = clean(j.description);
  return {
    ...baseOffer(j),
    noc,
    snippet: snippet.length > SNIPPET ? `${snippet.slice(0, SNIPPET - 1).replace(/\s+\S*$/, '')}…` : snippet,
    scam: analyzeOffer(`${title}.\n${snippet}`, { rules: ctx.rules, nocData: ctx.nocData }).signals.map((s) => s.id),
    ...(ctx.intlIds.has(j.id) ? { intl: true as const } : {}),
  };
}

/**
 * @param opts.onlyNocs  n'interroger que ces métiers (ex. métiers ajoutés depuis la dernière mise à jour) ;
 * @param opts.base      offres déjà publiées à garder (complétées par les nouveaux métiers).
 */
export async function fetchCurrentOffers(
  rules: Rules, nocData: NocData,
  opts: { onlyNocs?: string[]; base?: { offers: CurrentOffer[]; nocs: string[] } } = {},
): Promise<CurrentOffersStats> {
  console.log('▶ Offres actuelles des métiers suivis, avec lien direct (API Adzuna)');
  const keys = adzunaKeys();
  if (!keys) {
    console.log('  (clés ADZUNA_APP_ID / ADZUNA_APP_KEY absentes : étape sautée)');
    return { queries: 0, seen: 0, kept: 0, skipped: 'clés absentes' };
  }
  const intlPath = join(OUT_DIR, 'international-offers.json');
  const intlIds = new Set<string>(existsSync(intlPath) ? (JSON.parse(readFileSync(intlPath, 'utf8')).data as Array<{ id: string }>).map((o) => o.id) : []);
  const api = adzunaClient(keys);
  const offers = new Map<string, CurrentOffer>((opts.base?.offers ?? []).map((o) => [o.id, o]));
  let seen = 0;
  const wanted = opts.onlyNocs ? nocData.nocs.filter((n) => opts.onlyNocs!.includes(n.code)) : nocData.nocs;
  for (const n of wanted) {
    const what = (n.jobEn ?? n.titleEn).split(/[(/]/)[0]!.trim(); // Adzuna exige tous les mots de « what »
    const { results } = await api.search({ what, max_days_old: String(MAX_DAYS_OLD), results_per_page: String(PER_PAGE) });
    seen += results.length;
    for (const j of results) {
      const o = toCurrentOffer(j, n.code, { rules, nocData, intlIds });
      if (o && !offers.has(o.id)) offers.set(o.id, o);
    }
  }
  const list = [...offers.values()].sort((a, b) => b.date.localeCompare(a.date));
  const file = writeDataFile('current-offers.json', {
    name: 'Offres actuelles des métiers suivis (annonces Adzuna, lien direct)',
    publisher: 'Adzuna (annonces) — tri par métier et contrôle anti-arnaque par VériJob',
    url: 'https://www.adzuna.ca/',
    licence: 'Conditions de l’API Adzuna : affichage avec la mention « Adzuna » liée à adzuna.ca',
    // Métiers déjà interrogés : un métier ajouté plus tard sera interrogé dès l'envoi de code suivant.
    nocs: [...new Set([...(opts.base?.nocs ?? []), ...wanted.map((n) => n.code)])].sort(),
  }, list.length, list);
  console.log(`  ${api.count} requêtes, ${seen} annonces lues, ${list.length} gardées (titre conforme au métier)`);
  return { queries: api.count, seen, kept: list.length, file };
}
