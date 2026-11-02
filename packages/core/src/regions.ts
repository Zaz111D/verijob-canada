/**
 * Villes et régions qui peinent à recruter sur place (onglet « Régions ») : pilotes PICR / PICRF,
 * programme régional REDI de l'Ontario, régions du Québec hors Montréal et Laval.
 *
 * placeOf : à quelle région appartient le lieu d'une annonce (« Dryden, Kenora region ») ;
 * lowWageStatus : l'EIMT bas salaire y est-elle possible (hors RMR ou RMR non gelée) ?
 */
import type { CurrentOffer } from './international';
import { normalize } from './text';
import type { NocData, ProvinceCode, RegionPlace, Rules } from './types';

/** Offre d'une ville en région (tous métiers), publiée par le pipeline. */
export interface RegionOffer extends Omit<CurrentOffer, 'noc'> {
  /** Identifiant de la région (rules.regions.places[].id). */
  place: string;
  /** Métier suivi reconnu dans le titre, s'il y en a un. */
  noc?: string;
}

/** « Val-d'Or, Vallée-de-l'Or » → «  val d or vallee de l or  » (mots entiers, sans accents ni ponctuation). */
const words = (s: string) => ` ${normalize(s).replace(/[^a-z0-9]+/g, ' ').trim()} `;

/** Nom le plus long de la région trouvé dans le lieu, ou 0 (le plus long l'emporte : « Fort Nelson » avant « Nelson »). */
function matchLength(place: RegionPlace, location: string): number {
  const loc = words(location);
  return Math.max(0, ...[...place.towns, ...place.match].map((t) => words(t)).filter((t) => loc.includes(t)).map((t) => t.length));
}

/** Région du lieu d'une annonce (même province), ou undefined. */
export function placeOf(rules: Rules, location: string, province?: ProvinceCode): RegionPlace | undefined {
  let best: RegionPlace | undefined;
  let bestLen = 0;
  for (const p of rules.regions.places) {
    if (province && p.province !== province) continue;
    const len = matchLength(p, location);
    if (len > bestLen) { best = p; bestLen = len; }
  }
  return best;
}

/** EIMT bas salaire : « possible » hors RMR ou dans une RMR non gelée ; « gel » dans une RMR gelée. */
export function lowWageStatus(rules: Rules, place: RegionPlace): 'possible' | 'gel' {
  if (!place.cma) return 'possible';
  return rules.lmiaLowWage.cmas.find((c) => c.name === place.cma)?.frozen ? 'gel' : 'possible';
}

/**
 * Offre d'un des métiers de la personne : code reconnu par le pipeline, ou nom du métier dans le titre
 * (pour les métiers du catalogue complet, qui n'ont pas de mots-clés).
 */
export function isOwnJob(offer: Pick<RegionOffer, 'noc' | 'title'>, nocs: string[], nocData: NocData): boolean {
  if (offer.noc && nocs.includes(offer.noc)) return true;
  const title = words(offer.title);
  return nocs.some((code) => {
    const n = nocData.nocs.find((x) => x.code === code);
    // Écriture inclusive : « agent·e de sécurité » → « agent de sécurité ».
    return !!n && [n.jobFr, n.jobEn].some((j) => !!j && j.length >= 4 && title.includes(words(j.split(/[(/,]/)[0]!.replace(/·\p{L}+/gu, ''))));
  });
}
