/**
 * « Où postuler maintenant » : UNE seule liste d'offres pour le profil actif, qui réunit
 * - les offres où une preuve d'ouverture aux candidats de l'étranger a été trouvée (international-offers.json) ;
 * - les offres actuelles des métiers du profil (current-offers.json, mise à jour hebdomadaire).
 * Les offres avec preuve passent en premier ; division selon le test de langue ; conditions Adzuna : mention « Adzuna ».
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import { findNoc, formatDate, jobBankLink, PROVINCE_NAMES, type CurrentOffer, type InternationalOffer, type ProvinceCode } from '@verijob/core';
import { loadCurrentOffers, loadInternationalOffers, nocData, rules } from '../data';
import { STRINGS as S, tr, type Lang } from '../i18n';
import { openOfferCheck } from '../pages/CheckOffer';
import { openSampleCv } from '../pages/SampleCv';
import { useProfile } from '../store';
import { Badge } from './common';
import { ADZUNA, OfferCard, OfferLinks, salary } from './InternationalOffers';
import { countGroups, inTab, makeGrouper, TestLine, TestTabs, type Grouped, type TestTab } from './TestGroups';

const ext = { target: '_blank', rel: 'noopener noreferrer nofollow' } as const;
const PAGE = 20;

function CurrentCard({ o, g, lang }: { o: CurrentOffer; g: Grouped; lang: Lang }) {
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
      {o.scam.length > 0 && (
        <div class="alert">
          <p>{o.scam.length} {tr(S.intlScam, lang)}</p>
          {(o.scamWhy ?? []).filter(Boolean).map((w) => <p class="quote">« {w} »</p>)}
        </div>
      )}
      <OfferLinks o={o} lang={lang} />
      <div class="row">
        <button type="button" onClick={() => openOfferCheck(`${o.title}\n${o.company}\n${o.location}\n${o.snippet}`)}>{tr(S.intlAnalyze, lang)}</button>
        <button type="button" onClick={() => openSampleCv({ noc: o.noc, title: o.title, text: o.snippet, province: o.province })}>{tr(S.sampleOpen, lang)}</button>
        <a class="adzuna" href={ADZUNA} {...ext} title={tr(S.intlPoweredBy, lang)}>Adzuna</a>
      </div>
    </article>
  );
}

type Item = { kind: 'intl'; o: InternationalOffer; g: Grouped } | { kind: 'current'; o: CurrentOffer; g: Grouped };
/** Preuve d'ouverture aux candidats de l'étranger : phrase trouvée, ou employeur dans les listes d'EIMT. */
const proof = (it: Item) => (it.kind === 'intl' ? (it.o.evidence.length ? 2 : 1) : it.o.intl ? 1 : 0);

export function ApplyNow({ nocs, provinces, lang }: { nocs: string[]; provinces: ProvinceCode[]; lang: Lang }) {
  const profile = useProfile();
  const [current, setCurrent] = useState<{ list: CurrentOffer[]; at: string }>();
  const [intl, setIntl] = useState<InternationalOffer[]>([]);
  const [tab, setTab] = useState<TestTab>('sans-test');
  const [shown, setShown] = useState(PAGE);
  useEffect(() => {
    loadCurrentOffers().then((f) => setCurrent({ list: f.data, at: f.fetchedAt.slice(0, 10) })).catch(() => undefined);
    loadInternationalOffers().then((f) => setIntl(f.data)).catch(() => undefined);
  }, []);
  useEffect(() => { setShown(PAGE); }, [nocs.join(), provinces.join()]);

  const items = useMemo<Item[]>(() => {
    const grouper = makeGrouper(profile);
    const mine = (o: { noc: string; province?: ProvinceCode }) =>
      (!nocs.length || nocs.includes(o.noc)) && (!provinces.length || !o.province || provinces.includes(o.province));
    const out: Item[] = intl.filter(mine).map((o) => ({ kind: 'intl', o, g: grouper({ noc: o.noc || undefined, province: o.province }) }));
    const seen = new Set(out.map((x) => x.o.id));
    for (const o of current?.list ?? []) {
      if (mine(o) && !seen.has(o.id)) out.push({ kind: 'current', o, g: grouper({ noc: o.noc, province: o.province }) });
    }
    // Sans signal d'arnaque d'abord, puis preuve d'ouverture à l'étranger, puis les plus récentes.
    return out.sort((a, b) => a.o.scam.length - b.o.scam.length || proof(b) - proof(a) || b.o.date.localeCompare(a.o.date));
  }, [current, intl, nocs.join(), provinces.join(), profile]);

  if (!current && !intl.length) return null; // pas encore de données d'offres (clés Adzuna absentes)
  const counts = countGroups(items.map((e) => e.g));
  const visible = items.filter((e) => inTab(e.g, tab));
  // Métiers du profil sans aucune offre : lien de secours vers le Guichet-Emplois (offres ouvertes aux étrangers).
  const emptyNocs = nocs.filter((c) => !items.some((e) => e.o.noc === c));
  return (
    <>
      <h2>{tr(S.applyTitle, lang)}</h2>
      <p class="muted">{tr(S.applyIntro, lang)}{current ? ` ${tr(S.intlUpdated, lang)} ${formatDate(current.at, lang)}.` : ''}</p>
      <p class="muted">💡 {tr(S.offerAbroadShort, lang)}</p>
      {items.length > 0 && <TestTabs counts={counts} value={tab} onChange={(t) => { setTab(t); setShown(PAGE); }} lang={lang} />}
      {visible.length
        ? visible.slice(0, shown).map((it) => (it.kind === 'intl' ? <OfferCard o={it.o} g={it.g} lang={lang} /> : <CurrentCard o={it.o} g={it.g} lang={lang} />))
        : <p class="muted">{tr(S.currentNone, lang)}</p>}
      {shown < visible.length && <button type="button" onClick={() => setShown(shown + PAGE)}>{tr(S.showMore, lang)} ({visible.length - shown})</button>}
      {emptyNocs.map((code) => {
        const n = findNoc(nocData, code);
        return (
          <article class="card-result">
            <h3>{lang === 'fr' ? n?.titleFr : n?.titleEn}</h3>
            <p class="muted">{tr(S.currentEmptyJob, lang)}</p>
            <div class="row">
              {(provinces.length ? provinces : [undefined]).map((p) => (
                <a class="button" href={jobBankLink(rules, { keyword: n?.jobEn?.split(/[(/]/)[0]!.trim() ?? code, province: p }).url} {...ext}>
                  {tr(S.jobBankProvince, lang)}{p ? ` (${PROVINCE_NAMES[p][lang]})` : ''} ↗
                </a>
              ))}
            </div>
          </article>
        );
      })}
      <p class="muted">{tr(S.intlPoweredBy, lang)} <a class="adzuna" href={ADZUNA} {...ext}>Adzuna</a></p>
    </>
  );
}
