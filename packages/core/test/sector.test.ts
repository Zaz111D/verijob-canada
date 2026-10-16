import { describe, expect, it } from 'vitest';
import { nocCategory, sectorCategory } from '../src';

describe('secteur des employeurs désignés → grande catégorie CNP', () => {
  it('reconnaît chaque libellé présent dans les relevés des communautés', () => {
    const cases: Array<[string, number | undefined]> = [
      ['Business, Finance, and Administration', 1], ['Business, Administration & Finance', 1], ['Business, Finance and Administration', 1],
      ['Natural and Applied Sciences', 2],
      ['Health', 3], ['Health Care', 3], ['Health Sector', 3],
      ['Education, Social, Community, and Government Services', 4], ['Education & Law', 4],
      ['Education, Law, Social, Community & Government Services', 4], ['Education and Social, Community and Government Services', 4],
      ['Arts, Culture, Recreation and Sport', 5],
      ['Sales & Services', 6], ['Sales & Service', 6],
      ['Trades and Transport', 7], ['Trades, Transport, & Equipment Operators', 7],
      ['Natural Resources and Agriculture', 8], ['Agriculture', 8],
      ['Manufacturing and Utilities', 9], ['Manufacturing & Utilities', 9],
      ['', undefined],
    ];
    for (const [label, cat] of cases) expect(sectorCategory(label), label).toBe(cat);
  });
  it('catégorie d’un métier = 1er chiffre du code', () => {
    expect(nocCategory('64410')).toBe(6);
    expect(nocCategory('94132')).toBe(9);
    expect(nocCategory('33102')).toBe(3);
  });
});
