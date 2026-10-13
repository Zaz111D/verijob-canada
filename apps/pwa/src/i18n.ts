/**
 * Textes de l'interface, en français (par défaut) et en anglais.
 * Phrases courtes et concrètes : le public n'est pas forcément à l'aise avec l'administratif.
 */
import { useEffect, useState } from 'preact/hooks';
import type { Localized } from '@verijob/core';

export type Lang = 'fr' | 'en';

export const STRINGS = {
  appName: { fr: 'VériJob Canada', en: 'VériJob Canada' },
  switchLang: { fr: 'English', en: 'Français' },
  switchLangLabel: { fr: 'Passer en anglais', en: 'Switch to French' },
  offline: { fr: 'Hors ligne : l’appli fonctionne avec les données déjà enregistrées.', en: 'Offline: the app works with the data already saved.' },

  navHome: { fr: 'Accueil', en: 'Home' },
  navOffer: { fr: 'Offre', en: 'Offer' },
  navEmployer: { fr: 'Employeur', en: 'Employer' },
  navConsultant: { fr: 'Consultant', en: 'Consultant' },
  navProspects: { fr: 'Démarcher', en: 'Reach out' },
  navJobs: { fr: 'Emplois', en: 'Jobs' },
  navWatch: { fr: 'Ce qui a changé', en: 'What changed' },
  staleBanner: { fr: '⚠ Certaines règles ont dépassé leur date de révision : données possiblement périmées.', en: '⚠ Some rules are past their review date: data may be out of date.' },
  navProfile: { fr: 'Mon profil', en: 'My profile' },

  homeTitle: { fr: 'Vérifiez avant de payer ou d’envoyer vos papiers', en: 'Check before you pay or send your documents' },
  homeIntro: {
    fr: 'Beaucoup de fausses offres d’emploi au Canada circulent sur WhatsApp et Facebook. Cette appli vous aide à repérer les signaux d’alerte, à vérifier un employeur et à comprendre les voies d’immigration possibles.',
    en: 'Many fake Canadian job offers circulate on WhatsApp and Facebook. This app helps you spot warning signs, check an employer and understand possible immigration routes.',
  },
  homeRule: {
    fr: 'Règle d’or : un employeur canadien ne vous demande jamais d’argent pour un emploi ou pour une EIMT.',
    en: 'Golden rule: a Canadian employer never asks you for money for a job or an LMIA.',
  },
  cardOfferTitle: { fr: 'Analyser une offre', en: 'Check an offer' },
  cardOfferText: { fr: 'Collez un message reçu : l’appli liste les signaux d’alerte.', en: 'Paste a message you received: the app lists the warning signs.' },
  cardEmployerTitle: { fr: 'Vérifier un employeur', en: 'Check an employer' },
  cardEmployerText: { fr: 'A-t-il obtenu des EIMT ? Est-il désigné par une communauté ?', en: 'Did it get LMIAs? Is it designated by a community?' },
  cardConsultantTitle: { fr: 'Vérifier un consultant', en: 'Check a consultant' },
  cardConsultantText: { fr: 'Est-il autorisé à vous aider contre paiement ?', en: 'Is this person allowed to help you for a fee?' },
  cardProspectsTitle: { fr: 'Employeurs à contacter', en: 'Employers to contact' },
  cardProspectsText: { fr: 'Ceux qui recrutent régulièrement à l’étranger, avec un modèle de message.', en: 'Those that regularly hire abroad, with a message template.' },
  cardJobsTitle: { fr: 'Trouver des offres', en: 'Find job offers' },
  cardJobsText: { fr: 'Offres ouvertes aux candidats étrangers sur le Guichet-Emplois, et évaluation d’un poste.', en: 'Jobs open to foreign candidates on Job Bank, and checking a position.' },
  cardWatchTitle: { fr: 'Ce qui a changé', en: 'What changed' },
  cardWatchText: { fr: 'Programmes ouverts ou fermés, dates à venir.', en: 'Open or closed programs, upcoming dates.' },
  cardProfileTitle: { fr: 'Mes voies d’immigration', en: 'My immigration routes' },
  cardProfileText: { fr: 'Remplissez votre profil pour voir les voies réalistes pour vous.', en: 'Fill in your profile to see the realistic routes for you.' },

  offerTitle: { fr: 'Analyser une offre d’emploi', en: 'Check a job offer' },
  offerHelp: {
    fr: 'Collez ici le message complet (WhatsApp, e-mail, Facebook…). Rien n’est envoyé sur Internet : l’analyse se fait sur votre téléphone.',
    en: 'Paste the full message here (WhatsApp, e-mail, Facebook…). Nothing is sent over the Internet: the check runs on your phone.',
  },
  offerPlaceholder: { fr: 'Collez le message ici…', en: 'Paste the message here…' },
  offerButton: { fr: 'Analyser', en: 'Check' },
  offerClear: { fr: 'Effacer', en: 'Clear' },
  offerExample: { fr: 'Essayer avec un exemple', en: 'Try an example' },
  evidence: { fr: 'Dans le message :', en: 'In the message:' },
  sources: { fr: 'Sources officielles', en: 'Official sources' },
  verifiedOn: { fr: 'vérifié le', en: 'checked on' },
  stale: { fr: 'donnée possiblement périmée', en: 'data may be out of date' },
  notEvaluated: { fr: 'Non évalué', en: 'Not checked' },
  detected: { fr: 'Repéré dans le message', en: 'Found in the message' },
  detectedJob: { fr: 'Métier', en: 'Job' },
  detectedProvince: { fr: 'Province', en: 'Province' },
  afterSignals: {
    fr: 'Ne payez rien et n’envoyez pas vos documents (passeport, diplômes) avant d’avoir vérifié l’employeur.',
    en: 'Do not pay anything or send your documents (passport, diplomas) before checking the employer.',
  },

  employerTitle: { fr: 'Vérifier un employeur', en: 'Check an employer' },
  employerHelp: {
    fr: 'Tapez le nom de l’entreprise, même approximatif (fautes et « Inc. / Ltée » acceptés).',
    en: 'Type the company name, even roughly (typos and “Inc. / Ltd” are fine).',
  },
  employerName: { fr: 'Nom de l’employeur', en: 'Employer name' },
  province: { fr: 'Province', en: 'Province' },
  allProvinces: { fr: 'Toutes les provinces (plus lent)', en: 'All provinces (slower)' },
  search: { fr: 'Rechercher', en: 'Search' },
  loading: { fr: 'Chargement des données…', en: 'Loading data…' },
  loadError: {
    fr: 'Impossible de charger les données. Vérifiez votre connexion : les listes consultées une fois restent ensuite disponibles hors ligne.',
    en: 'Could not load the data. Check your connection: lists you open once stay available offline.',
  },
  lmiaFound: { fr: 'Trouvé dans les listes officielles EIMT', en: 'Found in the official LMIA lists' },
  lmiaNotFound: { fr: 'Aucun employeur proche trouvé dans les listes EIMT.', en: 'No close employer found in the LMIA lists.' },
  designatedFound: { fr: 'Employeur désigné (pilotes PICR / PICRF)', en: 'Designated employer (RCIP / FCIP pilots)' },
  designatedNone: { fr: 'Pas trouvé parmi les employeurs désignés relevés.', en: 'Not found among the designated employers recorded.' },
  positive: { fr: 'EIMT positives', en: 'Positive LMIAs' },
  negative: { fr: 'EIMT refusées', en: 'Refused LMIAs' },
  positions: { fr: 'postes', en: 'positions' },
  position: { fr: 'poste', en: 'position' },
  quarters: { fr: 'Trimestres', en: 'Quarters' },
  jobs: { fr: 'Métiers', en: 'Jobs' },
  streams: { fr: 'Volets', en: 'Streams' },
  location: { fr: 'Lieu', en: 'Location' },
  cmaFrozen: { fr: 'RMR où les EIMT bas salaire sont gelées', en: 'CMA where low-wage LMIAs are frozen' },
  cmaOpen: { fr: 'RMR non gelée', en: 'CMA not frozen' },
  cmaAgriExempt: { fr: 'le gel ne s’applique pas à l’agriculture primaire', en: 'the freeze does not apply to primary agriculture' },
  cmaOutside: { fr: 'Hors des grandes villes (hors RMR)', en: 'Outside large cities (outside CMAs)' },
  cmaUnknown: { fr: 'Situation par rapport aux RMR inconnue', en: 'CMA status unknown' },
  paWarning: {
    fr: '« Agriculture primaire » regroupe le PTAS (Mexique, Caraïbes) et le volet agricole. Avoir eu des EIMT agricoles ne veut pas dire que cet employeur recrute en Afrique.',
    en: '“Primary agriculture” combines SAWP (Mexico, Caribbean) and the Agricultural Stream. Agricultural LMIAs do not mean this employer recruits in Africa.',
  },
  hiringStatus: {
    recrute: { fr: 'Recrute (selon la communauté)', en: 'Hiring (per the community)' },
    'ne-recrute-pas': { fr: 'Ne recrute pas', en: 'Not hiring' },
    inconnu: { fr: 'Recrutement : non précisé', en: 'Hiring: not stated' },
    retire: { fr: 'Retiré du programme', en: 'Removed from the program' },
  },
  recordedOn: { fr: 'relevé le', en: 'recorded on' },
  dataDate: { fr: 'Données EIMT : trimestres', en: 'LMIA data: quarters' },

  consultantTitle: { fr: 'Vérifier un consultant ou un agent', en: 'Check a consultant or agent' },
  consultantIntro: {
    fr: 'Au Canada, seules certaines personnes peuvent être payées pour vous aider dans vos démarches d’immigration. Vérifiez toujours vous-même.',
    en: 'In Canada, only certain people can be paid to help you with immigration. Always check for yourself.',
  },
  consultantStep1: { fr: 'Demandez son numéro de licence CICC (forme : R suivi de 6 chiffres, ex. R123456), ou le barreau dont il est membre s’il est avocat.', en: 'Ask for their CICC licence number (format: R followed by 6 digits, e.g. R123456), or their law society if they are a lawyer.' },
  consultantStep2: { fr: 'Ouvrez le registre public du CICC et cherchez son nom.', en: 'Open the CICC public register and search for their name.' },
  consultantStep3: { fr: 'Vérifiez que la colonne « Entitled to Practise » indique « Yes » et que le nom correspond.', en: 'Check that the “Entitled to Practise” column says “Yes” and that the name matches.' },
  consultantStep4: { fr: 'Méfiance si on vous demande de payer par Western Union, Mobile Money, crypto, ou sur un compte personnel.', en: 'Be careful if you are asked to pay by Western Union, mobile money, crypto, or into a personal account.' },
  consultantOthers: { fr: 'Sont aussi autorisés : les avocats membres d’un barreau canadien, les notaires du Québec et les parajuristes de l’Ontario.', en: 'Also allowed: lawyers who are members of a Canadian law society, Quebec notaries and Ontario paralegals.' },
  consultantNumber: { fr: 'Numéro donné par la personne', en: 'Number given by the person' },
  consultantFormatOk: { fr: 'Le format est correct. Cela ne prouve rien : vérifiez-le dans le registre.', en: 'The format is correct. That proves nothing: check it in the register.' },
  consultantFormatBad: { fr: 'Ce n’est pas le format d’un numéro CICC (R + 6 chiffres). Méfiance.', en: 'This is not a CICC number format (R + 6 digits). Be careful.' },
  openRegister: { fr: 'Ouvrir le registre du CICC', en: 'Open the CICC register' },
  openAuthorized: { fr: 'Page IRCC : représentants autorisés', en: 'IRCC page: authorized representatives' },
  noRecommendation: { fr: 'Cette appli ne recommande aucun consultant ni aucune agence.', en: 'This app does not recommend any consultant or agency.' },

  profileTitle: { fr: 'Mon profil', en: 'My profile' },
  profilePrivacy: { fr: 'Votre profil reste sur ce téléphone. Il n’est jamais envoyé.', en: 'Your profile stays on this phone. It is never sent.' },
  citizenship: { fr: 'Pays de citoyenneté', en: 'Country of citizenship' },
  choose: { fr: '— Choisir —', en: '— Choose —' },
  frenchLevel: { fr: 'Niveau de français (NCLC)', en: 'French level (NCLC)' },
  englishLevel: { fr: 'Niveau d’anglais (CLB)', en: 'English level (CLB)' },
  levelHelp: { fr: 'Le niveau vient d’un test officiel (TEF, TCF pour le français ; IELTS, CELPIP, PTE pour l’anglais). Laissez « Je ne sais pas » si vous n’avez pas passé de test.', en: 'The level comes from an official test (TEF, TCF for French; IELTS, CELPIP, PTE for English). Leave “I don’t know” if you have not taken a test.' },
  speaking: { fr: 'Parler', en: 'Speaking' },
  listening: { fr: 'Comprendre à l’oral', en: 'Listening' },
  reading: { fr: 'Lire', en: 'Reading' },
  writing: { fr: 'Écrire', en: 'Writing' },
  dontKnow: { fr: 'Je ne sais pas', en: 'I don’t know' },
  targetJobs: { fr: 'Métiers visés', en: 'Target jobs' },
  provincesWanted: { fr: 'Provinces préférées', en: 'Preferred provinces' },
  experience: { fr: 'Expérience dans ce métier (mois)', en: 'Experience in this job (months)' },
  education: { fr: 'Niveau d’études', en: 'Education' },
  educationLevels: {
    aucun: { fr: 'Aucun diplôme', en: 'No diploma' },
    primaire: { fr: 'Primaire', en: 'Primary' },
    secondaire: { fr: 'Secondaire (bac, GCE A level…)', en: 'Secondary (high school)' },
    postsecondaire: { fr: 'Formation professionnelle / BTS', en: 'Vocational / college' },
    universite: { fr: 'Université', en: 'University' },
  },
  save: { fr: 'Enregistrer', en: 'Save' },
  saved: { fr: 'Profil enregistré sur ce téléphone.', en: 'Profile saved on this phone.' },
  erase: { fr: 'Effacer mon profil', en: 'Delete my profile' },
  erased: { fr: 'Profil effacé.', en: 'Profile deleted.' },
  routesTitle: { fr: 'Mes voies d’immigration possibles', en: 'My possible immigration routes' },
  routesEmpty: { fr: 'Choisissez au moins un métier visé pour voir vos voies.', en: 'Choose at least one target job to see your routes.' },
  routesNote: {
    fr: 'Ces résultats sont des estimations à partir des règles officielles. Ce n’est pas un avis juridique.',
    en: 'These results are estimates based on official rules. This is not legal advice.',
  },
  status: {
    probable: { fr: 'Probable', en: 'Likely' },
    possible: { fr: 'Possible', en: 'Possible' },
    bloquee: { fr: 'Bloquée', en: 'Blocked' },
    inconnue: { fr: 'À préciser', en: 'Unclear' },
  },
  other: { fr: 'Autre pays', en: 'Other country' },

  jobsTitle: { fr: 'Trouver des offres accessibles depuis l’étranger', en: 'Find jobs open to applicants abroad' },
  jobsIntro: {
    fr: 'Sur le Guichet-Emplois (Job Bank) du gouvernement du Canada, une partie des offres est ouverte aux candidats qui vivent hors du Canada. Les autres exigent déjà un permis de travail : n’y postulez pas.',
    en: 'On the Government of Canada Job Bank, some offers are open to candidates living outside Canada. The others already require a work permit: do not apply to them.',
  },
  jobsOpen: { fr: 'Ouvrir les offres pour candidats étrangers', en: 'Open jobs for foreign candidates' },
  jobsLinkNote: {
    fr: 'Le lien ouvre le site officiel. VériJob ne lit pas Job Bank automatiquement (ses conditions d’utilisation l’interdisent) : filtrez vous-même par métier et province avec les mots-clés ci-dessous.',
    en: 'The link opens the official site. VériJob does not read Job Bank automatically (its terms forbid it): filter by job and province yourself with the keywords below.',
  },
  jobsIcon: { fr: 'Sur Job Bank, postulez seulement aux offres marquées par l’icône « ouvert aux candidats étrangers ».', en: 'On Job Bank, only apply to postings marked with the “open to foreign candidates” icon.' },
  keywords: { fr: 'Mots-clés à taper dans Job Bank', en: 'Keywords to type in Job Bank' },
  openFiltered: { fr: 'Ouvrir la recherche', en: 'Open the search' },
  whereTitle: { fr: 'Où chercher dans vos provinces', en: 'Where to look in your provinces' },
  frozenIn: { fr: 'Villes où les EIMT bas salaire sont gelées', en: 'Cities where low-wage LMIAs are frozen' },
  frozenAdvice: { fr: 'Pour un poste bas salaire non exempté, préférez les petites villes et les zones rurales.', en: 'For a low-wage job that is not exempt, prefer small towns and rural areas.' },
  ruralActive: { fr: 'Mesure temporaire rurale en vigueur', en: 'Temporary rural measure in force' },
  ruralNone: { fr: 'Pas de mesure temporaire rurale', en: 'No temporary rural measure' },
  evalTitle: { fr: 'Évaluer un poste trouvé', en: 'Check a position you found' },
  evalIntro: { fr: 'Recopiez les informations de l’offre : l’appli estime les voies possibles et vérifie l’employeur.', en: 'Copy the details of the offer: the app estimates the possible routes and checks the employer.' },
  evalJob: { fr: 'Métier (CNP)', en: 'Job (NOC)' },
  evalCity: { fr: 'Ville du poste', en: 'Job city' },
  evalWage: { fr: 'Salaire horaire ($)', en: 'Hourly wage ($)' },
  evalLiveIn: { fr: 'Logement obligatoire chez l’employeur', en: 'Must live in the employer’s home' },
  evalEmployer: { fr: 'Nom de l’employeur (facultatif)', en: 'Employer name (optional)' },
  evalButton: { fr: 'Évaluer', en: 'Check' },
  evalPasteText: { fr: 'Collez aussi le texte de l’offre dans « Analyser une offre » pour repérer les signaux d’alerte.', en: 'Also paste the text of the offer in “Check an offer” to spot warning signs.' },

  watchTitle: { fr: 'Ce qui a changé', en: 'What changed' },
  watchIntro: { fr: 'Les règles changent souvent. Voici l’état des programmes et les prochaines dates à surveiller, d’après les sources officielles.', en: 'Rules change often. Here is the status of programs and the next dates to watch, based on official sources.' },
  programsTitle: { fr: 'État des programmes', en: 'Program status' },
  programState: {
    ouvert: { fr: 'Ouvert', en: 'Open' },
    restreint: { fr: 'Restreint', en: 'Restricted' },
    ferme: { fr: 'Fermé', en: 'Closed' },
    expire: { fr: 'Terminé', en: 'Ended' },
  },
  upcomingTitle: { fr: 'Prochaines dates', en: 'Upcoming dates' },
  inDays: { fr: 'dans {n} jours', en: 'in {n} days' },
  historyTitle: { fr: 'Historique des changements', en: 'Change history' },
  approxDate: { fr: 'date approximative', en: 'approximate date' },
  freshnessTitle: { fr: 'Fraîcheur des données', en: 'Data freshness' },
  lmiaLists: { fr: 'Listes d’employeurs EIMT', en: 'LMIA employer lists' },
  dataUpdated: { fr: 'mises à jour le', en: 'updated on' },
  designatedLists: { fr: 'Employeurs désignés PICR/PICRF (relevés manuels)', en: 'RCIP/FCIP designated employers (manual records)' },
  rulesTitle: { fr: 'Règles et sources vérifiées', en: 'Verified rules and sources' },
  nextReview: { fr: 'prochaine révision', en: 'next review' },
  noStale: { fr: 'Toutes les règles sont à jour.', en: 'All rules are up to date.' },

  prospectsTitle: { fr: 'Employeurs à contacter', en: 'Employers to contact' },
  prospectsIntro: {
    fr: 'Ces employeurs ont obtenu des EIMT pour vos métiers sur plusieurs trimestres : ils recrutent régulièrement à l’étranger. Écrivez-leur directement, sans intermédiaire.',
    en: 'These employers got LMIAs for your jobs over several quarters: they regularly hire abroad. Write to them directly, without a middleman.',
  },
  prospectsWarning: {
    fr: 'Une EIMT passée ne veut pas dire qu’un poste est ouvert aujourd’hui. Ne payez jamais pour être mis en relation avec un employeur.',
    en: 'A past LMIA does not mean a job is open today. Never pay to be put in touch with an employer.',
  },
  filters: { fr: 'Filtres', en: 'Filters' },
  allJobs: { fr: 'Mes métiers (profil)', en: 'My jobs (profile)' },
  noTargetJobs: { fr: 'Aucun métier choisi dans votre profil : tous les métiers sont affichés.', en: 'No job chosen in your profile: all jobs are shown.' },
  hideAgriOnly: { fr: 'Masquer les employeurs seulement en agriculture primaire (souvent via le PTAS)', en: 'Hide employers only in primary agriculture (often through SAWP)' },
  resultsCount: { fr: 'employeurs trouvés', en: 'employers found' },
  showMore: { fr: 'Afficher plus', en: 'Show more' },
  exportCsv: { fr: 'Exporter la liste (CSV)', en: 'Export the list (CSV)' },
  quartersSeen: { fr: 'trimestres avec EIMT', en: 'quarters with LMIAs' },
  lastQuarter: { fr: 'dernier', en: 'latest' },
  refused: { fr: 'postes refusés', en: 'refused positions' },
  bestRoute: { fr: 'Voie estimée pour vous', en: 'Estimated route for you' },
  findWebsite: { fr: 'Trouver le site de l’employeur', en: 'Find the employer’s website' },
  writeMessage: { fr: 'Préparer un message', en: 'Prepare a message' },
  designatedTitle: { fr: 'Employeurs désignés (PICR / PICRF)', en: 'Designated employers (RCIP / FCIP)' },
  designatedIntro: {
    fr: 'Voie vers la résidence permanente. Seuls les employeurs qui ne sont pas marqués « ne recrute pas » sont affichés. ⭐ = votre métier est prioritaire dans cette communauté.',
    en: 'Route to permanent residence. Only employers not marked “not hiring” are shown. ⭐ = your job is a priority in this community.',
  },
  priorityJob: { fr: 'Métier prioritaire', en: 'Priority job' },
  messageTitle: { fr: 'Message de candidature', en: 'Application message' },
  messageLang: { fr: 'Langue du message', en: 'Message language' },
  yourName: { fr: 'Votre nom', en: 'Your name' },
  yourCountry: { fr: 'Votre pays', en: 'Your country' },
  subject: { fr: 'Objet', en: 'Subject' },
  copy: { fr: 'Copier le message', en: 'Copy the message' },
  copied: { fr: 'Message copié.', en: 'Message copied.' },
  close: { fr: 'Fermer', en: 'Close' },
  messageAdvice: {
    fr: 'Envoyez-le à l’adresse e-mail trouvée sur le site officiel de l’employeur, avec votre CV. Si quelqu’un vous répond en demandant de l’argent, c’est une arnaque.',
    en: 'Send it to the e-mail address found on the employer’s official website, with your CV. If someone replies asking for money, it is a scam.',
  },
} as const;

type Leaf = Localized;
/** Texte dans la langue choisie. */
export function tr(text: Leaf, lang: Lang): string {
  return text[lang];
}

const KEY = 'verijob-lang';
let current: Lang = readLang();
const listeners = new Set<(l: Lang) => void>();

function readLang(): Lang {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'en' ? 'en' : 'fr';
  } catch {
    return 'fr';
  }
}

export function setLang(l: Lang) {
  current = l;
  try { localStorage.setItem(KEY, l); } catch { /* navigation privée : on garde la langue en mémoire */ }
  document.documentElement.lang = l;
  listeners.forEach((f) => f(l));
}

/** Applique la langue mémorisée au document (attribut lang). */
export function initLang() {
  document.documentElement.lang = current;
}

/** Langue courante (FR par défaut), mise à jour quand l'utilisateur bascule. */
export function useLang(): Lang {
  const [lang, set] = useState(current);
  useEffect(() => {
    listeners.add(set);
    return () => { listeners.delete(set); };
  }, []);
  return lang;
}
