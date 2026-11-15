/**
 * Lecture d'un CV pour remplir le profil et proposer des emplois — 100 % local, aucune IA, rien n'est envoyé.
 *
 * Du texte du CV, on tire :
 * - les métiers occupés (titres de poste reconnus parmi les 516 métiers de la CNP 2021, fonction `detect`),
 *   avec la durée de chaque poste quand des dates sont écrites à côté ;
 * - la durée totale d'expérience, le plus haut diplôme, les langues, les permis et certificats utiles au Canada.
 * Chaque élément trouvé garde la ligne du CV qui le prouve : la personne voit pourquoi et peut corriger.
 *
 * Puis `suggestBridges` propose des « métiers passerelles » : des métiers accessibles avec son niveau, où des
 * employeurs canadiens ont réellement obtenu des EIMT (données ouvertes d'EDSC), d'abord dans le même grand domaine.
 */
import { detectLanguage, extractPeriods, type DetectedLang } from './cv';
import { teerOf } from './noc';
import { normalize } from './text';
import type { Localized } from './types';

export type CvEducationLevel = 'primaire' | 'secondaire' | 'postsecondaire' | 'universite';

export interface CvJob {
  noc: string;
  /** Mois d'expérience (périodes écrites à côté du titre, chevauchements fusionnés) ; 0 si aucune date. */
  months: number;
  /** Lignes du CV où le métier a été reconnu. */
  lines: string[];
}

export interface CvCredential {
  id: 'permis-lourd' | 'permis-b' | 'secourisme' | 'hygiene' | 'securite' | 'cariste' | 'soudure' | 'infirmier' | 'test-ircc' | 'test-non-ircc';
  evidence: string;
  note: Localized;
  /** Source officielle (identifiant rules.json), si la note s'appuie sur une page publique. */
  source?: string;
}

export interface CvProfile {
  /** Métiers reconnus, le plus long d'abord. */
  jobs: CvJob[];
  /** Expérience totale (toutes les périodes de la partie « expérience », fusionnées). */
  experienceMonths: number;
  education?: { level: CvEducationLevel; evidence: string };
  languages: { fr: boolean; en: boolean; cvLanguage: DetectedLang };
  credentials: CvCredential[];
}

const BULLET = /^[•▪◦●■□➢➤►✓✔*·-]\s*/;
const short = (s: string, n = 100) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

type Section = 'debut' | 'experience' | 'formation' | 'competences' | 'autre';
const SECTION_RE: Array<[Section, RegExp]> = [
  ['experience', /^(experiences?( professionnelles?| de travail)?|parcours professionnel|emplois? (occupes|precedents)|work experience|professional experience|employment( history)?|career history)\s*:?$/],
  ['formation', /^(formations?( academiques?| et diplomes)?|education|etudes|diplomes?|scolarite|academic background|training|certifications?)\s*:?$/],
  ['competences', /^(competences( (cles|techniques|professionnelles))?|skills|key skills|qualifications|aptitudes|savoir-faire|technical skills)\s*:?$/],
  ['autre', /^(langues?|languages?|loisirs|centres? d'interets?|interets|hobbies|interests|references?|profil|resume|summary|objectif|objective|informations? personnelles|contact|coordonnees)\s*:?$/],
];

/** Ce qui n'est pas le titre du poste : dates, mois, « présent », lieu après la virgule… */
const DATE_BITS = /\b((19|20)\d{2}|\d{1,2}\/(19|20)?\d{2}|janv(ier)?|fevr(ier)?|mars|avr(il)?|mai|juin|juil(let)?|aout|sept(embre)?|oct(obre)?|nov(embre)?|dec(embre)?|jan(uary)?|feb(ruary)?|march|apr(il)?|may|june?|july?|aug(ust)?|sep(tember)?|october|november|december|present|presente|aujourd'hui|a ce jour|en cours|now|current|today|depuis|since)\b/g;

/** Parties possibles du titre : « Agent de sécurité – G4S, Douala (2019-2022) » → « agent de securite », « g4s »… */
function titleParts(line: string): string[] {
  const t = normalize(line).replace(BULLET, '').replace(DATE_BITS, ' ').replace(/[()[\]]/g, ' ');
  return t.split(/\s[-–—|]\s|\s*[|•,;:]\s*|\s(?:chez|at|au sein de|pour le compte de|with)\s/).map((s) => s.replace(/\s+/g, ' ').trim()).filter((s) => s.length >= 4);
}

function mergedMonths(periods: Array<{ start: number; end: number }>): number {
  const v = periods.filter((p) => p.end >= p.start).sort((a, b) => a.start - b.start);
  let total = 0, cur: { start: number; end: number } | undefined;
  for (const p of v) {
    if (cur && p.start <= cur.end + 1) cur.end = Math.max(cur.end, p.end);
    else { if (cur) total += cur.end - cur.start + 1; cur = { ...p }; }
  }
  if (cur) total += cur.end - cur.start + 1;
  return total;
}

// --- Diplôme ---------------------------------------------------------------------------------------
const EDU: Array<[CvEducationLevel, RegExp]> = [
  ['universite', /\b(doctorat|phd|ph\.d|master|maitrise|mba|licence (professionnelle|fondamentale|en|de|d')|bachelor|bachelier|b\.?sc|m\.?sc|diplome d'ingenieur|ingenieur (de conception|des travaux|d'etat)|dipes|bac ?\+ ?[3-8]|degree|baccalaureat (en|universitaire|specialise)|universite|university)\b/],
  ['postsecondaire', /\b(bts|dut|hnd|dts|cap|bep|dep|dec|aec|cqp|brevet de technicien|certificat d'aptitude professionnelle|diplome (professionnel|technique|de technicien)|college diploma|diploma in|formation professionnelle|bac ?\+ ?[12]|higher national diploma)\b/],
  ['secondaire', /\b(baccalaureat|bac|gce ?a ?level|gce ?o ?level|a levels?|o levels?|probatoire|bepc|bfem|high school|lycee|secondary school|diplome d'etat|brevet d'etudes)\b/],
  ['primaire', /\b(cep|cepe|certificat d'etudes primaires|primary school|fslc|first school leaving)\b/],
];

// --- Permis et certificats -------------------------------------------------------------------------
const CREDENTIALS: Array<Omit<CvCredential, 'evidence'> & { re: RegExp }> = [
  {
    id: 'permis-lourd',
    re: /\b(permis (de conduire )?(categories? |cat\.? ?)?(c|ce|c1|c1e|d|de|ec)\b|poids lourds?|heavy (goods|truck|vehicle)|class (1|3) (driver'?s? )?licen[cs]e|\b(az|dz) licen[cs]e|cdl)\b/,
    note: {
      fr: 'Au Canada, il faut un permis de camion de la province (classe 1, ou AZ en Ontario). Un permis poids lourd étranger ne s’échange en général pas : il faut repasser les examens au Canada. Votre expérience de conduite reste un atout à mettre en avant.',
      en: 'In Canada you need a provincial truck licence (Class 1, or AZ in Ontario). A foreign heavy licence generally cannot be exchanged: you must retake the tests in Canada. Your driving experience is still an asset to highlight.',
    },
  },
  {
    id: 'permis-b',
    re: /\b(permis (de conduire )?(categories? |cat\.? ?)?b\b|permis de conduire|driver'?s? licen[cs]e|driving licen[cs]e)/,
    note: {
      fr: 'Permis voiture : utile, surtout en région où il n’y a pas de transport en commun. Selon votre pays et la province, il s’échange ou il faut repasser l’examen.',
      en: 'Car licence: useful, especially in regions without public transit. Depending on your country and the province, it can be exchanged or you must retake the test.',
    },
  },
  {
    id: 'secourisme',
    re: /\b(secourisme|premiers (secours|soins)|sauveteur secouriste|\bsst\b|first aid|\bcpr\b|\brcr\b)/,
    note: {
      fr: 'Premiers secours : beaucoup d’employeurs canadiens demandent un certificat canadien (formation courte, un ou deux jours). Gardez le vôtre sur le CV.',
      en: 'First aid: many Canadian employers ask for a Canadian certificate (short course, one or two days). Keep yours on your resume.',
    },
  },
  {
    id: 'hygiene',
    re: /\b(haccp|hygiene alimentaire|securite alimentaire|food safety|food handler|manipulation des aliments)/,
    note: {
      fr: 'Hygiène alimentaire : atout en restauration et en usine alimentaire. Au Canada, chaque province a son certificat de manipulation des aliments (souvent en ligne, peu coûteux).',
      en: 'Food hygiene: an asset in restaurants and food plants. In Canada, each province has its own food handler certificate (often online, inexpensive).',
    },
  },
  {
    id: 'securite',
    re: /\b(agent de securite|agente de securite|security (guard|officer|agent)|carte professionnelle|cqp aps|ssiap|gardiennage|vigile)/,
    note: {
      fr: 'Agent de sécurité : chaque province exige son propre permis, obtenu au Canada (formation et examen). Les employeurs ne recrutent presque jamais ce métier depuis l’étranger : regardez aussi les métiers passerelles ci-dessous.',
      en: 'Security guard: each province requires its own licence, obtained in Canada (training and exam). Employers almost never hire this job from abroad: also look at the bridge occupations below.',
    },
  },
  {
    id: 'cariste',
    re: /\b(caces|chariot elevateur|cariste|forklift)/,
    note: {
      fr: 'Cariste : expérience recherchée en entrepôt et en usine. L’employeur canadien vous fera suivre sa propre formation de conduite de chariot.',
      en: 'Forklift: experience sought in warehouses and plants. The Canadian employer will have you take its own forklift training.',
    },
  },
  {
    id: 'soudure',
    re: /\b(soudeur|soudure|welder|welding)\b.*\b(certifi|qualifi|aws|iso 9606|cwb)|\b(certifi\w*|qualifi\w*) (en )?(soudure|welding)/,
    note: {
      fr: 'Soudure : au Canada, l’employeur fera passer un test de soudure (souvent CWB). Gardez vos certificats et les procédés maîtrisés (SMAW, GMAW…).',
      en: 'Welding: in Canada the employer will give you a welding test (often CWB). Keep your certificates and list the processes you master (SMAW, GMAW…).',
    },
  },
  {
    id: 'infirmier',
    re: /\b(infirmier|infirmiere|registered nurse|nursing|ordre (national )?des infirmiers|sage-femme|midwife)/,
    note: {
      fr: 'Soins infirmiers : métier réglementé. Pour exercer comme infirmier, il faut faire reconnaître le diplôme par l’ordre de la province (démarche longue). En attendant, préposé aux bénéficiaires ou aide de soutien à domicile sont des voies plus rapides.',
      en: 'Nursing: a regulated profession. To work as a nurse, the provincial regulator must recognize your diploma (a long process). Meanwhile, nurse aide or home support worker are faster routes.',
    },
  },
  {
    id: 'test-ircc',
    re: /\b(tef canada|tcf canada|ielts general|celpip|pte core|\btef\b|\btcf\b|\bielts\b)/,
    source: 'ircc-language-tests',
    note: {
      fr: 'Test de langue reconnu par IRCC (à condition que ce soit bien TEF Canada, TCF Canada, IELTS General Training, CELPIP-G ou PTE Core). Indiquez vos niveaux dans votre profil : ils comptent pour plusieurs voies.',
      en: 'IRCC-recognized language test (as long as it is TEF Canada, TCF Canada, IELTS General Training, CELPIP-G or PTE Core). Enter your levels in your profile: they count for several routes.',
    },
  },
  {
    id: 'test-non-ircc',
    re: /\b(toefl|toeic|delf|dalf)\b/,
    source: 'ircc-language-tests',
    note: {
      fr: 'TOEFL, TOEIC, DELF et DALF ne sont pas acceptés par IRCC pour l’immigration. Ils restent utiles pour un employeur, mais pour la résidence il faudra TEF Canada / TCF Canada (français) ou IELTS General / CELPIP / PTE Core (anglais).',
      en: 'TOEFL, TOEIC, DELF and DALF are not accepted by IRCC for immigration. They are still useful for an employer, but for permanent residence you will need TEF Canada / TCF Canada (French) or IELTS General / CELPIP / PTE Core (English).',
    },
  },
];

export interface CvProfileOptions {
  /** Titre → code CNP (makeCatalogDetector), ou undefined. */
  detect: (title: string) => string | undefined;
  today: string;
}

export function extractCvProfile(text: string, opts: CvProfileOptions): CvProfile {
  const raw = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const norm = raw.map((l) => normalize(l));
  const sections: Section[] = [];
  let sec: Section = 'debut';
  for (const n of norm) {
    const h = SECTION_RE.find(([, re]) => re.test(n.replace(BULLET, '')))?.[0];
    if (h) sec = h;
    sections.push(h ? 'autre' : sec); // la ligne de titre elle-même n'est pas un poste
  }
  const hasExperienceHeading = sections.includes('experience');

  // 1. Titres de poste reconnus (lignes courtes, hors listes à puces, hors formation et compétences).
  const found: Array<{ i: number; noc: string }> = [];
  for (let i = 0; i < raw.length; i++) {
    const s = sections[i]!;
    if (s === 'formation' || s === 'competences' || s === 'autre') continue;
    const line = norm[i]!;
    if (BULLET.test(raw[i]!) || line.split(/\s+/).length > 14 || /[.!?]$/.test(line)) continue;
    for (const part of titleParts(raw[i]!)) {
      const noc = opts.detect(part);
      if (noc) { found.push({ i, noc }); break; }
    }
  }

  // 2. Périodes : chacune rattachée au titre reconnu le plus proche au-dessus (3 lignes au plus), sinon juste en dessous.
  const periodsByLine = norm.map((l) => extractPeriods(l, opts.today));
  const jobPeriods = new Map<string, Array<{ start: number; end: number }>>();
  const jobLines = new Map<string, Set<string>>();
  for (const f of found) {
    if (!jobLines.has(f.noc)) { jobLines.set(f.noc, new Set()); jobPeriods.set(f.noc, []); }
    jobLines.get(f.noc)!.add(short(raw[f.i]!));
  }
  periodsByLine.forEach((ps, li) => {
    if (!ps.length) return;
    const above = [...found].reverse().find((f) => f.i <= li && li - f.i <= 3);
    const below = found.find((f) => f.i > li && f.i - li <= 1);
    const owner = above ?? below;
    if (owner) jobPeriods.get(owner.noc)!.push(...ps);
  });
  const jobs: CvJob[] = [...jobLines.entries()].map(([noc, l]) => ({ noc, months: mergedMonths(jobPeriods.get(noc)!), lines: [...l].slice(0, 3) }));
  jobs.sort((a, b) => b.months - a.months || b.lines.length - a.lines.length);

  // 3. Expérience totale : périodes de la partie « expérience » (ou de tout le CV hors formation s'il n'y a pas de titres).
  const expPeriods = periodsByLine.flatMap((ps, li) =>
    (hasExperienceHeading ? sections[li] === 'experience' : sections[li] !== 'formation') ? ps : []);
  const experienceMonths = mergedMonths(expPeriods);

  // 4. Diplôme le plus élevé (partie formation d'abord, sinon tout le CV).
  let education: CvProfile['education'];
  const order: CvEducationLevel[] = ['universite', 'postsecondaire', 'secondaire', 'primaire'];
  const eduLines = sections.includes('formation') ? norm.map((n, i) => (sections[i] === 'formation' || /diplome|degree/.test(n) ? i : -1)).filter((i) => i >= 0) : norm.map((_, i) => i);
  for (const level of order) {
    const re = EDU.find(([l]) => l === level)![1];
    const i = eduLines.find((k) => re.test(norm[k]!.replace(/permis de conduire|licence de conduire/g, '')));
    if (i !== undefined) { education = { level, evidence: short(raw[i]!) }; break; }
  }

  // 5. Langues.
  const all = norm.join('\n');
  const cvLanguage = detectLanguage(text);
  const languages = {
    fr: cvLanguage === 'fr' || /\b(francais|french)\b/.test(all),
    en: cvLanguage === 'en' || /\b(anglais|english)\b/.test(all),
    cvLanguage,
  };

  // 6. Permis et certificats (le permis lourd l'emporte sur le permis voiture s'ils sont sur la même ligne).
  const credentials: CvCredential[] = [];
  for (const c of CREDENTIALS) {
    const i = norm.findIndex((n) => c.re.test(n));
    if (i < 0) continue;
    if (c.id === 'permis-b' && credentials.some((x) => x.id === 'permis-lourd' && x.evidence === short(raw[i]!))) continue;
    const { re: _re, ...rest } = c;
    credentials.push({ ...rest, evidence: short(raw[i]!) });
  }

  return { jobs, experienceMonths, ...(education ? { education } : {}), languages, credentials };
}

// ---------------------------------------------------------------------------
// Métiers passerelles
// ---------------------------------------------------------------------------

/** Postes approuvés par EIMT, par métier : [postes, employeurs, dont postes du volet agricole]. */
export type LmiaByNoc = Record<string, [number, number, number]>;

export interface Bridge {
  noc: string;
  teer: number;
  /** Même grand domaine de la CNP (1er chiffre) qu'un des métiers de la personne. */
  sameDomain: boolean;
  positions: number;
  employers: number;
  /** Part des postes du volet agricole (une partie est réservée au Mexique et aux Caraïbes, PTAS). */
  agriShare: number;
  /** Offres de la semaine qui prouvent recruter à l'étranger. */
  intlNow: number;
}

/** Niveau FEER accessible avec le diplôme : université → 1, postsecondaire → 2, secondaire → 4, primaire ou rien → 5. */
/**
 * Jamais proposés comme passerelles : professions où l'on n'entre pas sans le diplôme et l'ordre professionnel propres
 * au métier (médecins, dentistes, vétérinaires, pharmaciens, optométristes, juges, avocats, notaires).
 */
const NOT_A_BRIDGE = new Set(['31100', '31101', '31102', '31103', '31110', '31111', '31112', '31120', '41100', '41101']);

const EDU_TEER: Record<CvEducationLevel, number> = { universite: 1, postsecondaire: 2, secondaire: 4, primaire: 5 };

export interface BridgeOptions {
  /** Métiers de la personne (CV et profil). */
  jobs: string[];
  education?: CvEducationLevel;
  lmia: LmiaByNoc;
  /** Code CNP → nombre d'offres de la semaine avec preuve de recrutement à l'étranger. */
  intl?: Record<string, number>;
  /** Métiers réglementés ou de gestion à écarter (ex. FEER 0 sans expérience de gestion). */
  exclude?: Set<string>;
  max?: number;
}

/**
 * Métiers proches où le recrutement de travailleurs étrangers est réel : au plus `max` (6), la moitié dans le même grand
 * domaine. Accessibles = FEER pas plus exigeant que le meilleur niveau de la personne (métier ou diplôme), et au plus
 * un niveau sous son métier le moins qualifié (sans métier reconnu : deux niveaux sous son diplôme).
 */
export function suggestBridges(o: BridgeOptions): Bridge[] {
  const max = o.max ?? 6;
  const own = new Set(o.jobs);
  const teers = o.jobs.map(teerOf).filter((t) => t > 0);
  const best = Math.min(...teers, o.education ? EDU_TEER[o.education] : 5);
  const floor = teers.length ? Math.max(...teers) + 1 : best + 2;
  const domains = new Set(o.jobs.map((c) => c[0]));
  const list: Bridge[] = [];
  for (const [noc, [positions, employers, agri]] of Object.entries(o.lmia)) {
    if (own.has(noc) || NOT_A_BRIDGE.has(noc) || o.exclude?.has(noc) || !/^\d{5}$/.test(noc)) continue;
    const teer = teerOf(noc);
    if (teer === 0 || teer < best || teer > floor) continue;
    if (positions < 20) continue;
    list.push({ noc, teer, sameDomain: domains.has(noc[0]!), positions, employers, agriShare: positions ? agri / positions : 0, intlNow: o.intl?.[noc] ?? 0 });
  }
  // Classement : offres de la semaine avec preuve, puis nombre d'employeurs (plus parlant que les postes, qu'une ferme peut gonfler).
  const rank = (a: Bridge, b: Bridge) => b.intlNow - a.intlNow || b.employers - a.employers;
  const same = list.filter((b) => b.sameDomain).sort(rank);
  const other = list.filter((b) => !b.sameDomain).sort(rank);
  const half = Math.ceil(max / 2);
  const out = [...same.slice(0, half), ...other.slice(0, max - Math.min(half, same.length))];
  return out.slice(0, max);
}
