/**
 * Pistes pour trouver un emploi depuis l'étranger, en MODE LIENS UNIQUEMENT :
 * sites d'offres (adresse de recherche pré-remplie), salons de recrutement, réseaux,
 * et canaux à risque. Tout vient de data/rules.json (section « opportunities ») ;
 * aucun site n'est lu automatiquement.
 */
import { sourceRef } from './sources';
import type { Localized, ProvinceCode, Rules, SourceRef } from './types';

export interface SearchLink {
  id: string;
  name: string;
  url: string;
  /** Vrai si l'adresse contient déjà le métier recherché. */
  filtered: boolean;
  note: Localized;
}

/**
 * Liens de recherche pour un métier (mot-clé) et un lieu.
 * Les sites réservés à certaines provinces (ex. Québec emploi) ne sont proposés que si
 * l'une de ces provinces fait partie des provinces visées (ou si aucune n'est choisie).
 */
export function searchLinks(rules: Rules, opts: { keyword?: string; location?: string; provinces?: ProvinceCode[] } = {}): SearchLink[] {
  const wanted = opts.provinces ?? [];
  return rules.opportunities.searchSites
    .filter((s) => !s.provinces || !wanted.length || s.provinces.some((p) => wanted.includes(p)))
    .map((s) => {
      const note = { fr: s.noteFr, en: s.noteEn };
      if (!s.template || !opts.keyword) {
        return { id: s.id, name: s.name, url: s.url ?? siteHome(s.template), filtered: false, note };
      }
      const url = s.template
        .replace('{keyword}', encodeURIComponent(opts.keyword))
        .replace('{location}', encodeURIComponent(opts.location ?? 'Canada'));
      return { id: s.id, name: s.name, url, filtered: true, note };
    });
}

/** Page d'accueil déduite d'un modèle (lien sans recherche). */
function siteHome(template: string | null): string {
  return template?.match(/^https?:\/\/[^/]+\//)?.[0] ?? '';
}

export interface EventInfo {
  id: string;
  name: Localized;
  audience: Localized;
  status: Localized;
  /** La dernière édition connue date de plus d'un an : vérifier sur la page officielle. */
  old: boolean;
  source: SourceRef;
}

/** Salons et missions de recrutement, les plus récents d'abord. */
export function recruitmentEvents(rules: Rules, today: string): EventInfo[] {
  const yearAgo = `${Number(today.slice(0, 4)) - 1}${today.slice(4)}`;
  return [...rules.opportunities.events]
    .sort((a, b) => (b.lastEditionEnd ?? '').localeCompare(a.lastEditionEnd ?? ''))
    .map((e) => ({
      id: e.id,
      name: { fr: e.nameFr, en: e.nameEn },
      audience: { fr: e.audienceFr, en: e.audienceEn },
      status: { fr: e.statusFr, en: e.statusEn },
      old: e.lastEditionEnd !== null && e.lastEditionEnd < yearAgo,
      source: sourceRef(rules, e.source, today),
    }));
}

export interface NetworkInfo {
  id: string;
  name: Localized;
  detail: Localized;
  url: Localized;
  internal?: string;
  /** Vrai si la piste concerne explicitement le pays de l'utilisateur. */
  forYourCountry: boolean;
  source: SourceRef;
}

/** Réseaux et organismes ; ceux qui concernent le pays de l'utilisateur passent en premier. */
export function networks(rules: Rules, today: string, citizenship?: string): NetworkInfo[] {
  const c = citizenship?.toUpperCase();
  return rules.opportunities.networks
    .map((n) => {
      const source = sourceRef(rules, n.source, today);
      return {
        id: n.id,
        name: { fr: n.nameFr, en: n.nameEn },
        detail: { fr: n.detailFr, en: n.detailEn },
        url: n.url ? { fr: n.url, en: n.url } : source.url,
        internal: n.internal,
        forYourCountry: !!c && !!n.countries?.includes(c),
        source,
      };
    })
    .sort((a, b) => Number(b.forYourCountry) - Number(a.forYourCountry));
}

/** Canaux où circulent beaucoup de fausses offres (mises en garde). */
export function riskyChannels(rules: Rules, today: string): Array<{ id: string; name: Localized; detail: Localized; source: SourceRef }> {
  return rules.opportunities.riskyChannels.map((r) => ({
    id: r.id,
    name: { fr: r.nameFr, en: r.nameEn },
    detail: { fr: r.detailFr, en: r.detailEn },
    source: sourceRef(rules, r.source, today),
  }));
}
