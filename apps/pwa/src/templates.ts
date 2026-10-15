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
  /** Historique public d'EIMT de l'employeur (listes d'EDSC) : nombre de trimestres et dernier trimestre. */
  lmiaHistory?: { quarters: number; last: string };
  /** Expérience dans un métier proche (passerelle officielle CNP). */
  transfer?: { job: string; skills: string };
  /** Le métier exige un permis provincial (ex. agent de sécurité). */
  licence?: boolean;
}

/** « 2026Q1 » → « 2026 T1 » / « 2026 Q1 ». */
function quarterLabel(q: string, lang: Lang): string {
  const m = /^(\d{4})Q([1-4])$/.exec(q);
  return m ? `${m[1]} ${lang === 'fr' ? 'T' : 'Q'}${m[2]}` : q;
}

function historySentence(d: MessageData, lang: Lang): string | null {
  const h = d.lmiaHistory;
  if (!h) return null;
  return lang === 'fr'
    ? `J’ai vu dans les listes publiques d’Emploi et Développement social Canada que votre entreprise a obtenu des EIMT ${h.quarters > 1 ? `pendant ${h.quarters} trimestres` : 'récemment'} (dernière : ${quarterLabel(h.last, 'fr')}). Même si aucune offre n’est affichée en ce moment, je me permets de vous écrire.`
    : `I saw in Employment and Social Development Canada’s public lists that your company obtained LMIAs ${h.quarters > 1 ? `in ${h.quarters} quarters` : 'recently'} (latest: ${quarterLabel(h.last, 'en')}). Even if no job is posted right now, I am taking the liberty of writing to you.`;
}

/** « de » élidé devant une voyelle ou un h : « poste d’agent·e », « poste de cuisinier ». */
function de(word: string): string {
  return /^[aeiouyhàâéèêëîïôöûü]/i.test(word) ? `d’${word}` : `de ${word}`;
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
      if (d.lmiaHistory) {
        return lang === 'fr'
          ? 'Je suis disponible pour un emploi dans le cadre du Programme des travailleurs étrangers temporaires si vous recrutez à nouveau.'
          : 'I am available for a job under the Temporary Foreign Worker Program if you are hiring again.';
      }
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
        `Je m’appelle ${name} et j’habite au ${country}. Je vous écris pour proposer ma candidature au poste ${de(d.jobTitle)} chez ${d.employer}.`,
        d.transfer
          ? `J’ai ${exp ? `${exp} d’expérience` : 'de l’expérience'} comme ${d.transfer.job} : ${d.transfer.skills}. Ces tâches correspondent à celles d’un poste ${de(d.jobTitle)}.`
          : exp ? `J’ai ${exp} d’expérience dans ce métier.` : 'Je suis motivé·e, fiable et prêt·e à apprendre.',
        d.licence ? 'Je suis prêt·e à suivre la formation et à obtenir le permis provincial exigé pour ce métier.' : null,
        langs.length ? `Je parle ${langs.join(' et ')}.` : null,
        historySentence(d, 'fr'),
        '',
        routeParagraph(d, 'fr'),
        '',
        'Vous trouverez mon CV en pièce jointe. Je suis disponible pour un entretien en ligne à l’heure qui vous convient.',
        '',
        'Merci pour votre attention.',
        name,
      ].filter((l): l is string => l !== null).filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n'),
    };
  }
  return {
    subject: `Application – ${d.jobTitle} (NOC ${d.nocCode})`,
    body: [
      'Hello,',
      '',
      `My name is ${name} and I live in ${country}. I am writing to apply for the position of ${d.jobTitle} at ${d.employer}.`,
      d.transfer
        ? `I have ${exp ? `${exp} of experience` : 'experience'} as a ${d.transfer.job}: ${d.transfer.skills}. These duties match those of a ${d.jobTitle}.`
        : exp ? `I have ${exp} of experience in this job.` : 'I am motivated, reliable and eager to learn.',
      d.licence ? 'I am ready to complete the training and obtain the provincial licence required for this job.' : null,
      langs.length ? `I speak ${langs.join(' and ')}.` : null,
      historySentence(d, 'en'),
      '',
      routeParagraph(d, 'en'),
      '',
      'Please find my CV attached. I am available for an online interview at a time that suits you.',
      '',
      'Thank you for your time.',
      name,
    ].filter((l): l is string => l !== null).filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n'),
  };
}
