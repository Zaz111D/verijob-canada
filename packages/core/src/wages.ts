/**
 * Salaires de référence (wages.json produit par le pipeline) → fonction utilisée par la règle
 * anti-arnaque « salaire irréaliste ».
 */
import type { ProvinceCode } from './types';
import type { WageLookup } from './scam/types';

/** Salaires horaires par métier puis par province (« NAT » = Canada). */
export type WagesData = Record<string, Record<string, { low: number | null; median: number; high: number | null }>>;

/** Salaire médian de la province si connu, sinon médian national. */
export function makeWageLookup(wages: WagesData): WageLookup {
  return (noc: string, province?: ProvinceCode) => {
    const byArea = wages[noc];
    const w = (province && byArea?.[province]) || byArea?.['NAT'];
    return w ? { medianHourly: w.median } : undefined;
  };
}
