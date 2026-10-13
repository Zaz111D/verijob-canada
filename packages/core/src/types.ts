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
  };
  changes: RuleChange[];
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
  probableNaics: string | null;
  keywords: string[];
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
}
