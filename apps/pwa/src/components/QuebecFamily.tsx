/**
 * Guide Québec (règles du MIFI, quebec.ca) et règle « couple » (permis de travail ouvert pour conjoint, IRCC).
 * Chaque étape cite sa page officielle.
 */
import { sourceRef, todayIso } from '@verijob/core';
import { rules } from '../data';
import { STRINGS as S, tr, type Lang } from '../i18n';
import { Sources } from './common';

/** Étapes pour travailler temporairement au Québec, puis y rester. */
export function QuebecGuide({ lang, open = false }: { lang: Lang; open?: boolean }) {
  const q = rules.quebec;
  const today = todayIso();
  const ids = [...new Set(q.steps.map((s) => s.source))];
  return (
    <details class="panel" open={open}>
      <summary><strong>{tr(S.quebecTitle, lang)}</strong></summary>
      <p class="warn">{lang === 'fr' ? q.noFrancophoneMobilityFr : q.noFrancophoneMobilityEn}</p>
      <ol class="steps">{q.steps.map((s) => <li>{s[lang]}</li>)}</ol>
      <p><a class="button" href={q.arrimaUrl} target="_blank" rel="noopener noreferrer">{tr(S.quebecArrima, lang)} ↗</a></p>
      <Sources sources={ids.map((id) => sourceRef(rules, id, today))} />
    </details>
  );
}

/** Règle du permis de travail ouvert pour conjoint (affichée quand plusieurs profils existent). */
export function FamilyCard({ lang }: { lang: Lang }) {
  const f = rules.family;
  const today = todayIso();
  return (
    <div class="panel">
      <h3>{tr(S.familyTitle, lang)}</h3>
      <p>{lang === 'fr' ? f.summaryFr : f.summaryEn}</p>
      <p class="muted">{lang === 'fr' ? f.exceptionsFr : f.exceptionsEn}</p>
      <Sources sources={[sourceRef(rules, f.source, today), sourceRef(rules, f.quebecSource, today)]} />
    </div>
  );
}
