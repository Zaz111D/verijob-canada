/**
 * Normalisation des noms d'employeurs, partagée par le pipeline de données
 * (déduplication) et par la recherche dans l'appli (tolérance aux variantes).
 *
 * « Ferme Tremblay Inc. », « FERME TREMBLAY INC » et « Ferme Tremblay Ltée » → « ferme tremblay ».
 */
import { normalize } from './text';

/** Formes juridiques et mots vides retirés du nom (FR + EN). */
const LEGAL_SUFFIXES = new Set([
  'inc', 'incorporated', 'incorporee', 'ltd', 'ltee', 'limited', 'limitee', 'corp', 'corporation',
  'co', 'company', 'cie', 'compagnie', 'llc', 'llp', 'lp', 'ulc', 'plc', 'enr', 'enrg', 'senc',
  'sencrl', 'srl', 'sa', 'the', 'le', 'la', 'les',
]);

/** Clé de comparaison d'un nom d'employeur. */
export function employerKey(name: string): string {
  const words = normalize(name)
    .replace(/\ufffd/g, "'")
    .replace(/&/g, ' and ')
    .replace(/['.,()/\\"-]/g, ' ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w === 'et' ? 'and' : w));
  // On retire les formes juridiques seulement si elles ne sont pas le nom entier.
  const kept = words.filter((w) => !LEGAL_SUFFIXES.has(w));
  return (kept.length > 0 ? kept : words).join(' ');
}

/** Forme juridique en fin de nom (« Inc. », « Ltée »…), à retirer pour une recherche sur un site d'offres. */
const TRAILING_LEGAL = /[\s,.]+(inc|incorporated|ltd|lt[eé]e|limited|limit[eé]e|corp|corporation|llc|ulc|enr|s\.?e\.?n\.?c\.?(r\.?l\.?)?)\.?$/i;

/** Nom d'employeur pour une recherche (Guichet-Emplois, moteur de recherche) : sans forme juridique finale. */
export function employerSearchName(name: string): string {
  let n = name.trim();
  for (let i = 0; i < 3 && TRAILING_LEGAL.test(n); i++) n = n.replace(TRAILING_LEGAL, '').trim();
  return n || name.trim();
}
