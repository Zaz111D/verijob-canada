/**
 * Publications récentes sur les réseaux et petites annonces, en MODE LIENS UNIQUEMENT :
 * LinkedIn, Facebook, X et Google interdisent la lecture automatique de leurs pages. L'appli fabrique
 * des recherches pré-remplies (métier + mots qui signalent un recrutement à l'étranger, publications
 * récentes) ; la personne les ouvre avec son propre compte, puis colle une publication dans « Offre ».
 *
 * publisherCheck : qui publie ? (adresses et sites cités comparés au nom de l'entreprise).
 */
import { employerKey } from './employer';
import { isFreeEmail } from './tracking';
import type { Localized, Rules } from './types';

export interface SocialSearchSite {
  id: string;
  name: string;
  /** Modèle avec {query} (recherche encodée) ; les filtres « récent » sont déjà dans l'adresse. */
  template: string;
  /** Le site comprend OR et les guillemets. */
  boolean: boolean;
  /** Compte nécessaire pour voir les résultats. */
  account: boolean;
  noteFr: string;
  noteEn: string;
  verifiedAt: string;
}

export interface SocialLink { id: string; name: string; url: string; account: boolean; note: Localized; lang: 'fr' | 'en' }

/** Mots qui accompagnent un recrutement à l'étranger dans les publications (FR pour le Québec et la francophonie). */
const OPEN_FR = ['EIMT', '"Mobilité francophone"', '"travailleurs étrangers"', '"recrutement international"'];
const OPEN_EN = ['LMIA', '"foreign workers"', '"international recruitment"', '"visa sponsorship"'];

function query(job: string, open: string[], boolean: boolean, lang: 'fr' | 'en'): string {
  const j = job.includes(' ') ? `"${job}"` : job;
  if (boolean) return `${j} Canada (${open.join(' OR ')})`;
  // Sites sans opérateurs : métier + un seul mot-clé, le plus fréquent dans les annonces.
  return `${job} Canada ${lang === 'fr' ? 'EIMT' : 'LMIA'}`;
}

/** Recherches pré-remplies pour un métier, en français puis en anglais. */
export function socialSearchLinks(rules: Rules, job: { fr: string; en: string }): SocialLink[] {
  const out: SocialLink[] = [];
  for (const lang of ['fr', 'en'] as const) {
    const name = lang === 'fr' ? job.fr : job.en;
    if (!name) continue;
    for (const s of rules.opportunities.socialSearches) {
      out.push({
        id: `${s.id}-${lang}`,
        name: s.name,
        url: s.template.replace('{query}', encodeURIComponent(query(name, lang === 'fr' ? OPEN_FR : OPEN_EN, s.boolean, lang))),
        account: s.account,
        note: { fr: s.noteFr, en: s.noteEn },
        lang,
      });
    }
  }
  return out;
}

export interface PublisherCheck {
  emails: string[];
  /** Domaines des adresses e-mail et des sites cités (hors réseaux sociaux). */
  domains: string[];
  /**
   * 'lie' : une adresse ou un site cité porte le nom de l'entreprise ;
   * 'autre' : des adresses ou sites sont cités, aucun ne porte ce nom (intermédiaire possible) ;
   * 'aucun' : aucune adresse ni site dans la publication ; undefined : entreprise non indiquée.
   */
  link?: 'lie' | 'autre' | 'aucun';
  /** Numéros de téléphone hors Amérique du Nord (indicatif autre que +1). */
  foreignPhones: string[];
}

const SOCIAL = /(^|\.)(linkedin|facebook|fb|instagram|x|twitter|tiktok|whatsapp|wa|t|telegram|youtube|bit|lnkd|google|forms\.gle)\.[a-z.]+$/;
const GENERIC = new Set(['and', 'les', 'des', 'groupe', 'group', 'canada', 'quebec', 'services', 'service', 'international', 'industries', 'entreprises', 'compagnie', 'company']);

/** Qui publie ? Compare les adresses et sites cités au nom de l'entreprise indiqué. */
export function publisherCheck(text: string, company?: string): PublisherCheck {
  const emails = [...new Set((text.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) ?? []).map((e) => e.toLowerCase()))];
  const urls = (text.match(/\b(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:ca|com|org|net|qc\.ca|io|co|info|biz))\b/gi) ?? [])
    .map((u) => u.replace(/^https?:\/\//i, '').replace(/^www\./i, '').toLowerCase());
  const mailDomains = emails.map((e) => e.split('@')[1]!);
  const domains = [...new Set([...mailDomains, ...urls])].filter((d) => !SOCIAL.test(d));
  const foreignPhones = [...new Set((text.match(/\+\s?(?!1\b)\d{2,3}[\s.-]?\d[\d\s.-]{6,}\d/g) ?? []).map((p) => p.replace(/\s+/g, ' ').trim()))];
  const result: PublisherCheck = { emails, domains, foreignPhones };
  if (!company?.trim()) return result;
  const own = domains.filter((d) => !isFreeEmail(`x@${d}`));
  if (!own.length) { result.link = domains.length ? 'autre' : 'aucun'; return result; }
  const key = employerKey(company);
  const compact = key.replace(/ /g, '');
  const tokens = key.split(' ').filter((w) => w.length >= 4 && !GENERIC.has(w));
  const matches = (d: string) => {
    const label = d.replace(/\.(qc\.ca|ca|com|org|net|io|co|info|biz)$/, '').replace(/[^a-z0-9]/g, '');
    return label.includes(compact) || compact.includes(label) && label.length >= 4 || tokens.some((t) => label.includes(t));
  };
  result.link = own.some(matches) ? 'lie' : 'autre';
  return result;
}
