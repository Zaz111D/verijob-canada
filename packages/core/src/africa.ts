/**
 * Employeurs qui ont FAIT LEURS PREUVES dans le recrutement en Afrique, et statistiques officielles.
 *
 * Aucune donnée publique ne relie un employeur à la nationalité de ses travailleurs. On s'appuie donc sur :
 * 1. des preuves publiques relevées à la main (data/manual/recrutement-afrique.csv) : page officielle de
 *    l'employeur, article de presse reconnue, communiqué ; chaque ligne porte sa source, sa date et ce
 *    qu'elle prouve exactement (embauches, ou seulement une mission de recrutement) ;
 * 2. les statistiques d'IRCC : permis de travail obtenus par les ressortissants de chaque pays.
 * Une preuve ancienne est signalée ; l'absence d'un employeur de la liste ne prouve rien.
 */
import { employerKey } from './employer';
import type { Localized } from './types';

export type EvidenceType = 'page-employeur' | 'presse' | 'mission' | 'gouvernement';

export interface AfricanRecruiter {
  employer: string;
  /** Clé de comparaison (employerKey). */
  k: string;
  province: string;
  city: string;
  sector: string;
  /** Pays (ISO-2) cités dans la preuve. */
  countries: string[];
  type: EvidenceType;
  evidence: Localized;
  /** Date de l'événement ou de la publication (AAAA-MM-JJ), vide si la page n'est pas datée. */
  eventDate: string;
  sourceTitle: string;
  sourceUrl: string;
  /** Date à laquelle VériJob a lu la source. */
  recordedAt: string;
}

export const EVIDENCE_LABEL: Record<EvidenceType, Localized> = {
  'page-employeur': { fr: 'Page officielle de l’employeur', en: 'Employer’s official page' },
  presse: { fr: 'Article de presse', en: 'News article' },
  mission: { fr: 'Mission de recrutement en Afrique', en: 'Recruitment mission in Africa' },
  gouvernement: { fr: 'Source gouvernementale', en: 'Government source' },
};

/** Âge au-delà duquel une preuve est signalée comme ancienne (en années). */
export const OLD_EVIDENCE_YEARS = 3;

/** La preuve date-t-elle de plus de OLD_EVIDENCE_YEARS ans ? (date de l'événement, sinon date de lecture). */
export function isOldEvidence(r: AfricanRecruiter, today: string): boolean {
  const d = r.eventDate || r.recordedAt;
  const limit = `${Number(today.slice(0, 4)) - OLD_EVIDENCE_YEARS}${today.slice(4)}`;
  return d < limit;
}

/**
 * Ordre d'affichage : d'abord les employeurs qui ont recruté dans le pays de l'utilisateur,
 * puis ceux de ses provinces visées, puis les preuves les plus récentes.
 */
export function sortRecruiters(list: AfricanRecruiter[], opts: { citizenship?: string; provinces?: string[]; today: string }): AfricanRecruiter[] {
  const c = opts.citizenship?.toUpperCase();
  const provs = new Set(opts.provinces ?? []);
  const score = (r: AfricanRecruiter) =>
    (c && r.countries.includes(c) ? 4 : 0) + (provs.has(r.province) ? 2 : 0) + (isOldEvidence(r, opts.today) ? 0 : 1);
  return [...list].sort((a, b) => score(b) - score(a) || (b.eventDate || b.recordedAt).localeCompare(a.eventDate || a.recordedAt));
}

/** Preuves pour un nom d'employeur (comparaison tolérante : formes juridiques, accents, casse). */
export function recruiterEvidence(list: AfricanRecruiter[], employerName: string): AfricanRecruiter[] {
  const k = employerKey(employerName);
  return k ? list.filter((r) => r.k === k) : [];
}

// ---------------------------------------------------------------------------
// Statistiques IRCC : permis de travail par pays de citoyenneté
// ---------------------------------------------------------------------------

/** Permis de travail par année, pour un programme (valeurs arrondies par IRCC ; 1 à 5 masqués, comptés 0). */
export type PermitsByYear = Record<string, number>;

export interface PermitsData {
  /** Dernier mois couvert (AAAA-MM). */
  lastMonth: string;
  /** PTET : permis avec EIMT (ou dispense) ; PMI : Programme de mobilité internationale (dont Mobilité francophone). */
  tfwp: Record<string, PermitsByYear>;
  imp: Record<string, PermitsByYear>;
}

export interface PermitSummary {
  country: string;
  year: string;
  /** L'année est-elle incomplète (en cours) ? */
  partial: boolean;
  tfwp: number;
  imp: number;
  /** Même période de l'année précédente, pour comparer (PTET). */
  tfwpPrev?: number;
  /** Rang du pays parmi les pays d'Afrique (PTET, année complète la plus récente). */
  africanRank?: number;
}

/** Résumé pour un pays : dernière année complète, et l'année en cours. */
export function permitSummary(data: PermitsData, country: string): { last?: PermitSummary; current?: PermitSummary } {
  const c = country.toUpperCase();
  const t = data.tfwp[c] ?? {};
  const i = data.imp[c] ?? {};
  const curYear = data.lastMonth.slice(0, 4);
  const fullYear = String(Number(curYear) - (data.lastMonth.endsWith('-12') ? 0 : 1));
  const ranking = Object.entries(data.tfwp)
    .map(([k, v]) => [k, v[fullYear] ?? 0] as const)
    .sort((a, b) => b[1] - a[1]);
  const rank = ranking.findIndex(([k]) => k === c);
  const last: PermitSummary | undefined = t[fullYear] !== undefined || i[fullYear] !== undefined
    ? { country: c, year: fullYear, partial: false, tfwp: t[fullYear] ?? 0, imp: i[fullYear] ?? 0, tfwpPrev: t[String(Number(fullYear) - 1)], africanRank: rank >= 0 && (t[fullYear] ?? 0) > 0 ? rank + 1 : undefined }
    : undefined;
  const current: PermitSummary | undefined = curYear !== fullYear && (t[curYear] !== undefined || i[curYear] !== undefined)
    ? { country: c, year: curYear, partial: true, tfwp: t[curYear] ?? 0, imp: i[curYear] ?? 0 }
    : undefined;
  return { last, current };
}
