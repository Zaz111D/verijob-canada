/**
 * Suivi des candidatures (stocké sur l'appareil) : statuts, relances, export / import JSON.
 * L'import est strictement validé : une sauvegarde abîmée ou étrangère ne doit jamais effacer de données.
 */

export type ApplicationStatus = 'a-envoyer' | 'envoyee' | 'relancee' | 'entretien' | 'offre' | 'refus' | 'abandon';

export const APPLICATION_STATUSES: ApplicationStatus[] = ['a-envoyer', 'envoyee', 'relancee', 'entretien', 'offre', 'refus', 'abandon'];

/** Où l'offre a été trouvée. */
export type ApplicationOrigin = 'guichet-emplois' | 'site-emploi' | 'petite-annonce' | 'messagerie' | 'site-employeur' | 'salon' | 'reseau' | 'demarchage' | 'autre';

export const APPLICATION_ORIGINS: ApplicationOrigin[] = [
  'guichet-emplois', 'site-emploi', 'petite-annonce', 'messagerie', 'site-employeur', 'salon', 'reseau', 'demarchage', 'autre',
];

/** Taille maximale de la copie d'annonce conservée (les annonces disparaissent vite : c'est une preuve). */
export const MAX_AD_TEXT = 20_000;

/** Statuts terminés : plus de relance à faire. */
const CLOSED: ApplicationStatus[] = ['offre', 'refus', 'abandon'];

export interface Verification {
  /** Nombre de signaux d'alerte trouvés dans l'offre (si analysée). */
  scamSignals?: number;
  /** Employeur trouvé dans les listes EIMT positives. */
  lmiaFound?: boolean;
  /** Employeur désigné PICR / PICRF. */
  designated?: boolean;
  checkedAt: string;
}

export interface Application {
  id: string;
  employer: string;
  job: string;
  /** Date d'envoi (ou de création si pas encore envoyée), AAAA-MM-JJ. */
  date: string;
  status: ApplicationStatus;
  /** Date de relance prévue, AAAA-MM-JJ. */
  followUp?: string;
  notes?: string;
  contact?: string;
  /** Téléphone de l'employeur relevé par la personne (même page source que le contact). */
  phone?: string;
  /** Page officielle où le contact a été trouvé (offre du Guichet-Emplois, site de l'employeur). */
  contactSource?: string;
  verification?: Verification;
  /** Provenance de l'offre. */
  origin?: ApplicationOrigin;
  /** Adresse de l'annonce. */
  adUrl?: string;
  /** Copie du texte de l'annonce. */
  adText?: string;
  updatedAt: string;
}

export interface TrackingExport {
  app: 'verijob-canada';
  kind: 'candidatures';
  version: 1;
  exportedAt: string;
  applications: Application[];
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const HTTP_URL = /^https?:[/][/]/i;

/** Messageries gratuites : un employeur qui a un site utilise normalement une adresse à son nom. */
const FREE_MAIL = /@(gmail|googlemail|yahoo|ymail|outlook|hotmail|live|msn|aol|icloud|proton|protonmail|gmx|yandex|mail)\.[a-z.]+$/i;

/** Vrai si le contact est une adresse e-mail de messagerie gratuite (Gmail, Yahoo…). */
export function isFreeEmail(contact: string | undefined): boolean {
  return !!contact && FREE_MAIL.test(contact.trim());
}

/** Ajoute des jours à une date AAAA-MM-JJ. */
export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Identifiant unique simple (pas de dépendance). */
export function newId(now = Date.now()): string {
  return `${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Relance par défaut : 10 jours après l'envoi. */
export const DEFAULT_FOLLOW_UP_DAYS = 10;

/** Candidatures dont la relance est due (date dépassée ou aujourd'hui), hors statuts terminés. */
export function dueFollowUps(apps: Application[], today: string): Application[] {
  return apps
    .filter((a) => a.followUp && a.followUp <= today && !CLOSED.includes(a.status))
    .sort((a, b) => (a.followUp ?? '').localeCompare(b.followUp ?? ''));
}

/** Tri d'affichage : relances dues d'abord, puis les plus récentes. */
export function sortApplications(apps: Application[], today: string): Application[] {
  const due = (a: Application) => (a.followUp && a.followUp <= today && !CLOSED.includes(a.status) ? 0 : 1);
  return [...apps].sort((a, b) => due(a) - due(b) || b.date.localeCompare(a.date) || a.employer.localeCompare(b.employer));
}

export function exportApplications(apps: Application[], now = new Date().toISOString()): TrackingExport {
  return { app: 'verijob-canada', kind: 'candidatures', version: 1, exportedAt: now, applications: apps };
}

function isApplication(x: unknown): x is Application {
  if (!x || typeof x !== 'object') return false;
  const a = x as Record<string, unknown>;
  return typeof a.id === 'string' && a.id.length > 0 && a.id.length < 100
    && typeof a.employer === 'string' && a.employer.trim().length > 0 && a.employer.length <= 300
    && typeof a.job === 'string' && a.job.length <= 300
    && typeof a.date === 'string' && DATE.test(a.date)
    && APPLICATION_STATUSES.includes(a.status as ApplicationStatus)
    && (a.followUp === undefined || (typeof a.followUp === 'string' && DATE.test(a.followUp)))
    && (a.notes === undefined || (typeof a.notes === 'string' && a.notes.length <= 5000))
    && (a.contact === undefined || (typeof a.contact === 'string' && a.contact.length <= 300))
    && (a.phone === undefined || (typeof a.phone === 'string' && a.phone.length <= 40))
    && (a.contactSource === undefined || (typeof a.contactSource === 'string' && a.contactSource.length <= 2000 && HTTP_URL.test(a.contactSource)))
    && (a.origin === undefined || APPLICATION_ORIGINS.includes(a.origin as ApplicationOrigin))
    && (a.adUrl === undefined || (typeof a.adUrl === 'string' && a.adUrl.length <= 2000 && /^https?:\/\//i.test(a.adUrl)))
    && (a.adText === undefined || (typeof a.adText === 'string' && a.adText.length <= MAX_AD_TEXT))
    && typeof a.updatedAt === 'string';
}

/**
 * Lit un fichier d'export. Renvoie les candidatures valides et le nombre de lignes rejetées,
 * ou une erreur si le fichier n'est pas une sauvegarde VériJob.
 */
export function parseImport(text: string): { ok: true; applications: Application[]; rejected: number } | { ok: false; error: 'json' | 'format' } {
  let data: unknown;
  try { data = JSON.parse(text); } catch { return { ok: false, error: 'json' }; }
  const d = data as Partial<TrackingExport>;
  if (!d || d.app !== 'verijob-canada' || d.kind !== 'candidatures' || !Array.isArray(d.applications)) {
    return { ok: false, error: 'format' };
  }
  const applications = d.applications.filter(isApplication).map((a) => {
    const { id, employer, job, date, status, followUp, notes, contact, phone, contactSource, verification, origin, adUrl, adText, updatedAt } = a;
    return { id, employer, job, date, status, followUp, notes, contact, phone, contactSource, verification, origin, adUrl, adText, updatedAt };
  });
  return { ok: true, applications, rejected: d.applications.length - applications.length };
}

/** Fusionne un import avec l'existant : même id → on garde la version modifiée le plus récemment. */
export function mergeApplications(current: Application[], incoming: Application[]): { merged: Application[]; added: number; updated: number } {
  const map = new Map(current.map((a) => [a.id, a]));
  let added = 0, updated = 0;
  for (const a of incoming) {
    const existing = map.get(a.id);
    if (!existing) { map.set(a.id, a); added++; }
    else if (a.updatedAt > existing.updatedAt) { map.set(a.id, a); updated++; }
  }
  return { merged: [...map.values()], added, updated };
}
