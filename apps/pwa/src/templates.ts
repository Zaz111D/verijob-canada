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
  /** La fiche « M'embaucher sans EIMT » (PDF) est jointe. */
  attachSheet?: boolean;
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
        d.attachSheet
          ? 'Vous trouverez mon CV en pièce jointe, ainsi qu’une fiche d’une page qui explique les trois étapes pour m’embaucher sans EIMT. Je suis disponible pour un entretien en ligne à l’heure qui vous convient.'
          : 'Vous trouverez mon CV en pièce jointe. Je suis disponible pour un entretien en ligne à l’heure qui vous convient.',
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
      d.attachSheet
        ? 'Please find my CV attached, with a one-page sheet explaining the three steps to hire me without an LMIA. I am available for an online interview at a time that suits you.'
        : 'Please find my CV attached. I am available for an online interview at a time that suits you.',
      '',
      'Thank you for your time.',
      name,
    ].filter((l): l is string => l !== null).filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n'),
  };
}

export interface CallData {
  employer: string;
  jobTitle: string;
  name: string;
  country: string;
  experienceMonths?: number;
  /** Annonce actuelle de l'employeur (titre). */
  offerTitle?: string;
  lmiaHistory?: { quarters: number; last: string };
  /** Voie à défendre au téléphone : Mobilité francophone (hors Québec), EIMT au Québec, ou EIMT ailleurs. */
  route: 'mobilite-francophone' | 'quebec' | 'eimt';
  /** Frais (règles officielles, data/rules.json). */
  fmFeeCad: number;
  lmiaFeeCad: number;
}

export interface CallSection { title: string; lines: string[] }

/** Script d'appel : présentation, réponses aux objections (immigration), envoi du CV, fin d'appel. */
export function buildCallScript(d: CallData, lang: Lang): CallSection[] {
  const name = d.name.trim() || (lang === 'fr' ? '[Votre nom]' : '[Your name]');
  const country = d.country.trim() || (lang === 'fr' ? '[votre pays]' : '[your country]');
  const exp = years(d.experienceMonths, lang);
  const fr = lang === 'fr';
  const hook = d.offerTitle
    ? (fr ? `J’ai vu votre annonce « ${d.offerTitle} ».` : `I saw your job posting “${d.offerTitle}”.`)
    : d.lmiaHistory
      ? (fr ? 'J’ai vu dans les listes publiques du gouvernement que vous avez déjà embauché des travailleurs étrangers.' : 'I saw in the government’s public lists that you have hired foreign workers before.')
      : (fr ? 'Je m’intéresse beaucoup à votre entreprise.' : 'I am very interested in your company.');
  const intro = fr
    ? [`« Bonjour, je m’appelle ${name}. J’appelle du ${country}. Je suis ${d.jobTitle}${exp ? ` avec ${exp} d’expérience` : ''}. ${hook} Est-ce que vous recrutez pour ce poste en ce moment ? Puis-je parler à la personne responsable de l’embauche ? »`]
    : [`“Hello, my name is ${name}. I am calling from ${country}. I am a ${d.jobTitle}${exp ? ` with ${exp} of experience` : ''}. ${hook} Are you currently hiring for this position? May I speak with the person in charge of hiring?”`];
  const objection: string[] = [];
  if (d.route === 'mobilite-francophone') {
    objection.push(fr
      ? `« Je comprends. Je suis francophone : avec la Mobilité francophone, vous n’avez PAS besoin d’EIMT. Vous présentez l’offre dans le Portail des employeurs d’IRCC avec le code C16 et vous payez ${d.fmFeeCad} $ de frais de conformité. Je fais ensuite moi-même ma demande de permis de travail. Je peux vous envoyer une fiche d’une page qui explique les trois étapes. »`
      : `“I understand. I speak French: with Francophone Mobility, you do NOT need an LMIA. You submit the offer in IRCC’s Employer Portal with code C16 and pay a $${d.fmFeeCad} compliance fee. I then apply for my work permit myself. I can send you a one-page sheet explaining the three steps.”`);
  } else {
    objection.push(fr
      ? `« Je comprends. ${d.route === 'quebec' ? 'Au Québec, l’embauche passe par une EIMT et un certificat d’acceptation du Québec (CAQ). ' : 'L’embauche passe par une EIMT. '}Les frais de traitement de l’EIMT sont de ${d.lmiaFeeCad} $ par poste, payés par l’employeur.${d.lmiaHistory ? ' Votre entreprise l’a déjà fait, d’après les listes publiques.' : ''} De mon côté, je suis prêt·e à commencer dès que mon permis est délivré. »`
      : `“I understand. ${d.route === 'quebec' ? 'In Quebec, hiring goes through an LMIA and a Quebec Acceptance Certificate (CAQ). ' : 'Hiring goes through an LMIA. '}The LMIA processing fee is $${d.lmiaFeeCad} per position, paid by the employer.${d.lmiaHistory ? ' According to the public lists, your company has done it before.' : ''} On my side, I am ready to start as soon as my permit is issued.”`);
  }
  objection.push(fr
    ? '« Les délais dépendent d’Immigration Canada, mais je peux préparer tous mes documents dès maintenant. »'
    : '“Processing times depend on Immigration Canada, but I can prepare all my documents right now.”');
  return [
    { title: fr ? '1. Se présenter (30 secondes)' : '1. Introduce yourself (30 seconds)', lines: intro },
    { title: fr ? '2. Si on vous dit : « l’immigration, c’est compliqué » ou « on préfère des gens déjà au Canada »' : '2. If they say: “immigration is complicated” or “we prefer people already in Canada”', lines: objection },
    {
      title: fr ? '3. Si on vous dit : « envoyez votre CV »' : '3. If they say: “send your CV”',
      lines: [fr
        ? '« Avec plaisir. À quelle adresse e-mail, et à quel nom ? Je vous l’envoie aujourd’hui. » Notez l’adresse, le nom de la personne et la date dans le Suivi.'
        : '“With pleasure. To which e-mail address, and to whose attention? I will send it today.” Write down the address, the person’s name and the date in Tracking.'],
    },
    {
      title: fr ? '4. Finir l’appel' : '4. End the call',
      lines: [fr
        ? '« Merci beaucoup pour votre temps. Puis-je vous rappeler dans une semaine si je n’ai pas de nouvelles ? »'
        : '“Thank you very much for your time. May I call you back in a week if I have not heard from you?”'],
    },
    {
      title: fr ? '⚠ Toujours' : '⚠ Always',
      lines: [fr
        ? 'Un vrai employeur ne vous demande jamais d’argent. Si on vous demande de payer (dossier, EIMT, visa, formation) : remerciez et raccrochez.'
        : 'A real employer never asks you for money. If you are asked to pay (file, LMIA, visa, training): say thank you and hang up.'],
    },
  ];
}
