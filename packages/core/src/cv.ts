/**
 * Vérificateur de CV — 100 % local : le texte du CV ne quitte jamais le téléphone.
 *
 * Deux familles de contrôles :
 * - les conseils officiels du Guichet-Emplois (« Comment rédiger un bon CV ») : 2 pages, pas de photo,
 *   pas de renseignements personnels, pas de « je », réalisations chiffrées, pas de références… (sourcés) ;
 * - des vérifications techniques de lisibilité par les logiciels de tri (ATS) : texte lisible, tableaux,
 *   titres de sections. Elles n'ont pas de source officielle et sont présentées comme telles.
 * Plus la comparaison avec une offre : mots importants de l'offre présents ou absents du CV, langue.
 *
 * Aucune IA : des règles explicables. Le résultat est une estimation, jamais une garantie.
 */
import { PROVINCE_NAMES } from './geo';
import { sourceRef } from './sources';
import { normalize } from './text';
import type { Localized, Rules, SourceRef } from './types';

/** Ce que l'appli a extrait du fichier (PDF, Word ou texte). */
export interface CvInput {
  text: string;
  fileName?: string;
  fileType?: 'pdf' | 'docx' | 'txt';
  /** Nombre de pages, si connu (PDF, ou Word quand le fichier l'indique). */
  pages?: number;
  /** Image trouvée dans le fichier (photo probable sur un CV). */
  hasImage?: boolean;
  /** Tableaux (Word). */
  hasTables?: boolean;
  /** Zones de texte flottantes (Word). */
  hasTextBoxes?: boolean;
}

export type CvCheckStatus = 'ok' | 'a-corriger' | 'conseil';
export type CvCategory = 'lisibilite' | 'format' | 'contenu' | 'coherence' | 'offre';

export interface CvCheck {
  id: string;
  category: CvCategory;
  status: CvCheckStatus;
  title: Localized;
  explanation: Localized;
  evidence: string[];
  /** Vide pour les vérifications techniques (sans source officielle). */
  sources: SourceRef[];
}

export interface KeywordMatch {
  matched: string[];
  missing: string[];
  ratio: number;
}

export type DetectedLang = 'fr' | 'en' | 'inconnue';

export interface CvAnalysis {
  checks: CvCheck[];
  /** Nombre de points à corriger. */
  toFix: number;
  advice: number;
  language: DetectedLang;
  offerLanguage?: DetectedLang;
  keywords?: KeywordMatch;
  words: number;
  summary: Localized;
  disclaimer: Localized;
}

// ---------------------------------------------------------------------------
// Outils de texte
// ---------------------------------------------------------------------------

const lines = (t: string) => t.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
const short = (s: string, n = 90) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** Lignes d'origine dont la version normalisée vérifie l'expression. */
function grep(text: string, re: RegExp): string[] {
  return [...new Set(lines(text).filter((l) => re.test(normalize(l))).map((l) => short(l)))].slice(0, 5);
}

const FR_WORDS = new Set(['le', 'la', 'les', 'des', 'et', 'est', 'une', 'pour', 'dans', 'avec', 'du', 'au', 'aux', 'sur', 'par', 'en', 'de', 'un']);
const EN_WORDS = new Set(['the', 'and', 'of', 'to', 'in', 'for', 'with', 'is', 'on', 'at', 'a', 'an', 'by', 'as', 'from']);

/** Langue dominante d'un texte (mots-outils les plus fréquents). */
export function detectLanguage(text: string): DetectedLang {
  let fr = 0, en = 0;
  for (const w of normalize(text).split(/[^a-z']+/)) {
    if (FR_WORDS.has(w)) fr++;
    if (EN_WORDS.has(w)) en++;
  }
  if (fr + en < 5) return 'inconnue';
  if (fr > en * 1.5) return 'fr';
  if (en > fr * 1.5) return 'en';
  return 'inconnue';
}

// Mots trop généraux pour juger un CV (mots-outils et vocabulaire de toute offre d'emploi).
const STOP = new Set([
  ...FR_WORDS, ...EN_WORDS,
  'nous', 'vous', 'votre', 'vos', 'notre', 'nos', 'leur', 'leurs', 'cette', 'ces', 'son', 'ses', 'qui', 'que', 'quoi', 'dont', 'tout', 'tous', 'toute', 'toutes',
  'plus', 'moins', 'tres', 'bien', 'etre', 'avoir', 'sont', 'sera', 'peut', 'doit', 'faire', 'fait', 'ainsi', 'aussi', 'entre', 'chez', 'sans', 'sous', 'vers', 'selon',
  'poste', 'postes', 'emploi', 'emplois', 'offre', 'offres', 'candidat', 'candidats', 'candidate', 'candidature', 'entreprise', 'employeur', 'travail', 'salaire',
  'heure', 'heures', 'semaine', 'semaines', 'temps', 'plein', 'partiel', 'annee', 'annees', 'mois', 'jour', 'jours', 'date', 'debut', 'canada', 'canadien', 'canadienne',
  'this', 'that', 'these', 'those', 'will', 'would', 'should', 'must', 'have', 'has', 'been', 'being', 'were', 'your', 'our', 'their', 'they', 'them', 'you', 'who',
  'which', 'what', 'when', 'where', 'while', 'also', 'more', 'other', 'such', 'than', 'then', 'into', 'over', 'under', 'about', 'able', 'within', 'per', 'each',
  'position', 'positions', 'job', 'jobs', 'work', 'working', 'employer', 'employment', 'company', 'candidate', 'candidates', 'applicant', 'apply', 'salary', 'wage',
  'hour', 'hours', 'hourly', 'week', 'weeks', 'weekly', 'year', 'years', 'month', 'months', 'full', 'time', 'part', 'start', 'location', 'canadian',
  'required', 'requis', 'requise', 'requises', 'preferred', 'atout', 'atouts', 'asset', 'assets', 'etc', 'including', 'notamment', 'minimum', 'maximum',
  'duties', 'duty', 'requirements', 'requirement', 'responsibilities', 'qualifications', 'exigences', 'taches', 'fonctions', 'description', 'profil',
  'lors', 'exige', 'exigee', 'exiges', 'exigees', 'souhaite', 'souhaitee',
  'first', 'premier', 'premiere', 'need', 'needs', 'help', 'every', 'besoin', 'aide', 'other', 'autres', 'benefits', 'avantages',
]);

/** Forme simplifiée d'un mot (pluriel retiré) pour comparer « soins » et « soin ». */
const stem = (w: string) => (w.length > 4 ? w.replace(/[sx]$/, '') : w);

function tokens(text: string): string[] {
  return normalize(text).split(/[^a-z0-9+#-]+/).map((w) => w.replace(/^-+|-+$/g, '')).filter(Boolean);
}

/** Mots importants de l'offre : les plus fréquents, hors mots généraux (au plus `n`). */
export function offerKeywords(offer: string, n: number, exclude: Set<string> = new Set()): string[] {
  const freq = new Map<string, { word: string; count: number; first: number }>();
  tokens(offer).forEach((w, i) => {
    if (w.length < 4 || STOP.has(w) || exclude.has(w) || /^\d/.test(w)) return;
    const k = stem(w);
    const cur = freq.get(k);
    if (cur) cur.count++;
    else freq.set(k, { word: w, count: 1, first: i });
  });
  return [...freq.values()].sort((a, b) => b.count - a.count || a.first - b.first).slice(0, n).map((x) => x.word);
}

export function matchKeywords(cvText: string, keywords: string[]): KeywordMatch {
  const have = new Set(tokens(cvText).map(stem));
  const matched = keywords.filter((k) => have.has(stem(k)));
  const missing = keywords.filter((k) => !have.has(stem(k)));
  return { matched, missing, ratio: keywords.length ? matched.length / keywords.length : 0 };
}

// ---------------------------------------------------------------------------
// Dates d'expérience et de formation
// ---------------------------------------------------------------------------

const MONTHS: Record<string, number> = {
  janv: 1, janvier: 1, jan: 1, january: 1, fevr: 2, fevrier: 2, feb: 2, february: 2, mars: 3, mar: 3, march: 3,
  avr: 4, avril: 4, apr: 4, april: 4, mai: 5, may: 5, juin: 6, jun: 6, june: 6, juil: 7, juillet: 7, jul: 7, july: 7,
  aout: 8, aug: 8, august: 8, sept: 9, septembre: 9, sep: 9, september: 9, oct: 10, octobre: 10, october: 10,
  nov: 11, novembre: 11, november: 11, dec: 12, decembre: 12, december: 12,
};
const MONTH_RE = Object.keys(MONTHS).sort((a, b) => b.length - a.length).join('|');
const POINT = `(?:(?:(${MONTH_RE})\\.?\\s+|(\\d{1,2})[/.-]))?((?:19|20)\\d{2})`;
const NOW = "(present|aujourd'hui|actuel|actuellement|ce jour|en cours|now|current|currently|today)";
const RANGE_RE = new RegExp(`${POINT}\\s*(?:-|a|au|to|until|jusqu'a|jusqu'en)\\s*(?:${POINT}|${NOW})`, 'g');

export interface Period { start: number; end: number; raw: string; ongoing: boolean }

/** Mois absolu (année × 12 + mois) ; sans mois : janvier pour un début, décembre pour une fin. */
function monthIndex(year: string, month: string | undefined, num: string | undefined, isEnd: boolean): number {
  const m = month ? MONTHS[month] : num ? Number(num) : undefined;
  const mm = m && m >= 1 && m <= 12 ? m : isEnd ? 12 : 1;
  return Number(year) * 12 + (mm - 1);
}

/** Périodes « 2019 – 2021 », « mars 2020 - présent », « 01/2018 – 06/2019 »… */
export function extractPeriods(text: string, today: string): Period[] {
  const now = Number(today.slice(0, 4)) * 12 + Number(today.slice(5, 7)) - 1;
  const out: Period[] = [];
  for (const m of normalize(text).matchAll(RANGE_RE)) {
    const start = monthIndex(m[3]!, m[1], m[2], false);
    const ongoing = !!m[7];
    const end = ongoing ? now : monthIndex(m[6]!, m[4], m[5], true);
    out.push({ start, end, raw: m[0].trim(), ongoing });
  }
  return out;
}

const monthLabel = (i: number, lang: 'fr' | 'en') => {
  const y = Math.floor(i / 12), m = (i % 12) + 1;
  return lang === 'fr' ? `${String(m).padStart(2, '0')}/${y}` : `${String(m).padStart(2, '0')}/${y}`;
};

// ---------------------------------------------------------------------------
// Expressions
// ---------------------------------------------------------------------------

const PERSONAL: Array<{ id: string; re: RegExp; label: Localized }> = [
  { id: 'age', re: /\b(nee? le|date de naissance|date of birth|dob|born (on|in)|age\s*:|\d{2} ans\b|\d{2} years old)/, label: { fr: 'âge ou date de naissance', en: 'age or date of birth' } },
  { id: 'etat-civil', re: /\b(etat civil|situation (familiale|matrimoniale)|mariee?|celibataire|divorcee?|veuve?|marital status|married|divorced|widowed|\d+ enfants?|\d+ children)\b/, label: { fr: 'état civil ou enfants', en: 'marital status or children' } },
  { id: 'religion', re: /\b(religion|confession religieuse|chretienne?|musulmane?|catholique|protestante?|christian|muslim|catholic)\b/, label: { fr: 'religion', en: 'religion' } },
  { id: 'physique', re: /\b(poids|taille|weight|height)\s*:|\b\d{2,3}\s?kg\b/, label: { fr: 'poids ou taille', en: 'weight or height' } },
  { id: 'politique', re: /\b(parti politique|opinions? politiques?|political (party|views))\b/, label: { fr: 'opinions politiques', en: 'political views' } },
  { id: 'nas', re: /\b(nas|numero d'assurance sociale|social insurance number|sin number)\b/, label: { fr: "numéro d'assurance sociale", en: 'Social Insurance Number' } },
];

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}/gi;
const PHONE_RE = /(?:\+|00)?\d[\d ().-]{7,}\d/g;
const YEAR_RANGE = /^(19|20)\d{2}\s*-\s*(19|20)\d{2}$/;

/** Numéro de téléphone : au moins 8 chiffres, et pas une période « 2015-2019 ». */
function hasPhone(text: string): boolean {
  return [...text.replace(EMAIL_RE, ' ').matchAll(PHONE_RE)].some((m) => m[0].replace(/\D/g, '').length >= 8 && !YEAR_RANGE.test(m[0].trim()));
}
const PRONOUN_FR = /(^|[^a-z])((je|moi|mon|mes)(?=[^a-z]|$)|j'(?=[a-z]))/g;
const PRONOUN_EN = /(^|[^a-z])(i|my|me)(?=[^a-z]|$)/g;
const QUANTIFIED = /\b\d[\d\s.,]*\s?(%|pour ?cent|percent|personnes|people|clients?|employes|employees|patients?|residents?|eleves|students|enfants|children|equipes?|teams?|\$|dollars|fcfa|euros?|tonnes|kg|heures|hours|vehicules|vehicles|machines|commandes|orders|lits|beds|hectares|chantiers|projets|projects|par jour|per day|par semaine|per week|par mois|per month)/;
const DUTY_LIST = /\b(responsable de|charge de|chargee de|responsible for|in charge of)\b/;
const REFERENCES = /\b(references? (disponibles?|sur demande|fournies)|references? available|available upon request|upon request|^references?$)/;
const LEAVING = /\b(raison (du|de|de mon) depart|motif (du|de) depart|reason for leaving)\b/;
const HOBBIES = /^(loisirs|centres? d'interets?|interets|hobbies|interests|activites( extra-?professionnelles)?)\s*:?$/;
const BULLET = /^[•▪◦●■□➢➤►✓✔*·-]\s*/;

const HEADINGS: Array<{ id: 'experience' | 'formation' | 'competences'; re: RegExp }> = [
  { id: 'experience', re: /^(experiences?( professionnelles?| de travail)?|parcours professionnel|emplois? (occupes|precedents)|work experience|professional experience|employment( history)?|experience)\s*:?$/ },
  { id: 'formation', re: /^(formations?( academiques?| et diplomes)?|education|etudes|diplomes?|scolarite|academic background|training)\s*:?$/ },
  { id: 'competences', re: /^(competences( (cles|techniques|professionnelles))?|skills|key skills|qualifications|aptitudes|savoir-faire|technical skills)\s*:?$/ },
];

// ---------------------------------------------------------------------------
// Analyse
// ---------------------------------------------------------------------------

export interface CvOptions {
  rules: Rules;
  /** Texte de l'offre visée (facultatif). */
  offerText?: string;
  today: string;
}

export function analyzeCv(input: CvInput, opts: CvOptions): CvAnalysis {
  const r = opts.rules.cv;
  const jb = [sourceRef(opts.rules, r.source, opts.today)];
  const text = input.text ?? '';
  const norm = normalize(text);
  const all = lines(text);
  const words = norm.split(/\s+/).filter(Boolean).length;
  const checks: CvCheck[] = [];
  let keywords: KeywordMatch | undefined;
  let offerLanguage: DetectedLang | undefined;
  const add = (c: Omit<CvCheck, 'evidence' | 'sources'> & { evidence?: string[]; sources?: SourceRef[] }) =>
    checks.push({ evidence: [], sources: [], ...c });

  // --- Lisibilité par les logiciels de tri (vérifications techniques) -------------------------
  // Un PDF scanné (image) ne contient presque pas de texte : on le mesure par page. Un fichier Word
  // ou texte contient toujours du vrai texte ; il n'est « illisible » que s'il est presque vide.
  const chars = text.replace(/\s/g, '').length;
  const readable = input.fileType === 'pdf' ? chars >= r.minTextChars * Math.max(1, Math.min(input.pages ?? 1, 2)) / 2 : chars >= 50;
  add({
    id: 'texte-lisible', category: 'lisibilite', status: readable ? 'ok' : 'a-corriger',
    title: readable ? { fr: 'Le texte du CV est lisible par un logiciel', en: 'The resume text can be read by software' } : { fr: 'Presque aucun texte lisible', en: 'Almost no readable text' },
    explanation: readable
      ? { fr: 'Le fichier contient du vrai texte : un logiciel de tri peut le lire.', en: 'The file contains real text: screening software can read it.' }
      : { fr: "Le fichier ressemble à une image ou à un scan (photo du CV). Les logiciels de tri des candidatures ne peuvent pas lire une image : refaites le CV dans Word ou Google Docs et enregistrez-le en PDF depuis le logiciel.", en: 'The file looks like an image or a scan (photo of the resume). Applicant screening software cannot read an image: rebuild the resume in Word or Google Docs and save it as PDF from there.' },
  });
  if (!readable) return finish();

  if (input.hasTables || input.hasTextBoxes) {
    add({
      id: 'mise-en-page', category: 'lisibilite', status: 'a-corriger',
      title: { fr: 'Tableaux ou zones de texte dans la mise en page', en: 'Tables or text boxes in the layout' },
      explanation: { fr: "Beaucoup de logiciels de tri lisent mal les tableaux, les colonnes et les zones de texte : des informations peuvent être perdues ou mélangées. Préférez une mise en page sur une seule colonne, avec des titres simples.", en: 'Many screening programs read tables, columns and text boxes poorly: information can be lost or mixed up. Prefer a single-column layout with simple headings.' },
      evidence: [input.hasTables ? 'tableau' : '', input.hasTextBoxes ? 'zone de texte' : ''].filter(Boolean),
    });
  }

  const normLines = all.map((l) => normalize(l).replace(/[^a-z' -]/g, '').trim());
  const found = new Set(HEADINGS.filter((h) => normLines.some((l) => h.re.test(l))).map((h) => h.id));
  const missingHeadings = HEADINGS.filter((h) => !found.has(h.id)).map((h) => h.id);
  const HEADING_NAMES: Record<string, Localized> = {
    experience: { fr: 'Expérience', en: 'Experience' }, formation: { fr: 'Formation', en: 'Education' }, competences: { fr: 'Compétences', en: 'Skills' },
  };
  add({
    id: 'sections', category: 'lisibilite', status: missingHeadings.length ? 'a-corriger' : 'ok',
    title: missingHeadings.length ? { fr: 'Titres de sections à rendre plus clairs', en: 'Section headings to make clearer' } : { fr: 'Sections clairement titrées', en: 'Clearly titled sections' },
    explanation: missingHeadings.length
      ? { fr: `Titres non trouvés : ${missingHeadings.map((h) => HEADING_NAMES[h]!.fr).join(', ')}. Utilisez des titres simples, seuls sur leur ligne (« Expérience », « Formation », « Compétences ») : les logiciels de tri s'en servent pour classer vos informations.`, en: `Headings not found: ${missingHeadings.map((h) => HEADING_NAMES[h]!.en).join(', ')}. Use simple headings on their own line ("Experience", "Education", "Skills"): screening software uses them to sort your information.` }
      : { fr: 'Expérience, formation et compétences ont chacune un titre simple.', en: 'Experience, education and skills each have a simple heading.' },
  });

  if (input.fileName && /^(cv|resume|curriculum|document|doc|scan|img|image|file|fichier|nouveau|new|sans titre|untitled)[\s_-]*\d*\.(pdf|docx?|txt)$/i.test(input.fileName.trim())) {
    add({
      id: 'nom-fichier', category: 'lisibilite', status: 'conseil',
      title: { fr: 'Nom de fichier peu parlant', en: 'Unclear file name' },
      explanation: { fr: 'Nommez le fichier avec votre nom, par exemple « Prenom-Nom-CV.pdf » : le recruteur le retrouvera facilement.', en: 'Name the file after yourself, for example "First-Last-Resume.pdf": the recruiter will find it easily.' },
      evidence: [input.fileName],
    });
  }

  // --- Format (Guichet-Emplois) ----------------------------------------------------------------
  const tooLong = input.pages !== undefined ? input.pages > r.maxPages : words > r.maxWordsIfPagesUnknown;
  add({
    id: 'longueur', category: 'format', status: tooLong ? 'a-corriger' : 'ok',
    title: tooLong ? { fr: `Plus de ${r.maxPages} pages`, en: `More than ${r.maxPages} pages` } : { fr: `${r.maxPages} pages au maximum`, en: `${r.maxPages} pages at most` },
    explanation: tooLong
      ? { fr: `Le Guichet-Emplois recommande ${r.maxPages} pages au maximum : un employeur parcourt un CV en 30 secondes en moyenne. Résumez ou retirez les expériences de plus de ${r.oldExperienceYears} ans.`, en: `Job Bank recommends ${r.maxPages} pages at most: an employer skims a resume in 30 seconds on average. Summarize or remove experience older than ${r.oldExperienceYears} years.` }
      : { fr: input.pages !== undefined ? `${input.pages} page(s) : c'est conforme.` : `${words} mots : la longueur semble raisonnable.`, en: input.pages !== undefined ? `${input.pages} page(s): that is fine.` : `${words} words: the length looks reasonable.` },
    evidence: tooLong ? [input.pages !== undefined ? `${input.pages} pages` : `${words} mots`] : [],
    sources: jb,
  });

  if (input.hasImage) {
    add({
      id: 'photo', category: 'format', status: 'a-corriger',
      title: { fr: 'Photo probable dans le CV', en: 'Probable photo in the resume' },
      explanation: { fr: "Au Canada, on ne met pas de photo sur un CV : selon le Guichet-Emplois, cela peut même réduire vos chances. L'employeur doit se concentrer sur vos compétences.", en: 'In Canada, resumes do not include a photo: according to Job Bank, it can even lower your chances. The employer should focus on your skills.' },
      evidence: ['image'], sources: jb,
    });
  }

  const emails = [...text.matchAll(EMAIL_RE)].map((m) => m[0]);
  const phone = hasPhone(text);
  const contactMissing = [!emails.length ? { fr: 'adresse e-mail', en: 'e-mail address' } : null, !phone ? { fr: 'numéro de téléphone', en: 'phone number' } : null].filter(Boolean) as Localized[];
  add({
    id: 'coordonnees', category: 'format', status: contactMissing.length ? 'a-corriger' : 'ok',
    title: contactMissing.length ? { fr: 'Coordonnées incomplètes', en: 'Incomplete contact details' } : { fr: 'Coordonnées présentes', en: 'Contact details present' },
    explanation: contactMissing.length
      ? { fr: `Manque : ${contactMissing.map((c) => c.fr).join(', ')}. Mettez en haut de la première page votre nom, votre ville et pays, votre e-mail et votre téléphone avec l'indicatif du pays (ex. +237).`, en: `Missing: ${contactMissing.map((c) => c.en).join(', ')}. Put your name, city and country, e-mail and phone with country code (e.g. +237) at the top of the first page.` }
      : { fr: "E-mail et téléphone trouvés. Vérifiez qu'ils sont en haut de la première page, avec l'indicatif du pays.", en: 'E-mail and phone found. Check they are at the top of the first page, with the country code.' },
    sources: jb,
  });

  const badEmails = emails.filter((e) => /[0-9_+]/.test(e.split('@')[0]!));
  if (badEmails.length) {
    add({
      id: 'email-pro', category: 'format', status: 'conseil',
      title: { fr: 'Adresse e-mail à rendre plus professionnelle', en: 'Make the e-mail address more professional' },
      explanation: { fr: "Le Guichet-Emplois conseille une adresse simple, basée sur votre nom, sans surnom, chiffres ni caractères spéciaux (ex. prenom.nom@…).", en: 'Job Bank advises a simple address based on your name, without nicknames, numbers or special characters (e.g. first.last@…).' },
      evidence: badEmails.slice(0, 3), sources: jb,
    });
  }

  // --- Contenu (Guichet-Emplois) ---------------------------------------------------------------
  const personal = PERSONAL.map((p) => ({ p, ev: grep(text, p.re) })).filter((x) => x.ev.length);
  add({
    id: 'infos-personnelles', category: 'contenu', status: personal.length ? 'a-corriger' : 'ok',
    title: personal.length ? { fr: 'Renseignements personnels à retirer', en: 'Personal details to remove' } : { fr: 'Pas de renseignements personnels inutiles', en: 'No unnecessary personal details' },
    explanation: personal.length
      ? { fr: `Trouvé : ${personal.map((x) => x.p.label.fr).join(', ')}. Au Canada, on n'indique pas l'âge, l'état civil, la religion, le poids, la taille ni les opinions politiques, pour éviter tout préjugé. Ne mettez jamais votre numéro d'assurance sociale.`, en: `Found: ${personal.map((x) => x.p.label.en).join(', ')}. In Canada, resumes do not state age, marital status, religion, weight, height or political views, to avoid bias. Never include your Social Insurance Number.` }
      : { fr: "Aucun âge, état civil, religion ou autre détail personnel repéré.", en: 'No age, marital status, religion or other personal detail found.' },
    evidence: personal.flatMap((x) => x.ev).slice(0, 5), sources: jb,
  });

  const lang = detectLanguage(text);
  const pronounRe = lang === 'en' ? PRONOUN_EN : PRONOUN_FR;
  const pronounLines = lines(text).filter((l) => { pronounRe.lastIndex = 0; return pronounRe.test(normalize(l)); });
  const pronounCount = [...norm.matchAll(pronounRe)].length;
  if (pronounCount > r.maxPronouns) {
    add({
      id: 'pronoms', category: 'contenu', status: 'conseil',
      title: { fr: 'Trop de « je », « mon », « mes »', en: 'Too many "I", "my", "me"' },
      explanation: { fr: "Le Guichet-Emplois conseille d'éviter les pronoms personnels. Commencez plutôt chaque ligne par un verbe d'action : « Géré… », « Organisé… », « Formé 5 employés… ».", en: 'Job Bank advises avoiding personal pronouns. Start each line with an action verb instead: "Managed…", "Organized…", "Trained 5 employees…".' },
      evidence: pronounLines.slice(0, 3).map((l) => short(l)), sources: jb,
    });
  }

  // Les lignes de renseignements personnels (« 3 enfants ») ne comptent pas comme des réalisations.
  const quantified = all.some((l) => { const n = normalize(l); return QUANTIFIED.test(n) && !PERSONAL.some((p) => p.re.test(n)); });
  add({
    id: 'realisations-chiffrees', category: 'contenu', status: quantified ? 'ok' : 'conseil',
    title: quantified ? { fr: 'Réalisations chiffrées', en: 'Quantified achievements' } : { fr: 'Aucune réalisation chiffrée', en: 'No quantified achievement' },
    explanation: quantified
      ? { fr: 'Le CV contient des chiffres concrets (nombre de personnes, quantités, pourcentages) : c’est ce que recommande le Guichet-Emplois.', en: 'The resume has concrete numbers (people, quantities, percentages): this is what Job Bank recommends.' }
      : { fr: "Ajoutez des chiffres concrets : combien de personnes vous avez supervisées ou servies, combien de produits, de patients, d'hectares… Le Guichet-Emplois le recommande.", en: 'Add concrete numbers: how many people you supervised or served, how many products, patients, hectares… Job Bank recommends it.' },
    sources: jb,
  });

  const duties = grep(text, DUTY_LIST);
  if ([...norm.matchAll(new RegExp(DUTY_LIST.source, 'g'))].length >= 3) {
    add({
      id: 'liste-de-taches', category: 'contenu', status: 'conseil',
      title: { fr: 'Liste de tâches plutôt que de réalisations', en: 'List of duties rather than achievements' },
      explanation: { fr: "Les tâches se devinent avec l'intitulé du poste. Le Guichet-Emplois conseille de montrer plutôt ce que vous avez accompli, avec des exemples précis.", en: 'Duties are obvious from the job title. Job Bank advises showing what you achieved instead, with specific examples.' },
      evidence: duties.slice(0, 3), sources: jb,
    });
  }

  // Puces par section
  let current = '', count = 0;
  const overBullets: string[] = [];
  for (const l of all) {
    const n = normalize(l).replace(/[^a-z' -]/g, '').trim();
    if (HEADINGS.some((h) => h.re.test(n)) || (l.length < 40 && l === l.toUpperCase() && /[A-Z]/.test(l))) {
      if (count > r.maxBulletsPerSection) overBullets.push(`${current || '—'} : ${count}`);
      current = l; count = 0;
    } else if (BULLET.test(l)) count++;
  }
  if (count > r.maxBulletsPerSection) overBullets.push(`${current || '—'} : ${count}`);
  if (overBullets.length) {
    add({
      id: 'puces', category: 'contenu', status: 'conseil',
      title: { fr: 'Trop de puces dans une section', en: 'Too many bullet points in a section' },
      explanation: { fr: `Le Guichet-Emplois conseille ${r.maxBulletsPerSection} puces au maximum par section : gardez les plus utiles pour le poste.`, en: `Job Bank advises at most ${r.maxBulletsPerSection} bullet points per section: keep the most relevant ones.` },
      evidence: overBullets.slice(0, 3), sources: jb,
    });
  }

  const refs = grep(text, REFERENCES);
  if (refs.length) {
    add({
      id: 'references', category: 'contenu', status: 'conseil',
      title: { fr: 'Références dans le CV', en: 'References in the resume' },
      explanation: { fr: "Gardez vos références sur une feuille à part et donnez-les seulement si l'employeur les demande.", en: 'Keep your references on a separate sheet and give them only when the employer asks.' },
      evidence: refs, sources: jb,
    });
  }
  const leaving = grep(text, LEAVING);
  if (leaving.length) {
    add({
      id: 'raison-depart', category: 'contenu', status: 'a-corriger',
      title: { fr: 'Raison du départ indiquée', en: 'Reason for leaving stated' },
      explanation: { fr: "Le CV doit rester positif : n'indiquez pas pourquoi vous avez quitté un emploi.", en: 'The resume should stay positive: do not say why you left a job.' },
      evidence: leaving, sources: jb,
    });
  }
  const hobbies = all.filter((l) => HOBBIES.test(normalize(l).replace(/[^a-z' -]/g, '').trim()));
  if (hobbies.length) {
    add({
      id: 'loisirs', category: 'contenu', status: 'conseil',
      title: { fr: 'Section « loisirs »', en: '"Hobbies" section' },
      explanation: { fr: "Le Guichet-Emplois déconseille les loisirs, sauf s'ils sont liés au poste (ex. secourisme pour un poste d'aide-soignant).", en: 'Job Bank advises against hobbies unless they relate to the job (e.g. first aid for a care worker).' },
      evidence: hobbies.slice(0, 2), sources: jb,
    });
  }

  // --- Cohérence des dates ---------------------------------------------------------------------
  const periods = extractPeriods(text, opts.today);
  const nowIdx = Number(opts.today.slice(0, 4)) * 12 + Number(opts.today.slice(5, 7)) - 1;
  const reversed = periods.filter((p) => p.end < p.start);
  const future = periods.filter((p) => !p.ongoing && (p.start > nowIdx || p.end > nowIdx));
  const coherenceIssues = [...reversed, ...future].map((p) => p.raw);
  if (periods.length) {
    add({
      id: 'dates', category: 'coherence', status: coherenceIssues.length ? 'a-corriger' : 'ok',
      title: coherenceIssues.length ? { fr: 'Dates incohérentes', en: 'Inconsistent dates' } : { fr: 'Dates cohérentes', en: 'Consistent dates' },
      explanation: coherenceIssues.length
        ? { fr: 'Une période se termine avant de commencer, ou une date est dans le futur. Une erreur de date fait douter de tout le CV : corrigez-la.', en: 'A period ends before it starts, or a date is in the future. A date error casts doubt on the whole resume: fix it.' }
        : { fr: `${periods.length} période(s) trouvée(s), sans incohérence.`, en: `${periods.length} period(s) found, with no inconsistency.` },
      evidence: [...new Set(coherenceIssues)].slice(0, 4),
    });
    // Trous : on fusionne les périodes valides et on cherche les intervalles vides.
    const valid = periods.filter((p) => p.end >= p.start).sort((a, b) => a.start - b.start);
    const gaps: string[] = [];
    let reach = valid[0]?.end ?? 0;
    for (const p of valid.slice(1)) {
      if (p.start - reach > r.gapMonths) gaps.push(`${monthLabel(reach, 'fr')} → ${monthLabel(p.start, 'fr')}`);
      reach = Math.max(reach, p.end);
    }
    if (gaps.length) {
      add({
        id: 'trous', category: 'coherence', status: 'conseil',
        title: { fr: "Période sans activité de plus d'un an", en: 'Period of more than a year without activity' },
        explanation: { fr: "Un employeur peut demander ce que vous avez fait pendant cette période. Si vous avez eu une activité (formation, travail informel, aide familiale, bénévolat), indiquez-la.", en: 'An employer may ask what you did during this period. If you had an activity (training, informal work, family care, volunteering), list it.' },
        evidence: gaps.slice(0, 3),
      });
    }
    const oldest = valid[0];
    if (oldest && nowIdx - oldest.start > r.oldExperienceYears * 12) {
      add({
        id: 'experience-ancienne', category: 'coherence', status: 'conseil',
        title: { fr: `Expérience de plus de ${r.oldExperienceYears} ans`, en: `Experience older than ${r.oldExperienceYears} years` },
        explanation: { fr: `Le Guichet-Emplois conseille de résumer ou de retirer les expériences de plus de ${r.oldExperienceYears} ans, pour mettre en avant les plus récentes.`, en: `Job Bank advises summarizing or removing experience older than ${r.oldExperienceYears} years, to highlight recent experience.` },
        evidence: [oldest.raw], sources: jb,
      });
    }
  }

  // --- Comparaison avec l'offre ----------------------------------------------------------------
  const offer = opts.offerText?.trim();
  if (offer) {
    offerLanguage = detectLanguage(offer);
    if (offerLanguage !== 'inconnue' && lang !== 'inconnue' && offerLanguage !== lang) {
      add({
        id: 'langue', category: 'offre', status: 'a-corriger',
        title: { fr: "Le CV n'est pas dans la langue de l'offre", en: 'The resume is not in the language of the offer' },
        explanation: { fr: `L'offre est en ${offerLanguage === 'fr' ? 'français' : 'anglais'} et le CV en ${lang === 'fr' ? 'français' : 'anglais'}. Envoyez un CV dans la langue de l'offre : hors Québec, c'est le plus souvent l'anglais.`, en: `The offer is in ${offerLanguage === 'fr' ? 'French' : 'English'} and the resume in ${lang === 'fr' ? 'French' : 'English'}. Send a resume in the language of the offer: outside Quebec, it is usually English.` },
      });
    }
    // Les noms de lieux (provinces, grandes villes) ne sont pas des compétences.
    const places = new Set([
      ...Object.values(PROVINCE_NAMES).flatMap((p) => [p.fr, p.en]),
      ...opts.rules.lmiaLowWage.cmas.flatMap((c) => [c.name, ...c.aliases]),
    ].flatMap((s) => tokens(s)));
    const kws = offerKeywords(offer, r.offerKeywords, places);
    if (kws.length >= 5) {
      keywords = matchKeywords(text, kws);
      const st: CvCheckStatus = keywords.ratio >= r.keywordMatchGood ? 'ok' : keywords.ratio >= r.keywordMatchLow ? 'conseil' : 'a-corriger';
      const pct = Math.round(keywords.ratio * 100);
      add({
        id: 'mots-cles', category: 'offre', status: st,
        title: { fr: `Mots importants de l'offre présents dans le CV : ${pct} %`, en: `Important words from the offer found in the resume: ${pct}%` },
        explanation: st === 'ok'
          ? { fr: "Le CV reprend une bonne partie des termes de l'offre, comme le conseille le Guichet-Emplois.", en: 'The resume uses many of the terms from the offer, as Job Bank advises.' }
          : { fr: "Le Guichet-Emplois conseille de reprendre les termes de l'offre. Ajoutez ceux qui correspondent VRAIMENT à votre expérience (ne mentez jamais) : les logiciels de tri cherchent souvent ces mots.", en: 'Job Bank advises reusing the terms from the offer. Add those that TRULY match your experience (never lie): screening software often looks for these words.' },
        evidence: keywords.missing.slice(0, 10),
        sources: jb,
      });
    }
  }

  return finish();

  function finish(): CvAnalysis {
    const order: Record<CvCheckStatus, number> = { 'a-corriger': 0, conseil: 1, ok: 2 };
    checks.sort((a, b) => order[a.status] - order[b.status]);
    const toFix = checks.filter((c) => c.status === 'a-corriger').length;
    const advice = checks.filter((c) => c.status === 'conseil').length;
    return {
      checks, toFix, advice, language: detectLanguage(text), offerLanguage, keywords, words,
      summary: toFix
        ? { fr: `${toFix} point(s) à corriger, ${advice} conseil(s)`, en: `${toFix} point(s) to fix, ${advice} tip(s)` }
        : { fr: `Aucun point bloquant trouvé, ${advice} conseil(s)`, en: `No blocking issue found, ${advice} tip(s)` },
      disclaimer: {
        fr: "Évaluation automatique à partir de règles simples : elle ne remplace pas une relecture humaine et ne garantit pas qu'un logiciel de tri acceptera le CV. Votre CV est analysé sur ce téléphone et n'est envoyé nulle part.",
        en: 'Automatic assessment based on simple rules: it does not replace a human review and does not guarantee screening software will accept the resume. Your resume is analyzed on this phone and sent nowhere.',
      },
    };
  }
}
