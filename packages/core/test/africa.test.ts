import { describe, expect, it } from 'vitest';
import { AFRICAN_COUNTRIES, isOldEvidence, permitSummary, recruiterEvidence, sortRecruiters, type AfricanRecruiter, type PermitsData } from '../src';
import { TODAY } from './helpers';
import csv from '../../../data/manual/recrutement-afrique.csv?raw';

const rec = (over: Partial<AfricanRecruiter>): AfricanRecruiter => ({
  employer: 'Ferme Test Inc.', k: 'ferme test', province: 'QC', city: '', sector: '', countries: ['TN'], type: 'presse',
  evidence: { fr: 'x', en: 'x' }, eventDate: '2025-01-01', sourceTitle: 't', sourceUrl: 'https://exemple.test', recordedAt: '2026-10-14', ...over,
});

describe('Recruteurs en Afrique — preuves', () => {
  it('preuve de plus de 3 ans signalée (date de l’événement, sinon date de lecture)', () => {
    expect(isOldEvidence(rec({ eventDate: '2019-11-08' }), TODAY)).toBe(true);
    expect(isOldEvidence(rec({ eventDate: '2024-09-19' }), TODAY)).toBe(false);
    expect(isOldEvidence(rec({ eventDate: '' }), TODAY)).toBe(false);
  });
  it('tri : pays de l’utilisateur, puis provinces visées, puis récence', () => {
    const list = [
      rec({ k: 'a', countries: ['TN'], province: 'QC', eventDate: '2025-01-01' }),
      rec({ k: 'b', countries: ['CM'], province: 'ON', eventDate: '2019-01-01' }),
      rec({ k: 'c', countries: ['TN'], province: 'NB', eventDate: '2024-01-01' }),
    ];
    expect(sortRecruiters(list, { citizenship: 'cm', provinces: ['NB'], today: TODAY }).map((r) => r.k)).toEqual(['b', 'c', 'a']);
  });
  it('rapprochement tolérant du nom d’employeur', () => {
    const list = [rec({ employer: 'Plastik MP', k: 'plastik mp' })];
    expect(recruiterEvidence(list, 'PLASTIK MP INC.')).toHaveLength(1);
    expect(recruiterEvidence(list, 'Autre entreprise')).toHaveLength(0);
  });
});

describe('Relevé manuel data/manual/recrutement-afrique.csv', () => {
  const lines = csv.trim().split(/\r?\n/).slice(1);
  it('chaque ligne cite une source https et des pays d’Afrique valides', () => {
    expect(lines.length).toBeGreaterThanOrEqual(5);
    for (const l of lines) {
      expect(l).toMatch(/,https:\/\/[^,]+,\d{4}-\d{2}-\d{2}$/);
      const countries = /,([A-Z]{2}(?:\|[A-Z]{2})*),(page-employeur|presse|mission|gouvernement),/.exec(l)?.[1];
      expect(countries, l.slice(0, 40)).toBeDefined();
      for (const c of countries!.split('|')) expect(AFRICAN_COUNTRIES.has(c)).toBe(true);
    }
  });
  it('aucun nom de travailleur dans les preuves (vie privée)', () => {
    expect(csv.replace(/https:\/\/\S+/g, '')).not.toMatch(/Abdelmoula|Saadi|Konate/);
  });
});

describe('Permis de travail par pays (IRCC)', () => {
  const data: PermitsData = {
    lastMonth: '2026-07',
    tfwp: { TN: { '2024': 4050, '2025': 1935, '2026': 1400 }, CM: { '2024': 2175, '2025': 1395, '2026': 770 }, MA: { '2025': 1685 } },
    imp: { CM: { '2025': 3575, '2026': 4145 } },
  };
  it('dernière année complète, année en cours partielle, rang africain', () => {
    const s = permitSummary(data, 'cm');
    expect(s.last).toEqual({ country: 'CM', year: '2025', partial: false, tfwp: 1395, imp: 3575, tfwpPrev: 2175, africanRank: 3 });
    expect(s.current).toMatchObject({ year: '2026', partial: true, tfwp: 770, imp: 4145 });
  });
  it('pays absent : rien', () => {
    expect(permitSummary(data, 'GA')).toEqual({ last: undefined, current: undefined });
  });
  it('décembre : l’année du dernier mois est complète', () => {
    expect(permitSummary({ ...data, lastMonth: '2025-12' }, 'TN').last?.year).toBe('2025');
  });
});
