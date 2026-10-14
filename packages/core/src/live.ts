/**
 * Informations « en direct » publiées par IRCC :
 * - rondes d'invitations d'Entrée express (fichier JSON officiel) ;
 * - fil d'actualités d'IRCC (api.io.canada.ca).
 * Ces fonctions ne font AUCUN appel réseau : elles transforment les fichiers reçus
 * (par le pipeline ou par l'appli) en données simples, testables hors ligne.
 */
import { normalize } from './text';
import type { ExpressEntryAccess, Localized, Rules } from './types';

// ---------------------------------------------------------------------------
// Entrée express
// ---------------------------------------------------------------------------

/** Ronde telle que publiée dans ee_rounds_123_{fr,en}.json (champs utiles seulement). */
export interface RawRound {
  drawNumber?: string;
  drawDate?: string;
  drawName?: string;
  drawSize?: string;
  drawCRS?: string;
}

export interface ExpressEntryRound {
  number: number;
  date: string;
  name: Localized;
  /** Nombre d'invitations. */
  size: number | null;
  /** Note minimale (SCG / CRS) du dernier candidat invité. */
  crs: number | null;
  /** Identifiant de catégorie de rules.json (ou « autre »). */
  category: string;
  access: ExpressEntryAccess;
}

export interface ExpressEntryData {
  /** Rondes, la plus récente d'abord. */
  rounds: ExpressEntryRound[];
}

/** « 3 500 », « 3,500 », « 3 500 » → 3500 ; valeur absente ou illisible → null. */
function toInt(v: string | undefined): number | null {
  if (!v) return null;
  const n = Number(v.replace(/[^\d]/g, ''));
  return v.match(/\d/) && Number.isFinite(n) ? n : null;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Catégorie d'une ronde d'après son nom (premier motif reconnu, dans l'ordre de rules.json). */
export function classifyRound(rules: Rules, name: string): { category: string; access: ExpressEntryAccess } {
  const n = normalize(name);
  for (const c of rules.expressEntry.categories) {
    if (c.match.some((m) => new RegExp(`\\b${escapeRe(normalize(m))}`).test(n))) return { category: c.id, access: c.access };
  }
  return { category: 'autre', access: 'autre' };
}

/**
 * Transforme le(s) fichier(s) officiel(s) en liste de rondes.
 * `fr` et `en` sont les deux versions du fichier ; une seule suffit (le nom est alors repris tel quel).
 */
export function parseExpressEntryRounds(
  rules: Rules,
  files: { fr?: { rounds?: RawRound[] }; en?: { rounds?: RawRound[] } },
  limit = 40,
): ExpressEntryData {
  const fr = files.fr?.rounds ?? [];
  const en = files.en?.rounds ?? [];
  const enByNumber = new Map(en.map((r) => [r.drawNumber, r]));
  const frByNumber = new Map(fr.map((r) => [r.drawNumber, r]));
  const base = fr.length ? fr : en;
  const rounds: ExpressEntryRound[] = [];
  for (const r of base) {
    const number = toInt(r.drawNumber);
    if (number === null || !r.drawDate || !/^\d{4}-\d{2}-\d{2}$/.test(r.drawDate) || !r.drawName) continue;
    const nameFr = (frByNumber.get(r.drawNumber)?.drawName ?? r.drawName).trim();
    const nameEn = (enByNumber.get(r.drawNumber)?.drawName ?? r.drawName).trim();
    rounds.push({
      number,
      date: r.drawDate,
      name: { fr: nameFr, en: nameEn },
      size: toInt(r.drawSize),
      crs: toInt(r.drawCRS),
      ...classifyRound(rules, `${nameEn} ${nameFr}`),
    });
  }
  rounds.sort((a, b) => b.date.localeCompare(a.date) || b.number - a.number);
  return { rounds: rounds.slice(0, limit) };
}

/** Dernière ronde de chaque catégorie, dans l'ordre de rules.json (catégories accessibles d'abord). */
export function latestRoundByCategory(rules: Rules, data: ExpressEntryData): ExpressEntryRound[] {
  const order: ExpressEntryAccess[] = ['etranger', 'nomination', 'canada', 'autre'];
  const ids = rules.expressEntry.categories.map((c) => c.id);
  const latest = new Map<string, ExpressEntryRound>();
  for (const r of data.rounds) if (!latest.has(r.category)) latest.set(r.category, r);
  return [...latest.values()].sort((a, b) =>
    order.indexOf(a.access) - order.indexOf(b.access) || ids.indexOf(a.category) - ids.indexOf(b.category));
}

// ---------------------------------------------------------------------------
// Actualités IRCC
// ---------------------------------------------------------------------------

export interface NewsItem {
  title: string;
  link: string;
  /** Date de publication AAAA-MM-JJ. */
  date: string;
  teaser: string;
}

/**
 * Garde les nouvelles utiles à une personne qui cherche un emploi au Canada :
 * le TITRE doit contenir un mot de `include` et aucun mot de `exclude` (rules.json, « liveNews »).
 * Seuls les liens vers canada.ca sont acceptés.
 */
export function filterNews(rules: Rules, feed: unknown): NewsItem[] {
  const entries = (feed as { feed?: { entry?: unknown } } | undefined)?.feed?.entry;
  if (!Array.isArray(entries)) return [];
  const include = rules.liveNews.include.map(normalize);
  const exclude = rules.liveNews.exclude.map(normalize);
  const out: NewsItem[] = [];
  for (const e of entries as Array<Record<string, unknown>>) {
    const title = typeof e.title === 'string' ? e.title.trim() : '';
    const link = typeof e.link === 'string' ? e.link : '';
    const date = typeof e.publishedDate === 'string' ? e.publishedDate.slice(0, 10) : '';
    if (!title || !/^https:\/\/www\.canada\.ca\//.test(link) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const t = normalize(title);
    if (!include.some((w) => t.includes(w)) || exclude.some((w) => t.includes(w))) continue;
    if (out.some((o) => normalize(o.title) === t)) continue; // même communiqué publié deux fois (ex. version régionale)
    const teaser = typeof e.teaser === 'string' ? e.teaser.trim() : '';
    out.push({ title, link, date, teaser: teaser.length > 280 ? `${teaser.slice(0, 277).trimEnd()}…` : teaser });
  }
  out.sort((a, b) => b.date.localeCompare(a.date));
  return out.slice(0, rules.liveNews.maxItems);
}
