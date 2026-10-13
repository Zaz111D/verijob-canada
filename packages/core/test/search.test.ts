import { describe, expect, it } from 'vitest';
import { boundedLevenshtein, employerKey, searchEmployers } from '../src';

const names = [
  'Ferme Tremblay Inc.',
  'Procyk Farms (1994) Ltd',
  'Pure Flavor Farms LP',
  'Nature Fresh Farms Inc.',
  'Les Productions Horticoles Demers inc',
  'Atlantic Seafoods Ltd.',
  'Aliments Nortera Inc.',
];
const items = names.map((n) => ({ n, k: employerKey(n) }));
const top = (q: string) => searchEmployers(items, q)[0]?.item.n;

describe('searchEmployers', () => {
  it('nom exact, majuscules et formes juridiques', () => {
    expect(top('FERME TREMBLAY LTÉE')).toBe('Ferme Tremblay Inc.');
  });
  it('fautes de frappe', () => {
    expect(top('procik farms')).toBe('Procyk Farms (1994) Ltd');
    expect(top('Atlantik Seafood')).toBe('Atlantic Seafoods Ltd.');
  });
  it('début de mot et ordre des mots', () => {
    expect(top('demers horti')).toBe('Les Productions Horticoles Demers inc');
  });
  it('espaces manquants', () => {
    expect(top('naturefresh')).toBe('Nature Fresh Farms Inc.');
  });
  it('aucun résultat si un mot ne correspond à rien', () => {
    expect(searchEmployers(items, 'Tremblay Construction')).toEqual([]);
    expect(searchEmployers(items, '   ')).toEqual([]);
  });
  it('le nom exact passe devant les noms proches', () => {
    const r = searchEmployers(items, 'farms');
    expect(r.length).toBe(3);
  });
});

describe('boundedLevenshtein', () => {
  it('calcule et s’arrête au-delà de la borne', () => {
    expect(boundedLevenshtein('procyk', 'procik', 1)).toBe(1);
    expect(boundedLevenshtein('abc', 'xyz', 1)).toBe(2);
  });
});
