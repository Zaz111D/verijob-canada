import { describe, expect, it } from 'vitest';
import { analyzeCv, detectLanguage, extractPeriods, matchKeywords, offerKeywords } from '../src';
import { rules, TODAY } from './helpers';

/** CV « à la canadienne » (fictif). */
const GOOD_EN = `Awa Diop
Dakar, Senegal | +221 77 123 45 67 | awa.diop@example.com

SKILLS
Personal care, mobility assistance, meal preparation, infection control, first aid (Red Cross)

WORK EXPERIENCE
Personal Support Worker — Clinique Les Palmiers, Dakar
March 2021 - present
• Assisted 12 elderly residents per day with bathing, dressing and mobility
• Prepared meals for 30 patients following dietary plans
• Trained 4 new caregivers in infection control

Home Care Aide — Private household, Thiès
January 2018 - February 2021
• Provided daily personal care and companionship to 2 seniors
• Managed medication schedules and medical appointments

EDUCATION
Certificate in Health Care Assistance — Institut de Formation, Dakar, 2017
`;

/** CV avec les erreurs fréquentes (fictif). */
const BAD_FR = `CURRICULUM VITAE
Jean Mballa
Né le 12/04/1990 à Douala, 36 ans
Marié, 3 enfants
Religion : catholique
Email : jeanbg237_du93@yahoo.fr

PARCOURS
Je suis un travailleur sérieux. Je suis responsable de la cuisine. J'aime mon travail et mes collègues.
Responsable de la plonge. Chargé de l'inventaire. Responsable de la propreté.
2015 - 2019 : Aide de cuisine, Restaurant Le Wouri
2021 - 2018 : Cuisinier, Hôtel du Lac
2027 - 2028 : Chef, Hôtel Akwa

Raison du départ : fermeture du restaurant
LOISIRS
Football, musique
Références disponibles sur demande
`;

const OFFER_EN = `Personal Support Worker – Moncton, NB. Full time, $19.50 hourly.
Duties: personal care, bathing, dressing, feeding residents, mobility assistance, infection control.
Requirements: PSW certificate, first aid, CPR, experience with seniors and dementia care.
Residents need help with personal care and mobility every day. Dementia experience is an asset.`;

const analyze = (text: string, extra: Partial<Parameters<typeof analyzeCv>[0]> = {}, offerText?: string) =>
  analyzeCv({ text, fileType: 'txt', ...extra }, { rules, offerText, today: TODAY });
const status = (r: ReturnType<typeof analyze>, id: string) => r.checks.find((c) => c.id === id)?.status;

describe('Vérificateur de CV — CV conforme', () => {
  const r = analyze(GOOD_EN, { fileName: 'Awa-Diop-CV.pdf', pages: 1 }, OFFER_EN);
  it('aucun point à corriger, langue détectée', () => {
    expect(r.checks.filter((c) => c.status === 'a-corriger').map((c) => c.id)).toEqual([]);
    expect(r.language).toBe('en');
  });
  it('coordonnées, sections, chiffres et dates reconnus', () => {
    for (const id of ['coordonnees', 'sections', 'realisations-chiffrees', 'dates', 'infos-personnelles', 'longueur', 'texte-lisible']) {
      expect(status(r, id), id).toBe('ok');
    }
  });
  it('mots-clés de l’offre : correspondance mesurée, mots manquants listés', () => {
    expect(r.keywords!.ratio).toBeGreaterThan(0.3);
    expect(r.keywords!.matched).toEqual(expect.arrayContaining(['personal', 'care', 'mobility']));
    expect(r.keywords!.missing).toEqual(expect.arrayContaining(['dementia']));
  });
  it('chaque conseil du Guichet-Emplois est sourcé', () => {
    for (const id of ['longueur', 'coordonnees', 'infos-personnelles']) {
      expect(r.checks.find((c) => c.id === id)!.sources[0]?.url.fr).toMatch(/guichetemplois\.gc\.ca/);
    }
  });
});

describe('Vérificateur de CV — erreurs fréquentes', () => {
  const r = analyze(BAD_FR, { fileName: 'CV.pdf', hasImage: true, hasTables: true }, OFFER_EN);
  const ids = (s: string) => r.checks.filter((c) => c.status === s).map((c) => c.id);
  it('repère les points à corriger', () => {
    expect(ids('a-corriger')).toEqual(expect.arrayContaining([
      'infos-personnelles', 'photo', 'mise-en-page', 'dates', 'raison-depart', 'coordonnees', 'langue', 'sections',
    ]));
  });
  it('donne les conseils', () => {
    expect(ids('conseil')).toEqual(expect.arrayContaining(['pronoms', 'liste-de-taches', 'loisirs', 'references', 'email-pro', 'nom-fichier', 'realisations-chiffrees']));
  });
  it('extraits : âge, état civil et religion cités', () => {
    const ev = r.checks.find((c) => c.id === 'infos-personnelles')!.evidence.join(' | ');
    expect(ev).toContain('Né le');
    expect(ev).toContain('Marié');
    expect(ev).toContain('Religion');
  });
  it('dates : période inversée et date future', () => {
    expect(r.checks.find((c) => c.id === 'dates')!.evidence).toEqual(expect.arrayContaining(['2021 - 2018', '2027 - 2028']));
  });
  it('résumé honnête, jamais « garanti »', () => {
    expect(r.summary.fr).toMatch(/point\(s\) à corriger/);
    expect(r.disclaimer.fr).toContain('ne garantit pas');
  });
});

describe('Vérificateur de CV — cas particuliers', () => {
  it('scan illisible : on s’arrête au contrôle de lisibilité', () => {
    const r = analyze('  Jean  ', { fileType: 'pdf', pages: 1 });
    expect(r.checks.map((c) => [c.id, c.status])).toEqual([['texte-lisible', 'a-corriger']]);
  });
  it('plus de 2 pages', () => {
    expect(status(analyze(GOOD_EN, { pages: 3 }), 'longueur')).toBe('a-corriger');
  });
  it('trou de plus d’un an signalé', () => {
    const r = analyze(`${GOOD_EN}\nWarehouse helper, Dakar\n2010 - 2012\n`);
    expect(r.checks.find((c) => c.id === 'trous')?.evidence[0]).toMatch(/2012 → .*2017|2012 → 01\/2018/);
  });
  it('« 2015-2019 » n’est pas pris pour un numéro de téléphone', () => {
    const r = analyze(`Jean Mballa\njean.mballa@example.com\nEXPÉRIENCE\nAide de cuisine 2015-2019\n${'Préparation des repas pour la cantine. '.repeat(12)}`);
    expect(status(r, 'coordonnees')).toBe('a-corriger');
  });
});

describe('Outils', () => {
  it('langue', () => {
    expect(detectLanguage(OFFER_EN)).toBe('en');
    expect(detectLanguage("Nous recherchons un aide de cuisine pour le restaurant et la cafétéria de l'hôpital, avec de l'expérience.")).toBe('fr');
  });
  it('périodes : mois, « présent », années seules', () => {
    const p = extractPeriods('Mars 2021 - présent\n01/2018 – 02/2021\n2010 à 2012', TODAY);
    expect(p.map((x) => x.raw)).toHaveLength(3);
    expect(p[0]!.ongoing).toBe(true);
    expect(p[1]!.start).toBe(2018 * 12);
  });
  it('mots-clés : pluriels rapprochés, mots généraux écartés', () => {
    const k = offerKeywords(OFFER_EN, 20);
    expect(k).not.toContain('hourly');
    expect(k).not.toContain('time');
    expect(k).not.toContain('duties');
    expect(analyze(GOOD_EN, {}, OFFER_EN).keywords!.missing).not.toContain('moncton');
    expect(matchKeywords('resident care', ['residents', 'cares']).ratio).toBe(1);
  });
});
