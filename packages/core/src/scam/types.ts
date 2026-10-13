import type { Localized, NocData, NocEntry, Profile, ProvinceCode, Rules, SourceRef } from '../types';
import type { Segment } from '../text';

/** Niveau d'un signal d'alerte. */
export type Severity = 'eleve' | 'moyen' | 'info';

/** Salaires de référence par métier et province (fournis plus tard par le pipeline Job Bank). */
export type WageLookup = (noc: string, province?: ProvinceCode) => { medianHourly: number } | undefined;

/** Contexte passé à chaque règle anti-arnaque. */
export interface ScamContext {
  raw: string;
  norm: string;
  segments: Segment[];
  rules: Rules;
  nocData: NocData;
  profile: Profile;
  detectedNoc?: NocEntry;
  detectedProvince?: ProvinceCode;
  wageLookup?: WageLookup;
  today: string;
}

/** Résultat brut d'une règle déclenchée. */
export interface RuleHit {
  /** Extraits du texte qui ont déclenché la règle. */
  evidence: string[];
  /** Explication spécifique (sinon l'explication générique de la règle est utilisée). */
  explanation?: Localized;
}

/** Une règle anti-arnaque explicable. */
export interface ScamRule {
  id: string;
  severity: Severity;
  title: Localized;
  /** Explication générique, en langage simple. */
  explanation: (rules: Rules) => Localized;
  /** Identifiants de sources dans rules.json. */
  sourceIds: (rules: Rules) => string[];
  /** Renvoie un RuleHit si la règle est déclenchée, `{ skipped }` si elle n'a pas pu être évaluée. */
  detect: (ctx: ScamContext) => RuleHit | { skipped: Localized } | undefined;
}

/** Signal d'alerte affiché à l'utilisateur. */
export interface ScamSignal {
  id: string;
  severity: Severity;
  title: Localized;
  explanation: Localized;
  evidence: string[];
  sources: SourceRef[];
}

export interface ScamAnalysis {
  signals: ScamSignal[];
  count: number;
  /** « X signaux d'alerte détectés » ou « Aucun signal d'alerte détecté — … ». Jamais « offre sûre ». */
  summary: Localized;
  /** Règles qui n'ont pas pu être évaluées (ex. métier non reconnu pour le contrôle du salaire). */
  skipped: Array<{ id: string; reason: Localized }>;
  detectedNoc?: { code: string; title: Localized };
  detectedProvince?: ProvinceCode;
  disclaimer: Localized;
}
