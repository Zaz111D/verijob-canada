/**
 * @verijob/core — moteur anti-arnaque et moteur de faisabilité.
 * Aucune dépendance au DOM : réutilisable par la PWA, une extension Chrome ou un bot.
 */
export * from './types';
export * from './messages';
export { normalize, prepareText, formatDate, formatAmount } from './text';
export { sourceRef, staleSources, todayIso } from './sources';
export { teerOf, findNoc, isPrimaryAgriculture, detectNocInText, probableRmrExemption, nocLabel } from './noc';
export {
  detectProvince,
  findCma,
  cityKey,
  locateWorkplace,
  isAfrican,
  AFRICAN_COUNTRIES,
  PROVINCE_NAMES,
  type CmaLookup,
  type WorkplaceLocation,
} from './geo';
export { employerKey, employerSearchName } from './employer';
export { searchEmployers, boundedLevenshtein, type SearchHit } from './search';
export {
  addDays, dueFollowUps, exportApplications, isFreeEmail, mergeApplications, newId, parseImport, sortApplications,
  APPLICATION_STATUSES, APPLICATION_ORIGINS, DEFAULT_FOLLOW_UP_DAYS, MAX_AD_TEXT,
  type Application, type ApplicationOrigin, type ApplicationStatus, type TrackingExport, type Verification,
} from './tracking';
export { programStatuses, upcomingDates, changeLog, jobBankLink, type ProgramStatus, type ProgramState, type UpcomingDate, type ChangeEntry } from './watch';
export { filterProspects, prospectPathway, prospectsToCsv, totalPositions, type Prospect, type ProspectFilter } from './prospects';
export {
  searchLinks, recruitmentEvents, networks, riskyChannels,
  type SearchLink, type EventInfo, type NetworkInfo,
} from './opportunities';
export {
  classifyRound, parseExpressEntryRounds, latestRoundByCategory, filterNews,
  type RawRound, type ExpressEntryRound, type ExpressEntryData, type NewsItem,
} from './live';
export { makeWageLookup, type WagesData } from './wages';
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
export { analyzeCv, detectLanguage, offerKeywords, matchKeywords, extractPeriods, type CvInput, type CvAnalysis, type CvCheck, type CvCheckStatus, type CvCategory, type KeywordMatch, type DetectedLang } from './cv';
export {
  computeStats, hourlyOf, parseEducation, parseEmploymentType, parseExperience, parsePostingLang, parseSalaryPer, parseTerm,
  recentPostings, salaryLabel, EDUCATION_LABEL, EXPERIENCE_LABEL, POSTING_LANG_LABEL, TERM_LABEL, TYPE_LABEL,
  type PostingRow, type PostingStats, type PostingsData, type PostingView, type Education, type Experience,
} from './postings';
