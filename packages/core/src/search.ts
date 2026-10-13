/**
 * Recherche floue d'employeurs : tolère les fautes de frappe, les abréviations
 * (« Inc », « Ltée »…), l'ordre des mots et les espaces manquants.
 * Travaille sur la clé normalisée `k` (employerKey) produite par le pipeline.
 */
import { employerKey } from './employer';

export interface SearchHit<T> {
  item: T;
  /** Score entre 0 et ~1,5 (plus haut = plus proche). */
  score: number;
}

/** Distance de Levenshtein bornée (renvoie max+1 dès que la borne est dépassée). */
export function boundedLevenshtein(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const v = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
      cur.push(v);
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length]!;
}

/** Proximité d'un mot de la requête avec un mot du nom (0 = aucune). */
function tokenScore(q: string, t: string): number {
  if (q === t) return 1;
  if (q.length >= 2 && t.startsWith(q)) return 0.8;
  const allowed = q.length >= 8 ? 2 : q.length >= 4 ? 1 : 0;
  if (allowed && boundedLevenshtein(q, t, allowed) <= allowed) return 0.6;
  return 0;
}

/**
 * Cherche `query` parmi des éléments portant une clé `k`.
 * Tous les mots de la requête doivent correspondre à un mot du nom (exact, début de mot ou faute de frappe).
 */
export function searchEmployers<T extends { k: string }>(items: T[], query: string, limit = 30): SearchHit<T>[] {
  const qk = employerKey(query);
  if (!qk) return [];
  const qTokens = qk.split(' ');
  const qCompact = qk.replace(/ /g, '');
  const hits: SearchHit<T>[] = [];
  for (const item of items) {
    let score: number;
    if (item.k === qk) {
      score = 1.5;
    } else {
      const tokens = item.k.split(' ');
      let sum = 0;
      for (const q of qTokens) {
        let best = 0;
        for (const t of tokens) {
          const s = tokenScore(q, t);
          if (s > best) best = s;
          if (best === 1) break;
        }
        if (best === 0) { sum = -1; break; }
        sum += best;
      }
      score = sum < 0 ? 0 : (sum / qTokens.length) * (0.9 + 0.1 * Math.min(1, qTokens.length / tokens.length));
      // « fermetremblay » ↔ « ferme tremblay »
      if (score === 0 && qCompact.length >= 5 && item.k.replace(/ /g, '').includes(qCompact)) score = 0.7;
    }
    if (score > 0) hits.push({ item, score });
  }
  return hits.sort((a, b) => b.score - a.score || a.item.k.localeCompare(b.item.k)).slice(0, limit);
}
