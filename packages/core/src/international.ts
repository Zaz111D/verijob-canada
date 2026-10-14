/**
 * Tri des offres OUVERTES AUX CANDIDATS DE L'ÉTRANGER.
 *
 * Les filtres des sites d'emploi sont vagues : on lit le texte de l'offre (titre + extrait) et on garde
 * seulement celles qui le disent explicitement (EIMT/LMIA, parrainage du permis, candidatures
 * internationales bienvenues…). On écarte celles qui exigent d'être déjà au Canada
 * (citoyens/résidents permanents seulement, « no sponsorship », permis de travail valide exigé).
 * Chaque décision est justifiée par la phrase trouvée. Aucune IA : des expressions explicables.
 */
import { excerpt, prepareText } from './text';
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
  /\b(lmia|eimt)\b/,
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
  /\bno\s+(lmia|eimt)\b|\b(lmia|eimt)\s+(is\s+)?(not|non|pas)\s+(available|offered|supported|provided|disponible|offerte?)\b/,
  /\b(doit|devez)\s+(deja\s+)?(resider|habiter|etre)\s+au canada\b/,
  /\bpermis de travail valide\s+(est\s+)?(exige|requis|obligatoire)\b/,
];

const WEAK = [
  /\b(legally\s+)?(entitled|eligible|authori[sz]ed)\s+to work in canada\b/,
  /\b(legalement\s+)?(autorise|admissible)e?s?\s+a travailler au canada\b/,
];

export function classifyInternational(text: string): InternationalVerdict {
  const { segments } = prepareText(text);
  const find = (res: RegExp[]) => [...new Set(segments.filter((s) => res.some((r) => r.test(s.norm))).map((s) => excerpt(s.raw)))];
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
  caution: string[];
  /** Identifiants des signaux d'arnaque repérés dans le titre + l'extrait. */
  scam: string[];
}
