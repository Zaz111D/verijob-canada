/**
 * Informations officielles « en direct » (page Programmes et actualités) :
 * - Entrée express : fichier préparé chaque semaine par le pipeline, actualisable à la demande depuis canada.ca ;
 * - actualités d'IRCC : lues à l'ouverture de la page (fil officiel), filtrées par les mots de rules.json.
 */
import { useEffect, useState } from 'preact/hooks';
import { formatAmount, formatDate, latestRoundByCategory, sourceRef, type ExpressEntryData, type NewsItem } from '@verijob/core';
import { fetchLiveNews, fetchLiveRounds, loadExpressEntry, rules } from '../data';
import { STRINGS as S, tr, type Lang } from '../i18n';
import { Badge, Sources } from './common';

const ACCESS_KIND = { etranger: 'ok', nomination: 'moyen', canada: 'info', autre: 'info' } as const;
const today = () => new Date().toISOString().slice(0, 10);

export function ExpressEntryRounds({ lang }: { lang: Lang }) {
  const [data, setData] = useState<{ ee: ExpressEntryData; asOf: string }>();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    loadExpressEntry().then((f) => setData((cur) => cur ?? { ee: f.data, asOf: f.fetchedAt.slice(0, 10) })).catch(() => undefined);
  }, []);

  const refresh = async () => {
    setBusy(true); setFailed(false);
    try { setData({ ee: await fetchLiveRounds(lang), asOf: today() }); } catch { setFailed(true); }
    setBusy(false);
  };

  const src = sourceRef(rules, rules.expressEntry.roundsSource, today());
  const cats = sourceRef(rules, rules.expressEntry.source, today());
  const n = (x: number | null) => (x === null ? '—' : formatAmount(x, lang));
  return (
    <>
      <h2>{tr(S.eeTitle, lang)}</h2>
      <p class="muted">{tr(S.eeIntro, lang)}</p>
      {data && latestRoundByCategory(rules, data.ee).map((r) => (
        <article class="card-result">
          <div class="route-head"><strong>{r.name[lang]}</strong><Badge kind={ACCESS_KIND[r.access]}>{tr(S.eeAccess[r.access], lang)}</Badge></div>
          <p>{formatDate(r.date, lang)} — {n(r.size)} {tr(S.eeInvitations, lang)}, {tr(S.eeMinScore, lang)} <strong>{n(r.crs)}</strong></p>
        </article>
      ))}
      {data && (
        <details class="sources">
          <summary>{tr(S.eeAllRounds, lang)} ({data.ee.rounds.length})</summary>
          <ul>{data.ee.rounds.map((r) => <li>{formatDate(r.date, lang)} — {r.name[lang]} : {n(r.size)} / {n(r.crs)}</li>)}</ul>
        </details>
      )}
      <p class="muted">
        {data && <>{tr(S.eeUpdatedOn, lang)} {formatDate(data.asOf, lang)}. </>}
        {tr(S.refreshHeavy, lang)}
      </p>
      <p><button type="button" onClick={() => void refresh()} disabled={busy}>{tr(busy ? S.refreshing : S.refreshNow, lang)}</button></p>
      {failed && <p class="alert" role="status">{tr(S.refreshFailed, lang)}</p>}
      <Sources sources={[src, cats]} />
    </>
  );
}

export function IrccNews({ lang }: { lang: Lang }) {
  const [news, setNews] = useState<NewsItem[]>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setNews(undefined); setFailed(false);
    fetchLiveNews(lang).then((x) => { if (alive) setNews(x); }).catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [lang]);

  const src = sourceRef(rules, rules.liveNews.source, today());
  return (
    <>
      <h2>{tr(S.newsTitle, lang)}</h2>
      <p class="muted">{tr(S.newsIntro, lang)}</p>
      {!news && !failed && <p class="muted" role="status">{tr(S.newsLoading, lang)}</p>}
      {failed && <p class="muted" role="status">{tr(S.newsOffline, lang)}</p>}
      {news && !news.length && <p class="muted">{tr(S.newsNone, lang)}</p>}
      {news?.map((x) => (
        <article class="card-result">
          <p class="muted">{formatDate(x.date, lang)}</p>
          <h3><a href={x.link} target="_blank" rel="noopener noreferrer">{x.title}</a></h3>
          {x.teaser && <p>{x.teaser}</p>}
        </article>
      ))}
      <p><a href={src.url[lang]} target="_blank" rel="noopener noreferrer">{tr(S.newsAll, lang)} ↗</a></p>
    </>
  );
}
