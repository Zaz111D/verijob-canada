import { describe, expect, it } from 'vitest';
import { evaluatePathways, type JobContext, type PathwayId, type Profile } from '../src';
import { nocData, rules, TODAY } from './helpers';

const evaluate = (profile: Profile, job: JobContext, today = TODAY) =>
  evaluatePathways(profile, job, { rules, nocData, today });

const status = (res: ReturnType<typeof evaluate>, voie: PathwayId) => res.find((r) => r.voie === voie)?.statut;
const reasons = (res: ReturnType<typeof evaluate>, voie: PathwayId) =>
  (res.find((r) => r.voie === voie)?.raisons ?? []).map((r) => r.fr).join(' ');

const FRANCO_NCLC5: Profile = { citizenship: 'CM', french: { speaking: 5, listening: 5 } };

describe('Critères de réussite du MVP', () => {
  it('n°3 — caregiver francophone NCLC 5 : pilotes fermés, Mobilité francophone possible', () => {
    const res = evaluate(FRANCO_NCLC5, { noc: '44101' });
    expect(status(res, 'pilotes-aides-familiaux')).toBe('bloquee');
    expect(reasons(res, 'pilotes-aides-familiaux')).toContain('2030-03-30');
    expect(status(res, 'mobilite-francophone')).toBe('probable');
    expect(status(res, 'eimt-bas-salaire')).toBe('possible'); // aides familiaux exemptés du gel des RMR
    for (const r of res) {
      expect(r.sources.length).toBeGreaterThan(0);
      expect(r.sources.every((s) => s.url.fr.startsWith('https://'))).toBe(true);
    }
  });

  it('n°4 — farm worker camerounais : PTAS bloqué, volet agricole possible', () => {
    const res = evaluate({ citizenship: 'CM' }, { noc: '85101' });
    expect(status(res, 'ptas')).toBe('bloquee');
    expect(status(res, 'eimt-agricole')).toBe('possible');
    expect(status(res, 'mobilite-francophone')).toBe('bloquee'); // agriculture primaire TEER 5
    expect(res.find((r) => r.voie === 'eimt-bas-salaire')).toBeUndefined();
  });
});

describe('EIMT bas salaire — gel des RMR', () => {
  it('manutentionnaire à Mississauga (RMR de Toronto, gelée) → bloquée', () => {
    const res = evaluate({}, { noc: '75101', city: 'Mississauga', province: 'ON' });
    expect(status(res, 'eimt-bas-salaire')).toBe('bloquee');
    expect(reasons(res, 'eimt-bas-salaire')).toContain('Toronto');
  });

  it('usine de poisson à Halifax (gelée) → possible, exemption SCIAN 311 estimée', () => {
    const res = evaluate({}, { noc: '94142', city: 'Halifax', province: 'NS' });
    expect(status(res, 'eimt-bas-salaire')).toBe('possible');
    expect(reasons(res, 'eimt-bas-salaire')).toContain('SCIAN 311');
  });

  it('manœuvre de construction à Calgary (gelée) → possible, exemption construction', () => {
    expect(status(evaluate({}, { noc: '75110', city: 'Calgary', province: 'AB' }), 'eimt-bas-salaire')).toBe('possible');
  });

  it('manutentionnaire à Winnipeg (non gelée) → possible', () => {
    expect(status(evaluate({}, { noc: '75101', city: 'Winnipeg', province: 'MB' }), 'eimt-bas-salaire')).toBe('possible');
  });

  it('ville inconnue → inconnue ; hors RMR confirmé → possible', () => {
    expect(status(evaluate({}, { noc: '75101', city: 'Steinbach', province: 'MB' }), 'eimt-bas-salaire')).toBe('inconnue');
    expect(status(evaluate({}, { noc: '75101', city: 'Steinbach', province: 'MB', outsideCma: true }), 'eimt-bas-salaire')).toBe('possible');
  });

  it('salaire au-dessus du seuil provincial → volet haut salaire, gel non applicable', () => {
    const res = evaluate({}, { noc: '75101', city: 'Toronto', province: 'ON', hourlyWage: 40 });
    expect(status(res, 'eimt-bas-salaire')).toBe('possible');
    expect(reasons(res, 'eimt-bas-salaire')).toContain('haut salaire');
  });

  it('aide familial logé chez l’employeur → bloquée', () => {
    expect(status(evaluate({}, { noc: '44101', city: 'Toronto', province: 'ON', liveIn: true }), 'eimt-bas-salaire')).toBe('bloquee');
  });

  it('aide familial hors ménage privé dans une RMR gelée → pas d’exemption', () => {
    expect(
      status(evaluate({}, { noc: '44101', city: 'Toronto', province: 'ON', privateHousehold: false }), 'eimt-bas-salaire'),
    ).toBe('bloquee');
  });

  it('liste RMR expirée → avertissement « périmée »', () => {
    const res = evaluate({}, { noc: '75101', city: 'Toronto', province: 'ON' }, '2027-02-01');
    expect(reasons(res, 'eimt-bas-salaire')).toMatch(/périmée|expiré/);
  });
});

describe('PTAS', () => {
  it('citoyen mexicain → possible ; pays non renseigné → inconnue', () => {
    expect(status(evaluate({ citizenship: 'MX' }, { noc: '85101' }), 'ptas')).toBe('possible');
    expect(status(evaluate({}, { noc: '85101' }), 'ptas')).toBe('inconnue');
  });
});

describe('Mobilité francophone (C16)', () => {
  it('emploi au Québec → bloquée', () => {
    expect(status(evaluate(FRANCO_NCLC5, { noc: '75101', province: 'QC' }), 'mobilite-francophone')).toBe('bloquee');
  });
  it('NCLC 4 à l’oral → bloquée ; niveau non renseigné → inconnue', () => {
    expect(status(evaluate({ french: { speaking: 4, listening: 6 } }, { noc: '75101' }), 'mobilite-francophone')).toBe('bloquee');
    expect(status(evaluate({}, { noc: '75101' }), 'mobilite-francophone')).toBe('inconnue');
  });
  it('aquaculture (85102) n’est pas de l’agriculture primaire → admissible', () => {
    expect(status(evaluate(FRANCO_NCLC5, { noc: '85102' }), 'mobilite-francophone')).toBe('probable');
  });
});

describe('Pilotes aides familiaux', () => {
  it('après la période de fermeture enregistrée → inconnue (à revérifier)', () => {
    expect(status(evaluate({}, { noc: '44101' }, '2030-04-01'), 'pilotes-aides-familiaux')).toBe('inconnue');
  });
  it('ne concerne que les métiers d’aide familial', () => {
    expect(evaluate({}, { noc: '75101' }).find((r) => r.voie === 'pilotes-aides-familiaux')).toBeUndefined();
  });
});

describe('Pilotes communautaires (PICR / PICRF)', () => {
  const fcip = { program: 'FCIP' as const, community: 'Sudbury' };
  it('PICRF + NCLC 5 dans les 4 compétences + 1 an d’expérience → probable', () => {
    const p: Profile = { french: { speaking: 5, listening: 5, reading: 5, writing: 5 }, experienceMonths: 12 };
    expect(status(evaluate(p, { noc: '44101', designatedEmployer: fcip }), 'pilotes-communautaires')).toBe('probable');
  });
  it('PICRF + une compétence à NCLC 4 → bloquée', () => {
    const p: Profile = { french: { speaking: 4, listening: 5, reading: 5, writing: 5 }, experienceMonths: 24 };
    expect(status(evaluate(p, { noc: '44101', designatedEmployer: fcip }), 'pilotes-communautaires')).toBe('bloquee');
  });
  it('PICR + TEER 5 + anglais CLB 4 → probable', () => {
    const p: Profile = { english: { speaking: 4, listening: 4, reading: 4, writing: 4 }, experienceMonths: 18 };
    expect(status(evaluate(p, { noc: '95106', designatedEmployer: { program: 'RCIP' } }), 'pilotes-communautaires')).toBe('probable');
  });
  it('expérience inconnue → possible ; moins d’un an → bloquée', () => {
    const fr = { speaking: 6, listening: 6, reading: 6, writing: 6 };
    expect(status(evaluate({ french: fr }, { noc: '44101', designatedEmployer: fcip }), 'pilotes-communautaires')).toBe('possible');
    expect(status(evaluate({ french: fr, experienceMonths: 6 }, { noc: '44101', designatedEmployer: fcip }), 'pilotes-communautaires')).toBe('bloquee');
  });
  it('employeur non désigné → bloquée ; inconnu → liste des communautés de la province', () => {
    expect(status(evaluate({}, { noc: '75101', designatedEmployer: false }), 'pilotes-communautaires')).toBe('bloquee');
    expect(reasons(evaluate({}, { noc: '75101', province: 'MB' }), 'pilotes-communautaires')).toContain('Brandon');
  });
});

describe('Forme des résultats', () => {
  it('tri : probable, possible, inconnue, bloquée ; raisons FR/EN non vides', () => {
    const order = { probable: 0, possible: 1, inconnue: 2, bloquee: 3 };
    const res = evaluate(FRANCO_NCLC5, { noc: '44101', city: 'Toronto', province: 'ON' });
    const ranks = res.map((r) => order[r.statut]);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    for (const r of res) {
      expect(r.raisons.length).toBeGreaterThan(0);
      for (const t of r.raisons) expect(t.fr && t.en).toBeTruthy();
    }
  });
});
