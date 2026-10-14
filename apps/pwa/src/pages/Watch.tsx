/**
 * Programmes et actualités : état des programmes, rondes Entrée express, actualités IRCC en direct,
 * prochaines dates, historique daté et sourcé,
 * fraîcheur des données et règles dont la date de révision est dépassée.
 */
import { useEffect, useState } from 'preact/hooks';
import { changeLog, formatDate, programStatuses, sourceRef, upcomingDates } from '@verijob/core';
import { Badge, Sources } from '../components/common';
import { ExpressEntryRounds, IrccNews } from '../components/LiveUpdates';
import { loadDesignated, loadEmployersIndex, rules } from '../data';
import { STRINGS as S, tr, useLang } from '../i18n';

const STATE_KIND = { ouvert: 'ok', restreint: 'moyen', ferme: 'eleve', expire: 'info' } as const;

export function Watch() {
  const lang = useLang();
  const today = new Date().toISOString().slice(0, 10);
  const [lmia, setLmia] = useState<{ from?: string; to?: string; fetchedAt: string }>();
  const [designatedDate, setDesignatedDate] = useState<string>();

  useEffect(() => {
    loadEmployersIndex().then((f) => setLmia({ from: f.data.quarters[0]?.quarter, to: f.data.quarters.at(-1)?.quarter, fetchedAt: f.fetchedAt.slice(0, 10) })).catch(() => undefined);
    loadDesignated().then((f) => setDesignatedDate(f.data.map((d) => d.recordedAt).sort()[0])).catch(() => undefined);
  }, []);

  const sources = Object.keys(rules.sources).map((id) => sourceRef(rules, id, today)).sort((a, b) => a.nextReview.localeCompare(b.nextReview));
  const stale = sources.filter((s) => s.stale);

  return (
    <section>
      <h1>{tr(S.watchTitle, lang)}</h1>
      <p>{tr(S.watchIntro, lang)}</p>
      {stale.length > 0
        ? <p class="alert">{tr(S.staleBanner, lang)} ({stale.map((s) => s.title[lang]).join(' ; ')})</p>
        : <p class="ok">{tr(S.noStale, lang)}</p>}

      <h2>{tr(S.programsTitle, lang)}</h2>
      {programStatuses(rules, today).map((p) => (
        <article class="card-result">
          <div class="route-head"><strong>{p.name[lang]}</strong><Badge kind={STATE_KIND[p.state]}>{tr(S.programState[p.state], lang)}</Badge></div>
          <p>{p.detail[lang]}</p>
          <Sources sources={[p.source]} />
        </article>
      ))}

      <ExpressEntryRounds lang={lang} />
      <IrccNews lang={lang} />

      <h2>{tr(S.upcomingTitle, lang)}</h2>
      <ul class="timeline">
        {upcomingDates(rules, today).map((u) => (
          <li>
            <strong>{formatDate(u.date, lang)}</strong> — {u.label[lang]}{' '}
            <span class="muted">({tr(S.inDays, lang).replace('{n}', String(u.daysLeft))})</span>
          </li>
        ))}
      </ul>

      <h2>{tr(S.historyTitle, lang)}</h2>
      {changeLog(rules, today).map((c) => (
        <article class="card-result">
          <p class="muted">{formatDate(c.date, lang)}{c.approximate ? ` (${tr(S.approxDate, lang)})` : ''}</p>
          <h3>{c.title[lang]}</h3>
          <p>{c.detail[lang]}</p>
          <Sources sources={[c.source]} />
        </article>
      ))}

      <h2>{tr(S.freshnessTitle, lang)}</h2>
      <ul>
        {lmia && <li>{tr(S.lmiaLists, lang)} : {lmia.from} → {lmia.to} — {tr(S.dataUpdated, lang)} {formatDate(lmia.fetchedAt, lang)}</li>}
        {designatedDate && <li>{tr(S.designatedLists, lang)} : {tr(S.recordedOn, lang)} {formatDate(designatedDate, lang)}</li>}
      </ul>

      <h2>{tr(S.rulesTitle, lang)}</h2>
      <ul class="sources-list">
        {sources.map((s) => (
          <li>
            <a href={s.url[lang]} target="_blank" rel="noopener noreferrer">{s.title[lang]}</a>
            <span class="muted"> — {tr(S.verifiedOn, lang)} {formatDate(s.verifiedAt, lang)}, {tr(S.nextReview, lang)} {formatDate(s.nextReview, lang)}</span>
            {s.stale && <strong class="warn"> ⚠ {tr(S.stale, lang)}</strong>}
          </li>
        ))}
      </ul>
    </section>
  );
}
