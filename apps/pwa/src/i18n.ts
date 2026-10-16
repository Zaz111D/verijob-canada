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
  navTracking: { fr: 'Suivi', en: 'Tracking' },
  trackingTitle: { fr: 'Mes candidatures', en: 'My applications' },
  trackingPrivacy: { fr: 'Ce suivi reste sur ce téléphone. Exportez-le régulièrement pour ne pas le perdre (changement de téléphone, nettoyage du navigateur).', en: 'This tracker stays on this phone. Export it regularly so you do not lose it (new phone, browser cleanup).' },
  trackingEmpty: { fr: 'Aucune candidature pour le moment. Ajoutez-en une ici ou depuis « Démarcher ».', en: 'No applications yet. Add one here or from “Reach out”.' },
  trackingDue: { fr: 'relance(s) à faire', en: 'follow-up(s) due' },
  addApplication: { fr: 'Ajouter une candidature', en: 'Add an application' },
  editApplication: { fr: 'Modifier la candidature', en: 'Edit the application' },
  fieldEmployer: { fr: 'Employeur', en: 'Employer' },
  fieldJob: { fr: 'Poste', en: 'Position' },
  fieldDate: { fr: 'Date d’envoi', en: 'Date sent' },
  fieldStatus: { fr: 'Statut', en: 'Status' },
  fieldFollowUp: { fr: 'Relance prévue le', en: 'Follow up on' },
  fieldContact: { fr: 'Contact (e-mail ou site officiel)', en: 'Contact (e-mail or official website)' },
  fieldNotes: { fr: 'Notes', en: 'Notes' },
  appStatus: {
    'a-envoyer': { fr: 'À envoyer', en: 'To send' },
    envoyee: { fr: 'Envoyée', en: 'Sent' },
    relancee: { fr: 'Relancée', en: 'Followed up' },
    entretien: { fr: 'Entretien', en: 'Interview' },
    offre: { fr: 'Offre reçue', en: 'Offer received' },
    refus: { fr: 'Refus', en: 'Rejected' },
    abandon: { fr: 'Abandonnée', en: 'Dropped' },
  },
  followUpDue: { fr: 'Relance à faire', en: 'Follow-up due' },
  markFollowedUp: { fr: 'J’ai relancé', en: 'I followed up' },
  edit: { fr: 'Modifier', en: 'Edit' },
  delete: { fr: 'Supprimer', en: 'Delete' },
  confirmDelete: { fr: 'Supprimer cette candidature ?', en: 'Delete this application?' },
  cancel: { fr: 'Annuler', en: 'Cancel' },
  exportJson: { fr: 'Exporter (sauvegarde JSON)', en: 'Export (JSON backup)' },
  importJson: { fr: 'Importer une sauvegarde', en: 'Import a backup' },
  importDone: { fr: 'Import terminé : {added} ajoutée(s), {updated} mise(s) à jour, {rejected} ligne(s) ignorée(s).', en: 'Import done: {added} added, {updated} updated, {rejected} line(s) ignored.' },
  importBad: { fr: 'Ce fichier n’est pas une sauvegarde VériJob. Rien n’a été modifié.', en: 'This file is not a VériJob backup. Nothing was changed.' },
  verifLmia: { fr: 'EIMT trouvées', en: 'LMIAs found' },
  verifDesignated: { fr: 'Employeur désigné', en: 'Designated employer' },
  verifSignals: { fr: 'signal(aux) d’alerte', en: 'warning sign(s)' },
  track: { fr: 'Suivre', en: 'Track' },
  tracked: { fr: 'Ajouté au suivi', en: 'Added to tracker' },
  cardTrackingTitle: { fr: 'Suivre mes candidatures', en: 'Track my applications' },
  cardTrackingText: { fr: 'Statuts, relances, provenance et copie des annonces, sauvegarde.', en: 'Statuses, follow-ups, ad source and copy, backup.' },
  navWatch: { fr: 'Programmes et actualités', en: 'Programs and news' },
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
  cardJobsText: { fr: 'Offres ouvertes aux candidats étrangers, autres sites, salons de recrutement et réseaux.', en: 'Jobs open to foreign candidates, other sites, recruitment fairs and networks.' },
  cardWatchTitle: { fr: 'Programmes et actualités', en: 'Programs and news' },
  cardWatchText: { fr: 'Programmes ouverts ou fermés, invitations Entrée express, actualités IRCC en direct.', en: 'Open or closed programs, Express Entry invitations, live IRCC news.' },
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
  currentJob: { fr: 'Votre métier actuel, s’il n’est pas dans la liste', en: 'Your current job, if it is not in the list' },
  currentJobNone: { fr: 'Aucun / dans la liste', en: 'None / in the list' },
  transferTitle: { fr: 'Métier proche conseillé', en: 'Suggested related job' },
  transferIntro: {
    fr: 'Vos tâches se retrouvent dans ce métier. Comparaison des fonctions officielles (CNP 2021, Statistique Canada) :',
    en: 'Your duties are found in this job. Comparison of the official duties (NOC 2021, Statistics Canada):',
  },
  transferYourJob: { fr: 'Votre métier', en: 'Your job' },
  transferRelated: { fr: 'Métier proche', en: 'Related job' },
  transferAdd: { fr: 'Ajouter ce métier à mes métiers visés', en: 'Add this job to my target jobs' },
  transferAdded: { fr: 'Déjà dans vos métiers visés', en: 'Already in your target jobs' },
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

  // Autres pistes (onglet Emplois) — mode liens uniquement
  otherSitesTitle: { fr: 'Autres sites d’offres', en: 'Other job sites' },
  otherSitesIntro: {
    fr: 'Recherches déjà remplies avec vos métiers. VériJob ne lit pas ces sites : il ouvre seulement la recherche. Passez toujours une offre trouvée dans « Analyser une offre ».',
    en: 'Searches pre-filled with your jobs. VériJob does not read these sites: it only opens the search. Always run an offer you find through “Check an offer”.',
  },
  searchFor: { fr: 'Rechercher', en: 'Search' },
  openSite: { fr: 'Ouvrir le site', en: 'Open the site' },
  eventsTitle: { fr: 'Salons et missions de recrutement', en: 'Recruitment fairs and missions' },
  eventsIntro: {
    fr: 'Des employeurs canadiens y rencontrent des candidats à l’étranger. Ils sont gratuits ou presque : inscrivez-vous seulement sur la page officielle.',
    en: 'Canadian employers meet candidates abroad there. They are free or nearly free: register only on the official page.',
  },
  eventOld: { fr: 'Dernière édition connue il y a plus d’un an : vérifiez sur la page officielle.', en: 'Last known edition more than a year ago: check the official page.' },
  officialPage: { fr: 'Page officielle', en: 'Official page' },
  networksTitle: { fr: 'Réseaux et organismes', en: 'Networks and organizations' },
  forYourCountry: { fr: 'Pour votre pays', en: 'For your country' },
  riskyTitle: { fr: 'Attention à ces canaux', en: 'Be careful with these channels' },

  watchTitle: { fr: 'Programmes et actualités', en: 'Programs and news' },
  watchIntro: { fr: 'Les règles changent souvent. Voici l’état des programmes, les dernières invitations d’Entrée express, les actualités d’IRCC et les prochaines dates à surveiller, d’après les sources officielles.', en: 'Rules change often. Here is the status of programs, the latest Express Entry invitations, IRCC news and the next dates to watch, based on official sources.' },
  eeTitle: { fr: 'Entrée express : dernières invitations', en: 'Express Entry: latest invitations' },
  eeIntro: {
    fr: 'Dernière ronde de chaque catégorie. Le « score minimum » est la note du dernier candidat invité (Système de classement global).',
    en: 'Latest round of each category. The “minimum score” is the score of the lowest-ranked invited candidate (Comprehensive Ranking System).',
  },
  eeInvitations: { fr: 'invitations', en: 'invitations' },
  eeMinScore: { fr: 'score minimum', en: 'minimum score' },
  eeAccess: {
    etranger: { fr: 'Possible depuis l’étranger', en: 'Possible from abroad' },
    nomination: { fr: 'Nomination d’une province requise', en: 'Provincial nomination required' },
    canada: { fr: 'Expérience au Canada requise', en: 'Canadian experience required' },
    autre: { fr: 'Cas particulier', en: 'Special case' },
  },
  eeAllRounds: { fr: 'Toutes les rondes récentes', en: 'All recent rounds' },
  eeUpdatedOn: { fr: 'Données du', en: 'Data from' },
  refreshNow: { fr: 'Actualiser maintenant', en: 'Refresh now' },
  refreshing: { fr: 'Actualisation…', en: 'Refreshing…' },
  refreshHeavy: { fr: 'Télécharge le fichier officiel d’IRCC (environ 800 Ko).', en: 'Downloads the official IRCC file (about 800 KB).' },
  refreshFailed: { fr: 'Impossible de joindre canada.ca pour le moment. Les données déjà enregistrées restent affichées.', en: 'Cannot reach canada.ca right now. The data already saved is still shown.' },
  newsTitle: { fr: 'Actualités d’IRCC (en direct)', en: 'IRCC news (live)' },
  newsIntro: { fr: 'Annonces officielles d’Immigration, Réfugiés et Citoyenneté Canada utiles pour chercher un emploi. Lues en direct sur canada.ca.', en: 'Official Immigration, Refugees and Citizenship Canada announcements useful for job seekers. Read live from canada.ca.' },
  newsLoading: { fr: 'Chargement des actualités…', en: 'Loading news…' },
  newsNone: { fr: 'Aucune actualité récente sur l’immigration économique.', en: 'No recent news on economic immigration.' },
  newsOffline: { fr: 'Actualités indisponibles hors ligne.', en: 'News unavailable offline.' },
  newsAll: { fr: 'Toutes les actualités d’IRCC', en: 'All IRCC news' },

  // Joindre un employeur (sans deviner d'e-mail)
  employerJobs: { fr: 'Ses offres sur le Guichet-Emplois', en: 'Its jobs on Job Bank' },
  seeOnMap: { fr: 'Voir sur la carte', en: 'See on the map' },
  careersPage: { fr: 'Trouver sa page Carrières', en: 'Find its careers page' },
  howToApply: {
    fr: 'Postulez uniquement par le moyen indiqué dans une offre du Guichet-Emplois (rubrique « Comment postuler ») ou sur le site officiel de l’employeur. Les listes officielles ne donnent que la ville et le code postal : VériJob ne devine jamais d’adresse e-mail.',
    en: 'Apply only through the method shown in a Job Bank posting (“How to apply” section) or on the employer’s official website. Official lists only give the city and postal code: VériJob never guesses an e-mail address.',
  },

  // Offres ouvertes aux candidats de l'étranger (API Adzuna, tri VériJob)
  intlTitle: { fr: 'Offres ouvertes aux candidats de l’étranger', en: 'Offers open to candidates abroad' },
  intlIntro: {
    fr: 'Chaque semaine, VériJob lit les annonces publiées au Canada et garde seulement celles qui disent clairement accepter les candidats de l’étranger (EIMT, parrainage du permis, candidatures internationales). Celles qui exigent d’être déjà au Canada sont écartées. La phrase qui le prouve est affichée : lisez toujours l’offre complète.',
    en: 'Every week, VériJob reads job ads posted in Canada and keeps only those that clearly accept candidates abroad (LMIA, permit sponsorship, international applications). Those requiring you to already be in Canada are removed. The sentence that proves it is shown: always read the full offer.',
  },
  intlProof: { fr: 'Ce que dit l’annonce', en: 'What the ad says' },
  intlMatched: { fr: 'Adzuna a trouvé {mots} dans l’annonce complète (pas dans l’extrait reçu par VériJob) : ouvrez l’offre pour lire la phrase exacte.', en: 'Adzuna found {mots} in the full ad (not in the excerpt VériJob received): open the offer to read the exact sentence.' },
  intlMatchedBadge: { fr: 'Mention internationale trouvée par Adzuna', en: 'International mention found by Adzuna' },
  intlLmia: { fr: 'Employeur présent dans les listes officielles d’EIMT positives d’EDSC : {n} poste(s) approuvé(s), dernier trimestre {q}', en: 'Employer listed in ESDC’s official positive LMIA lists: {n} approved position(s), latest quarter {q}' },
  intlLmiaSameNoc: { fr: ' — dont ce métier', en: ' — including this job' },
  intlCaution: { fr: 'L’annonce mentionne aussi « autorisé à travailler au Canada » : vérifiez avec l’employeur que le permis sera bien parrainé.', en: 'The ad also says “authorized to work in Canada”: check with the employer that the permit will be sponsored.' },
  intlScam: { fr: 'signal(s) d’arnaque dans l’annonce : analysez-la avant tout contact', en: 'scam sign(s) in the ad: check it before any contact' },
  intlAnalyze: { fr: 'Analyser l’annonce', en: 'Check the ad' },
  intlEstimated: { fr: 'salaire estimé par Adzuna', en: 'salary estimated by Adzuna' },
  intlAllJobs: { fr: 'Afficher tous les métiers', en: 'Show all jobs' },
  intlNone: { fr: 'Aucune offre ouverte à l’international trouvée cette semaine pour vos métiers et provinces.', en: 'No offer open to international candidates found this week for your jobs and provinces.' },
  intlUpdated: { fr: 'Mise à jour le', en: 'Updated on' },
  intlPoweredBy: { fr: 'Annonces fournies par', en: 'Jobs by' },

  // Employeurs qui ont fait leurs preuves en Afrique
  africaTitle: { fr: 'Employeurs qui ont fait leurs preuves en Afrique', en: 'Employers with a proven track record in Africa' },
  africaIntro: {
    fr: 'Aucune donnée publique ne dit quels employeurs embauchent des Africains. Cette liste ne contient donc que des employeurs pour lesquels une preuve publique existe (page officielle de l’employeur, article de presse, mission de recrutement). Chaque preuve est datée et cliquable : vérifiez-la. Un employeur absent de la liste peut tout à fait recruter en Afrique.',
    en: 'No public data says which employers hire Africans. This list therefore only includes employers for which public evidence exists (employer’s official page, news article, recruitment mission). Each piece of evidence is dated and clickable: check it. An employer missing from the list may well recruit in Africa.',
  },
  africaYourCountry: { fr: 'Votre pays', en: 'Your country' },
  africaOld: { fr: 'Preuve de plus de 3 ans : vérifiez que l’employeur recrute encore.', en: 'Evidence older than 3 years: check the employer still recruits.' },
  africaCountries: { fr: 'Pays cités', en: 'Countries mentioned' },
  africaSource: { fr: 'Source', en: 'Source' },
  africaReadOn: { fr: 'lue le', en: 'read on' },
  africaUndated: { fr: 'page non datée', en: 'undated page' },
  africaNone: { fr: 'Aucune preuve enregistrée pour le moment.', en: 'No evidence recorded yet.' },
  africaBadge: { fr: 'A recruté en Afrique (preuve publique)', en: 'Has recruited in Africa (public evidence)' },
  statsTitle: { fr: 'Votre pays en chiffres officiels', en: 'Your country in official figures' },
  statsTfwp: {
    fr: 'permis de travail liés à une EIMT (Programme des travailleurs étrangers temporaires) délivrés à des ressortissants de ce pays',
    en: 'work permits tied to an LMIA (Temporary Foreign Worker Program) issued to citizens of this country',
  },
  statsRank: { fr: '{n}e pays d’Afrique', en: 'no. {n} among African countries' },
  statsImp: {
    fr: 'permis du Programme de mobilité internationale (tous motifs : Mobilité francophone, permis post-diplôme, conjoints…)',
    en: 'International Mobility Program permits (all purposes: Francophone Mobility, post-graduation, spouses…)',
  },
  statsPartial: { fr: 'jusqu’à', en: 'up to' },
  statsNote: { fr: 'Chiffres d’IRCC, arrondis ; les valeurs de 1 à 5 sont masquées par IRCC. Ils ne disent pas quels employeurs ont embauché.', en: 'IRCC figures, rounded; values from 1 to 5 are hidden by IRCC. They do not say which employers hired.' },
  statsChoose: { fr: 'Indiquez votre pays dans « Mon profil » pour voir ses chiffres.', en: 'Set your country in “My profile” to see its figures.' },
  whoNote: {
    fr: 'Santé : plusieurs pays d’Afrique figurent sur la liste d’appui et de sauvegarde de l’OMS (par exemple le Cameroun, selon IRCC). L’OMS y décourage le recrutement international actif de personnel de santé : certains employeurs canadiens de la santé limitent donc leurs missions dans ces pays. Postuler soi-même reste possible.',
    en: 'Health: several African countries are on the WHO support and safeguards list (for example Cameroon, according to IRCC). WHO discourages active international recruitment of health workers there: some Canadian health employers therefore limit their missions in these countries. Applying on your own is still possible.',
  },

  // Offres récentes (données ouvertes du Guichet-Emplois)
  postingsTitle: { fr: 'Le marché de vos métiers (statistiques officielles)', en: 'Your jobs’ market (official statistics)' },
  postingsIntro: {
    fr: 'Chiffres des données ouvertes du Guichet-Emplois (mois précédent) : nombre d’offres, salaire médian, part sans diplôme ou sans expérience. Ce ne sont pas des offres à cliquer (ces données n’ont pas de lien) : pour postuler, utilisez les offres actuelles plus haut ou le bouton Guichet-Emplois de chaque province.',
    en: 'Figures from Job Bank open data (previous month): number of offers, median wage, share without degree or experience. These are not offers to click (this data has no link): to apply, use the current offers above or each province’s Job Bank button.',
  },
  jobBankProvince: { fr: 'Offres actuelles ouvertes aux étrangers — Guichet-Emplois', en: 'Current offers open to foreign candidates — Job Bank' },
  currentTitle: { fr: 'Offres actuelles de vos métiers (lien direct)', en: 'Current offers for your jobs (direct link)' },
  currentIntro: {
    fr: 'Annonces des 3 dernières semaines, mises à jour chaque semaine. Une annonce ne dit pas toujours si l’employeur accepte les candidats de l’étranger : lisez-la en entier, et préférez celles marquées « ouverte à l’étranger ».',
    en: 'Ads from the last 3 weeks, updated weekly. An ad does not always say whether the employer accepts candidates from abroad: read it fully, and prefer those marked “open to applicants abroad”.',
  },
  currentEmptyJob: {
    fr: 'Pas encore d’offre actuelle pour ce métier dans la liste (mise à jour chaque semaine). En attendant, voici les offres ouvertes aux candidats étrangers sur le Guichet-Emplois :',
    en: 'No current offer for this job in the list yet (updated weekly). Meanwhile, here are the offers open to foreign candidates on Job Bank:',
  },
  currentIntl: { fr: 'Ouverte à l’étranger (preuve trouvée)', en: 'Open to applicants abroad (proof found)' },
  currentNone: { fr: 'Aucune offre récente pour vos métiers et provinces dans cet onglet.', en: 'No recent offer for your jobs and provinces in this tab.' },
  offerOnJobBank: { fr: 'Trouver et postuler sur le Guichet-Emplois', en: 'Find and apply on Job Bank' },
  offerEmployerSite: { fr: 'Site de l’employeur', en: 'Employer’s website' },
  offerReadAdzuna: { fr: 'Lire l’annonce (Adzuna)', en: 'Read the ad (Adzuna)' },
  offerAbroadNote: {
    fr: 'Depuis l’étranger, Adzuna montre le texte de l’annonce mais bloque son bouton « Postuler ». Pour postuler : « Trouver et postuler sur le Guichet-Emplois » (même titre, même employeur, même province) ou le site de l’employeur.',
    en: 'From abroad, Adzuna shows the ad text but blocks its “Apply” button. To apply: “Find and apply on Job Bank” (same title, employer and province) or the employer’s website.',
  },
  postingsMonth: { fr: 'Offres publiées en', en: 'Offers posted in' },
  postingsNeedProfile: { fr: 'Choisissez vos métiers et vos provinces dans « Mon profil » pour voir les offres récentes.', en: 'Choose your jobs and provinces in “My profile” to see recent offers.' },
  statOffers: { fr: 'offres', en: 'offers' },
  statPositions: { fr: 'postes', en: 'positions' },
  statMedian: { fr: 'salaire médian proposé', en: 'median offered wage' },
  statNoDegree: { fr: 'sans diplôme exigé', en: 'no degree required' },
  statNoExp: { fr: 'sans expérience exigée', en: 'no experience required' },
  statSeasonal: { fr: 'saisonnières', en: 'seasonal' },
  postedOn: { fr: 'Publiée le', en: 'Posted on' },

  // Vérificateur de CV
  navCv: { fr: 'Vérifier mon CV', en: 'Check my resume' },
  cardCvTitle: { fr: 'Vérifier mon CV', en: 'Check my resume' },
  cardCvText: { fr: 'Format canadien, cohérence, langue, mots de l’offre, lisibilité par les logiciels de tri.', en: 'Canadian format, consistency, language, words from the offer, readability by screening software.' },
  quebecTitle: { fr: 'Travailler au Québec : les étapes (règles du Québec)', en: 'Working in Quebec: the steps (Quebec rules)' },
  quebecArrima: { fr: 'Arrima : déclaration d’intérêt et Portail employeurs', en: 'Arrima: expression of interest and Employer Portal' },
  familyTitle: { fr: 'Venir en couple ou en famille', en: 'Coming as a couple or family' },
  profilesTitle: { fr: 'Profils sur ce téléphone', en: 'Profiles on this phone' },
  profilesIntro: {
    fr: 'Créez un profil par personne (vous, votre conjoint·e, un proche) : chacun garde ses métiers, ses langues, ses provinces et son suivi de candidatures. Tout reste sur ce téléphone, sans compte.',
    en: 'Create one profile per person (you, your spouse, a relative): each keeps their own jobs, languages, provinces and application tracking. Everything stays on this phone, no account.',
  },
  profileDefaultName: { fr: 'Profil', en: 'Profile' },
  profileName: { fr: 'Nom du profil', en: 'Profile name' },
  profileRename: { fr: 'Renommer', en: 'Rename' },
  profileDelete: { fr: 'Supprimer ce profil', en: 'Delete this profile' },
  profileDeleteConfirm: { fr: 'Supprimer le profil « {nom} » et ses candidatures de ce téléphone ? C’est définitif.', en: 'Delete the profile “{nom}” and its applications from this phone? This cannot be undone.' },
  profileNewName: { fr: 'Nom du nouveau profil (ex. Mon épouse)', en: 'New profile name (e.g. My wife)' },
  profileCreate: { fr: 'Créer un profil', en: 'Create a profile' },
  profileSwitchHint: { fr: 'Profil actif — changer dans « Mon profil »', en: 'Active profile — change it in “My profile”' },
  testTabsLabel: { fr: 'Classer selon le test de langue', en: 'Sort by language test' },
  testTab: {
    'sans-test': { fr: 'Sans test de langue obligatoire', en: 'No mandatory language test' },
    test: { fr: 'Test de langue obligatoire', en: 'Language test required' },
    aucune: { fr: 'Aucune voie pour votre profil', en: 'No route for your profile' },
    inconnu: { fr: 'Métier non reconnu', en: 'Job not recognized' },
    tout: { fr: 'Tout', en: 'All' },
  },
  testExplainFree: {
    fr: '« Sans test obligatoire » = pour OBTENIR le permis de travail, aucun test de langue officiel n’est exigé (permis avec EIMT), ou une autre preuve de français est acceptée (Mobilité francophone). Ouvrez chaque fiche pour les conditions.',
    en: '“No mandatory test” = to GET the work permit, no official language test is required (LMIA-based permit), or another proof of French is accepted (Francophone Mobility). Open each card for the conditions.',
  },
  testExplainTest: {
    fr: '« Test obligatoire » = la seule voie possible pour votre profil exige un test de langue approuvé (ex. pilotes PICR et PICRF vers la résidence permanente).',
    en: '“Test required” = the only route possible for your profile requires an approved language test (e.g. RCIP and FCIP pilots to permanent residence).',
  },
  testProposalMore: { fr: 'Suivi dans Programmes et actualités', en: 'Tracked in Programs and news' },
  testUnknownJob: { fr: 'Métier non reconnu dans le titre : ouvrez l’offre pour vérifier les conditions.', en: 'Job not recognized in the title: open the posting to check the conditions.' },
  frenchStudies: { fr: 'J’ai fait mes études en français (diplôme ou relevé de notes d’un collège ou d’une université)', en: 'I studied in French (diploma or transcript from a college or university)' },
  frenchStudiesHelp: {
    fr: 'Pour la Mobilité francophone, IRCC accepte cette preuve à la place d’un test TEF ou TCF (l’agent peut la juger insuffisante).',
    en: 'For Francophone Mobility, IRCC accepts this proof instead of a TEF or TCF test (the officer may find it insufficient).',
  },
  proposalsTitle: { fr: 'Règles en préparation (pas encore en vigueur)', en: 'Rules in preparation (not yet in force)' },
  proposalChecked: { fr: 'Dernière vérification', en: 'Last checked' },
  proposalPageChanged: {
    fr: 'La page officielle a été modifiée le {d} (après notre vérification) : la règle a peut-être avancé. Vérifiez-la.',
    en: 'The official page was modified on {d} (after our check): the rule may have moved forward. Check it.',
  },
  sampleTitle: { fr: 'CV d’exemple pour ce poste', en: 'Sample resume for this job' },
  sampleOpen: { fr: 'CV d’exemple', en: 'Sample resume' },
  sampleIntro: {
    fr: 'Exemple d’un candidat FICTIF qui vit hors du Canada, au format canadien. Chaque tâche vient des fonctions officielles du métier (CNP 2021, Statistique Canada) ; la présentation suit le Guichet-Emplois. Remplacez chaque [repère surligné] par vos vraies informations et gardez seulement les tâches que vous avez réellement faites.',
    en: 'Example of a FICTIONAL candidate living outside Canada, in Canadian format. Each task comes from the official duties of the job (NOC 2021, Statistics Canada); the layout follows Job Bank. Replace each [highlighted placeholder] with your real information and keep only the tasks you have really done.',
  },
  sampleHonest: {
    fr: 'Ne recopiez jamais une tâche ou un chiffre qui n’est pas vrai : un employeur peut vérifier, et le Guichet-Emplois rappelle que mentir dans un CV peut coûter l’emploi.',
    en: 'Never copy a task or a number that is not true: an employer can check, and Job Bank reminds that lying on a resume can cost you the job.',
  },
  sampleJob: { fr: 'Métier', en: 'Job' },
  sampleChooseJob: { fr: '— Choisir un métier —', en: '— Choose a job —' },
  sampleLang: { fr: 'Langue du CV', en: 'Resume language' },
  sampleOfferTitle: { fr: 'Intitulé du poste (facultatif)', en: 'Job title (optional)' },
  sampleOfferText: { fr: 'Texte de l’offre (facultatif) : le CV reprend ses mots importants', en: 'Job posting text (optional): the resume reuses its key words' },
  sampleDownload: { fr: 'Télécharger le CV Word (.docx)', en: 'Download the Word resume (.docx)' },
  sampleCopy: { fr: 'Copier le texte', en: 'Copy the text' },
  sampleCheck: { fr: 'Vérifier mon propre CV pour cette offre', en: 'Check my own resume for this posting' },
  sampleFromOffer: { fr: 'Mot de l’offre', en: 'Posting word' },
  sampleToProve: {
    fr: 'Mots de l’offre absents de l’exemple : montrez-les dans votre CV avec un exemple réel, seulement si c’est vrai',
    en: 'Posting words missing from the example: show them in your resume with a real example, only if true',
  },
  sampleMatched: { fr: 'Mots de l’offre déjà repris', en: 'Posting words already used' },
  sampleRequirements: { fr: 'Conditions d’accès officielles du métier (à prouver si elles s’appliquent)', en: 'Official employment requirements (prove them when they apply)' },
  sampleTransfer: {
    fr: 'Ce CV part de votre métier actuel (Mon profil) : il met en avant les tâches communes avec le métier visé.',
    en: 'This resume starts from your current job (My profile): it highlights the tasks shared with the target job.',
  },
  sampleWhy: {
    header: {
      fr: 'En haut de la 1re page : nom, ville et pays, téléphone avec l’indicatif, courriel simple (prénom.nom). Sans photo, âge, état civil ni religion. Pour un candidat hors Canada, une ligne claire sur votre disponibilité et le permis de travail rassure l’employeur.',
      en: 'At the top of page 1: name, city and country, phone with country code, simple e-mail (first.last). No photo, age, marital status or religion. For a candidate outside Canada, a clear line on availability and the work permit reassures the employer.',
    },
    summary: {
      fr: '3 à 4 lignes qui reprennent l’intitulé du poste visé et vos années d’expérience. C’est la seule section où « je » est permis.',
      en: '3 to 4 lines that repeat the target job title and your years of experience. This is the only section where “I” is allowed.',
    },
    skills: {
      fr: 'Les compétences que l’offre demande et que vous pouvez prouver plus bas.',
      en: 'The skills the posting asks for and that you can prove below.',
    },
    experience: {
      fr: 'Du plus récent au plus ancien. 5 à 7 puces au plus, chacune commence par un verbe à l’infinitif. Pas seulement des tâches : ajoutez un résultat chiffré (combien, à quelle fréquence). Les puces marquées « Mot de l’offre » reprennent ses termes.',
      en: 'Most recent first. 5 to 7 bullets at most, each starting with an action verb. Not just tasks: add a measurable result (how many, how often). Bullets marked “Posting word” reuse its terms.',
    },
    education: {
      fr: 'Le nom exact du diplôme, l’établissement, le pays et l’année. N’inventez pas d’équivalence canadienne.',
      en: 'The exact diploma name, school, country and year. Do not invent a Canadian equivalence.',
    },
    languages: {
      fr: 'Indiquez le résultat d’un test officiel (TEF/TCF, IELTS/CELPIP) si vous l’avez ; sinon, votre niveau réel.',
      en: 'Give an official test result (TEF/TCF, IELTS/CELPIP) if you have one; otherwise your real level.',
    },
  },
  cvTitle: { fr: 'Vérifier mon CV avant de postuler', en: 'Check my resume before applying' },
  cvIntro: {
    fr: 'Ajoutez votre CV (PDF, Word .docx ou texte) et, si possible, le texte de l’offre visée. L’appli vérifie le format canadien, le contenu, la cohérence des dates, la langue, les mots importants de l’offre et la lisibilité par les logiciels de tri (ATS).',
    en: 'Add your resume (PDF, Word .docx or text) and, if possible, the text of the target offer. The app checks the Canadian format, content, date consistency, language, important words from the offer and readability by screening software (ATS).',
  },
  cvPrivacy: { fr: 'Votre CV est lu sur ce téléphone. Il n’est envoyé nulle part et n’est pas enregistré.', en: 'Your resume is read on this phone. It is not sent anywhere and not saved.' },
  cvFile: { fr: 'Mon CV (PDF, .docx ou .txt, 5 Mo maximum)', en: 'My resume (PDF, .docx or .txt, 5 MB max)' },
  cvOffer: { fr: 'Texte de l’offre visée (facultatif, mais recommandé)', en: 'Text of the target offer (optional, but recommended)' },
  cvAnalyze: { fr: 'Vérifier', en: 'Check' },
  cvReading: { fr: 'Lecture du CV…', en: 'Reading the resume…' },
  cvErr: {
    'trop-gros': { fr: 'Fichier trop gros (5 Mo maximum).', en: 'File too large (5 MB max).' },
    format: { fr: 'Format non pris en charge : utilisez un PDF, un fichier Word .docx ou un fichier texte. (Ancien format .doc : ouvrez-le dans Word et enregistrez-le en .docx.)', en: 'Unsupported format: use a PDF, a Word .docx or a text file. (Old .doc format: open it in Word and save it as .docx.)' },
    illisible: { fr: 'Impossible de lire ce fichier. Il est peut-être protégé ou abîmé.', en: 'Cannot read this file. It may be protected or damaged.' },
  },
  cvCategory: {
    lisibilite: { fr: 'Lisibilité par les logiciels de tri (ATS)', en: 'Readability by screening software (ATS)' },
    format: { fr: 'Format canadien', en: 'Canadian format' },
    contenu: { fr: 'Contenu', en: 'Content' },
    coherence: { fr: 'Cohérence', en: 'Consistency' },
    offre: { fr: 'Correspondance avec l’offre', en: 'Match with the offer' },
  },
  cvStatus: {
    'a-corriger': { fr: 'À corriger', en: 'To fix' },
    conseil: { fr: 'Conseil', en: 'Tip' },
    ok: { fr: 'OK', en: 'OK' },
  },
  cvTechnical: { fr: 'Vérification technique de VériJob (pas de règle officielle sur ce point).', en: 'Technical check by VériJob (no official rule on this point).' },
  cvMissingWords: { fr: 'Mots de l’offre absents du CV (ajoutez seulement ceux qui sont vrais pour vous)', en: 'Words from the offer missing from the resume (add only those that are true for you)' },
  cvFoundWords: { fr: 'Mots de l’offre présents', en: 'Words from the offer found' },
  cvShowOk: { fr: 'Points conformes', en: 'Points that are fine' },
  cvBuilder: { fr: 'Pour refaire un CV au format canadien, le Guichet-Emplois propose un outil gratuit de création de CV (compte gratuit).', en: 'To rebuild a resume in Canadian format, Job Bank offers a free Resume Builder (free account).' },
  cvEvidence: { fr: 'Dans votre CV :', en: 'In your resume:' },
  checkCvForOffer: { fr: 'Vérifier mon CV pour cette offre', en: 'Check my resume for this offer' },

  // Suivi : provenance et copie de l'annonce
  fieldOrigin: { fr: 'Où avez-vous trouvé l’offre ?', en: 'Where did you find the offer?' },
  appOrigin: {
    'guichet-emplois': { fr: 'Guichet-Emplois (Job Bank)', en: 'Job Bank' },
    'site-emploi': { fr: 'Site d’emploi (Indeed, LinkedIn…)', en: 'Job site (Indeed, LinkedIn…)' },
    'petite-annonce': { fr: 'Petite annonce', en: 'Classified ad' },
    messagerie: { fr: 'WhatsApp, Telegram, Facebook…', en: 'WhatsApp, Telegram, Facebook…' },
    'site-employeur': { fr: 'Site de l’employeur', en: 'Employer’s website' },
    salon: { fr: 'Salon de recrutement', en: 'Recruitment fair' },
    reseau: { fr: 'Réseau, bouche-à-oreille', en: 'Network, word of mouth' },
    demarchage: { fr: 'Candidature spontanée', en: 'Unsolicited application' },
    autre: { fr: 'Autre', en: 'Other' },
  },
  fieldContactSource: { fr: 'Où avez-vous trouvé ce contact ? (lien de l’offre officielle ou du site de l’employeur)', en: 'Where did you find this contact? (link to the official posting or the employer’s website)' },
  contactVerified: { fr: 'Contact trouvé sur', en: 'Contact found on' },
  contactUnverified: { fr: 'Contact non vérifié : retrouvez-le dans une offre du Guichet-Emplois ou sur le site officiel de l’employeur avant d’envoyer quoi que ce soit.', en: 'Contact not verified: find it in a Job Bank posting or on the employer’s official website before sending anything.' },
  contactFreeMail: { fr: 'Adresse de messagerie gratuite (Gmail, Yahoo…) : une vraie entreprise écrit normalement depuis une adresse à son nom. Vérifiez avant d’envoyer vos documents.', en: 'Free e-mail address (Gmail, Yahoo…): a real company normally writes from an address in its own name. Check before sending your documents.' },
  originShort: { fr: 'Provenance', en: 'Found on' },
  fieldAdUrl: { fr: 'Lien de l’annonce', en: 'Link to the ad' },
  fieldAdText: { fr: 'Copie du texte de l’annonce', en: 'Copy of the ad text' },
  adTextHelp: { fr: 'Les annonces disparaissent vite. Gardez-en une copie : elle sert de preuve en cas d’arnaque.', en: 'Ads disappear quickly. Keep a copy: it is evidence if it turns out to be a scam.' },
  analyzeAd: { fr: 'Analyser cette annonce', en: 'Check this ad' },
  viewAd: { fr: 'Voir l’annonce', en: 'View the ad' },
  savedAd: { fr: 'Annonce enregistrée', en: 'Saved ad' },
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
    fr: 'Ces employeurs ont obtenu des EIMT pour vos métiers sur plusieurs trimestres (ils recrutent régulièrement à l’étranger), ou viennent d’en obtenir une première. Écrivez-leur directement, sans intermédiaire.',
    en: 'These employers got LMIAs for your jobs over several quarters (they regularly hire abroad), or have just obtained their first one. Write to them directly, without a middleman.',
  },
  prospectsWarning: {
    fr: 'Une EIMT passée ne veut pas dire qu’un poste est ouvert aujourd’hui. Ne payez jamais pour être mis en relation avec un employeur.',
    en: 'A past LMIA does not mean a job is open today. Never pay to be put in touch with an employer.',
  },
  filters: { fr: 'Filtres', en: 'Filters' },
  allJobs: { fr: 'Mes métiers (profil)', en: 'My jobs (profile)' },
  noTargetJobs: { fr: 'Aucun métier choisi dans votre profil : tous les métiers sont affichés.', en: 'No job chosen in your profile: all jobs are shown.' },
  onlyNew: { fr: 'Seulement les nouveaux recruteurs', en: 'New recruiters only' },
  directContact: {
    fr: 'Mise en relation directe, en 3 étapes : 1) « Trouver sa page Carrières » et vérifiez comment postuler ; 2) « Préparer un message » (il cite les EIMT publiques de l’employeur) ; 3) « Suivre » : la relance est notée dans l’onglet Suivi. Beaucoup d’employeurs qui ont un besoin régulier ne publient pas d’offre à chaque fois : une candidature spontanée a du sens.',
    en: 'Direct contact, in 3 steps: 1) “Find its careers page” and check how to apply; 2) “Prepare a message” (it cites the employer’s public LMIAs); 3) “Track”: the follow-up is noted in the Tracking tab. Many employers with a regular need do not post a job every time: an unsolicited application makes sense.',
  },
  recurringNeed: { fr: 'Besoin récurrent', en: 'Recurring need' },
  recurringNeedText: {
    fr: 'EIMT obtenues dans {q} trimestres différents : cet employeur a régulièrement besoin de travailleurs étrangers, même quand aucune offre n’est affichée.',
    en: 'LMIAs obtained in {q} different quarters: this employer regularly needs foreign workers, even when no job is posted.',
  },
  newRecruiter: { fr: 'Nouveau recruteur', en: 'New recruiter' },
  newRecruiterText: {
    fr: 'Première EIMT au {f}, aucune depuis {start} : cet employeur vient de commencer à recruter à l’étranger. Vérifiez bien qu’il existe (site, adresse) avant d’écrire.',
    en: 'First LMIA in {f}, none since {start}: this employer has just started hiring abroad. Check that it exists (website, address) before writing.',
  },
  licenceLink: { fr: 'Permis d’agent de sécurité', en: 'Security guard licence' },
  hideAgriOnly: { fr: 'Masquer les employeurs seulement en agriculture primaire (souvent via le PTAS)', en: 'Hide employers only in primary agriculture (often through SAWP)' },
  resultsCount: { fr: 'employeurs trouvés', en: 'employers found' },
  showMore: { fr: 'Afficher plus', en: 'Show more' },
  exportCsv: { fr: 'Exporter la liste (CSV)', en: 'Export the list (CSV)' },
  quartersSeen: { fr: 'trimestres avec EIMT', en: 'quarters with LMIAs' },
  lastQuarter: { fr: 'dernier', en: 'latest' },
  refused: { fr: 'postes refusés', en: 'refused positions' },
  refusedOne: { fr: 'poste refusé', en: 'refused position' },
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
