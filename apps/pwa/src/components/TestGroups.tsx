/**
 * Division des offres et des employeurs selon le test de langue : « sans test obligatoire » / « test obligatoire ».
 * Le groupe dépend du profil (pays, niveaux, études en français) et des voies NON bloquées (rules.languageTest).
 */
import { evaluatePathways, sourceRef, testGroup, todayIso, type JobContext, type PathwayResult, type Profile, type TestGroup } from '@verijob/core';
import { nocData, rules } from '../data';
import { STRINGS as S, tr, type Lang } from '../i18n';
import { Sources } from './common';

/** Onglet choisi : un groupe, ou tout. « inconnu » = métier non reconnu (pas d'évaluation possible). */
export type TestTab = TestGroup | 'inconnu' | 'tout';

export interface Grouped { group: TestGroup | 'inconnu'; routes: PathwayResult[] }

/** Groupe d'un emploi pour ce profil (mis en cache par clé : beaucoup d'offres partagent métier et lieu). */
export function makeGrouper(profile: Profile) {
  const cache = new Map<string, Grouped>();
  return (job: Partial<JobContext> & { noc?: string }, results?: PathwayResult[]): Grouped => {
    if (results) return testGroup(rules, results);
    if (!job.noc) return { group: 'inconnu', routes: [] };
    const key = `${job.noc}|${job.province ?? ''}|${job.city ?? ''}|${job.outsideCma ?? ''}`;
    let g = cache.get(key);
    if (!g) {
      try { g = testGroup(rules, evaluatePathways(profile, job as JobContext, { rules, nocData })); } catch { g = { group: 'inconnu', routes: [] }; }
      cache.set(key, g);
    }
    return g;
  };
}

/** Onglets avec compteurs + explication et sources. */
export function TestTabs({ counts, value, onChange, lang }: { counts: Record<TestTab, number>; value: TestTab; onChange: (t: TestTab) => void; lang: Lang }) {
  const today = todayIso();
  const tabs: TestTab[] = ['sans-test', 'test', ...(counts.aucune ? ['aucune' as const] : []), ...(counts.inconnu ? ['inconnu' as const] : []), 'tout'];
  const proposal = rules.proposals.find((p) => p.status === 'propose' || p.status === 'publie');
  return (
    <div class="test-tabs">
      <div class="seg" role="radiogroup" aria-label={tr(S.testTabsLabel, lang)}>
        {tabs.map((t) => (
          <button type="button" role="radio" aria-checked={value === t} class={value === t ? 'on' : ''} onClick={() => onChange(t)}>
            {tr(S.testTab[t], lang)} ({counts[t]})
          </button>
        ))}
      </div>
      <p class="muted">{tr(value === 'test' ? S.testExplainTest : S.testExplainFree, lang)} {lang === 'fr' ? rules.languageTest.permanentResidenceNoteFr : rules.languageTest.permanentResidenceNoteEn}</p>
      {proposal && value !== 'test' && <p class="warn">⚠ {lang === 'fr' ? proposal.titleFr : proposal.titleEn} — {lang === 'fr' ? proposal.expectedFr : proposal.expectedEn}. <a href="#/veille">{tr(S.testProposalMore, lang)}</a></p>}
      <Sources sources={[...new Set(Object.values(rules.languageTest.byPathway).map((v) => v.source))].map((id) => sourceRef(rules, id, today))} />
    </div>
  );
}

/** Ligne sur une carte : groupe + voies concernées, détail dépliable. */
export function TestLine({ g, lang }: { g: Grouped; lang: Lang }) {
  if (g.group === 'inconnu') return <p class="muted">{tr(S.testUnknownJob, lang)}</p>;
  const kind = g.group === 'sans-test' ? 'ok' : g.group === 'test' ? 'moyen' : 'eleve';
  return (
    <details class="test-line">
      <summary><span class={`badge badge-${kind}`}>{tr(S.testTab[g.group], lang)}</span> {g.routes.map((r) => r.nom[lang]).join(' · ')}</summary>
      <ul>
        {g.routes.map((r) => {
          const n = rules.languageTest.byPathway[r.voie];
          return n ? <li><strong>{r.nom[lang]}</strong> : {lang === 'fr' ? n.noteFr : n.noteEn}</li> : null;
        })}
      </ul>
    </details>
  );
}

export function countGroups(items: Grouped[]): Record<TestTab, number> {
  const c: Record<TestTab, number> = { 'sans-test': 0, test: 0, aucune: 0, inconnu: 0, tout: items.length };
  for (const i of items) c[i.group]++;
  return c;
}
export const inTab = (g: Grouped, tab: TestTab) => tab === 'tout' || g.group === tab;
