/**
 * Contrôles d'intégrité des fichiers de données versionnés.
 * Une règle sans source officielle datée ne doit jamais passer.
 */
import { describe, expect, it } from 'vitest';
import { staleSources, teerOf } from '../src';
import { nocData, rules, TODAY } from './helpers';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Parcourt rules.json et renvoie toutes les valeurs des champs « source » / « registerSource ». */
function referencedSources(node: unknown, out: string[] = []): string[] {
  if (Array.isArray(node)) node.forEach((n) => referencedSources(n, out));
  else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      if ((k === 'source' || k === 'registerSource') && typeof v === 'string') out.push(v);
      else if (k !== 'sources') referencedSources(v, out);
    }
  }
  return out;
}

describe('data/rules.json', () => {
  it('chaque section pointe vers une source existante', () => {
    const refs = referencedSources(rules);
    expect(refs.length).toBeGreaterThan(10);
    for (const id of refs) expect(rules.sources[id], `source « ${id} »`).toBeDefined();
  });

  it('chaque source a une URL officielle https, une date de vérification et de révision', () => {
    for (const [id, s] of Object.entries(rules.sources)) {
      // Gouvernements du Canada et du Québec, registre du CICC, Centre antifraude, et organismes partenaires
      // financés par IRCC (FCFA, CDEM) pour les salons et réseaux francophones.
      expect(s.urlEn, id).toMatch(/^https:\/\/(www\.canada\.ca|register\.college-ic\.ca|www\.jobbank\.gc\.ca|antifraudcentre-centreantifraude\.ca|www\.quebec\.ca|immigrationfrancophone\.ca|www\.cdem\.com|open\.canada\.ca|www\.who\.int)\//);
      if (s.urlFr) expect(s.urlFr, id).toMatch(/^https:\/\//);
      expect(s.verifiedAt, id).toMatch(DATE);
      expect(s.nextReview, id).toMatch(DATE);
      expect(s.nextReview > s.verifiedAt, id).toBe(true);
    }
  });

  it('aucune source n’est périmée à la date de vérification', () => {
    expect(staleSources(rules, TODAY)).toEqual([]);
  });

  it('liste RMR : 30 gelées, 11 non gelées, période cohérente', () => {
    const lw = rules.lmiaLowWage;
    expect(lw.cmas.filter((c) => c.frozen)).toHaveLength(30);
    expect(lw.cmas.filter((c) => !c.frozen)).toHaveLength(11);
    expect(lw.validFrom <= lw.validTo).toBe(true);
    expect(lw.nextUpdate > lw.validTo).toBe(true);
  });

  it('PTAS : Mexique + 11 pays des Caraïbes, aucun pays africain', () => {
    expect(rules.sawp.countries).toHaveLength(12);
    expect(rules.sawp.countries).toContain('MX');
    for (const c of ['CM', 'NG', 'SN', 'CI', 'GH']) expect(rules.sawp.countries).not.toContain(c);
  });

  it('seuils salariaux pour les 13 provinces et territoires', () => {
    expect(Object.keys(rules.wageThresholds.hourlyCad)).toHaveLength(13);
  });

  it('18 communautés FCIP/RCIP', () => {
    expect(rules.communityPilots.communities).toHaveLength(18);
  });
});

describe('data/noc.json', () => {
  it('codes CNP 2021 valides et uniques', () => {
    const codes = nocData.nocs.map((n) => n.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const c of codes) expect(() => teerOf(c)).not.toThrow();
  });

  it('TEER conformes à la table officielle (2e chiffre)', () => {
    expect(teerOf('94142')).toBe(4);
    expect(teerOf('95106')).toBe(5);
    expect(teerOf('44101')).toBe(4);
    expect(teerOf('33102')).toBe(3);
  });

  it('les métiers d’agriculture primaire de rules.json sont tous des codes valides', () => {
    for (const c of rules.agricultural.primaryAgricultureNocs) expect(c).toMatch(/^\d{5}$/);
    expect(rules.agricultural.primaryAgricultureNocs).not.toContain('85102');
  });
});
