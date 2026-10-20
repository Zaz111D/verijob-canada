/**
 * Types partagés du moteur VériJob.
 * Les structures `Rules` et `NocData` décrivent les fichiers data/rules.json et data/noc.json.
 */

/** Texte disponible dans les deux langues de l'interface. */
export interface Localized {
  fr: string;
  en: string;
}

/** Code de province/territoire canadien (2 lettres). */
export type ProvinceCode =
  | 'NL' | 'PE' | 'NS' | 'NB' | 'QC' | 'ON' | 'MB' | 'SK' | 'AB' | 'BC' | 'YT' | 'NT' | 'NU';

// ---------------------------------------------------------------------------
// data/rules.json
// ---------------------------------------------------------------------------

export interface RuleSource {
  titleFr: string;
  titleEn: string;
  urlFr: string | null;
  urlEn: string;
  pageModified: string | null;
  verifiedAt: string;
  nextReview: string;
}

export interface Cma {
  name: string;
  province: ProvinceCode;
  frozen: boolean;
  aliases: string[];
}

export interface Community {
  name: string;
  province: ProvinceCode;
  programs: Array<'RCIP' | 'FCIP'>;
  url: string;
}

export interface Rules {
  version: string;
  sources: Record<string, RuleSource>;
  lmiaLowWage: {
    source: string;
    unemploymentThresholdPercent: number;
    ratesUpdated: string;
    validFrom: string;
    validTo: string;
    nextUpdate: string;
    exemptions: {
      naics: string[];
      primaryAgriculture: boolean;
      inHomeCaregiverNocs: string[];
    };
    cmas: Cma[];
  };
  wageThresholds: {
    source: string;
    effectiveFrom: string;
    hourlyCad: Record<string, number>;
  };
  fees: {
    source: string;
    lmiaProcessingFeeCad: number;
  };
  agricultural: {
    source: string;
    openToAllCountries: boolean;
    primaryAgricultureNocs: string[];
  };
  sawp: {
    source: string;
    countries: string[];
  };
  francophoneMobility: {
    source: string;
    excludedProvinces: string[];
    minOralNclc: number;
    excludesPrimaryAgricultureTeer: number[];
  };
  homeCareWorkerPilots: {
    source: string;
    nocs: string[];
    closedFrom: string;
    closedUntil: string;
  };
  liveInCaregiver: {
    source: string;
    nocs: string[];
  };
  communityPilots: {
    source: string;
    rcip: { source: string; minClbByTeer: Record<string, number>; languages: string[] };
    fcip: { source: string; minNclcAllTeer: number; languages: string[] };
    minExperienceHours: number;
    communities: Community[];
  };
  authorizedRepresentatives: {
    source: string;
    registerSource: string;
  };
  ruralMeasures: {
    source: string;
    validFrom: string;
    validTo: string;
    provinces: Record<string, { from: string; cap15: boolean }>;
    notParticipating: string[];
    undetermined: string[];
  };
  lowWageRecruitment: {
    source: string;
    minAdvertisingWeeks: number;
    youthAgeRange: [number, number];
  };
  jobBank: {
    source: string;
    foreignJobsUrl: string;
    /** Modèle d'URL relevé à la main ({keyword}, {province}) ; null tant qu'il n'est pas vérifié. */
    searchTemplate: string | null;
    /** Filtre province vérifié à la main, ajouté à la fin de l'adresse (ex. « &fprov={province} »). */
    provinceParam?: string;
  };
  opportunities: {
    searchSites: SearchSite[];
    events: OpportunityEvent[];
    networks: OpportunityNetwork[];
    riskyChannels: Array<{ id: string; source: string; nameFr: string; nameEn: string; detailFr: string; detailEn: string }>;
  };
  cv: {
    source: string;
    maxPages: number;
    maxWordsIfPagesUnknown: number;
    maxBulletsPerSection: number;
    oldExperienceYears: number;
    minTextChars: number;
    maxPronouns: number;
    gapMonths: number;
    offerKeywords: number;
    keywordMatchGood: number;
    keywordMatchLow: number;
    /** Outil gratuit de création de CV du Guichet-Emplois (compte nécessaire). */
    resumeBuilder: Localized;
  };
  expressEntry: {
    source: string;
    roundsSource: string;
    roundsJson: Localized;
    minFrenchNclc: number;
    categoryMinExperienceMonths: number;
    categories: ExpressEntryCategory[];
  };
  liveNews: {
    source: string;
    url: Localized;
    maxItems: number;
    include: string[];
    exclude: string[];
  };
  languageTest: {
    byPathway: Record<string, { required: boolean; source: string; noteFr: string; noteEn: string }>;
    permanentResidenceNoteFr: string;
    permanentResidenceNoteEn: string;
  };
  /** Règles en préparation (pas encore en vigueur), suivies par l'appli. */
  proposals: RuleProposal[];
  family: {
    source: string;
    quebecSource: string;
    openPermitTeers: number[];
    minPermitMonths: number;
    summaryFr: string; summaryEn: string;
    exceptionsFr: string; exceptionsEn: string;
  };
  quebec: {
    steps: Array<{ source: string; fr: string; en: string }>;
    noFrancophoneMobilityFr: string;
    noFrancophoneMobilityEn: string;
    arrimaUrl: string;
  };
  occupationTransfers: OccupationTransfer[];
  /** Province → identifiant de source de la page officielle du permis d'agent de sécurité. */
  securityLicences: Partial<Record<ProvinceCode, string>>;
  changes: RuleChange[];
}

export interface RuleProposal {
  id: string;
  source: string;
  /** Voies concernées si la règle est adoptée. */
  affects: string[];
  status: 'propose' | 'publie' | 'en-vigueur' | 'abandonne';
  expectedFr: string;
  expectedEn: string;
  titleFr: string;
  titleEn: string;
  detailFr: string;
  detailEn: string;
  checkedAt: string;
}

/** Métier d'origine → métier proche, justifié par les fonctions officielles des deux groupes (CNP 2021). */
export interface OccupationTransfer {
  source: string;
  from: string;
  fromTitleFr: string;
  fromTitleEn: string;
  /** Intitulé court pour les messages. */
  fromJobFr: string;
  fromJobEn: string;
  /** Résumé des tâches communes, pour la candidature. */
  skillsFr: string;
  skillsEn: string;
  to: string;
  shared: Array<{ fromFr: string; fromEn: string; toFr: string; toEn: string }>;
  requirementsFr: string;
  requirementsEn: string;
}

/** Site d'offres d'emploi (mode liens : l'appli construit l'adresse, l'utilisateur l'ouvre). */
export interface SearchSite {
  id: string;
  name: string;
  /** Modèle avec {keyword} et {location} ; null = lien simple (champ url). */
  template: string | null;
  url?: string;
  /** Si présent : site utile seulement pour ces provinces. */
  provinces?: ProvinceCode[];
  noteFr: string;
  noteEn: string;
  verifiedAt: string;
}

/** Salon ou mission de recrutement. */
export interface OpportunityEvent {
  id: string;
  source: string;
  nameFr: string;
  nameEn: string;
  audienceFr: string;
  audienceEn: string;
  statusFr: string;
  statusEn: string;
  /** Fin de la dernière édition connue (AAAA-MM-JJ) ; null si inconnue. */
  lastEditionEnd: string | null;
}

/** Réseau ou organisme utile pour trouver un employeur. */
export interface OpportunityNetwork {
  id: string;
  source: string;
  nameFr: string;
  nameEn: string;
  detailFr: string;
  detailEn: string;
  /** Lien propre (sinon le lien de la source). */
  url?: string;
  /** Lien interne de l'appli (ex. « #/demarcher »). */
  internal?: string;
  /** Pays (ISO-2) concernés, si la piste ne vaut que pour certains pays. */
  countries?: string[];
}

/** Accès à une catégorie d'Entrée express pour une personne qui vit hors du Canada. */
export type ExpressEntryAccess = 'etranger' | 'nomination' | 'canada' | 'autre';

export interface ExpressEntryCategory {
  id: string;
  /** Morceaux de nom de ronde (texte normalisé) qui identifient la catégorie. */
  match: string[];
  access: ExpressEntryAccess;
  nameFr: string;
  nameEn: string;
}

/** Changement réglementaire daté (page « Ce qui a changé »). */
export interface RuleChange {
  date: string;
  source: string;
  /** Vrai si la date exacte n'est pas indiquée sur la page officielle. */
  approximateDate?: boolean;
  titleFr: string;
  titleEn: string;
  detailFr: string;
  detailEn: string;
}

// ---------------------------------------------------------------------------
// data/noc.json
// ---------------------------------------------------------------------------

export interface NocEntry {
  code: string;
  group: string;
  titleFr: string;
  titleEn: string;
  /** Intitulé de poste court, au singulier (pour les messages). */
  jobFr?: string;
  jobEn?: string;
  /** Terme de recherche français (annonces du Québec) ; figure aussi dans les mots-clés du métier. */
  searchFr?: string;
  probableNaics: string | null;
  keywords: string[];
  /** Mots qui désignent un métier voisin : si le texte les contient, ce n'est pas ce métier. */
  notKeywords?: string[];
}

export interface NocData {
  source: { titleFr: string; titleEn: string; urlFr: string; urlEn: string; verifiedAt: string };
  nocs: NocEntry[];
}

// ---------------------------------------------------------------------------
// Références de source affichées à l'utilisateur
// ---------------------------------------------------------------------------

export interface SourceRef {
  id: string;
  title: Localized;
  url: Localized;
  verifiedAt: string;
  nextReview: string;
  /** Vrai si la date de prochaine révision est dépassée : « donnée possiblement périmée ». */
  stale: boolean;
}

// ---------------------------------------------------------------------------
// Profil utilisateur (stocké localement, jamais envoyé)
// ---------------------------------------------------------------------------

/** Niveaux NCLC (français) ou CLB (anglais) par compétence. Absent = inconnu. */
export interface LanguageLevels {
  speaking?: number;
  listening?: number;
  reading?: number;
  writing?: number;
}

export interface Profile {
  /** Pays de citoyenneté, code ISO 3166-1 alpha-2 (ex. « CM »). */
  citizenship?: string;
  french?: LanguageLevels;
  english?: LanguageLevels;
  experienceMonths?: number;
  targetNocs?: string[];
  provinces?: ProvinceCode[];
  /** Métier actuel ou passé, s'il n'est pas dans la liste des métiers suivis (ex. « 43201 »). */
  currentNoc?: string;
  /** Études faites en français (diplôme ou relevé) : preuve de français acceptée sans test pour la Mobilité francophone. */
  frenchStudies?: boolean;
}
