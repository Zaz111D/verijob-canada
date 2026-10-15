/**
 * Test de langue obligatoire ou non, par voie d'immigration (rules.languageTest, sources officielles).
 * Sert à diviser les offres et les employeurs en deux groupes : « sans test obligatoire » / « test obligatoire ».
 * « Sans test obligatoire » ne veut pas dire « sans preuve de langue » : chaque voie a sa note.
 */
import type { PathwayResult } from './feasibility/evaluate';
import type { Rules } from './types';

export type TestGroup = 'sans-test' | 'test' | 'aucune';

export function testRequired(rules: Rules, voie: string): boolean | undefined {
  return rules.languageTest.byPathway[voie]?.required;
}

/**
 * Groupe d'une offre ou d'un employeur selon les voies NON bloquées pour ce profil :
 * au moins une voie sans test obligatoire → « sans-test » ; sinon au moins une voie avec test → « test » ; sinon « aucune ».
 */
export function testGroup(rules: Rules, results: PathwayResult[]): { group: TestGroup; routes: PathwayResult[] } {
  const open = results.filter((r) => r.statut !== 'bloquee');
  const free = open.filter((r) => testRequired(rules, r.voie) === false);
  if (free.length) return { group: 'sans-test', routes: free };
  const withTest = open.filter((r) => testRequired(rules, r.voie) === true);
  if (withTest.length) return { group: 'test', routes: withTest };
  return { group: 'aucune', routes: [] };
}
