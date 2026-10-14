import { describe, expect, it } from 'vitest';
import { changeLog, evaluatePathways, jobBankLink, programStatuses, upcomingDates, type Rules } from '../src';
import { nocData, rules, TODAY } from './helpers';

describe('veille réglementaire', () => {
  it('statut des programmes au 13 oct. 2026', () => {
    const s = Object.fromEntries(programStatuses(rules, TODAY).map((p) => [p.id, p.state]));
    expect(s['pilotes-aides-familiaux']).toBe('ferme');
    expect(s['ptas']).toBe('restreint');
    expect(s['eimt-agricole']).toBe('ouvert');
    expect(s['mesures-rurales']).toBe('ouvert');
    expect(s['entree-express']).toBe('ouvert');
  });
  it('mesures rurales expirées après le 31 mars 2027', () => {
    const s = programStatuses(rules, '2027-04-02').find((p) => p.id === 'mesures-rurales');
    expect(s?.state).toBe('expire');
  });
  it('échéances futures triées, avec jours restants', () => {
    const u = upcomingDates(rules, TODAY);
    // La plus proche : revérification des salons de recrutement (14 déc. 2026), puis la liste RMR (8 janv. 2027).
    expect(u[0]?.date).toBe('2026-12-14');
    expect(u[0]?.daysLeft).toBe(62);
    expect(u.some((x) => x.date === '2027-01-08' && x.daysLeft === 87)).toBe(true);
    expect(u.map((x) => x.date)).toEqual([...u.map((x) => x.date)].sort());
  });
  it('historique trié du plus récent au plus ancien, chaque entrée sourcée', () => {
    const c = changeLog(rules, TODAY);
    expect(c[0]?.date).toBe('2026-10-09');
    expect(c.every((x) => x.source.url.fr.startsWith('https://'))).toBe(true);
    expect(c.some((x) => x.approximate)).toBe(true);
  });
});

describe('liens Job Bank (mode liens)', () => {
  it('sans modèle vérifié : lien confirmé « candidats étrangers », non filtré', () => {
    expect(jobBankLink(rules, { keyword: 'farm worker', province: 'ON' })).toEqual({
      url: 'https://www.jobbank.gc.ca/jobsearch/jobsearch?fglo=1&sort=D', filtered: false,
    });
  });
  it('avec un modèle relevé à la main : mots-clés encodés', () => {
    const r = { ...rules, jobBank: { ...rules.jobBank, searchTemplate: 'https://example.test/s?q={keyword}&p={province}&fglo=1' } } as Rules;
    expect(jobBankLink(r, { keyword: 'aide familial', province: 'NB' })).toEqual({ url: 'https://example.test/s?q=aide%20familial&p=NB&fglo=1', filtered: true });
  });
});

describe('mesures rurales dans le moteur de faisabilité', () => {
  it('hors RMR au Nouveau-Brunswick : mention du plafond de 15 %', () => {
    const res = evaluatePathways({}, { noc: '75101', province: 'NB', outsideCma: true }, { rules, nocData, today: TODAY });
    const r = res.find((x) => x.voie === 'eimt-bas-salaire');
    expect(r?.raisons.map((x) => x.fr).join(' ')).toContain('15 %');
  });
  it('hors RMR en Ontario (province non participante) : pas de mention', () => {
    const res = evaluatePathways({}, { noc: '75101', province: 'ON', outsideCma: true }, { rules, nocData, today: TODAY });
    expect(res.find((x) => x.voie === 'eimt-bas-salaire')?.raisons.map((x) => x.fr).join(' ')).not.toContain('rurale');
  });
});
