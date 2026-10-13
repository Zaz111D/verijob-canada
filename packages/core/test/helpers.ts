import rulesJson from '../../../data/rules.json';
import nocJson from '../../../data/noc.json';
import type { NocData, Rules } from '../src';

export const rules = rulesJson as unknown as Rules;
export const nocData = nocJson as unknown as NocData;

/** Date fixe pour des tests reproductibles (jour de la vérification Phase 0). */
export const TODAY = '2026-10-13';
