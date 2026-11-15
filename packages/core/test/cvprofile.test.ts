import { describe, expect, it } from 'vitest';
import index from '../../../data/noc-search.json';
import { extractCvProfile, makeCatalogDetector, suggestBridges, type LmiaByNoc } from '../src';

const detect = makeCatalogDetector(index as Record<string, string>);
const today = '2026-11-15';

const AGENT = `Jean Mballa
Agent de sécurité
Douala, Cameroun — +237 6 99 00 00 00 — jean.mballa@example.com

EXPÉRIENCE PROFESSIONNELLE
Agent de sécurité – G4S Cameroun, Douala
Janvier 2019 - présent
• Contrôle des accès et rondes de surveillance sur un site industriel de 300 employés
• Rédaction des rapports d'incident

Chauffeur livreur – Brasseries du Cameroun
Mars 2015 - Décembre 2018
• Livraison de 40 clients par jour

FORMATION
Baccalauréat série A4, Lycée de New-Bell, 2014
CQP Agent de prévention et de sécurité, 2019

COMPÉTENCES
Premiers secours (SST), lutte contre l'incendie
Permis de conduire catégorie B et C

LANGUES
Français (langue maternelle), anglais (intermédiaire), TCF Canada 2025`;

const DRIVER = `MARY NJI
Professional Experience
Truck Driver, Dangote Transport, Lagos
Feb 2017 - Aug 2023
- Long-haul deliveries across West Africa
Warehouse Supervisor | ABC Logistics
09/2023 - present
Education
Higher National Diploma (HND) in Logistics, 2016
Skills
Forklift operation, Class 1 licence equivalent
Languages
English, French (basic), IELTS General 6.5`;

describe('extractCvProfile', () => {
  it('reconnaît les métiers, les durées, le diplôme, les langues et les certificats (CV en français)', () => {
    const p = extractCvProfile(AGENT, { detect, today });
    expect(p.jobs.map((j) => j.noc)).toEqual(['64410', '75201']); // chauffeur livreur = 75201
    const guard = p.jobs.find((j) => j.noc === '64410')!;
    expect(guard.months).toBe(95); // janv. 2019 → nov. 2026
    expect(p.jobs[1]!.months).toBe(46);
    expect(p.experienceMonths).toBe(95 + 46);
    expect(p.education?.level).toBe('postsecondaire'); // CQP > bac
    expect(p.languages).toMatchObject({ fr: true, en: true, cvLanguage: 'fr' });
    const ids = p.credentials.map((c) => c.id);
    expect(ids).toEqual(expect.arrayContaining(['permis-lourd', 'secourisme', 'securite', 'test-ircc']));
    expect(ids).not.toContain('permis-b');
  });

  it('CV en anglais : chauffeur de camion, HND, IELTS', () => {
    const p = extractCvProfile(DRIVER, { detect, today });
    const truck = p.jobs.find((j) => j.noc === '73300');
    expect(truck?.months).toBe(79);
    expect(p.jobs[0]!.noc).toBe('73300');
    expect(p.education?.level).toBe('postsecondaire');
    expect(p.languages.en).toBe(true);
    expect(p.credentials.map((c) => c.id)).toEqual(expect.arrayContaining(['test-ircc', 'cariste', 'permis-lourd']));
  });

  it('ne prend pas les lignes de formation ou de compétences pour des postes', () => {
    const p = extractCvProfile('FORMATION\nBTS Cuisinier, 2018\nCOMPÉTENCES\nSoudeur occasionnel', { detect, today });
    expect(p.jobs).toEqual([]);
    expect(p.education?.level).toBe('postsecondaire');
  });

  it('signale les tests de langue non acceptés par IRCC', () => {
    const p = extractCvProfile('Langues\nAnglais : TOEIC 850', { detect, today });
    expect(p.credentials.map((c) => c.id)).toEqual(['test-non-ircc']);
  });
});

describe('suggestBridges', () => {
  const lmia: LmiaByNoc = {
    '64410': [50, 30, 0], // le métier de la personne : exclu
    '65310': [3000, 1400, 0], // même domaine (6), FEER 5
    '63200': [14000, 7500, 0], // même domaine, FEER 3 : trop exigeant pour un FEER 4 sans diplôme
    '65201': [8000, 3800, 0],
    '94141': [5000, 900, 0], // autre domaine, FEER 4
    '85101': [100000, 3200, 99000], // agricole
    '31301': [9000, 2000, 0], // FEER 1 : exclu
    '00012': [500, 300, 0], // gestion : exclu
    '75101': [10, 5, 0], // trop peu de postes
  };
  it('propose des métiers accessibles, le même domaine d’abord, avec la preuve de la semaine en tête', () => {
    const b = suggestBridges({ jobs: ['64410'], education: 'secondaire', lmia, intl: { '94141': 2 } });
    const codes = b.map((x) => x.noc);
    expect(codes).not.toContain('64410');
    expect(codes).not.toContain('31301');
    expect(codes).not.toContain('00012');
    expect(codes).not.toContain('75101');
    expect(codes).not.toContain('63200');
    expect(codes.slice(0, 2)).toEqual(['65201', '65310']);
    expect(codes[2]).toBe('94141'); // offre prouvée cette semaine
    expect(b.find((x) => x.noc === '85101')!.agriShare).toBeGreaterThan(0.9);
  });
  it('un diplôme plus élevé ouvre les métiers de FEER 3', () => {
    const b = suggestBridges({ jobs: ['64410'], education: 'postsecondaire', lmia });
    expect(b.map((x) => x.noc)).toContain('63200');
  });
});

describe('isGigOffer', () => {
  it('écarte le travail à la tâche sur une plateforme, pas les vrais employeurs', async () => {
    const { isGigOffer } = await import('../src');
    expect(isGigOffer({ title: 'Delivery Driver', company: 'Skip The Dishes' })).toBe(true);
    expect(isGigOffer({ title: 'Livreur Indépendant', company: 'Une entreprise' })).toBe(true);
    expect(isGigOffer({ title: 'Shopper', company: 'Instacart Shoppers' })).toBe(true);
    expect(isGigOffer({ title: 'Delivery Driver', company: 'Huber Transport' })).toBe(false);
    expect(isGigOffer({ title: 'Independent Living Support Worker', company: 'Community Living' })).toBe(false);
    expect(isGigOffer({ title: 'Chauffeur livreur', company: 'Brasserie du Nord' })).toBe(false);
  });
});
