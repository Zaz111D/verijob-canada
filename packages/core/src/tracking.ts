/**
 * Suivi des candidatures (stocké sur l'appareil) : statuts, relances, export / import JSON.
 * L'import est strictement validé : une sauvegarde abîmée ou étrangère ne doit jamais effacer de données.
 */

export type ApplicationStatus = 'a-envoyer' | 'envoyee' | 'relancee' | 'entretien' | 'offre' | 'refus' | 'abandon';

export const APPLICATION_STATUSES: ApplicationStatus[] = ['a-envoyer', 'envoyee', 'relancee', 'entretien', 'offre', 'refus', 'abandon'];

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
  verification?: Verification;
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
    const { id, employer, job, date, status, followUp, notes, contact, verification, updatedAt } = a;
    return { id, employer, job, date, status, followUp, notes, contact, verification, updatedAt };
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
