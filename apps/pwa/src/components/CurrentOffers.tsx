/**
 * Offres ACTUELLES des métiers du profil, avec un lien direct vers chaque annonce (API Adzuna, mise à jour hebdomadaire).
 * Divisées selon le test de langue (voies du profil). Conditions Adzuna : mention « Adzuna » liée à adzuna.ca.
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import { findNoc, formatDate, type CurrentOffer, type ProvinceCode } from '@verijob/core';
import { loadCurrentOffers, nocData } from '../data';
import { STRINGS as S, tr, type Lang } from '../i18n';
import { openOfferCheck } from '../pages/CheckOffer';
import { openSampleCv } from '../pages/SampleCv';
import { useProfile } from '../store';
import { Badge } from './common';
import { ADZUNA, OfferLinks, salary } from './InternationalOffers';
import { countGroups, inTab, makeGrouper, TestLine, TestTabs, type Grouped, type TestTab } from './TestGroups';

const ext = { target: '_blank', rel: 'noopener noreferrer nofollow' } as const;
const PAGE = 20;

function Card({ o, g, lang }: { o: CurrentOffer; g: Grouped; lang: Lang }) {
  const n = findNoc(nocData, o.noc);
  const sal = salary(o, lang);
  return (
    <article class="card-result">
      <h3>{o.title}</h3>
      <p><strong>{o.company || '—'}</strong> — {o.location}</p>
      <p class="muted">{tr(S.postedOn, lang)} {formatDate(o.date, lang)} · {lang === 'fr' ? n?.titleFr : n?.titleEn}{sal ? ` · ${sal}` : ''}</p>
      {o.intl && <p><Badge kind="ok">✓ {tr(S.currentIntl, lang)}</Badge></p>}
      {o.snippet && <p class="muted">{o.snippet}</p>}
      <TestLine g={g} lang={lang} />
      {o.scam.length > 0 && <p class="alert">{o.scam.length} {tr(S.intlScam, lang)}</p>}
      <OfferLinks o={o} lang={lang} />
      <div class="row">
        <button type="button" onClick={() => openOfferCheck(`${o.title}\n${o.company}\n${o.location}\n${o.snippet}`)}>{tr(S.intlAnalyze, lang)}</button>
        <button type="button" onClick={() => openSampleCv({ noc: o.noc, title: o.title, text: o.snippet, province: o.province })}>{tr(S.sampleOpen, lang)}</button>
        <a class="adzuna" href={ADZUNA} {...ext} title={tr(S.intlPoweredBy, lang)}>Adzuna</a>
      </div>
    </article>
  );
}

export function CurrentOffers({ nocs, provinces, lang }: { nocs: string[]; provinces: ProvinceCode[]; lang: Lang }) {
  const profile = useProfile();
  const [data, setData] = useState<{ list: CurrentOffer[]; at: string }>();
  const [tab, setTab] = useState<TestTab>('sans-test');
  const [shown, setShown] = useState(PAGE);
  useEffect(() => { loadCurrentOffers().then((f) => setData({ list: f.data, at: f.fetchedAt.slice(0, 10) })).catch(() => undefined); }, []);
  const grouped = useMemo(() => {
    if (!data) return [];
    const grouper = makeGrouper(profile);
    return data.list
      .filter((o) => (!nocs.length || nocs.includes(o.noc)) && (!provinces.length || !o.province || provinces.includes(o.province)))
      .map((o) => ({ o, g: grouper({ noc: o.noc, province: o.province }) }));
  }, [data, nocs.join(), provinces.join(), profile]);
  if (!data) return null; // pas encore de fichier (clés Adzuna absentes) : section masquée
  const counts = countGroups(grouped.map((e) => e.g));
  // Sans signal d'arnaque d'abord, puis « ouverte à l'étranger », puis les plus récentes.
  const visible = grouped.filter((e) => inTab(e.g, tab))
    .sort(({ o: a }, { o: b }) => a.scam.length - b.scam.length || Number(!!b.intl) - Number(!!a.intl) || b.date.localeCompare(a.date));
  return (
    <>
      <h2>{tr(S.currentTitle, lang)}</h2>
      <p class="muted">{tr(S.currentIntro, lang)}</p>
      <p class="callout">{tr(S.offerAbroadNote, lang)}</p>
      <p class="muted">{tr(S.intlUpdated, lang)} {formatDate(data.at, lang)} — {grouped.length} / {data.list.length}</p>
      {grouped.length > 0 && <TestTabs counts={counts} value={tab} onChange={(t) => { setTab(t); setShown(PAGE); }} lang={lang} />}
      {visible.length ? visible.slice(0, shown).map(({ o, g }) => <Card o={o} g={g} lang={lang} />) : <p class="muted">{tr(S.currentNone, lang)}</p>}
      {shown < visible.length && <button type="button" onClick={() => setShown(shown + PAGE)}>{tr(S.showMore, lang)}</button>}
      <p class="muted">{tr(S.intlPoweredBy, lang)} <a class="adzuna" href={ADZUNA} {...ext}>Adzuna</a></p>
    </>
  );
}
