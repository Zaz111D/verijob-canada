import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { NocData, RegionOffer, Rules } from '../../packages/core/src';
import { capPerPlace, regionQueryKeys, toRegionOffer } from '../fetch-region-offers';
import { htmlListFound, ontarioUpdated, pdfListCheck } from '../check-region-lists';
import { ROOT } from '../lib/paths';

const rules = JSON.parse(readFileSync(join(ROOT, 'data', 'rules.json'), 'utf8')) as Rules;
const nocData = JSON.parse(readFileSync(join(ROOT, 'data', 'noc.json'), 'utf8')) as NocData;
const ctx = { rules, nocData, intlIds: new Set(['42']) };
const job = (o: Record<string, unknown>) => ({
  id: '1', title: 'Cook', description: 'Busy kitchen.', redirect_url: 'https://www.adzuna.ca/land/ad/1', created: '2026-10-30T10:00:00Z',
  company: { display_name: 'Lakeside Inn' }, location: { display_name: 'Dryden, Kenora region', area: ['Canada', 'Ontario', 'Kenora region', 'Dryden'] },
  ...o,
});

describe('offres des régions (Adzuna) : annonce → offre publiée', () => {
  it('une requête par ville, préfixée par la région', () => {
    const keys = regionQueryKeys(rules);
    expect(keys).toContain('kenora:Dryden');
    expect(keys).toContain("abitibi:Val-d'Or");
    // Quota Adzuna : ≈ 120 requêtes déjà chaque lundi, 250 par jour au plus.
    expect(keys.length).toBeLessThanOrEqual(100);
    expect(keys).toContain('ab-fort-mcmurray:Fort McMurray');
  });
  it('garde tous les métiers, rattache la région et reconnaît un métier suivi', () => {
    const o = toRegionOffer(job({}), ctx)!;
    expect(o).toMatchObject({ place: 'kenora', province: 'ON', company: 'Lakeside Inn', date: '2026-10-30' });
    expect(toRegionOffer(job({ title: 'Security Guard' }), ctx)!.noc).toBe('64410');
  });
  it('écarte une annonce hors des régions (ville inconnue d’Adzuna → résultats d’ailleurs)', () => {
    expect(toRegionOffer(job({ location: { display_name: 'Toronto, Ontario', area: ['Canada', 'Ontario', 'Toronto'] } }), ctx)).toBeNull();
    expect(toRegionOffer(job({ location: { display_name: 'Trenton, Quinte West', area: ['Canada', 'Ontario', 'Quinte West', 'Trenton'] } }), ctx)).toBeNull();
  });
  it('contrôle anti-arnaque et marque « ouverte à l’étranger »', () => {
    const o = toRegionOffer(job({ id: '42', description: 'Pay a $300 processing fee by Western Union to get the job.' }), ctx)!;
    expect(o.scam.length).toBeGreaterThan(0);
    expect(o.intl).toBe(true);
  });
  it('garde les plus récentes de chaque région', () => {
    const offers = ['2026-10-01', '2026-10-20', '2026-10-10'].map((date, i) => ({ id: String(i), place: 'kenora', date }) as RegionOffer);
    expect(capPerPlace([...offers, { id: 'x', place: 'brandon', date: '2026-09-01' } as RegionOffer], 2).map((o) => o.id)).toEqual(['1', '2', 'x']);
  });
});

describe('contrôle des listes d’employeurs désignés', () => {
  const page = (links: string) => [{ html: `<p>Designated employers</p>${links}`, url: 'https://example-community.ca/rcip/' }];
  it('PDF : même fichier, nouvelle liste ou rien de trouvé', () => {
    const rec = 'https://example-community.ca/wp-content/uploads/2026/09/As-of-September-25-2026.pdf';
    expect(pdfListCheck(rec, page('<a href="/wp-content/uploads/2026/09/As-of-September-25-2026.pdf">List of Designated Employers</a>')).result).toBe('meme');
    expect(pdfListCheck(rec, page('<a href="/wp-content/uploads/2026/11/As-of-November-1-2026.pdf">List of Designated Employers</a>'))).toEqual({
      result: 'changee', newUrl: 'https://example-community.ca/wp-content/uploads/2026/11/As-of-November-1-2026.pdf',
    });
    // Un guide pour les employeurs n'est pas une liste.
    expect(pdfListCheck(rec, page('<a href="/uploads/Employer-Designation-Guidelines.pdf">RCIP Employer Designation Guidelines</a>')).result).toBe('inconnu');
  });
  it('page web : part des employeurs relevés encore présents ; page vide → inconnu', () => {
    const html = `<ul>${['Acme Foods', 'Boreal Tree Service', 'Lakeside Inn'].map((n) => `<li>${n}</li>`).join('')}</ul>${'<p>texte</p>'.repeat(80)}`;
    expect(htmlListFound(html, ['Acme Foods', 'Boreal Tree Service', 'Lakeside Inn', 'Gone Ltd'])).toBe(0.75);
    expect(htmlListFound('<div id="app"></div>', ['Acme Foods'])).toBeUndefined();
  });
  it('date « Updated » des pages ontario.ca', () => {
    expect(ontarioUpdated('<p> Updated: October 13, 2026 </p>')).toBe('2026-10-13');
    expect(ontarioUpdated('<p>Published</p>')).toBeUndefined();
  });
});
