/**
 * Références de sources officielles et détection des données périmées.
 * Chaque information affichée doit porter sa source cliquable et sa date.
 */
import type { Rules, SourceRef } from './types';

/** Date du jour au format AAAA-MM-JJ (fuseau local). */
export function todayIso(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Construit la référence affichable d'une source de rules.json. Lève une erreur si l'id est inconnu. */
export function sourceRef(rules: Rules, id: string, today: string): SourceRef {
  const s = rules.sources[id];
  if (!s) throw new Error(`Source inconnue dans rules.json : « ${id} »`);
  return {
    id,
    title: { fr: s.titleFr, en: s.titleEn },
    // Si la version française n'a pas été relevée, on affiche le lien anglais.
    url: { fr: s.urlFr ?? s.urlEn, en: s.urlEn },
    verifiedAt: s.verifiedAt,
    nextReview: s.nextReview,
    stale: today > s.nextReview,
  };
}

/** Liste des sources dont la date de révision est dépassée (page « Ce qui a changé »). */
export function staleSources(rules: Rules, today: string): SourceRef[] {
  return Object.keys(rules.sources)
    .map((id) => sourceRef(rules, id, today))
    .filter((s) => s.stale);
}

/** Supprime les doublons (même id) en gardant l'ordre. */
export function uniqueSources(refs: SourceRef[]): SourceRef[] {
  const seen = new Set<string>();
  return refs.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
}
