/**
 * Veille réglementaire (page « Ce qui a changé ») et liens Job Bank (mode liens uniquement).
 * Tout est calculé à partir de data/rules.json : statut des programmes, échéances à venir,
 * historique des changements, règles dont la date de révision est dépassée.
 */
import { sourceRef } from './sources';
import { formatDate } from './text';
import type { Localized, Rules, SourceRef } from './types';

export type ProgramState = 'ouvert' | 'restreint' | 'ferme' | 'expire';

export interface ProgramStatus {
  id: string;
  name: Localized;
  state: ProgramState;
  detail: Localized;
  source: SourceRef;
}

export interface UpcomingDate {
  date: string;
  daysLeft: number;
  label: Localized;
  source: SourceRef;
}

export interface ChangeEntry {
  date: string;
  approximate: boolean;
  title: Localized;
  detail: Localized;
  source: SourceRef;
}

function days(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** Statut actuel des voies suivies par l'appli. */
export function programStatuses(rules: Rules, today: string): ProgramStatus[] {
  const src = (id: string) => sourceRef(rules, id, today);
  const h = rules.homeCareWorkerPilots;
  const hcwpClosed = today >= h.closedFrom && today <= h.closedUntil;
  const lw = rules.lmiaLowWage;
  const frozen = lw.cmas.filter((c) => c.frozen).length;
  const rm = rules.ruralMeasures;
  const rmActive = today >= rm.validFrom && today <= rm.validTo;
  const fd = (d: string) => ({ fr: formatDate(d, 'fr'), en: formatDate(d, 'en') });
  return [
    {
      id: 'pilotes-aides-familiaux',
      name: { fr: 'Pilotes aides familiaux (résidence permanente)', en: 'Home Care Worker Pilots (permanent residence)' },
      state: hcwpClosed ? 'ferme' : 'restreint',
      detail: hcwpClosed
        ? { fr: `Aucune nouvelle demande jusqu'au ${fd(h.closedUntil).fr}.`, en: `No new applications until ${fd(h.closedUntil).en}.` }
        : { fr: 'Période de fermeture enregistrée terminée : vérifiez le statut sur canada.ca.', en: 'Recorded closure period is over: check the status on canada.ca.' },
      source: src(h.source),
    },
    {
      id: 'eimt-bas-salaire',
      name: { fr: 'EIMT – volet bas salaire', en: 'LMIA – low-wage stream' },
      state: 'restreint',
      detail: {
        fr: `Gel dans ${frozen} grandes régions urbaines (RMR) jusqu'au ${fd(lw.validTo).fr}. Affichage de ${rules.lowWageRecruitment.minAdvertisingWeeks} semaines minimum.`,
        en: `Frozen in ${frozen} large urban areas (CMAs) until ${fd(lw.validTo).en}. Minimum ${rules.lowWageRecruitment.minAdvertisingWeeks}-week advertising.`,
      },
      source: src(lw.source),
    },
    {
      id: 'mesures-rurales',
      name: { fr: 'Mesures temporaires rurales (bas salaire)', en: 'Temporary rural measures (low-wage)' },
      state: rmActive ? 'ouvert' : 'expire',
      detail: rmActive
        ? { fr: `Hors RMR, dans ${Object.keys(rm.provinces).length} provinces ou territoires, jusqu'au ${fd(rm.validTo).fr}.`, en: `Outside CMAs, in ${Object.keys(rm.provinces).length} provinces or territories, until ${fd(rm.validTo).en}.` }
        : { fr: `Prévues du ${fd(rm.validFrom).fr} au ${fd(rm.validTo).fr}.`, en: `Planned from ${fd(rm.validFrom).en} to ${fd(rm.validTo).en}.` },
      source: src(rm.source),
    },
    {
      id: 'eimt-agricole',
      name: { fr: 'EIMT – volet agricole', en: 'LMIA – Agricultural Stream' },
      state: 'ouvert',
      detail: { fr: 'Ouvert aux travailleurs de tous les pays.', en: 'Open to workers from all countries.' },
      source: src(rules.agricultural.source),
    },
    {
      id: 'ptas',
      name: { fr: 'PTAS (travailleurs agricoles saisonniers)', en: 'SAWP (seasonal agricultural workers)' },
      state: 'restreint',
      detail: { fr: `Réservé au Mexique et à ${rules.sawp.countries.length - 1} pays des Caraïbes. Aucun pays africain.`, en: `Only Mexico and ${rules.sawp.countries.length - 1} Caribbean countries. No African country.` },
      source: src(rules.sawp.source),
    },
    {
      id: 'mobilite-francophone',
      name: { fr: 'Mobilité francophone (C16)', en: 'Francophone Mobility (C16)' },
      state: 'ouvert',
      detail: { fr: `Hors Québec, NCLC ${rules.francophoneMobility.minOralNclc} à l'oral, sans EIMT.`, en: `Outside Quebec, NCLC ${rules.francophoneMobility.minOralNclc} oral, no LMIA.` },
      source: src(rules.francophoneMobility.source),
    },
    {
      id: 'pilotes-communautaires',
      name: { fr: 'Pilotes communautaires PICR / PICRF', en: 'Community pilots RCIP / FCIP' },
      state: 'ouvert',
      detail: { fr: `${rules.communityPilots.communities.length} communautés ; offre d'un employeur désigné obligatoire.`, en: `${rules.communityPilots.communities.length} communities; job offer from a designated employer required.` },
      source: src(rules.communityPilots.source),
    },
  ];
}

/** Échéances à venir (mises à jour attendues, fins de mesures, révisions de règles), triées par date. */
export function upcomingDates(rules: Rules, today: string): UpcomingDate[] {
  const items: Array<Omit<UpcomingDate, 'daysLeft'>> = [
    { date: rules.lmiaLowWage.nextUpdate, label: { fr: 'Nouvelle liste des RMR gelées (EDSC)', en: 'New list of frozen CMAs (ESDC)' }, source: sourceRef(rules, rules.lmiaLowWage.source, today) },
    { date: rules.ruralMeasures.validTo, label: { fr: 'Fin des mesures temporaires rurales', en: 'End of temporary rural measures' }, source: sourceRef(rules, rules.ruralMeasures.source, today) },
    { date: rules.homeCareWorkerPilots.closedUntil, label: { fr: 'Fin de la fermeture des pilotes aides familiaux', en: 'End of the caregiver pilots closure' }, source: sourceRef(rules, rules.homeCareWorkerPilots.source, today) },
  ];
  // Prochaine révision des règles de VériJob (la plus proche).
  const review = Object.keys(rules.sources).map((id) => sourceRef(rules, id, today)).sort((a, b) => a.nextReview.localeCompare(b.nextReview))[0];
  if (review) items.push({ date: review.nextReview, label: { fr: 'Prochaine revérification des règles par VériJob', en: 'Next re-check of the rules by VériJob' }, source: review });
  return items
    .filter((i) => i.date >= today)
    .map((i) => ({ ...i, daysLeft: days(today, i.date) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Historique des changements, du plus récent au plus ancien. */
export function changeLog(rules: Rules, today: string): ChangeEntry[] {
  return [...rules.changes]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((c) => ({
      date: c.date,
      approximate: !!c.approximateDate,
      title: { fr: c.titleFr, en: c.titleEn },
      detail: { fr: c.detailFr, en: c.detailEn },
      source: sourceRef(rules, c.source, today),
    }));
}

/**
 * Lien Job Bank pour une recherche. Sans modèle vérifié (searchTemplate = null), renvoie le lien
 * confirmé « offres ouvertes aux candidats étrangers » et filtered = false : l'utilisateur filtre sur le site.
 */
export function jobBankLink(rules: Rules, opts: { keyword?: string; province?: string } = {}): { url: string; filtered: boolean } {
  const t = rules.jobBank.searchTemplate;
  if (!t || !opts.keyword) return { url: rules.jobBank.foreignJobsUrl, filtered: false };
  const url = t
    .replace('{keyword}', encodeURIComponent(opts.keyword))
    .replace('{province}', encodeURIComponent(opts.province ?? ''));
  return { url, filtered: true };
}
