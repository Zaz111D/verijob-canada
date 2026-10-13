/**
 * Modèles de candidature spontanée (FR / EN), adaptés à la voie d'immigration estimée.
 * Ton honnête : aucune promesse, aucune mention de paiement ; le candidat se présente
 * et demande si l'employeur recrute à l'international.
 */
import type { PathwayId } from '@verijob/core';
import type { Lang } from './i18n';

export interface MessageData {
  employer: string;
  jobTitle: string;
  nocCode: string;
  name: string;
  country: string;
  experienceMonths?: number;
  frenchOral?: number;
  englishMin?: number;
  /** Voie estimée la plus favorable (pour adapter un paragraphe). */
  pathway?: PathwayId;
  /** Programme de l'employeur s'il est désigné (PICR / PICRF). */
  designatedProgram?: 'RCIP' | 'FCIP';
  community?: string;
}

function years(months: number | undefined, lang: Lang): string {
  if (!months) return '';
  if (months < 12) return lang === 'fr' ? `${months} mois` : `${months} months`;
  const y = Math.floor(months / 12);
  return lang === 'fr' ? `${y} an${y > 1 ? 's' : ''}` : `${y} year${y > 1 ? 's' : ''}`;
}

function routeParagraph(d: MessageData, lang: Lang): string {
  if (d.designatedProgram) {
    const prog = lang === 'fr'
      ? (d.designatedProgram === 'FCIP' ? 'Programme pilote d’immigration dans les communautés francophones (PICRF)' : 'Programme pilote d’immigration dans les communautés rurales (PICR)')
      : (d.designatedProgram === 'FCIP' ? 'Francophone Community Immigration Pilot (FCIP)' : 'Rural Community Immigration Pilot (RCIP)');
    return lang === 'fr'
      ? `J’ai vu que votre entreprise est désignée dans le cadre du ${prog}${d.community ? ` à ${d.community}` : ''}. Je serais heureux·se de déposer ma candidature si un poste est ouvert.`
      : `I saw that your company is designated under the ${prog}${d.community ? ` in ${d.community}` : ''}. I would be glad to apply if a position is open.`;
  }
  switch (d.pathway) {
    case 'mobilite-francophone':
      return lang === 'fr'
        ? `Je suis francophone${d.frenchOral ? ` (niveau NCLC ${d.frenchOral} à l’oral)` : ''}. Pour un poste hors du Québec, je pourrais obtenir un permis de travail dans le cadre de la Mobilité francophone, sans que vous ayez besoin d’une EIMT.`
        : `I am a French speaker${d.frenchOral ? ` (NCLC ${d.frenchOral} oral level)` : ''}. For a job outside Quebec, I could obtain a work permit under Francophone Mobility, without you needing an LMIA.`;
    case 'eimt-agricole':
      return lang === 'fr'
        ? 'Je sais que vous avez déjà recruté des travailleurs étrangers. Je suis disponible pour un emploi dans le cadre du volet agricole du Programme des travailleurs étrangers temporaires.'
        : 'I know you have hired foreign workers before. I am available for a job under the Agricultural Stream of the Temporary Foreign Worker Program.';
    default:
      return lang === 'fr'
        ? 'Je sais que vous avez déjà recruté des travailleurs étrangers dans le cadre du Programme des travailleurs étrangers temporaires. Je suis disponible si vous recrutez à nouveau.'
        : 'I know you have hired foreign workers under the Temporary Foreign Worker Program. I am available if you are hiring again.';
  }
}

/** Construit l'objet et le corps du message. Les champs vides sont remplacés par des repères visibles. */
export function buildMessage(d: MessageData, lang: Lang): { subject: string; body: string } {
  const name = d.name.trim() || (lang === 'fr' ? '[Votre nom]' : '[Your name]');
  const country = d.country.trim() || (lang === 'fr' ? '[votre pays]' : '[your country]');
  const exp = years(d.experienceMonths, lang);
  const langs: string[] = [];
  if (d.frenchOral) langs.push(lang === 'fr' ? `français (NCLC ${d.frenchOral} à l’oral)` : `French (NCLC ${d.frenchOral} oral)`);
  if (d.englishMin) langs.push(lang === 'fr' ? `anglais (CLB ${d.englishMin})` : `English (CLB ${d.englishMin})`);

  if (lang === 'fr') {
    return {
      subject: `Candidature spontanée – ${d.jobTitle} (CNP ${d.nocCode})`,
      body: [
        'Bonjour,',
        '',
        `Je m’appelle ${name} et j’habite au ${country}. Je vous écris pour proposer ma candidature au poste de ${d.jobTitle} chez ${d.employer}.`,
        exp ? `J’ai ${exp} d’expérience dans ce métier.` : 'Je suis motivé·e, fiable et prêt·e à apprendre.',
        langs.length ? `Je parle ${langs.join(' et ')}.` : '',
        '',
        routeParagraph(d, 'fr'),
        '',
        'Vous trouverez mon CV en pièce jointe. Je suis disponible pour un entretien en ligne à l’heure qui vous convient.',
        '',
        'Merci pour votre attention.',
        name,
      ].filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n'),
    };
  }
  return {
    subject: `Application – ${d.jobTitle} (NOC ${d.nocCode})`,
    body: [
      'Hello,',
      '',
      `My name is ${name} and I live in ${country}. I am writing to apply for the position of ${d.jobTitle} at ${d.employer}.`,
      exp ? `I have ${exp} of experience in this job.` : 'I am motivated, reliable and eager to learn.',
      langs.length ? `I speak ${langs.join(' and ')}.` : '',
      '',
      routeParagraph(d, 'en'),
      '',
      'Please find my CV attached. I am available for an online interview at a time that suits you.',
      '',
      'Thank you for your time.',
      name,
    ].filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n'),
  };
}
