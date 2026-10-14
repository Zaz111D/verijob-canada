/**
 * Extrait des fichiers officiels ee_rounds_123_fr.json / ee_rounds_123_en.json (relevé le 14 oct. 2026),
 * réduit aux champs utilisés. Le fichier réel contient aussi drawNumberURL, mitext, dd1…dd18, etc.
 */
export const EE_FR = {
  classes: 'wb-tables',
  rounds: [
    { drawNumber: '448', drawDate: '2026-10-13', drawName: 'Programme des candidats des provinces', drawSize: '752', drawCRS: '772' },
    { drawNumber: '447', drawDate: '2026-10-01', drawName: 'Métiers spécialisés 2026-Version 3', drawSize: '3 500', drawCRS: '476' },
    { drawNumber: '446', drawDate: '2026-09-29', drawName: 'Catégorie de l’expérience canadienne', drawSize: '2 000', drawCRS: '518' },
    { drawNumber: '444', drawDate: '2026-09-16', drawName: 'Cadres supérieurs/cadres supérieures ayant de l’expérience de travail au Canada 2026-version 1', drawSize: '250', drawCRS: '389' },
    { drawNumber: '441', drawDate: '2026-09-04', drawName: 'Professions de la santé et des services sociaux 2026-version 3', drawSize: '3 500', drawCRS: '475' },
    { drawNumber: '440', drawDate: '2026-09-03', drawName: 'Médecins ayant de l’expérience de travail au Canada 2026-Version 1', drawSize: '229', drawCRS: '198' },
    { drawNumber: '437', drawDate: '2026-08-19', drawName: 'Compétence linguistique en français 2026-Version 2', drawSize: '5 000', drawCRS: '382' },
    { drawNumber: '434', drawDate: '2026-08-07', drawName: 'Métiers des transports 2026-Version 2', drawSize: '300', drawCRS: '470' },
    { drawNumber: '433', drawDate: '2026-08-06', drawName: 'Compétence linguistique en français 2026-Version 2', drawSize: '5 000', drawCRS: '391' },
    { drawNumber: '430', drawDate: '2026-07-23', drawName: 'Recrues militaires qualifiées, 2026-Version 1', drawSize: '4', drawCRS: '368' },
    // Ligne abîmée : doit être ignorée.
    { drawNumber: '', drawDate: 'bientôt', drawName: '', drawSize: '', drawCRS: '' },
  ],
};

export const EE_EN = {
  classes: 'wb-tables',
  rounds: [
    { drawNumber: '448', drawDate: '2026-10-13', drawName: 'Provincial Nominee Program', drawSize: '752', drawCRS: '772' },
    { drawNumber: '447', drawDate: '2026-10-01', drawName: 'Trades Occupations, 2026-Version 3', drawSize: '3,500', drawCRS: '476' },
    { drawNumber: '446', drawDate: '2026-09-29', drawName: 'Canadian Experience Class', drawSize: '2,000', drawCRS: '518' },
    { drawNumber: '444', drawDate: '2026-09-16', drawName: 'Senior managers with Canadian Work Experience, 2026-Version 1', drawSize: '250', drawCRS: '389' },
    { drawNumber: '441', drawDate: '2026-09-04', drawName: 'Healthcare and Social Services Occupations, 2026-Version 3', drawSize: '3,500', drawCRS: '475' },
    { drawNumber: '440', drawDate: '2026-09-03', drawName: 'Physicians with Canadian Work Experience, 2026-Version 1', drawSize: '229', drawCRS: '198' },
    { drawNumber: '437', drawDate: '2026-08-19', drawName: 'French-Language proficiency 2026-Version 2', drawSize: '5,000', drawCRS: '382' },
    { drawNumber: '434', drawDate: '2026-08-07', drawName: 'Transport Occupations, 2026-Version 2', drawSize: '300', drawCRS: '470' },
    { drawNumber: '433', drawDate: '2026-08-06', drawName: 'French-Language proficiency 2026-Version 2', drawSize: '5,000', drawCRS: '391' },
    { drawNumber: '430', drawDate: '2026-07-23', drawName: 'Skilled Military Recruits, 2026-Version 1', drawSize: '4', drawCRS: '368' },
  ],
};

/** Extrait du fil api.io.canada.ca (format=json), titres réels du 14 oct. 2026, textes abrégés. */
export const NEWS_FR = {
  feed: {
    entry: [
      { link: 'https://www.canada.ca/fr/immigration-refugies-citoyennete/nouvelles/2026/10/megadeduction.html', publishedDate: '2026-10-09T12:15:00-04:00', title: 'La ministre Metlege Diab présente la nouvelle Mégadéduction à la productivité pour aider les entreprises à investir, à croître et à créer des emplois au Canada', teaser: 'Fiscalité des entreprises.' },
      { link: 'https://www.canada.ca/fr/immigration-refugies-citoyennete/nouvelles/2026/09/francophone.html', publishedDate: '2026-09-29T10:00:00-04:00', title: 'Le Canada appuie de nouveaux projets visant à promouvoir l’immigration francophone et à renforcer les communautés', teaser: 'Nouveaux projets.' },
      { link: 'https://www.canada.ca/fr/immigration-refugies-citoyennete/nouvelles/2026/07/passeport.html', publishedDate: '2026-07-28T10:00:00-04:00', title: 'Le Canada étend le renouvellement en ligne du passeport à tous les adultes admissibles', teaser: 'Passeports.' },
      { link: 'https://www.canada.ca/fr/immigration-refugies-citoyennete/nouvelles/2026/05/halifax.html', publishedDate: '2026-05-11T10:00:00-04:00', title: 'Constituer la main-d’œuvre nécessaire pour construire plus de logements à Halifax', teaser: 'Logement.' },
      { link: 'https://www.canada.ca/fr/immigration-refugies-citoyennete/nouvelles/2026/05/consultants.html', publishedDate: '2026-05-06T10:00:00-04:00', title: 'Le Canada renforce la réglementation sur les consultants en immigration et en citoyenneté', teaser: 'Consultants.' },
      { link: 'https://www.canada.ca/fr/immigration-refugies-citoyennete/nouvelles/2025/12/citoyennete.html', publishedDate: '2025-12-15T10:00:00-04:00', title: 'De nouvelles règles de citoyenneté pour les Canadiens nés ou adoptés à l’étranger sont maintenant en vigueur', teaser: 'Citoyenneté.' },
      // Lien hors canada.ca : refusé.
      { link: 'https://exemple.test/emploi', publishedDate: '2026-10-01T10:00:00-04:00', title: 'Immigration : recrutement de travailleurs', teaser: '' },
    ],
  },
};
