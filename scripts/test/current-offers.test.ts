import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { NocData, Rules } from '../../packages/core/src';
import { queryKeys, toCurrentOffer } from '../fetch-current-offers';
import { ROOT } from '../lib/paths';

const rules = JSON.parse(readFileSync(join(ROOT, 'data', 'rules.json'), 'utf8')) as Rules;
const nocData = JSON.parse(readFileSync(join(ROOT, 'data', 'noc.json'), 'utf8')) as NocData;
const ctx = { rules, nocData, intlIds: new Set(['42']) };
const job = (o: Record<string, unknown>) => ({
  id: '1', redirect_url: 'https://www.adzuna.ca/land/ad/1', created: '2026-10-14T10:00:00Z',
  company: { display_name: 'Acme Security' }, location: { display_name: 'Moncton, New Brunswick', area: ['Canada', 'New Brunswick', 'Moncton'] },
  ...o,
});

describe('offres actuelles (Adzuna) : annonce → offre publiée', () => {
  it('garde une annonce dont le TITRE correspond au métier, avec lien direct, province et date', () => {
    const o = toCurrentOffer(job({ title: 'Night <strong>Security Guard</strong>', description: 'Patrol the site.' }), '64410', ctx)!;
    expect(o).toMatchObject({ id: '1', title: 'Night Security Guard', url: 'https://www.adzuna.ca/land/ad/1', province: 'NB', date: '2026-10-14', noc: '64410', scam: [] });
    expect(o.intl).toBeUndefined();
  });
  it('écarte une annonce dont le titre est un autre métier (le mot n’était que dans le texte)', () => {
    expect(toCurrentOffer(job({ title: 'Store Manager', description: 'Work with our security guard team.' }), '64410', ctx)).toBeNull();
  });
  it('écarte un poste d’un autre niveau qui contient le mot-clé du métier', () => {
    expect(toCurrentOffer(job({ title: 'Architecte paysagiste', description: 'Classe 7' }), '85121', ctx)).toBeNull();
    expect(toCurrentOffer(job({ title: 'Security Manager', description: 'Lead the team.' }), '64410', ctx)).toBeNull();
  });
  it('garde la phrase qui déclenche une alerte d’arnaque', () => {
    const o = toCurrentOffer(job({ id: '7', title: 'Security Guard', description: 'Pay a $300 processing fee by Western Union to get the job.' }), '64410', ctx)!;
    expect(o.scamWhy?.length).toBe(o.scam.length);
    expect(o.scamWhy?.join(' ')).toMatch(/processing fee/i);
  });
  it('écarte une annonce sans lien', () => {
    expect(toCurrentOffer(job({ title: 'Security Guard', redirect_url: undefined }), '64410', ctx)).toBeNull();
  });
  it('marque une annonce déjà reconnue « ouverte à l’étranger » et repère une arnaque', () => {
    const o = toCurrentOffer(job({ id: '42', title: 'Security Guard', description: 'Pay a $300 processing fee by Western Union to get the job.' }), '64410', ctx)!;
    expect(o.intl).toBe(true);
    expect(o.scam.length).toBeGreaterThan(0);
  });
  it('coupe l’extrait sur une limite de mot', () => {
    const o = toCurrentOffer(job({ title: 'Security Guard', description: 'mot '.repeat(100) }), '64410', ctx)!;
    expect(o.snippet.length).toBeLessThanOrEqual(220);
    expect(o.snippet.endsWith('mot…')).toBe(true);
  });
});

describe('requêtes des offres actuelles', () => {
  it('un terme anglais par métier, plus un terme français quand il existe', () => {
    const keys = queryKeys(nocData);
    expect(keys).toContain('64200');
    expect(keys).toContain('64200:fr');
    expect(keys.filter((k) => !k.includes(':')).length).toBe(nocData.nocs.length);
  });
  it('une annonce québécoise en français est gardée sous le bon métier', () => {
    const o = toCurrentOffer(job({ title: 'Couturière', description: 'Retouches de vêtements.', location: { display_name: 'Québec, Québec', area: ['Canada', 'Québec'] } }), '64200', ctx)!;
    expect(o.noc).toBe('64200');
    expect(o.province).toBe('QC');
  });
});
