import { describe, expect, it } from 'vitest';
import { evaluatePathways, isOwnJob, lowWageStatus, placeOf, type Profile } from '../src';
import { nocData, rules } from './helpers';

const TODAY = '2026-11-02';
const redi = (profile: Profile, noc: string, city?: string) =>
  evaluatePathways(profile, { noc, province: 'ON', city }, { rules, nocData, today: TODAY }).find((r) => r.voie === 'ontario-redi');
const ALL4 = (n: number) => ({ speaking: n, listening: n, reading: n, writing: n });

describe('régions : lieu des annonces', () => {
  it('reconnaît une ville ou le nom de la région chez Adzuna', () => {
    expect(placeOf(rules, 'Dryden, Kenora region', 'ON')?.id).toBe('kenora');
    expect(placeOf(rules, 'Val Caron, Greater Sudbury', 'ON')?.id).toBe('sudbury');
    expect(placeOf(rules, "Val-d'Or, Vallée-de-l'Or", 'QC')?.id).toBe('abitibi');
    expect(placeOf(rules, 'Sept-Îles, Sept-Rivières - Caniapiscau', 'QC')?.id).toBe('cote-nord');
    expect(placeOf(rules, 'Sault Ste. Marie, Algoma', 'ON')?.id).toBe('sault-ste-marie');
  });
  it('mots entiers, bonne province, et le nom le plus précis l’emporte', () => {
    expect(placeOf(rules, 'Toronto, Ontario', 'ON')).toBeUndefined();
    expect(placeOf(rules, 'Trenton, Quinte West', 'ON')).toBeUndefined(); // Trenton (N.-É.) seulement en Nouvelle-Écosse
    expect(placeOf(rules, 'Trenton, Pictou region', 'NS')?.id).toBe('pictou');
    expect(placeOf(rules, 'Fort Nelson, Northern Rockies', 'BC')?.id).toBe('peace-liard');
    expect(placeOf(rules, 'Nelson, Central Kootenay', 'BC')?.id).toBe('west-kootenay');
    expect(placeOf(rules, 'Trailside, Calgary', 'AB')).toBeUndefined();
  });
  it('EIMT bas salaire : hors RMR possible, RMR gelée bloquée', () => {
    const p = (id: string) => rules.regions.places.find((x) => x.id === id)!;
    expect(lowWageStatus(rules, p('kenora'))).toBe('possible');
    expect(lowWageStatus(rules, p('thunder-bay'))).toBe('possible');
    expect(lowWageStatus(rules, p('sudbury'))).toBe('gel');
    expect(lowWageStatus(rules, p('kelowna'))).toBe('gel');
  });
  it('chaque région : programme connu, page https, communauté existante', () => {
    const names = new Set(rules.communityPilots.communities.map((c) => c.name));
    for (const p of rules.regions.places) {
      expect(p.towns.length).toBeGreaterThan(0);
      expect(p.url).toMatch(/^https:\/\//);
      if (p.community) expect(names.has(p.community)).toBe(true);
      if (p.programs.some((x) => x === 'RCIP' || x === 'FCIP')) expect(p.community).toBeDefined();
      if (p.cma) expect(rules.lmiaLowWage.cmas.some((c) => c.name === p.cma)).toBe(true);
    }
    expect(rules.regions.places.filter((p) => p.programs.includes('REDI'))).toHaveLength(6);
  });
  it('mes métiers : code reconnu ou nom du métier dans le titre', () => {
    expect(isOwnJob({ noc: '64410', title: 'Security guard' }, ['64410'], nocData)).toBe(true);
    expect(isOwnJob({ title: 'Warehouse worker - nights' }, ['75101'], nocData)).toBe(false); // nom officiel absent du titre
    expect(isOwnJob({ title: 'Cook' }, ['64410'], nocData)).toBe(false);
    expect(isOwnJob({ title: 'Agent de sécurité – Rouyn-Noranda' }, ['64410'], nocData)).toBe(true);
  });
});

describe('Ontario – REDI', () => {
  it('pas proposé hors Ontario', () => {
    const r = evaluatePathways({}, { noc: '64410', province: 'QC' }, { rules, nocData, today: TODAY });
    expect(r.some((x) => x.voie === 'ontario-redi')).toBe(false);
  });
  it('TEER 4-5 : possible avec CLB 4, mais il faut d’abord 9 mois chez l’employeur', () => {
    const r = redi({ english: ALL4(4) }, '64410', 'Kenora')!;
    expect(r.statut).toBe('possible');
    expect(r.raisons.some((x) => x.fr.includes('9 mois'))).toBe(true);
    expect(redi({ english: ALL4(3) }, '64410')!.statut).toBe('bloquee');
  });
  it('TEER 0-3 : CLB 6 (5 pour certains métiers), langue inconnue → inconnue', () => {
    expect(redi({ french: ALL4(6), experienceMonths: 36 }, '72106')!.statut).toBe('possible');
    expect(redi({ french: ALL4(4) }, '72106')!.statut).toBe('bloquee');
    expect(redi({}, '72106')!.statut).toBe('inconnue');
  });
  it('ville hors des 6 territoires : à vérifier ; ronde terminée : bloquée', () => {
    expect(redi({ english: ALL4(6) }, '64410', 'Toronto')!.statut).toBe('inconnue');
    const after = evaluatePathways({}, { noc: '64410', province: 'ON' }, { rules, nocData, today: '2028-01-01' }).find((x) => x.voie === 'ontario-redi')!;
    expect(after.statut).toBe('bloquee');
  });
});
