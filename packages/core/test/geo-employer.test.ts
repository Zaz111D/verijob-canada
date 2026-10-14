import { describe, expect, it } from 'vitest';
import { cityKey, employerKey, employerSearchName, evaluatePathways, locateWorkplace, makeWageLookup, type CmaLookup } from '../src';
import { nocData, rules, TODAY } from './helpers';

describe('employerKey — tolérance aux variantes de nom', () => {
  it.each([
    ['Ferme Tremblay Inc.', 'ferme tremblay'],
    ['FERME TREMBLAY INC', 'ferme tremblay'],
    ['Ferme Tremblay Ltée', 'ferme tremblay'],
    ['La Ferme Tremblay', 'ferme tremblay'],
    ['Smith & Sons Farms Ltd.', 'smith and sons farms'],
    ['Bergeron et Fils inc.', 'bergeron and fils'],
    ["St. John\ufffds Seafood", 'st john s seafood'],
    ['15243921 CANADA INC.', '15243921 canada'],
  ])('%s → %s', (name, key) => expect(employerKey(name)).toBe(key));

  it('garde le nom entier s’il ne contient que des formes juridiques', () => {
    expect(employerKey('The Company')).toBe('the company');
  });
});

describe('cityKey', () => {
  it('unifie St./Saint, Ste/Sainte, accents et parenthèses', () => {
    expect(cityKey('St. Catharines')).toBe(cityKey('Saint Catharines'));
    expect(cityKey('Ste-Anne-des-Plaines')).toBe('sainte anne des plaines');
    expect(cityKey('Lévis')).toBe('levis');
    expect(cityKey('Greater Sudbury (Ontario part)')).toBe('greater sudbury');
  });
});

describe('locateWorkplace — RMR via la correspondance officielle', () => {
  const lookup: CmaLookup = {
    ON: { [cityKey('Mississauga')]: 'Toronto', [cityKey('Leamington')]: '-', [cityKey('Springfield')]: '?' },
    MB: { [cityKey('Steinbach')]: '-' },
  };

  it('ville dans une RMR gelée', () => {
    const w = locateWorkplace(rules, 'Mississauga', 'ON', lookup);
    expect(w.kind === 'cma' && w.cma.name).toBe('Toronto');
  });
  it('municipalité hors RMR → outside', () => {
    expect(locateWorkplace(rules, 'Leamington', 'ON', lookup).kind).toBe('outside');
    expect(locateWorkplace(rules, 'Steinbach', 'MB', lookup).kind).toBe('outside');
  });
  it('nom ambigu ou inconnu → unknown', () => {
    expect(locateWorkplace(rules, 'Springfield', 'ON', lookup).kind).toBe('unknown');
    expect(locateWorkplace(rules, 'Nulle-Part', 'ON', lookup).kind).toBe('unknown');
  });
  it('les alias saisis à la main (quartiers) restent prioritaires', () => {
    const w = locateWorkplace(rules, 'Scarborough', 'ON', lookup);
    expect(w.kind === 'cma' && w.cma.name).toBe('Toronto');
  });
  it('le moteur de faisabilité utilise la correspondance : Steinbach hors RMR → possible', () => {
    const res = evaluatePathways({}, { noc: '75101', city: 'Steinbach', province: 'MB' }, { rules, nocData, cmaLookup: lookup, today: TODAY });
    expect(res.find((r) => r.voie === 'eimt-bas-salaire')?.statut).toBe('possible');
  });
});

describe('makeWageLookup', () => {
  const lookup = makeWageLookup({ '85101': { NAT: { low: 15, median: 17, high: 22 }, ON: { low: 16, median: 17.6, high: 21 } } });
  it('province, sinon national, sinon rien', () => {
    expect(lookup('85101', 'ON')?.medianHourly).toBe(17.6);
    expect(lookup('85101', 'BC')?.medianHourly).toBe(17);
    expect(lookup('99999', 'ON')).toBeUndefined();
  });
});

describe('employerSearchName — nom pour une recherche', () => {
  it.each([
    ['Pointcare Health Services Inc.', 'Pointcare Health Services'],
    ['Aliments Breton Ltée', 'Aliments Breton'],
    ['1059066 Ontario Inc.', '1059066 Ontario'],
    ['Ferme Tremblay S.E.N.C.', 'Ferme Tremblay'],
    ['Inc.', 'Inc.'],
  ])('%s → %s', (name, out) => expect(employerSearchName(name)).toBe(out));
});
