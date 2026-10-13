/**
 * Moteur de faisabilité : pour un profil et un emploi (ou un simple métier),
 * indique quelles voies d'immigration sont réalistes, avec les raisons en langage simple
 * et les sources officielles. Jamais de « score magique ».
 *
 * Toutes les valeurs réglementaires viennent de data/rules.json.
 */
import { locateWorkplace, PROVINCE_NAMES, type CmaLookup } from '../geo';
import { findNoc, isPrimaryAgriculture, nocLabel, probableRmrExemption, teerOf } from '../noc';
import { sourceRef, todayIso, uniqueSources } from '../sources';
import { formatCad, formatDate } from '../text';
import type { LanguageLevels, Localized, NocData, Profile, ProvinceCode, Rules, SourceRef } from '../types';

export type PathwayId =
  | 'eimt-bas-salaire'
  | 'eimt-agricole'
  | 'ptas'
  | 'mobilite-francophone'
  | 'pilotes-aides-familiaux'
  | 'pilotes-communautaires';

export type PathwayStatus = 'probable' | 'possible' | 'bloquee' | 'inconnue';

export interface PathwayResult {
  voie: PathwayId;
  nom: Localized;
  statut: PathwayStatus;
  raisons: Localized[];
  sources: SourceRef[];
}

/** Emploi évalué. Seul le code CNP est obligatoire (évaluation « par métier »). */
export interface JobContext {
  noc: string;
  province?: ProvinceCode;
  city?: string;
  /** Vrai si l'on sait que le lieu de travail est hors de toute RMR. */
  outsideCma?: boolean;
  /** Salaire horaire offert en $ CA, s'il est connu. */
  hourlyWage?: number;
  /** Poste d'aide familial avec obligation de loger chez l'employeur. */
  liveIn?: boolean;
  /** Poste dans un ménage privé (par défaut : supposé vrai pour les aides familiaux). */
  privateHousehold?: boolean;
  /** Employeur désigné FCIP/RCIP ; `false` = on sait qu'il ne l'est pas ; absent = inconnu. */
  designatedEmployer?: { program: 'RCIP' | 'FCIP'; community?: string } | false;
}

export interface EvaluateOptions {
  rules: Rules;
  nocData: NocData;
  /** Correspondance officielle municipalité → RMR (cma-lookup.json), si chargée. */
  cmaLookup?: CmaLookup;
  today?: string;
}

export const PATHWAY_NAMES: Record<PathwayId, Localized> = {
  'eimt-bas-salaire': { fr: 'EIMT – volet bas salaire', en: 'LMIA – low-wage stream' },
  'eimt-agricole': { fr: 'EIMT – volet agricole', en: 'LMIA – Agricultural Stream' },
  ptas: { fr: 'Programme des travailleurs agricoles saisonniers (PTAS)', en: 'Seasonal Agricultural Worker Program (SAWP)' },
  'mobilite-francophone': { fr: 'Mobilité francophone (permis sans EIMT)', en: 'Francophone Mobility (LMIA-exempt permit)' },
  'pilotes-aides-familiaux': { fr: 'Projets pilotes aides familiaux (résidence permanente)', en: 'Home Care Worker Pilots (permanent residence)' },
  'pilotes-communautaires': { fr: 'Pilotes communautaires rural (PICR) et francophone (PICRF)', en: 'Rural (RCIP) and Francophone (FCIP) Community Pilots' },
};

const STATUS_ORDER: Record<PathwayStatus, number> = { probable: 0, possible: 1, inconnue: 2, bloquee: 3 };

/** Évalue toutes les voies pertinentes pour ce profil et cet emploi. */
export function evaluatePathways(profile: Profile, job: JobContext, opts: EvaluateOptions): PathwayResult[] {
  const today = opts.today ?? todayIso();
  const ctx: Ctx = { profile, job, rules: opts.rules, nocData: opts.nocData, cmaLookup: opts.cmaLookup, today, teer: teerOf(job.noc) };
  const results: PathwayResult[] = [];

  if (isPrimaryAgriculture(opts.rules, job.noc)) {
    results.push(agricultural(ctx), sawp(ctx));
  } else {
    results.push(lowWage(ctx));
  }
  results.push(francophoneMobility(ctx));
  if (opts.rules.homeCareWorkerPilots.nocs.includes(job.noc)) results.push(homeCarePilots(ctx));
  results.push(communityPilots(ctx));

  return results.sort((a, b) => STATUS_ORDER[a.statut] - STATUS_ORDER[b.statut]);
}

// ---------------------------------------------------------------------------

interface Ctx {
  profile: Profile;
  job: JobContext;
  rules: Rules;
  nocData: NocData;
  cmaLookup?: CmaLookup;
  today: string;
  teer: number;
}

function result(ctx: Ctx, voie: PathwayId, statut: PathwayStatus, raisons: Localized[], sourceIds: string[]): PathwayResult {
  const sources = uniqueSources(sourceIds.map((id) => sourceRef(ctx.rules, id, ctx.today)));
  // Avertissement visible si une règle utilisée a dépassé sa date de révision.
  if (sources.some((s) => s.stale)) {
    raisons.push({
      fr: '⚠ Donnée possiblement périmée : la règle utilisée a dépassé sa date de révision. Vérifiez sur canada.ca.',
      en: '⚠ Data may be out of date: the rule used is past its review date. Check on canada.ca.',
    });
  }
  return { voie, nom: PATHWAY_NAMES[voie], statut, raisons, sources };
}

function provinceName(code: ProvinceCode): Localized {
  return { fr: PROVINCE_NAMES[code].fr, en: PROVINCE_NAMES[code].en };
}

/** EIMT bas salaire : gel des RMR, exemptions estimées, aides familiaux résidants. */
function lowWage(ctx: Ctx): PathwayResult {
  const { rules, job } = ctx;
  const lw = rules.lmiaLowWage;
  const ids = [lw.source];
  const label = nocLabel(ctx.nocData, job.noc);

  // 1. Aide familial obligé de loger chez l'employeur : refus de traiter.
  if (job.liveIn && rules.liveInCaregiver.nocs.includes(job.noc)) {
    return result(ctx, 'eimt-bas-salaire', 'bloquee', [{
      fr: "Les demandes d'EIMT pour un aide familial obligé de loger chez l'employeur ne sont pas traitées, sauf besoins médicaux importants (note du médecin) ou circonstances exceptionnelles.",
      en: 'LMIA applications for caregivers required to live in the employer’s home are not processed, except for high medical needs (doctor’s note) or exceptional circumstances.',
    }], [rules.liveInCaregiver.source]);
  }

  // 2. Salaire au-dessus du seuil provincial : volet haut salaire, gel des RMR non applicable.
  const threshold = job.province ? rules.wageThresholds.hourlyCad[job.province] : undefined;
  if (job.hourlyWage !== undefined && threshold !== undefined && job.hourlyWage >= threshold) {
    return result(ctx, 'eimt-bas-salaire', 'possible', [{
      fr: `Le salaire offert (${formatCad(job.hourlyWage, 'fr')}/h) atteint le seuil « haut salaire » de la province (${formatCad(threshold, 'fr')}/h) : la demande passe par le volet haut salaire et le gel des RMR ne s'applique pas.`,
      en: `The offered wage (${formatCad(job.hourlyWage, 'en')}/h) reaches the province’s "high-wage" threshold (${formatCad(threshold, 'en')}/h): the application goes through the high-wage stream and the CMA freeze does not apply.`,
    }], [...ids, rules.wageThresholds.source]);
  }

  const raisons: Localized[] = [];
  if (job.hourlyWage === undefined && ctx.teer >= 4) {
    raisons.push({
      fr: `Pour ce métier (${label.fr}), le salaire est presque toujours sous le seuil « haut salaire » : c'est en général le volet bas salaire.`,
      en: `For this job (${label.en}), pay is almost always below the "high-wage" threshold: it is usually the low-wage stream.`,
    });
  }
  if (job.province === 'QC') {
    raisons.push({
      fr: 'Au Québec, des règles provinciales s’ajoutent (CAQ, listes propres au Québec). Module Québec à venir.',
      en: 'In Quebec, provincial rules also apply (CAQ, Quebec-specific lists). Quebec module coming later.',
    });
  }

  const exemption = probableRmrExemption(rules, ctx.nocData, job.noc, { privateHousehold: job.privateHousehold });
  const exemptionText: Localized | undefined = exemption && {
    fr:
      exemption.kind === 'inHomeCaregiver'
        ? "Les postes d'aide familial dans un ménage privé sont exemptés du gel des RMR."
        : `Ce métier est probablement exempté du gel des RMR (secteur estimé d'après le métier : SCIAN ${exemption.naics}). À confirmer avec l'employeur.`,
    en:
      exemption.kind === 'inHomeCaregiver'
        ? 'In-home caregiver positions in a private household are exempt from the CMA freeze.'
        : `This job is probably exempt from the CMA freeze (sector estimated from the job: NAICS ${exemption.naics}). Confirm with the employer.`,
  };

  const period: Localized = {
    fr: `liste valable pour les demandes du ${formatDate(lw.validFrom, 'fr')} au ${formatDate(lw.validTo, 'fr')}`,
    en: `list valid for applications from ${formatDate(lw.validFrom, 'en')} to ${formatDate(lw.validTo, 'en')}`,
  };
  if (ctx.today > lw.validTo) {
    raisons.push({
      fr: `⚠ La liste des RMR gelées utilisée a expiré le ${formatDate(lw.validTo, 'fr')} : elle doit être mise à jour.`,
      en: `⚠ The frozen CMA list used expired on ${formatDate(lw.validTo, 'en')}: it must be updated.`,
    });
  }

  const where = job.city ? locateWorkplace(rules, job.city, job.province, ctx.cmaLookup) : undefined;
  const cma = where?.kind === 'cma' ? where.cma : undefined;
  if (cma) {
    if (!cma.frozen) {
      raisons.push({
        fr: `${cma.name} est une RMR où le chômage est sous ${lw.unemploymentThresholdPercent} % : les EIMT bas salaire y sont traitées (${period.fr}).`,
        en: `${cma.name} is a CMA with unemployment below ${lw.unemploymentThresholdPercent}%: low-wage LMIAs are processed there (${period.en}).`,
      });
      return result(ctx, 'eimt-bas-salaire', 'possible', raisons, ids);
    }
    if (exemptionText) {
      raisons.push({
        fr: `${cma.name} est une RMR gelée (chômage ≥ ${lw.unemploymentThresholdPercent} %), mais : ${exemptionText.fr}`,
        en: `${cma.name} is a frozen CMA (unemployment ≥ ${lw.unemploymentThresholdPercent}%), but: ${exemptionText.en}`,
      });
      return result(ctx, 'eimt-bas-salaire', 'possible', raisons, ids);
    }
    raisons.push({
      fr: `${cma.name} est une RMR où le chômage est d'au moins ${lw.unemploymentThresholdPercent} % : EDSC refuse de traiter les EIMT bas salaire pour ce lieu (${period.fr}). Cherchez plutôt un employeur hors des grandes villes.`,
      en: `${cma.name} is a CMA with unemployment of ${lw.unemploymentThresholdPercent}% or more: ESDC refuses to process low-wage LMIAs for this location (${period.en}). Look for an employer outside large cities.`,
    });
    return result(ctx, 'eimt-bas-salaire', 'bloquee', raisons, ids);
  }

  if (job.outsideCma || where?.kind === 'outside') {
    raisons.push({
      fr: 'Le lieu de travail est hors de toute RMR : il n’est pas visé par le gel des EIMT bas salaire.',
      en: 'The workplace is outside any CMA: it is not affected by the low-wage LMIA freeze.',
    });
    return result(ctx, 'eimt-bas-salaire', 'possible', raisons, ids);
  }

  if (exemptionText) {
    raisons.push({ fr: `${exemptionText.fr} Le lieu de travail importe donc peu pour cette règle.`, en: `${exemptionText.en} The workplace location matters little for this rule.` });
    return result(ctx, 'eimt-bas-salaire', 'possible', raisons, ids);
  }

  raisons.push(
    job.city
      ? {
          fr: `Nous ne savons pas encore si « ${job.city} » fait partie d'une RMR gelée. Les lieux hors RMR (petites villes, zones rurales) ne sont pas visés par le gel.`,
          en: `We do not know yet whether "${job.city}" is part of a frozen CMA. Places outside CMAs (small towns, rural areas) are not affected by the freeze.`,
        }
      : {
          fr: `Tout dépend du lieu de travail : dans ${lw.cmas.filter((c) => c.frozen).length} grandes régions urbaines (RMR) où le chômage est d'au moins ${lw.unemploymentThresholdPercent} %, ces demandes ne sont pas traitées. Hors de ces RMR, elles le sont.`,
          en: `It depends on the workplace: in ${lw.cmas.filter((c) => c.frozen).length} large urban areas (CMAs) with unemployment of ${lw.unemploymentThresholdPercent}% or more, these applications are not processed. Outside these CMAs, they are.`,
        },
  );
  return result(ctx, 'eimt-bas-salaire', 'inconnue', raisons, ids);
}

/** EIMT volet agricole : ouvert à tous les pays pour l'agriculture primaire. */
function agricultural(ctx: Ctx): PathwayResult {
  const { rules } = ctx;
  const raisons: Localized[] = [
    {
      fr: "Le volet agricole de l'EIMT est ouvert aux travailleurs de tous les pays, y compris d'Afrique. C'est la voie principale pour un emploi agricole depuis l'étranger.",
      en: 'The LMIA Agricultural Stream is open to workers from any country, including Africa. It is the main route for farm work from abroad.',
    },
    {
      fr: "Attention : une ferme présente dans la liste des EIMT agricoles peut ne recruter que via le PTAS (Mexique, Caraïbes). Demandez-lui si elle recrute par le volet agricole.",
      en: 'Note: a farm listed with agricultural LMIAs may recruit only through SAWP (Mexico, Caribbean). Ask whether it hires through the Agricultural Stream.',
    },
    {
      fr: "Le gel des RMR ne s'applique pas à l'agriculture primaire.",
      en: 'The CMA freeze does not apply to primary agriculture.',
    },
  ];
  if (ctx.job.province === 'QC') {
    raisons.push({
      fr: 'Au Québec, des règles provinciales s’ajoutent (CAQ). Module Québec à venir.',
      en: 'In Quebec, provincial rules also apply (CAQ). Quebec module coming later.',
    });
  }
  return result(ctx, 'eimt-agricole', 'possible', raisons, [rules.agricultural.source, rules.lmiaLowWage.source]);
}

/** PTAS/SAWP : réservé au Mexique et aux pays des Caraïbes. */
function sawp(ctx: Ctx): PathwayResult {
  const { rules, profile } = ctx;
  const c = profile.citizenship?.toUpperCase();
  const n = rules.sawp.countries.length - 1;
  if (!c) {
    return result(ctx, 'ptas', 'inconnue', [{
      fr: `Le PTAS est réservé aux citoyens du Mexique et de ${n} pays des Caraïbes. Indiquez votre pays dans votre profil.`,
      en: `SAWP is only for citizens of Mexico and ${n} Caribbean countries. Add your country to your profile.`,
    }], [rules.sawp.source]);
  }
  if (rules.sawp.countries.includes(c)) {
    return result(ctx, 'ptas', 'possible', [{
      fr: 'Votre pays participe au PTAS : le recrutement passe par les autorités de votre pays.',
      en: 'Your country takes part in SAWP: recruitment goes through your country’s authorities.',
    }], [rules.sawp.source]);
  }
  return result(ctx, 'ptas', 'bloquee', [{
    fr: `Le PTAS est réservé aux citoyens du Mexique et de ${n} pays des Caraïbes. Il n'est pas accessible depuis votre pays. Toute offre « PTAS/SAWP » qui vous est adressée est suspecte. Utilisez plutôt le volet agricole de l'EIMT.`,
    en: `SAWP is only for citizens of Mexico and ${n} Caribbean countries. It is not open to your country. Any "SAWP" offer sent to you is suspicious. Use the LMIA Agricultural Stream instead.`,
  }], [rules.sawp.source]);
}

/** Mobilité francophone (C16) : hors Québec, NCLC 5 à l'oral, sauf agriculture primaire TEER 4–5. */
function francophoneMobility(ctx: Ctx): PathwayResult {
  const { rules, job, profile } = ctx;
  const fm = rules.francophoneMobility;
  const ids = [fm.source];

  if (job.province && fm.excludedProvinces.includes(job.province)) {
    return result(ctx, 'mobilite-francophone', 'bloquee', [{
      fr: `La Mobilité francophone ne s'applique qu'aux emplois hors ${provinceName(job.province).fr}.`,
      en: `Francophone Mobility only applies to jobs outside ${provinceName(job.province).en}.`,
    }], ids);
  }
  if (isPrimaryAgriculture(rules, job.noc) && fm.excludesPrimaryAgricultureTeer.includes(ctx.teer)) {
    return result(ctx, 'mobilite-francophone', 'bloquee', [{
      fr: `Les emplois en agriculture primaire de TEER ${fm.excludesPrimaryAgricultureTeer.join(' ou ')} sont exclus de la Mobilité francophone.`,
      en: `Primary agriculture jobs in TEER ${fm.excludesPrimaryAgricultureTeer.join(' or ')} are excluded from Francophone Mobility.`,
    }], [...ids, rules.agricultural.source]);
  }

  const common: Localized[] = [
    {
      fr: "Permis de travail sans EIMT : l'employeur n'a pas besoin d'EIMT, mais il faut une offre d'emploi d'un employeur hors Québec.",
      en: 'LMIA-exempt work permit: the employer does not need an LMIA, but you need a job offer from an employer outside Quebec.',
    },
  ];
  const fr = profile.french;
  const min = fm.minOralNclc;
  if (fr?.speaking === undefined || fr?.listening === undefined) {
    return result(ctx, 'mobilite-francophone', 'inconnue', [
      { fr: `Il faut un niveau NCLC ${min} en expression orale et en compréhension orale du français. Indiquez votre niveau dans votre profil.`, en: `You need NCLC ${min} in French speaking and listening. Add your level to your profile.` },
      ...common,
    ], ids);
  }
  if (fr.speaking < min || fr.listening < min) {
    return result(ctx, 'mobilite-francophone', 'bloquee', [
      { fr: `Votre niveau de français oral indiqué est inférieur à NCLC ${min}. Cette voie s'ouvrira si vous atteignez NCLC ${min} (test TEF ou TCF).`, en: `Your stated spoken French level is below NCLC ${min}. This route opens if you reach NCLC ${min} (TEF or TCF test).` },
      ...common,
    ], ids);
  }
  return result(ctx, 'mobilite-francophone', 'probable', [
    { fr: `Votre français oral (NCLC ${fr.speaking} en expression, ${fr.listening} en compréhension) atteint le minimum NCLC ${min}.`, en: `Your spoken French (NCLC ${fr.speaking} speaking, ${fr.listening} listening) meets the NCLC ${min} minimum.` },
    { fr: 'Ce métier est admissible (tous les TEER sauf agriculture primaire TEER 4–5).', en: 'This job is eligible (all TEER levels except primary agriculture TEER 4–5).' },
    ...common,
  ], ids);
}

/** Projets pilotes aides familiaux : fermés aux nouvelles demandes. */
function homeCarePilots(ctx: Ctx): PathwayResult {
  const h = ctx.rules.homeCareWorkerPilots;
  if (ctx.today >= h.closedFrom && ctx.today <= h.closedUntil) {
    return result(ctx, 'pilotes-aides-familiaux', 'bloquee', [
      {
        fr: `Fermés : IRCC n'accepte aucune nouvelle demande du ${formatDate(h.closedFrom, 'fr')} au ${formatDate(h.closedUntil, 'fr')}. Il n'existe donc pas de voie « directe » vers la résidence permanente comme aide familial en ce moment.`,
        en: `Closed: IRCC accepts no new applications from ${formatDate(h.closedFrom, 'en')} to ${formatDate(h.closedUntil, 'en')}. There is currently no "direct" route to permanent residence as a caregiver.`,
      },
      {
        fr: 'Alternatives : Mobilité francophone (si vous parlez français, hors Québec) ou EIMT.',
        en: 'Alternatives: Francophone Mobility (if you speak French, outside Quebec) or an LMIA.',
      },
    ], [h.source]);
  }
  return result(ctx, 'pilotes-aides-familiaux', 'inconnue', [{
    fr: `La période de fermeture enregistrée (${h.closedFrom} – ${h.closedUntil}) ne couvre pas la date du jour : vérifiez le statut actuel sur canada.ca.`,
    en: `The recorded closure period (${h.closedFrom} – ${h.closedUntil}) does not cover today: check the current status on canada.ca.`,
  }], [h.source]);
}

/** Niveau minimal dans les 4 compétences (undefined si une compétence est inconnue). */
function minAllSkills(l?: LanguageLevels): number | undefined {
  if (!l) return undefined;
  const v = [l.speaking, l.listening, l.reading, l.writing];
  return v.some((x) => x === undefined) ? undefined : Math.min(...(v as number[]));
}

/** Pilotes communautaires RCIP / FCIP : employeur désigné + langue + expérience. */
function communityPilots(ctx: Ctx): PathwayResult {
  const { rules, job, profile } = ctx;
  const cp = rules.communityPilots;
  const ids = [cp.source];
  const de = job.designatedEmployer;

  if (de === false) {
    return result(ctx, 'pilotes-communautaires', 'bloquee', [{
      fr: "Cet employeur n'est pas désigné par une communauté participante : cette voie ne s'applique pas à cette offre.",
      en: 'This employer is not designated by a participating community: this route does not apply to this offer.',
    }], ids);
  }

  if (!de) {
    const communities = cp.communities.filter((c) => !job.province || c.province === job.province);
    const names = communities.map((c) => c.name).join(', ');
    return result(ctx, 'pilotes-communautaires', 'inconnue', [{
      fr: communities.length
        ? `Voie vers la résidence permanente si l'employeur est « désigné » par l'une de ces communautés : ${names}. Vérifiez sur la liste de la communauté.`
        : "Aucune communauté participante dans cette province : cette voie ne s'applique que dans les 18 communautés désignées.",
      en: communities.length
        ? `Route to permanent residence if the employer is "designated" by one of these communities: ${names}. Check the community’s list.`
        : 'No participating community in this province: this route only applies in the 18 designated communities.',
    }], ids);
  }

  const raisons: Localized[] = [];
  let statut: PathwayStatus = 'probable';
  const sourceIds = [...ids];

  // Langue
  if (de.program === 'FCIP') {
    sourceIds.push(cp.fcip.source);
    const min = cp.fcip.minNclcAllTeer;
    const lvl = minAllSkills(profile.french);
    if (lvl === undefined) {
      statut = 'inconnue';
      raisons.push({ fr: `PICRF : il faut NCLC ${min} en français dans les 4 compétences (test TEF ou TCF).`, en: `FCIP: you need NCLC ${min} in French in all 4 abilities (TEF or TCF test).` });
    } else if (lvl < min) {
      statut = 'bloquee';
      raisons.push({ fr: `PICRF : votre niveau de français le plus faible (NCLC ${lvl}) est sous le minimum NCLC ${min}.`, en: `FCIP: your lowest French level (NCLC ${lvl}) is below the NCLC ${min} minimum.` });
    } else {
      raisons.push({ fr: `PICRF : votre français (NCLC ${lvl} au minimum) atteint NCLC ${min}.`, en: `FCIP: your French (at least NCLC ${lvl}) meets NCLC ${min}.` });
    }
  } else {
    sourceIds.push(cp.rcip.source);
    const min = cp.rcip.minClbByTeer[String(ctx.teer)] ?? 4;
    const best = Math.max(minAllSkills(profile.french) ?? -1, minAllSkills(profile.english) ?? -1);
    if (best < 0) {
      statut = 'inconnue';
      raisons.push({ fr: `PICR : pour un métier TEER ${ctx.teer}, il faut NCLC/CLB ${min} dans les 4 compétences (français ou anglais).`, en: `RCIP: for a TEER ${ctx.teer} job, you need CLB/NCLC ${min} in all 4 abilities (English or French).` });
    } else if (best < min) {
      statut = 'bloquee';
      raisons.push({ fr: `PICR : votre meilleur niveau (${best}) est sous le minimum ${min} requis pour un métier TEER ${ctx.teer}.`, en: `RCIP: your best level (${best}) is below the minimum ${min} required for a TEER ${ctx.teer} job.` });
    } else {
      raisons.push({ fr: `PICR : votre niveau de langue (${best}) atteint le minimum ${min} pour un métier TEER ${ctx.teer}.`, en: `RCIP: your language level (${best}) meets the minimum ${min} for a TEER ${ctx.teer} job.` });
    }
  }

  // Expérience
  const months = Math.round(cp.minExperienceHours / 130);
  if (profile.experienceMonths === undefined) {
    if (statut === 'probable') statut = 'possible';
    raisons.push({ fr: `Il faut au moins 1 an d'expérience liée (${cp.minExperienceHours} heures) au cours des 3 dernières années.`, en: `You need at least 1 year of related experience (${cp.minExperienceHours} hours) in the last 3 years.` });
  } else if (profile.experienceMonths < months) {
    statut = 'bloquee';
    raisons.push({ fr: `Votre expérience (${profile.experienceMonths} mois) est inférieure au minimum d'environ ${months} mois à temps plein.`, en: `Your experience (${profile.experienceMonths} months) is below the minimum of about ${months} full-time months.` });
  }

  raisons.push({
    fr: 'Il faut aussi un diplôme (ou équivalence), des fonds d’établissement et la recommandation de la communauté.',
    en: 'You also need an education credential (or equivalency), settlement funds and the community’s recommendation.',
  });
  return result(ctx, 'pilotes-communautaires', statut, raisons, sourceIds);
}

/** Libellé d'un métier pour l'affichage (réexport pratique). */
export function describeNoc(nocData: NocData, code: string): Localized {
  const n = findNoc(nocData, code);
  return n ? { fr: n.titleFr, en: n.titleEn } : { fr: `CNP ${code}`, en: `NOC ${code}` };
}
