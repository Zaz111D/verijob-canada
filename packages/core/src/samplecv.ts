/**
 * « CV d'exemple pour ce poste » : modèle de CV canadien pour un candidat qui vit hors du Canada.
 *
 * Ce qui est VRAI et vérifiable :
 * - chaque puce d'expérience reprend une fonction principale OFFICIELLE du métier (CNP 2021, Statistique Canada) ;
 * - les exigences listées sont les conditions d'accès officielles du métier ;
 * - la mise en page suit le Guichet-Emplois (« Comment rédiger un bon CV ») : 2 pages, sans photo ni âge,
 *   verbes à l'infinitif, 5 à 7 puces par poste, réalisations chiffrées, mots de l'offre repris.
 * Ce qui est À REMPLACER : tout ce qui est entre crochets (nom, dates, chiffres, établissement). Aucun résultat
 * n'est inventé : l'exemple montre OÙ mettre une preuve, la personne y met la sienne.
 * Les employeurs sont décrits par leur type, jamais par un vrai nom (le candidat est fictif).
 */
import { offerKeywords } from './cv';
import { findNoc, findTransfer } from './noc';
import { normalize } from './text';
import type { LanguageLevels, NocData, Profile, Rules } from './types';

type Lang = 'fr' | 'en';

export interface NocElements {
  code: string;
  duties: Array<{ headingFr?: string; headingEn?: string; items: Array<{ fr: string; en: string }> }>;
  requirements: Array<{ fr: string; en: string }>;
  examplesFr: string[];
  examplesEn: string[];
}
export interface NocElementsData {
  source: { id: string; urlFr: string; urlEn: string; verifiedAt: string };
  nocs: NocElements[];
}

export interface SampleBullet {
  /** Fonction officielle (CNP), à l'infinitif. */
  text: string;
  /** Repère de réalisation à remplacer par une preuve réelle. */
  result?: string;
  /** La puce reprend un mot important de l'offre. */
  matched: boolean;
}
export interface SampleJob { title: string; employer: string; place: string; period: string; bullets: SampleBullet[] }

export interface SampleCv {
  lang: Lang;
  noc: string;
  /** Titre du CV (intitulé de l'offre ou du métier). */
  title: string;
  header: { name: string; location: string; contact: string; availability: string };
  summary: string;
  skills: string[];
  experience: SampleJob[];
  education: string[];
  certifications: string[];
  languages: string[];
  /** Conditions d'accès officielles du métier (à prouver dans le CV quand elles s'appliquent). */
  requirements: string[];
  /** Mots importants de l'offre absents de l'exemple : à prouver avec sa propre expérience. */
  offerToProve: string[];
  /** Mots de l'offre déjà repris par l'exemple. */
  offerMatched: string[];
  /** Le CV part d'un métier proche (passerelle officielle). */
  transferFrom?: string;
}

export interface SampleCvOptions {
  rules: Rules;
  nocData: NocData;
  elements: NocElementsData;
  noc: string;
  lang: Lang;
  profile?: Profile;
  offer?: { title?: string; text?: string };
}

/** Puces par poste (Guichet-Emplois : 5 à 7 au plus). */
const MAX_BULLETS = 6;

/** Type d'employeur selon le groupe de métiers (jamais un vrai nom : le candidat est fictif). */
const EMPLOYER_TYPE: Record<string, { fr: string; en: string }> = {
  agriculture: { fr: 'Exploitation agricole', en: 'Farm' },
  soins: { fr: 'Établissement de soins', en: 'Care facility' },
  manoeuvres: { fr: 'Entreprise de construction et logistique', en: 'Construction and logistics company' },
  transformation: { fr: 'Usine de transformation alimentaire', en: 'Food processing plant' },
  services: { fr: 'Entreprise de services', en: 'Service company' },
  securite: { fr: 'Entreprise de sécurité privée', en: 'Private security company' },
  couture: { fr: 'Atelier de couture ou usine de confection', en: 'Tailoring workshop or garment factory' },
  '43201': { fr: 'Établissement pénitentiaire public', en: 'Public correctional facility' },
};

const P = {
  name: { fr: '[Prénom NOM]', en: '[First name LAST NAME]' },
  location: { fr: '[Ville], [Pays]', en: '[City], [Country]' },
  contact: { fr: '+[indicatif] [numéro] | [prenom.nom]@[fournisseur].com', en: '+[country code] [number] | [first.last]@[provider].com' },
  availability: {
    fr: 'Disponible pour m’installer au Canada — permis de travail requis',
    en: 'Available to relocate to Canada — work permit required',
  },
  place: { fr: '[Ville], [Pays]', en: '[City], [Country]' },
  current: { fr: '[mois année] – aujourd’hui', en: '[month year] – present' },
  previous: { fr: '[mois année] – [mois année]', en: '[month year] – [month year]' },
  result: [
    { fr: '[résultat chiffré : combien, à quelle fréquence, pour combien de personnes]', en: '[measurable result: how many, how often, for how many people]' },
    { fr: '[réalisation concrète : ce qui s’est amélioré grâce à vous]', en: '[concrete achievement: what improved thanks to you]' },
  ],
  years: { fr: '[X] ans', en: '[X] years' },
  degree: { fr: '[Votre diplôme exact] — [Établissement], [Ville, Pays] — [Année]', en: '[Your exact diploma] — [School], [City, Country] — [Year]' },
  previousTitle: { fr: '[Emploi précédent, s’il est utile pour ce poste]', en: '[Previous job, if relevant to this position]' },
  previousBullet: { fr: '[Tâche liée au poste visé, commençant par un verbe à l’infinitif]', en: '[Task related to the target job, starting with an action verb]' },
} as const;

/** Certifications reconnues dans les conditions d'accès officielles (repérées par mots-clés). */
const CERTS: Array<{ re: RegExp; fr: string; en: string }> = [
  { re: /secourisme|first aid/, fr: 'Secourisme et RCR — [obtenu en AAAA / à obtenir]', en: 'First aid and CPR — [obtained YYYY / to obtain]' },
  { re: /bureau de la securite privee|security officer|agent de securite/, fr: 'Permis provincial d’agent de sécurité — à obtenir à l’arrivée au Canada', en: 'Provincial security guard licence — to obtain on arrival in Canada' },
  { re: /simdut|whmis/, fr: 'SIMDUT (sécurité des produits dangereux) — [à obtenir]', en: 'WHMIS (hazardous products safety) — [to obtain]' },
  { re: /salubrite|food safety|manipulation des aliments|food handl/, fr: 'Hygiène et salubrité alimentaires — [obtenu / à obtenir]', en: 'Food safety / food handling — [obtained / to obtain]' },
  { re: /chariot elevateur|forklift/, fr: 'Conduite de chariot élévateur — [certificat, année]', en: 'Forklift operation — [certificate, year]' },
  { re: /permis de conduire|driver's licence/, fr: 'Permis de conduire — [classe, pays]', en: 'Driver’s licence — [class, country]' },
];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** Racine simple FR/EN : « contrôler », « contrôle », « contrôles » → « control ». */
const root = (w: string) => (w.length > 5 ? w.replace(/(ers|er|es|e|s|x)$/, '') : w.length > 4 ? w.replace(/[sx]$/, '') : w);
const words = (s: string) => new Set(normalize(s).split(/[^a-z0-9]+/).filter((w) => w.length >= 4).map(root));

function langLine(label: string, l: LanguageLevels | undefined, test: string, lang: Lang): string {
  const v = [l?.speaking, l?.listening, l?.reading, l?.writing];
  if (v.every((x) => x !== undefined)) {
    const min = Math.min(...(v as number[]));
    return `${label} — ${test} ${min}`;
  }
  return `${label} — ${lang === 'fr' ? `[niveau, ex. : ${test} 7 au test officiel]` : `[level, e.g. ${test} 7 on the official test]`}`;
}

/** Fonctions officielles d'un métier, triées : celles qui reprennent les mots de l'offre d'abord. */
function rankedDuties(el: NocElements, keys: Set<string>): Array<{ fr: string; en: string; score: number }> {
  // Plusieurs sous-groupes (ex. agents de sécurité / enquêteurs privés) : le 1er sauf si l'offre en vise un autre.
  const groups = el.duties.map((g) => ({ g, score: g.items.reduce((s, it) => s + overlap(it, keys), 0) + overlap({ fr: g.headingFr ?? '', en: g.headingEn ?? '' }, keys) * 2 }));
  const best = groups.reduce((a, b) => (b.score > a.score ? b : a), groups[0]!);
  const pool = [...best.g.items, ...(el.duties.length > 1 && best.g.items.length < 4 ? el.duties.filter((g) => g !== best.g).flatMap((g) => g.items) : [])];
  return pool.map((it, i) => ({ ...it, score: overlap(it, keys), i }))
    .sort((a, b) => b.score - a.score || a.i - b.i);
}
function overlap(it: { fr: string; en: string }, keys: Set<string>): number {
  if (!keys.size) return 0;
  const w = new Set([...words(it.fr), ...words(it.en)]);
  return [...keys].filter((k) => w.has(k)).length;
}

export function buildSampleCv(o: SampleCvOptions): SampleCv {
  const { lang, profile } = o;
  const entry = findNoc(o.nocData, o.noc);
  const el = o.elements.nocs.find((n) => n.code === o.noc);
  if (!entry || !el) throw new Error(`Métier inconnu pour le CV d'exemple : ${o.noc}`);
  const t = (x: { fr: string; en: string }) => x[lang];
  const job = cap((lang === 'fr' ? entry.jobFr : entry.jobEn) ?? (lang === 'fr' ? entry.titleFr : entry.titleEn));
  const title = o.offer?.title?.trim() || job;

  const offerKeys = o.offer?.text ? offerKeywords(o.offer.text, o.rules.cv.offerKeywords) : [];
  const keyStems = new Set(offerKeys.flatMap((k) => [...words(k)]));

  const transfer = findTransfer(o.rules, profile?.currentNoc, o.noc);
  const fromEl = transfer && o.elements.nocs.find((n) => n.code === transfer.from);
  const years = profile?.experienceMonths ? (lang === 'fr' ? `${Math.max(1, Math.round(profile.experienceMonths / 12))} ans` : `${Math.max(1, Math.round(profile.experienceMonths / 12))} years`) : t(P.years);

  /** Fonctions affichées (FR + EN) : sert à savoir quels mots de l'offre l'exemple reprend vraiment. */
  const shown: Array<{ fr: string; en: string }> = [];
  const toBullets = (list: Array<{ fr: string; en: string; score: number }>, n: number, withResults: boolean): SampleBullet[] =>
    list.slice(0, n).map((d, i) => (shown.push(d), {
      text: cap(t(d)),
      matched: d.score > 0,
      ...(withResults && i < P.result.length ? { result: t(P.result[i]!) } : {}),
    }));

  const experience: SampleJob[] = [];
  const target = rankedDuties(el, keyStems);
  if (transfer && fromEl) {
    // Métier d'origine (ex. gardien·ne de prison) : ses fonctions officielles, celles communes au métier visé d'abord.
    const sharedFirst = new Set(transfer.shared.map((s) => normalize(s.fromFr)));
    const fromDuties = rankedDuties(fromEl, keyStems)
      .map((d) => ({ ...d, score: d.score + ([...sharedFirst].some((s) => normalize(d.fr).startsWith(s.slice(0, 40))) ? 10 : 0) }))
      .sort((a, b) => b.score - a.score);
    experience.push({
      title: cap(lang === 'fr' ? transfer.fromJobFr : transfer.fromJobEn),
      employer: t(EMPLOYER_TYPE[transfer.from] ?? EMPLOYER_TYPE.services!),
      place: t(P.place), period: t(P.current),
      bullets: toBullets(fromDuties, 5, true),
    });
    experience.push({ title: t(P.previousTitle), employer: '', place: t(P.place), period: t(P.previous), bullets: [{ text: t(P.previousBullet), matched: false }] });
  } else {
    experience.push({ title: job, employer: t(EMPLOYER_TYPE[entry.group] ?? EMPLOYER_TYPE.services!), place: t(P.place), period: t(P.current), bullets: toBullets(target, 5, true) });
    experience.push({ title: job, employer: t(EMPLOYER_TYPE[entry.group] ?? EMPLOYER_TYPE.services!), place: t(P.place), period: t(P.previous), bullets: toBullets(target.slice(5), 3, false) });
  }
  if (!experience[1]!.bullets.length) experience.pop();

  const summary = transfer
    ? (lang === 'fr'
      ? `${cap(transfer.fromJobFr)} avec ${years} d’expérience : ${transfer.skillsFr}. Je souhaite mettre ces compétences au service d’un poste ${/^[aeiouyh]/i.test(job) ? 'd’' : 'de '}${job.toLowerCase()} au Canada.`
      : `${cap(transfer.fromJobEn)} with ${years} of experience: ${transfer.skillsEn}. Seeking to apply these skills as a ${job.toLowerCase()} in Canada.`)
    : (lang === 'fr'
      ? `${job} avec ${years} d’expérience. Habitué·e à ${target.slice(0, 2).map((d) => d.fr.split(/[,;]/)[0]).join(' et à ')}. Fiable, ponctuel·le et prêt·e à m’installer au Canada.`
      : `${job} with ${years} of experience. Used to ${target.slice(0, 2).map((d) => d.en.split(/[,;]/)[0]!.toLowerCase()).join(' and to ')}. Reliable, punctual and ready to relocate to Canada.`);

  // Compétences clés : fonctions officielles courtes (≤ 11 mots), dans l'ordre de pertinence pour l'offre ;
  // pour une passerelle, les compétences communes aux deux métiers.
  const skills = transfer
    ? (lang === 'fr' ? transfer.skillsFr : transfer.skillsEn).split(/,\s*/).map(cap)
    : target.map((d) => cap(t(d))).filter((x) => x.split(' ').length <= 11).slice(0, 5);

  const reqText = normalize(el.requirements.map((r) => `${r.fr} ${r.en}`).join(' '));
  const certs = CERTS.filter((c) => c.re.test(reqText));
  const certifications = certs.map((c) => (lang === 'fr' ? c.fr : c.en));

  const cvWords = words([title, summary, ...skills, ...shown.map((d) => `${d.fr} ${d.en}`), ...certs.map((c) => `${c.fr} ${c.en}`)].join(' '));
  const offerMatched = offerKeys.filter((k) => [...words(k)].every((w) => cvWords.has(w)));
  const offerToProve = offerKeys.filter((k) => !offerMatched.includes(k));

  const languages = [
    langLine(lang === 'fr' ? 'Français' : 'French', profile?.french, 'NCLC', lang),
    langLine(lang === 'fr' ? 'Anglais' : 'English', profile?.english, 'CLB', lang),
  ];

  return {
    lang, noc: o.noc, title,
    header: { name: t(P.name), location: t(P.location), contact: t(P.contact), availability: t(P.availability) },
    summary, skills, experience,
    education: [t(P.degree)],
    certifications, languages,
    requirements: el.requirements.map((r) => r[lang]),
    offerToProve, offerMatched,
    ...(transfer ? { transferFrom: transfer.from } : {}),
  };
}

/** Texte brut du CV (à copier dans un courriel ou un formulaire). */
export function sampleCvToText(cv: SampleCv): string {
  const fr = cv.lang === 'fr';
  const h = (s: string) => `\n${s.toUpperCase()}`;
  const lines = [
    cv.header.name, cv.title, `${cv.header.location} | ${cv.header.contact}`, cv.header.availability,
    h(fr ? 'Profil' : 'Profile'), cv.summary,
    h(fr ? 'Compétences clés' : 'Key skills'), cv.skills.join(' • '),
    h(fr ? 'Expérience professionnelle' : 'Work experience'),
    ...cv.experience.flatMap((j) => [
      `${j.title} — ${j.period}`, [j.employer, j.place].filter(Boolean).join(' — '),
      ...j.bullets.map((b) => `• ${b.text}${b.result ? ` — ${b.result}` : ''}`), '',
    ]),
    h(fr ? 'Formation' : 'Education'), ...cv.education,
    ...(cv.certifications.length ? [h(fr ? 'Certifications et permis' : 'Certifications and licences'), ...cv.certifications.map((c) => `• ${c}`)] : []),
    h(fr ? 'Langues' : 'Languages'), ...cv.languages.map((l) => `• ${l}`),
  ];
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}
