/**
 * Liste de démarchage : employeurs qui recrutent régulièrement à l'étranger pour nos métiers
 * (EIMT positives sur plusieurs trimestres), avec une estimation honnête de la voie possible.
 */
import { evaluatePathways, type PathwayResult, type PathwayStatus } from './feasibility/evaluate';
import type { CmaLookup } from './geo';
import type { NocData, Profile, ProvinceCode, Rules } from './types';

/** Recruteur récurrent, format compact produit par le pipeline (prospects.json). */
export interface Prospect {
  /** Nom affiché. */
  n: string;
  /** Clé de recherche (employerKey). */
  k: string;
  /** Province (ou « XX » : siège social hors Canada). */
  p: string;
  /** Ville. */
  c: string;
  /** Code postal. */
  pc: string;
  /** Situation RMR : nom de la RMR, « - » hors RMR, « ? » inconnue. */
  g: string;
  /** Nombre de trimestres avec au moins une EIMT positive pour un métier ciblé. */
  q: number;
  /** Dernier trimestre concerné (ex. « 2026Q1 »). */
  lq: string;
  /** Volets utilisés (PA, LW, HW…). */
  s: string[];
  /** Postes approuvés par métier ciblé : [CNP, postes]. */
  j: Array<[string, number]>;
  /** Postes refusés (EIMT négatives) pour les métiers ciblés. */
  neg: number;
}

export interface ProspectFilter {
  nocs?: string[];
  provinces?: string[];
  /** Exclure les employeurs seulement présents en agriculture primaire (souvent PTAS). */
  excludeAgricultureOnly?: boolean;
  minQuarters?: number;
}

/** Filtre et trie : régularité d'abord, puis nombre de postes, puis récence. */
export function filterProspects(list: Prospect[], f: ProspectFilter): Prospect[] {
  const nocs = f.nocs?.length ? new Set(f.nocs) : undefined;
  const provs = f.provinces?.length ? new Set(f.provinces) : undefined;
  return list
    .filter((x) =>
      (!nocs || x.j.some(([noc]) => nocs.has(noc))) &&
      (!provs || provs.has(x.p)) &&
      (!f.excludeAgricultureOnly || x.s.some((s) => s !== 'PA')) &&
      x.q >= (f.minQuarters ?? 2))
    .sort((a, b) => b.q - a.q || totalPositions(b, nocs) - totalPositions(a, nocs) || b.lq.localeCompare(a.lq));
}

export function totalPositions(x: Prospect, nocs?: Set<string>): number {
  return x.j.filter(([noc]) => !nocs || nocs.has(noc)).reduce((s, [, n]) => s + n, 0);
}

const RANK: Record<PathwayStatus, number> = { probable: 0, possible: 1, inconnue: 2, bloquee: 3 };

/**
 * Meilleure voie estimée pour ce profil chez cet employeur (pour le métier le plus recruté).
 * Utilise la situation RMR connue de l'employeur.
 */
export function prospectPathway(
  x: Prospect,
  profile: Profile,
  opts: { rules: Rules; nocData: NocData; cmaLookup?: CmaLookup; today?: string; nocs?: string[] },
): { noc: string; best: PathwayResult; all: PathwayResult[] } {
  const wanted = opts.nocs?.length ? x.j.filter(([n]) => opts.nocs!.includes(n)) : x.j;
  const noc = [...(wanted.length ? wanted : x.j)].sort((a, b) => b[1] - a[1])[0]![0];
  const province = x.p === 'XX' ? undefined : (x.p as ProvinceCode);
  const job = x.g === '-' || x.g === '?'
    ? { noc, province, outsideCma: x.g === '-' ? true : undefined }
    : { noc, province, city: x.g };
  const all = evaluatePathways(profile, job, opts);
  // Le PTAS n'est pas une « voie » pour démarcher un employeur : on ne le met pas en avant.
  const best = [...all].filter((r) => r.voie !== 'ptas').sort((a, b) => RANK[a.statut] - RANK[b.statut])[0] ?? all[0]!;
  return { noc, best, all };
}

/** Échappe une valeur CSV (séparateur « ; » pour Excel en français, guillemets doublés). */
function cell(v: string | number): string {
  const s = String(v);
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Export CSV (UTF-8 avec BOM, séparateur « ; ») lisible dans Excel / LibreOffice / Google Sheets. */
export function prospectsToCsv(rows: Array<Record<string, string | number>>): string {
  if (!rows.length) return '\ufeff';
  const headers = Object.keys(rows[0]!);
  return '\ufeff' + [headers.map(cell).join(';'), ...rows.map((r) => headers.map((h) => cell(r[h] ?? '')).join(';'))].join('\r\n') + '\r\n';
}
