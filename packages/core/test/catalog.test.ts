import { describe, expect, it } from 'vitest';
import index from '../../../data/noc-search.json';
import { makeCatalogDetector } from '../src';

const detect = makeCatalogDetector(index as Record<string, string>);

describe('métier d’une annonce parmi les 516 métiers du catalogue', () => {
  it('reconnaît l’exemple officiel le plus long, en français ou en anglais', () => {
    expect(detect('Line Cook - Night shift')).toBe('63200');
    expect(detect('Aide-cuisinier')).toBe('65201');
    expect(detect('Butcher')).toBe('63201');
    expect(detect('Housekeeping Room Attendant')).toBe('65310');
    expect(detect('Préposé aux bénéficiaires')).toBe('33102');
    expect(detect('Long haul truck driver AZ')).toBe('73300');
  });
  it('sinon, l’exemple qui contient tous les mots du titre', () => {
    expect(detect('Heavy Duty Mechanic')).toBe('72401');
    expect(detect('Farm worker')).toBe('85100');
  });
  it('ne devine pas sur un titre sans métier', () => {
    expect(detect('Night shift - urgent hiring')).toBeUndefined();
  });
});

describe('pas de métier inventé', () => {
  it('« Branch Manager » seul ne devient pas directeur de banque', () => {
    expect(detect('Branch Manager')).toBeUndefined();
  });
});
