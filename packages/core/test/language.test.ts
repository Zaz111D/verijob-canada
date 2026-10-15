import { describe, expect, it } from 'vitest';
import { evaluatePathways, testGroup, testRequired, type Profile } from '../src';
import { nocData, rules, TODAY } from './helpers';

const group = (profile: Profile, job: Parameters<typeof evaluatePathways>[1]) =>
  testGroup(rules, evaluatePathways(profile, job, { rules, nocData, today: TODAY }));

describe('test de langue obligatoire ou non (rules.languageTest)', () => {
  it('chaque voie évaluée par l’appli est classée, avec une source connue et une note FR/EN', () => {
    for (const voie of ['eimt-bas-salaire', 'eimt-agricole', 'ptas', 'mobilite-francophone', 'pilotes-communautaires', 'pilotes-aides-familiaux']) {
      const v = rules.languageTest.byPathway[voie]!;
      expect(v, voie).toBeDefined();
      expect(rules.sources[v.source], voie).toBeDefined();
      expect(v.noteFr.length).toBeGreaterThan(20);
      expect(v.noteEn.length).toBeGreaterThan(20);
    }
    expect(testRequired(rules, 'mobilite-francophone')).toBe(false);
    expect(testRequired(rules, 'pilotes-communautaires')).toBe(true);
  });
  it('agent de sécurité hors Québec, études en français : sans test obligatoire (Mobilité francophone)', () => {
    const g = group({ citizenship: 'CM', frenchStudies: true }, { noc: '64410', province: 'NB', outsideCma: true });
    expect(g.group).toBe('sans-test');
    expect(g.routes.map((r) => r.voie)).toContain('mobilite-francophone');
  });
  it('les voies bloquées ne comptent pas (PTAS pour un Camerounais)', () => {
    const g = group({ citizenship: 'CM' }, { noc: '85101', province: 'ON' });
    expect(g.routes.map((r) => r.voie)).not.toContain('ptas');
  });
  it('un projet de règlement suivi cite une source connue et des voies existantes', () => {
    for (const p of rules.proposals) {
      expect(rules.sources[p.source]).toBeDefined();
      for (const a of p.affects) expect(rules.languageTest.byPathway[a]).toBeDefined();
    }
  });
});
