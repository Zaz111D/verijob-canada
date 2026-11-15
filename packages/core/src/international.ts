/**
 * Tri des offres OUVERTES AUX CANDIDATS DE L'ÉTRANGER.
 *
 * Les filtres des sites d'emploi sont vagues : on lit le texte de l'offre (titre + extrait) et on garde
 * seulement celles qui le disent explicitement (EIMT/LMIA, parrainage du permis, candidatures
 * internationales bienvenues…). On écarte celles qui exigent d'être déjà au Canada
 * (citoyens/résidents permanents seulement, « no sponsorship », permis de travail valide exigé).
 * Chaque décision est justifiée par la phrase trouvée. Aucune IA : des expressions explicables.
 */
import { excerpt, normalize, prepareText } from './text';
import type { ProvinceCode } from './types';

export type InternationalStatus = 'ouvert' | 'ferme' | 'inconnu';

export interface InternationalVerdict {
  status: InternationalStatus;
  /** Phrases qui montrent l'ouverture aux candidats de l'étranger. */
  evidence: string[];
  /** Phrases qui exigent d'être déjà au Canada (ou refusent le parrainage). */
  against: string[];
  /** Mention faible du type « légalement autorisé à travailler au Canada » (fréquente, même sur des offres EIMT). */
  caution: string[];
}

// Texte normalisé : minuscules, sans accents (voir prepareText).
const OPEN = [
  // Le mot « EIMT » seul ne prouve rien (« Nous ne réalisons pas de EIMT », vu le 15 nov. 2026) : il faut un contexte positif.
  /\b(lmia|eimt)\s*-?\s*(approved|approuvee?s?|positive|available|disponibles?|supported|support|sponsorship|sponsored|assistance|provided|offerte?s?|possible|exempt|dispensee?)\b/,
  // « with LMIA » seulement après un mot d'emploi : « Experience with LMIA paperwork » n'est pas une ouverture.
  /\b(positive|approved|(job|position|poste|emploi|offer|offre)\s+(with|avec)(\s+une?|\s+an?)?|offre d'|obtenu \w+ )\s*(lmia|eimt)\b/,
  /\b(lmia|eimt)\s+(jobs?|positions?|postes?|emplois?|candidates?|workers?)\b/,
  /\b(lmia|eimt)\b[^.!?\n]{0,15}\b(may|can|will|could)\s+be\s+(considered|provided|offered|supported|available)\b/,
  /\b(can|will|able to|pouvons|peut|pourrons|allons|aider?|help|assist|support)\b[^.!?\n]{0,25}\b(lmia|eimt)\b/,
  // Annonce publiée pour une demande d'EIMT : l'employeur prépare l'embauche d'un travailleur étranger.
  /\b(affichage|annonce|advertis\w*|posting)\b[^.!?\n]{0,80}\b(eimt|lmia)\b/,
  /\b(eimt|lmia)\b[^.!?\n]{0,60}\b(affichage|advertis\w*|recruitment efforts?|efforts de recrutement)\b/,
  /\b(visa|work permit|permis de travail|immigration)\s+(sponsor(ship|ed|ing)?|support(ed)?|assistance|parrain\w*|soutien|accompagnement)\b/,
  /\b(sponsor(ship)?|parrain\w*)\s+(available|offered|provided|possible|disponible|offert)\b/,
  /\b(will|can|able to|willing to|happy to)\s+sponsor\b/,
  /\b(open to|accept(s|ing)?|welcome|considering|consider)\s+(international|foreign|overseas)\s+(applicants|candidates|workers|applications)\b/,
  /\b(international|foreign|overseas)\s+(applicants|candidates|workers|applications)\s+(are\s+)?(welcome|encouraged|considered|accepted|eligible)\b/,
  /\btemporary foreign workers?\b/,
  /\b(travailleurs?|candidat(e)?s?|candidatures?)\s+(etrangers?|etrangeres?|internationa(les?|ux))\s+(sont\s+)?(bienvenu|accept|admissible|encourag)\w*/,
  /\brecrutement international\b/,
  /\b(mobilite francophone|francophone mobility)\b/,
  /\b(we will|nous allons|l'employeur va|employer will)\s+(help|assist|aider|accompagner)\b[^.!?\n]{0,60}\b(immigration|work permit|permis|visa)\b/,
];

const CLOSED = [
  // Refus en français et en anglais vus le 15 nov. 2026 (« Nous ne réalisons pas de EIMT », « No International Sponsorship Available »).
  /\bne\s+(realis|fais|fait|offr|fourn|soutien|parrain|accompagn|procede)\w*\s+(pas|aucune?)\b[^.!?\n]{0,40}\b(eimt|parrainage|permis de travail|immigration)\b/,
  /\bno\s+(international|foreign|overseas|visa|work permit|immigration)\s+(sponsorship|applicants|candidates|applications|support)\b/,
  /\b(not|n't)\s+(open|available)\s+to\s+(international|foreign|overseas)\b/,
  /\b(international|foreign|overseas)\s+(applicants|candidates|applications)\s+(will\s+)?(not|cannot|can't)\s+be\s+(considered|accepted|reviewed)\b/,
  /\b(must|need to|required to)\s+be\s+(currently|already)\s+(legally\s+)?(authori[sz]ed|eligible|entitled|permitted)\s+to work in canada\b/,
  /\b(must|need to)\s+(currently|already)\s+(have|hold|possess)\s+(a\s+)?(valid\s+)?(canadian\s+)?(work permit|work authori[sz]ation)\b/,
  /\b(must|need to|required to|should)\s+(be|have)\s+(a\s+)?(canadian citizen|citizenship|permanent resident|pr)\b/,
  /\b(canadian\s+)?citizens?\s+(and|or|&)\s+permanent residents?\s+(only|are eligible)/,
  /\bonly\s+(canadian\s+)?citizens?\s+(and|or)\s+permanent residents?\b/,
  /\b(no|not|unable to|cannot|can't|do not|don't|will not|won't)\s+(offer\s+|provide\s+)?(visa\s+|lmia\s+)?sponsor(ship)?\b/,
  /\bsponsorship\s+(is\s+)?not\s+(available|offered|provided|possible)\b/,
  /\b(must|need to)\s+(already\s+)?(reside|live|be located|be residing|be based)\s+in canada\b/,
  /\bvalid\s+(canadian\s+|open\s+)?work permit\s+(is\s+)?(required|mandatory)\b/,
  /\b(doit|doivent|devez)\s+(etre|deja etre)\s+(citoyen|resident permanent)/,
  /\b(citoyens?|residents? permanents?)\s+(canadiens?\s+)?(seulement|uniquement)\b/,
  /\baucun\s+parrainage\b|\bpas de parrainage\b/,
  /\bwithout\s+(any\s+)?(current\s+or\s+future\s+|future\s+)?(visa\s+|employer\s+|immigration\s+)?sponsorship\b/,
  /\b(authori[sz]ed|eligible|entitled)\s+to work in the (united states|us|u\.s\.)\b/,
  /\bsans\s+(aucun\s+)?parrainage\b/,
  /\bnot\s+(a|an)\s+(lmia|eimt)\b|\b(lmia|eimt)\s+not\s+(available|offered|supported|provided)\b/,
  /\b(do not|don't|does not|doesn't|cannot|can't|will not|won't|unable to|not able to)\s+(offer|provide|support|sponsor|assist with)\b[^.!?\n]{0,60}\b(lmia|eimt|labour market impact assessment|sponsor\w*|work permits?|visas?)\b/,
  // Visas AMÉRICAINS (TN, EB-3, H-1B, H-2B) : l'offre vise les États-Unis, pas un permis canadien (vu le 9 nov. 2026).
  /\b(tn|eb-?3|h-?1b|h-?2b)\b[^.!?\n]{0,40}\b(visa|sponsorship)\b/,
  /\b(n'offr|ne (pouvons|peut) pas|n'appuy)\w*\b[^.!?\n]{0,30}\b(eimt|parrainage|permis de travail)\b/,
  /\bno\s+(lmia|eimt)\b|\b(lmia|eimt)\s+(is\s+)?(not|non|pas)\s+(available|offered|supported|provided|disponible|offerte?)\b/,
  /\b(doit|devez)\s+(deja\s+)?(resider|habiter|etre)\s+au canada\b/,
  /\bpermis de travail valide\s+(est\s+)?(exige|requis|obligatoire)\b/,
];

const WEAK = [
  /\b(legally\s+)?(entitled|eligible|authori[sz]ed)\s+to work in canada\b/,
  /\b(legalement\s+)?(autorise|admissible)e?s?\s+a travailler au canada\b/,
];

/**
 * Travail « à la tâche » sur une plateforme (livreur Skip The Dishes, Uber Eats, DoorDash…) ou en travailleur autonome :
 * pas d'employeur, donc pas d'offre d'emploi qui permette un permis de travail. Inutile pour le public de VériJob.
 */
const GIG_COMPANY = /(^|[^a-z])(skip ?the ?dishes|uber|doordash|instacart|lyft|amazon flex|spark driver|foodora)(?![a-z])/;
const GIG_TITLE = /(^|[^a-z])(freelance|independent contractor|livreur independant|livreuse independante|chauffeur independant|travailleur autonome|travailleuse autonome|self[- ]employed)(?![a-z])/;
export function isGigOffer(o: { title: string; company?: string }): boolean {
  return GIG_COMPANY.test(normalize(o.company ?? '')) || GIG_TITLE.test(normalize(o.title));
}

export function classifyInternational(text: string): InternationalVerdict {
  const { segments } = prepareText(text);
  // Extrait centré sur l'expression trouvée : les annonces ont souvent de très longues « phrases » sans ponctuation.
  const around = (s: { raw: string; norm: string }, r: RegExp) => {
    const i = s.norm.search(r);
    const raw = s.raw.length === s.norm.length ? s.raw : s.norm;
    if (raw.length <= 160 || i < 0) return excerpt(raw);
    // Début de l'extrait environ 60 caractères avant l'expression, sur une limite de mot.
    let start = Math.max(0, i - 60);
    while (start > 0 && raw[start - 1] !== ' ') start--;
    return `${start > 0 ? '…' : ''}${excerpt(raw.slice(start), start > 0 ? 159 : 160)}`;
  };
  const find = (res: RegExp[]) => [...new Set(segments.flatMap((s) => {
    const r = res.find((x) => x.test(s.norm));
    return r ? [around(s, r)] : [];
  }))];
  const evidence = find(OPEN);
  const against = find(CLOSED);
  const caution = find(WEAK).filter((c) => !against.includes(c));
  // Une exigence explicite (« citoyens seulement », « no sponsorship ») l'emporte sur une simple mention d'EIMT.
  const status: InternationalStatus = against.length ? 'ferme' : evidence.length ? 'ouvert' : 'inconnu';
  return { status, evidence, against, caution };
}

/** Offre publiée par le pipeline (annonce Adzuna triée par VériJob). */
export interface InternationalOffer {
  id: string;
  title: string;
  company: string;
  location: string;
  province?: ProvinceCode;
  /** Date de publication AAAA-MM-JJ. */
  date: string;
  salaryMin: number | null;
  salaryMax: number | null;
  /** Salaire estimé par Adzuna (et non indiqué par l'employeur). */
  salaryPredicted: boolean;
  url: string;
  noc: string;
  snippet: string;
  evidence: string[];
  /** Expressions trouvées par Adzuna dans l'annonce COMPLÈTE (l'API ne renvoie qu'un extrait). */
  matched: string[];
  /** Recoupement avec les listes officielles d'EIMT positives (EDSC) : même employeur, même province. */
  lmia?: { positions: number; lastQuarter: string; sameNoc: boolean };
  caution: string[];
  /** Identifiants des signaux d'arnaque repérés dans le titre + l'extrait. */
  scam: string[];
  /** Tracker : première et dernière semaine où VériJob a vu l'annonce (AAAA-MM-JJ). */
  firstSeen?: string;
  lastSeen?: string;
  /** Métier reconnu dans le catalogue complet (516 métiers) quand ce n'est pas un métier suivi. */
  nocGuess?: string;
}

/** Offre actuelle d'un métier suivi (annonce Adzuna avec lien direct), publiée par le pipeline. */
export interface CurrentOffer {
  /** Métier du catalogue complet (516 métiers) reconnu dans le titre, quand ce n'est pas un métier suivi. */
  nocGuess?: string;
  id: string;
  title: string;
  company: string;
  location: string;
  province?: ProvinceCode;
  /** Date de publication AAAA-MM-JJ. */
  date: string;
  salaryMin: number | null;
  salaryMax: number | null;
  /** Salaire estimé par Adzuna (et non indiqué par l'employeur). */
  salaryPredicted: boolean;
  /** Lien direct vers l'annonce (via Adzuna). */
  url: string;
  noc: string;
  /** Début de l'annonce (Adzuna ne donne pas le texte complet). */
  snippet: string;
  /** Identifiants des signaux d'arnaque repérés. */
  scam: string[];
  /** Pour chaque signal, la phrase de l'annonce qui l'a déclenché (transparence : l'utilisateur juge lui-même). */
  scamWhy?: string[];
  /** L'annonce figure aussi dans les offres reconnues « ouvertes aux candidats de l'étranger ». */
  intl?: true;
}
