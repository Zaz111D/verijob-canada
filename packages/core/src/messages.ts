import type { Localized } from './types';

/** Mention permanente exigée sur toutes les pages et tous les résultats. */
export const DISCLAIMER: Localized = {
  fr: "Outil d'information gratuit, non affilié au gouvernement du Canada. Ce n'est pas un avis juridique. Vérifiez toujours sur canada.ca.",
  en: 'Free information tool, not affiliated with the Government of Canada. This is not legal advice. Always check on canada.ca.',
};

/** Mention à afficher avec toute recherche dans les listes d'employeurs EIMT. */
export const EMPLOYER_LIST_WARNING: Localized = {
  fr: 'Cette liste exclut les employeurs dont le nom contient un nom de personne, et elle a un retard de plusieurs mois. Absent ≠ faux. Présent ≠ cette offre est vraie.',
  en: "This list excludes employers whose name includes a person's name, and it is several months behind. Absent ≠ fake. Present ≠ this offer is real.",
};

/** Résumé du vérificateur d'offre. Ne jamais dire « offre sûre ». */
export function scamSummary(count: number): Localized {
  if (count === 0) {
    return {
      fr: "Aucun signal d'alerte détecté — cela ne garantit pas que l'offre est authentique.",
      en: 'No warning signs detected — this does not guarantee that the offer is genuine.',
    };
  }
  return count === 1
    ? { fr: "1 signal d'alerte détecté", en: '1 warning sign detected' }
    : { fr: `${count} signaux d'alerte détectés`, en: `${count} warning signs detected` };
}

export const SEVERITY_LABEL: Record<'eleve' | 'moyen' | 'info', Localized> = {
  eleve: { fr: 'Alerte forte', en: 'Strong warning' },
  moyen: { fr: 'Alerte', en: 'Warning' },
  info: { fr: 'À savoir', en: 'Good to know' },
};
