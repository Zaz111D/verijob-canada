/**
 * « Régions » : villes et régions qui peinent à recruter sur place (Kenora, Thunder Bay, Abitibi…), avec un programme
 * officiel vers la résidence permanente (pilotes PICR / PICRF, REDI de l'Ontario) ou qui favorise les régions (Québec).
 * Pour chaque région : programmes, EIMT bas salaire possible ou gelée, offres récentes de TOUS les métiers (les métiers
 * du profil en premier), employeurs désignés relevés sur le site de la communauté, liens officiels.
 * Mise à jour chaque lundi (offres, contrôle des listes) ; une liste ou une page qui a changé est signalée.
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import {
  formatDate, isOwnJob, jobBankLink, lowWageStatus, normalize, PROVINCE_NAMES,
  type ProvinceCode, type RegionOffer, type RegionPlace, type RegionProgram,
} from '@verijob/core';
import { Badge } from '../components/common';
import { ADZUNA, OfferLinks, salary } from '../components/InternationalOffers';
import { ProfileBanner } from '../components/ProfileBanner';
import { loadDesignated, loadRegionOffers, loadRegionsStatus, nocData, rules, type DesignatedEmployer, type RegionSourceStatus } from '../data';
import { STRINGS as S, tr, useLang, type Lang } from '../i18n';
import { useProfile } from '../store';
import { openOfferCheck } from './CheckOffer';

const ext = { target: '_blank', rel: 'noopener noreferrer nofollow' } as const;
const OFFERS_PAGE = 8;
const EMPLOYERS_PAGE = 30;
type ProgramFilter = 'tous' | RegionProgram;

const PROGRAM_LABEL: Record<RegionProgram, { fr: string; en: string }> = {
  RCIP: { fr: 'Pilote rural (PICR)', en: 'Rural pilot (RCIP)' },
  FCIP: { fr: 'Pilote francophone (PICRF)', en: 'Francophone pilot (FCIP)' },
  REDI: { fr: 'Ontario – REDI', en: 'Ontario – REDI' },
  QC: S.regionsProgramQc,
};

function OfferItem({ o, mine, lang }: { o: RegionOffer; mine: boolean; lang: Lang }) {
  const sal = salary(o, lang);
  return (
    <article class="card-result">
      <h4>{o.title}</h4>
      <p><strong>{o.company || '—'}</strong> — {o.location}</p>
      <p class="muted">{tr(S.postedOn, lang)} {formatDate(o.date, lang)}{sal ? ` · ${sal}` : ''}</p>
      {(mine || o.intl) && (
        <p>
          {mine && <Badge kind="info">{tr(S.regionsMine, lang)}</Badge>}{' '}
          {o.intl && <Badge kind="ok">✓ {tr(S.currentIntl, lang)}</Badge>}
        </p>
      )}
      {o.snippet && <p class="muted">{o.snippet}</p>}
      {o.scam.length > 0 && (
        <div class="alert">
          <p>{o.scam.length} {tr(S.intlScam, lang)}</p>
          {(o.scamWhy ?? []).filter(Boolean).map((w) => <p class="quote">« {w} »</p>)}
        </div>
      )}
      <OfferLinks o={o} lang={lang} />
      <div class="row">
        <button type="button" onClick={() => openOfferCheck(`${o.title}\n${o.company}\n${o.location}\n${o.snippet}`)}>{tr(S.intlAnalyze, lang)}</button>
        <a class="adzuna" href={ADZUNA} {...ext} title={tr(S.intlPoweredBy, lang)}>Adzuna</a>
      </div>
    </article>
  );
}

function Employers({ list, lang }: { list: DesignatedEmployer[]; lang: Lang }) {
  const [q, setQ] = useState('');
  const [shown, setShown] = useState(EMPLOYERS_PAGE);
  const nq = normalize(q.trim());
  const visible = list.filter((e) => !nq || normalize(`${e.employer} ${e.address} ${e.sector}`).includes(nq));
  return (
    <>
      <p class="muted">{tr(S.regionsDesignatedHelp, lang)}</p>
      {list.length > EMPLOYERS_PAGE && <label>{tr(S.regionsSearchEmployer, lang)}<input value={q} onInput={(e) => { setQ((e.target as HTMLInputElement).value); setShown(EMPLOYERS_PAGE); }} /></label>}
      <ul class="plain">
        {visible.slice(0, shown).map((e) => (
          <li class={e.hiring === 'ne-recrute-pas' ? 'muted' : ''}>
            <strong>{e.employer}</strong>
            {e.address && <> — {e.address}</>}
            {e.sector && <span class="muted"> · {e.sector}</span>}
            {e.hiring === 'ne-recrute-pas' && <> <Badge kind="moyen">{tr(S.regionsNotHiring, lang)}</Badge></>}
            {e.hiring === 'recrute' && <> <Badge kind="ok">{lang === 'fr' ? 'recrute' : 'hiring'}</Badge></>}
          </li>
        ))}
      </ul>
      {shown < visible.length && <button type="button" onClick={() => setShown(shown + EMPLOYERS_PAGE)}>{tr(S.regionsShowMore, lang)} ({visible.length - shown})</button>}
      {list[0] && <p class="muted"><a href={list[0].sourceUrl} {...ext}>{tr(S.regionsOfficial, lang)} ↗</a> · {formatDate(list[0].recordedAt, lang)}</p>}
    </>
  );
}

function PlaceCard({ p, offers, mine, designated, status, lang }: {
  p: RegionPlace; offers: RegionOffer[]; mine: Set<string>; designated: DesignatedEmployer[]; status?: RegionSourceStatus; lang: Lang;
}) {
  const [shown, setShown] = useState(OFFERS_PAGE);
  const lw = lowWageStatus(rules, p);
  const own = offers.filter((o) => mine.has(o.id)).length;
  const town = p.towns[0]!;
  const jb = jobBankLink(rules, { keyword: town, province: p.province });
  const note = lang === 'fr' ? p.noteFr : p.noteEn;
  const active = designated.filter((e) => e.hiring !== 'retire');
  return (
    <article class="card-result">
      <h3>{p.name} <small class="muted">— {lang === 'fr' ? PROVINCE_NAMES[p.province].fr : PROVINCE_NAMES[p.province].en}</small></h3>
      <p>
        {p.programs.map((x) => <><Badge kind="info">{tr(PROGRAM_LABEL[x], lang)}</Badge>{' '}</>)}
        {p.francophone && <><Badge kind="ok">{tr(S.regionsFrancophone, lang)}</Badge>{' '}</>}
        <Badge kind={lw === 'gel' ? 'moyen' : 'ok'}>{tr(lw === 'gel' ? S.regionsLowWageFrozen : S.regionsLowWageOk, lang)}</Badge>
      </p>
      {note && <p class="callout">{note}</p>}
      <p>
        <strong>{offers.length}</strong> {tr(offers.length === 1 ? S.regionsOffer : S.regionsOffers, lang)}
        {own > 0 && <> (<strong>{own}</strong> {tr(S.regionsMine, lang)})</>}
        {active.length > 0 && <> · <strong>{active.length}</strong> {tr(S.regionsDesignated, lang)}</>}
      </p>
      {status?.result === 'changee' && <p class="alert">{tr(S.regionsListChanged, lang)}{status.newUrl && <> <a href={status.newUrl} {...ext}>↗</a></>}</p>}
      {offers.length > 0 ? (
        <details open={own > 0}>
          <summary>{tr(S.regionsSeeOffers, lang)} ({offers.length})</summary>
          {offers.slice(0, shown).map((o) => <OfferItem o={o} mine={mine.has(o.id)} lang={lang} />)}
          {shown < offers.length && <button type="button" onClick={() => setShown(shown + OFFERS_PAGE)}>{tr(S.regionsShowMore, lang)} ({offers.length - shown})</button>}
        </details>
      ) : <p class="muted">{tr(S.regionsNoOffers, lang)}</p>}
      {p.community && (
        active.length
          ? <details><summary>{tr(S.regionsSeeEmployers, lang)} ({active.length})</summary><Employers list={active} lang={lang} /></details>
          : <p class="muted">{tr(S.regionsNoList, lang)}</p>
      )}
      <div class="row">
        <a class="button" href={p.url} {...ext}>{tr(S.regionsOfficial, lang)} ↗</a>
        <a class="button" href={jb.url} {...ext}>{tr(S.regionsJobBank, lang)} « {town} » ↗</a>
      </div>
    </article>
  );
}

export function Regions() {
  const lang = useLang();
  const profile = useProfile();
  const nocs = useMemo(() => [...new Set([...(profile.targetNocs ?? []), ...(profile.currentNoc ? [profile.currentNoc] : [])])], [profile]);
  const [offers, setOffers] = useState<RegionOffer[]>([]);
  const [offersDate, setOffersDate] = useState('');
  const [designated, setDesignated] = useState<DesignatedEmployer[]>([]);
  const [status, setStatus] = useState<RegionSourceStatus[]>([]);
  const [province, setProvince] = useState<'' | ProvinceCode>('');
  const [program, setProgram] = useState<ProgramFilter>('tous');
  const [franco, setFranco] = useState(false);
  const [onlyMine, setOnlyMine] = useState(false);

  useEffect(() => {
    loadRegionOffers().then((f) => { setOffers(f.data); setOffersDate(f.fetchedAt.slice(0, 10)); }).catch(() => undefined);
    loadDesignated().then((f) => setDesignated(f.data)).catch(() => undefined);
    loadRegionsStatus().then((f) => setStatus(f.data)).catch(() => undefined);
  }, []);

  const mine = useMemo(() => new Set(offers.filter((o) => isOwnJob(o, nocs, nocData)).map((o) => o.id)), [offers, nocs]);
  const byPlace = useMemo(() => {
    const m = new Map<string, RegionOffer[]>();
    for (const o of offers) m.set(o.place, [...(m.get(o.place) ?? []), o]);
    // Mes métiers d'abord, puis les plus récentes.
    for (const list of m.values()) list.sort((a, b) => Number(mine.has(b.id)) - Number(mine.has(a.id)) || b.date.localeCompare(a.date));
    return m;
  }, [offers, mine]);
  const ownCount = (p: RegionPlace) => (byPlace.get(p.id) ?? []).filter((o) => mine.has(o.id)).length;

  const places = rules.regions.places
    .filter((p) => (!province || p.province === province) && (program === 'tous' || p.programs.includes(program)) && (!franco || p.francophone))
    .filter((p) => !onlyMine || ownCount(p) > 0)
    .sort((a, b) => ownCount(b) - ownCount(a) || (byPlace.get(b.id)?.length ?? 0) - (byPlace.get(a.id)?.length ?? 0));
  const provinces = [...new Set(rules.regions.places.map((p) => p.province))];
  const pageChanged = status.some((s) => s.kind === 'page' && s.result === 'changee');
  const checkedAt = status[0]?.checkedAt;

  return (
    <section>
      <h1>{tr(S.regionsTitle, lang)}</h1>
      <ProfileBanner lang={lang} />
      <p class="muted">{tr(S.regionsIntro, lang)}</p>
      <p class="callout">{tr(S.regionsWarning, lang)}</p>
      <details>
        <summary>{tr(S.regionsProgramsTitle, lang)}</summary>
        <p>{tr(S.regionsRcip, lang)}</p>
        <p>{tr(S.regionsFcip, lang)}</p>
        <p>{tr(S.regionsRedi, lang)} <a href={rules.sources[rules.regions.redi.source]!.urlEn!} {...ext}>ontario.ca ↗</a></p>
        <p>{tr(S.regionsQc, lang)} <a href={rules.sources[rules.regions.quebec.source]!.urlFr!} {...ext}>quebec.ca ↗</a></p>
      </details>
      {pageChanged && <p class="alert">{tr(S.regionsPageChanged, lang)}</p>}

      <label>{lang === 'fr' ? 'Province' : 'Province'}
        <select value={province} onChange={(e) => setProvince((e.target as HTMLSelectElement).value as '' | ProvinceCode)}>
          <option value="">{tr(S.applyAllProvinces, lang)}</option>
          {provinces.map((c) => <option value={c}>{lang === 'fr' ? PROVINCE_NAMES[c].fr : PROVINCE_NAMES[c].en}</option>)}
        </select>
      </label>
      <div class="chips" role="group" aria-label={tr(S.regionsProgramsTitle, lang)}>
        {(['tous', 'REDI', 'RCIP', 'FCIP', 'QC'] as ProgramFilter[]).map((x) => (
          <button type="button" class={`chip${program === x ? ' primary' : ''}`} aria-pressed={program === x} onClick={() => setProgram(x)}>
            {x === 'tous' ? tr(S.regionsAllPrograms, lang) : tr(PROGRAM_LABEL[x], lang)}
          </button>
        ))}
      </div>
      <label class="check"><input type="checkbox" checked={franco} onChange={(e) => setFranco((e.target as HTMLInputElement).checked)} /> {tr(S.regionsFrancophone, lang)}</label>
      {nocs.length > 0 && <label class="check"><input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine((e.target as HTMLInputElement).checked)} /> {tr(S.regionsOnlyMine, lang)}</label>}
      <p class="muted">
        {offersDate && <>{tr(S.regionsUpdated, lang)} {formatDate(offersDate, lang)}</>}
        {checkedAt && <> · {tr(S.regionsChecked, lang)} {formatDate(checkedAt, lang)}</>}
      </p>

      {places.length === 0 && <p class="muted">{tr(S.regionsNone, lang)}</p>}
      {places.map((p) => (
        <PlaceCard key={p.id} p={p} offers={byPlace.get(p.id) ?? []} mine={mine}
          designated={p.community ? designated.filter((e) => e.community === p.community) : []}
          status={p.community ? status.find((s) => s.kind === 'liste' && s.id === p.community && s.result === 'changee') : undefined}
          lang={lang} />
      ))}
    </section>
  );
}
