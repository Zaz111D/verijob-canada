import { describe, expect, it } from 'vitest';
import elementsJson from '../../../data/noc-elements.json';
import { buildSampleCv, normalize, sampleCvToText, type NocElementsData } from '../src';
import { nocData, rules } from './helpers';

const elements = elementsJson as unknown as NocElementsData;
const base = { rules, nocData, elements };
const officialFr = (code: string) => new Set(elements.nocs.find((n) => n.code === code)!.duties.flatMap((g) => g.items.map((i) => normalize(i.fr))));

describe('data/noc-elements.json', () => {
  it('couvre chaque métier suivi et chaque métier d’origine des passerelles, en FR et EN', () => {
    const codes = new Set(elements.nocs.map((n) => n.code));
    for (const n of nocData.nocs) expect(codes.has(n.code), n.code).toBe(true);
    for (const t of rules.occupationTransfers) expect(codes.has(t.from)).toBe(true);
    for (const n of elements.nocs) {
      expect(n.duties.flatMap((g) => g.items).length, n.code).toBeGreaterThanOrEqual(3);
      for (const i of n.duties.flatMap((g) => g.items)) { expect(i.fr).not.toBe(''); expect(i.en).not.toBe(''); }
    }
    expect(elements.source.id).toBe('statcan-noc-elements');
    expect(rules.sources[elements.source.id]).toBeDefined();
  });
});

describe('buildSampleCv', () => {
  it('chaque puce d’expérience est une fonction officielle du métier (aucune tâche inventée)', () => {
    for (const n of nocData.nocs) {
      const cv = buildSampleCv({ ...base, noc: n.code, lang: 'fr' });
      const official = officialFr(n.code);
      for (const b of cv.experience.flatMap((j) => j.bullets)) expect(official.has(normalize(b.text)), `${n.code} : ${b.text}`).toBe(true);
      expect(cv.experience[0]!.bullets.length).toBeLessThanOrEqual(7); // Guichet-Emplois : 5 à 7 puces au plus
    }
  });
  it('aucun chiffre ni nom inventé : identité, dates et résultats sont des repères entre crochets', () => {
    const cv = buildSampleCv({ ...base, noc: '85101', lang: 'fr' });
    expect(cv.header.name).toMatch(/^\[.*\]$/);
    expect(cv.experience[0]!.period).toContain('[');
    expect(cv.experience[0]!.bullets[0]!.result).toMatch(/^\[.*\]$/);
    expect(cv.summary).toContain('[X] ans');
    const text = sampleCvToText(cv);
    expect(text.replace(/\[[^\]]*\]/g, '')).not.toMatch(/\d/); // aucun chiffre hors repères
    expect(text).not.toMatch(/photo|âge|état civil/i);
  });
  it('gardien·ne de prison → agent·e de sécurité : part des fonctions officielles du métier d’origine', () => {
    const cv = buildSampleCv({ ...base, noc: '64410', lang: 'fr', profile: { currentNoc: '43201', experienceMonths: 50 } });
    expect(cv.transferFrom).toBe('43201');
    expect(cv.experience[0]!.title).toMatch(/correctionnels/);
    expect(cv.experience[0]!.employer).toBe('Établissement pénitentiaire public');
    const official = officialFr('43201');
    for (const b of cv.experience[0]!.bullets) expect(official.has(normalize(b.text))).toBe(true);
    // Les 4 tâches communes avec le métier visé (rules.occupationTransfers) passent en premier.
    const shared = rules.occupationTransfers[0]!.shared.map((x) => normalize(x.fromFr).slice(0, 40));
    for (const b of cv.experience[0]!.bullets.slice(0, 4)) expect(shared.some((x) => normalize(b.text).startsWith(x)), b.text).toBe(true);
    expect(cv.summary).toContain('4 ans');
    expect(cv.certifications.join(' ')).toMatch(/Permis provincial d’agent de sécurité/);
  });
  it('s’adapte à l’offre : intitulé repris, puces qui reprennent ses mots en premier, mots à prouver listés', () => {
    const offer = { title: 'Security Guard – Night Shift', text: 'Patrol the site and control access. Screen luggage and cargo at checkpoints. Write reports. Bilingual asset.' };
    const cv = buildSampleCv({ ...base, noc: '64410', lang: 'en', offer });
    expect(cv.title).toBe('Security Guard – Night Shift');
    expect(cv.experience[0]!.bullets[0]!.matched).toBe(true);
    expect(cv.offerMatched).toEqual(expect.arrayContaining(['patrol', 'access']));
    expect(cv.offerToProve).toContain('bilingual');
  });
  it('utilise les vrais niveaux de langue du profil, sinon un repère', () => {
    const lv = { speaking: 8, listening: 9, reading: 7, writing: 8 };
    const cv = buildSampleCv({ ...base, noc: '65310', lang: 'fr', profile: { french: lv } });
    expect(cv.languages[0]).toBe('Français — NCLC 7');
    expect(cv.languages[1]).toMatch(/Anglais — \[/);
  });
});
