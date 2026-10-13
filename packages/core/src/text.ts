/**
 * Outils de normalisation de texte.
 * Toute la détection travaille sur un texte « normalisé » : minuscules, sans accents,
 * apostrophes et espaces unifiés. On garde la correspondance des positions avec le
 * texte d'origine pour afficher des extraits lisibles (avec accents) à l'utilisateur.
 */

/** Minuscules + suppression des accents + apostrophes/espaces unifiés. */
export function normalize(input: string): string {
  return input
    .normalize('NFC')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Ligatures non décomposées par NFD.
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/[\u2018\u2019\u02bc\u00b4`]/g, "'")
    .replace(/[\u00a0\u202f\u2009]/g, ' ')
    .replace(/[\u2013\u2014]/g, '-');
}

export interface Segment {
  /** Texte normalisé du segment. */
  norm: string;
  /** Texte d'origine du segment (pour l'affichage). */
  raw: string;
}

/**
 * Prépare un texte collé : version normalisée + découpage en phrases.
 * Une « phrase » se termine par . ! ? ou un retour à la ligne.
 * Les points à l'intérieur des nombres (17.50) ou des adresses (gmail.com) ne coupent pas.
 */
export function prepareText(rawInput: string): { raw: string; norm: string; segments: Segment[] } {
  // On remplace les ligatures dès le départ pour garder des positions alignées.
  const raw = rawInput
    .normalize('NFC')
    .replace(/œ/g, 'oe')
    .replace(/Œ/g, 'Oe')
    .replace(/æ/g, 'ae')
    .replace(/Æ/g, 'Ae');
  const norm = normalize(raw);
  // Les positions ne correspondent que si la normalisation n'a pas changé la longueur
  // (cas normal). Sinon, on affiche le texte normalisé.
  const aligned = norm.length === raw.length;
  const segments: Segment[] = [];
  const re = /[^.!?\n]+(?:[.!?](?=\S)[^.!?\n]*)*[.!?]*/g;
  for (const m of norm.matchAll(re)) {
    const text = m[0].trim();
    if (!text) continue;
    const start = m.index ?? 0;
    const rawText = aligned ? raw.slice(start, start + m[0].length).trim() : text;
    segments.push({ norm: text, raw: rawText });
  }
  return { raw, norm, segments };
}

/** Raccourcit un extrait pour l'affichage. */
export function excerpt(text: string, max = 160): string {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

/** Arrondi à 2 décimales, formaté selon la langue (17,50 / 17.50). */
export function formatCad(value: number, lang: 'fr' | 'en'): string {
  const s = value.toFixed(2);
  return lang === 'fr' ? `${s.replace('.', ',')} $` : `$${s}`;
}

/** Montant entier lisible : « 1 000 » (fr) / « 1,000 » (en). */
export function formatAmount(value: number, lang: 'fr' | 'en'): string {
  return value.toLocaleString(lang === 'fr' ? 'fr-CA' : 'en-CA');
}

/** Date AAAA-MM-JJ → « 30 mars 2030 » (fr) / « March 30, 2030 » (en). */
export function formatDate(iso: string, lang: 'fr' | 'en'): string {
  const d = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  const s = new Intl.DateTimeFormat(lang === 'fr' ? 'fr-CA' : 'en-CA', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d);
  // Usage français : « 1er avril » et non « 1 avril ».
  return lang === 'fr' ? s.replace(/^1 /, '1er ') : s;
}
