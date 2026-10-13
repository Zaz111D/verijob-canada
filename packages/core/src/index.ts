/**
 * @verijob/core — moteur anti-arnaque et moteur de faisabilité.
 * Aucune dépendance au DOM : réutilisable par la PWA, une extension Chrome ou un bot.
 */
export * from './types';
export * from './messages';
export { normalize, prepareText } from './text';
export { sourceRef, staleSources, todayIso } from './sources';
export { teerOf, findNoc, isPrimaryAgriculture, detectNocInText, probableRmrExemption, nocLabel } from './noc';
export { detectProvince, findCma, isAfrican, AFRICAN_COUNTRIES, PROVINCE_NAMES } from './geo';
export { extractWages, parseAmount } from './salary';
export { analyzeOffer, type AnalyzeOptions } from './scam/analyze';
export { SCAM_RULES } from './scam/rules';
export type { ScamAnalysis, ScamSignal, Severity, WageLookup } from './scam/types';
export {
  evaluatePathways,
  describeNoc,
  PATHWAY_NAMES,
  type JobContext,
  type PathwayId,
  type PathwayResult,
  type PathwayStatus,
  type EvaluateOptions,
} from './feasibility/evaluate';
