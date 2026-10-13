/**
 * Extraction des salaires en dollars canadiens dans une offre, convertis en taux horaire.
 * Les montants en FCFA, naira, etc. sont ignorés (ce sont souvent des frais, pas des salaires).
 */

export interface WageMention {
  hourly: number;
  period: 'hour' | 'week' | 'month' | 'year';
  /** Extrait normalisé où le salaire a été trouvé. */
  match: string;
}

/** Heures de référence : 40 h/semaine, 52 semaines/an. */
const HOURS_PER = { hour: 1, week: 40, month: (40 * 52) / 12, year: 40 * 52 } as const;

const NUMBER = String.raw`\d{1,3}(?:[ ,.]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?`;
const CURRENCY_BEFORE = String.raw`(?:ca?\$|c\$|cad|\$)\s?`;
const CURRENCY_AFTER = String.raw`\s?(?:\$\s?(?:ca|cad|can)?|cad|dollars?(?:\s+canadiens?)?)`;

const UNITS: Array<{ period: WageMention['period']; re: string }> = [
  { period: 'hour', re: String.raw`\/\s?h(?:r|eure)?\b|\/\s?hour|de l'heure|par heure|l'heure|an hour|per hour|hourly|horaire|\bheure\b` },
  { period: 'week', re: String.raw`\/\s?semaine|par semaine|per week|a week|weekly|\/\s?week|hebdomadaire` },
  { period: 'month', re: String.raw`\/\s?mois|par mois|mensuel(?:lement)?|per month|a month|monthly|\/\s?month|\/\s?mo\b` },
  { period: 'year', re: String.raw`\/\s?an\b|par an\b|par annee|annuel(?:lement)?|per year|a year|annually|yearly|\/\s?year|\/\s?yr\b` },
];

/** Convertit « 6,000 », « 4 500 », « 17,50 », « 17.50 », « 90 000 » en nombre. */
export function parseAmount(s: string): number {
  let t = s.replace(/\s/g, '');
  const lastSep = Math.max(t.lastIndexOf(','), t.lastIndexOf('.'));
  if (lastSep >= 0) {
    const decimals = t.length - lastSep - 1;
    if (decimals === 3) {
      // Séparateur de milliers uniquement.
      t = t.replace(/[.,]/g, '');
    } else {
      // Dernier séparateur = décimal ; les autres = milliers.
      t = `${t.slice(0, lastSep).replace(/[.,]/g, '')}.${t.slice(lastSep + 1)}`;
    }
  }
  return Number(t);
}

/** Renvoie tous les salaires en $ CA trouvés dans un texte normalisé, convertis en taux horaire. */
export function extractWages(normText: string): WageMention[] {
  const out: WageMention[] = [];
  const unitAlt = UNITS.map((u) => `(${u.re})`).join('|');
  const patterns = [
    new RegExp(`${CURRENCY_BEFORE}(${NUMBER})[^\\d\\n]{0,25}?(?:${unitAlt})`, 'g'),
    new RegExp(`(${NUMBER})${CURRENCY_AFTER}[^\\d\\n]{0,25}?(?:${unitAlt})`, 'g'),
  ];
  for (const re of patterns) {
    for (const m of normText.matchAll(re)) {
      const amount = parseAmount(m[1] ?? '');
      const unitIndex = m.slice(2).findIndex((g) => g !== undefined);
      const unit = UNITS[unitIndex];
      if (!unit || !Number.isFinite(amount) || amount <= 0) continue;
      out.push({ hourly: amount / HOURS_PER[unit.period], period: unit.period, match: m[0] });
    }
  }
  return out;
}

/** Vrai si le texte contient un taux de salaire (« 17 $/h », « $6,000 monthly »…). */
export function hasWageRate(normText: string): boolean {
  return extractWages(normText).length > 0;
}
