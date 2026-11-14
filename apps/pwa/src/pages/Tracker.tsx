/**
 * « Tracker international » : toutes les offres qui annoncent ouvertement recruter à l'étranger (EIMT / LMIA, parrainage
 * de visa, recrutement international, Mobilité francophone), TOUS métiers, mises à jour le lundi et le jeudi.
 * Historique de 60 jours (première et dernière semaine où l'annonce a été vue), badge « Nouveau » depuis la dernière
 * visite, statut personnel par offre (intéressé·e, postulé → Suivi, écartée), gardé sur l'appareil pour le profil actif.
 * En bas : recruteurs en Afrique pour des employeurs canadiens (voies officielles, agences « permis à vérifier »).
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import {
  addDays, DEFAULT_FOLLOW_UP_DAYS, findNoc, formatDate, jobBankLink, newId, normalize, PROVINCE_NAMES, sourceRef, todayIso,
  type InternationalOffer, type ProvinceCode,
} from '@verijob/core';
import { Badge, Sources } from '../components/common';
import { ADZUNA, OfferLinks, salary } from '../components/InternationalOffers';
import { ProfileBanner } from '../components/ProfileBanner';
import { Recruiters } from '../components/Recruiters';
import { loadInternationalOffers, nocData, rules } from '../data';
import { STRINGS as S, tr, useLang, type Lang } from '../i18n';
import { loadTracker, saveTracker, upsertApplication, useProfile, type TrackerState, type TrackerStatus } from '../store';
import { openOfferCheck } from './CheckOffer';
import { openSampleCv } from './SampleCv';

const ext = { target: '_blank', rel: 'noopener noreferrer nofollow' } as const;
const PAGE = 20;
type Tab = 'tout' | 'nouveau' | TrackerStatus;

/** Métier de l'offre : métier suivi, sinon métier reconnu dans le catalogue complet. */
const jobOf = (o: InternationalOffer) => o.noc || o.nocGuess || '';
function jobLabel(code: string, lang: Lang): string {
  const n = code ? findNoc(nocData, code) : undefined;
  if (!n) return tr(S.trackerOtherJob, lang);
  return (lang === 'fr' ? n.jobFr ?? n.titleFr : n.jobEn ?? n.titleEn) ?? code;
}

function TrackerCard({ o, isNew, status, lastData, onStatus, lang }: {
  o: InternationalOffer; isNew: boolean; status?: TrackerStatus; lastData: string; onStatus: (s: TrackerStatus | undefined) => void; lang: Lang;
}) {
  const sal = salary(o, lang);
  const job = jobOf(o);
  const gone = !!o.lastSeen && o.lastSeen < lastData;
  return (
    <article class={`card-result ${o.scam.length ? 'sev-moyen' : ''}`}>
      <h3>{o.title}</h3>
      <p><strong>{o.company || '—'}</strong> — {o.location}{o.province ? ` (${o.province})` : ''}</p>
      <p class="muted">
        {tr(S.postedOn, lang)} {formatDate(o.date, lang)} · {job ? `${job} – ` : ''}{jobLabel(job, lang)}{sal ? ` · ${sal}` : ''}
      </p>
      <p>
        {isNew && <><Badge kind="ok">{tr(S.trackerNew, lang)}</Badge>{' '}</>}
        {o.evidence.length > 0 ? <Badge kind="ok">✓ {tr(S.trackerProofBadge, lang)}</Badge> : <Badge kind="moyen">{tr(S.trackerUnverifiedBadge, lang)}</Badge>}
      </p>
      {o.evidence.length > 0
        ? o.evidence.slice(0, 2).map((e) => <p class="quote">« {e} »</p>)
        : <p class="muted">{tr(S.intlMatched, lang).replace('{mots}', (o.matched ?? []).map((m) => `« ${m} »`).join(', '))}</p>}
      {o.lmia && <p class="ok">✓ {tr(S.intlLmia, lang).replace('{n}', String(o.lmia.positions)).replace('{q}', o.lmia.lastQuarter)}{o.lmia.sameNoc ? tr(S.intlLmiaSameNoc, lang) : ''}.</p>}
      {o.caution.length > 0 && <p class="warn">{tr(S.intlCaution, lang)}</p>}
      {o.scam.length > 0 && <p class="alert">{o.scam.length} {tr(S.intlScam, lang)}</p>}
      {o.firstSeen && <p class="muted">{gone ? tr(S.trackerGone, lang).replace('{d}', formatDate(o.lastSeen!, lang)) : tr(S.trackerSeen, lang).replace('{d}', formatDate(o.firstSeen, lang))}</p>}
      <OfferLinks o={o} lang={lang} />
      <div class="row">
        {status
          ? <button type="button" onClick={() => onStatus(undefined)}>{tr(S.trackerUndo, lang)}</button>
          : <>
            <button type="button" onClick={() => onStatus('interesse')}>{tr(S.trackerInterested, lang)}</button>
            <button type="button" class="primary" onClick={() => onStatus('postule')}>{tr(S.trackerApplied, lang)}</button>
            <button type="button" onClick={() => onStatus('ecarte')}>{tr(S.trackerDismiss, lang)}</button>
          </>}
        {status === 'interesse' && <button type="button" class="primary" onClick={() => onStatus('postule')}>{tr(S.trackerApplied, lang)}</button>}
        {status === 'postule' && <span class="ok">✓ {tr(S.trackerAppliedSaved, lang)}</span>}
      </div>
      <div class="row">
        <button type="button" onClick={() => openOfferCheck(`${o.title}\n${o.company}\n${o.location}\n${o.snippet}`)}>{tr(S.intlAnalyze, lang)}</button>
        <button type="button" onClick={() => openSampleCv({ noc: job || undefined, title: o.title, text: o.snippet, province: o.province })}>{tr(S.sampleOpen, lang)}</button>
        <a class="adzuna" href={ADZUNA} {...ext} title={tr(S.intlPoweredBy, lang)}>Adzuna</a>
      </div>
    </article>
  );
}

/**
 * « Postuler soi-même, à distance » : pas besoin d'agence ni de représentant (IRCC), les sources officielles d'offres
 * ouvertes à l'étranger, et les étapes que la personne fait elle-même en ligne.
 */
function RemoteGuide({ nocs, lang }: { nocs: string[]; lang: Lang }) {
  const today = todayIso();
  const jb = nocs.length
    ? nocs.map((c) => { const n = findNoc(nocData, c); return { label: jobLabel(c, lang), url: jobBankLink(rules, { keyword: (n?.jobEn ?? n?.titleEn ?? '').split(/[(/]/)[0]!.trim() }).url }; })
    : [{ label: tr(S.trackerAllJobs, lang), url: rules.jobBank.foreignJobsUrl }];
  return (
    <details class="card-result" open>
      <summary><strong>{tr(S.remoteTitle, lang)}</strong></summary>
      <p>{tr(S.remoteNoAgency, lang)}</p>
      <ol>
        <li>{tr(S.remoteStep1, lang)}</li>
        <li>{tr(S.remoteStep2, lang)}</li>
        <li>{tr(S.remoteStep3, lang)}</li>
        <li>{tr(S.remoteStep4, lang)}</li>
        <li>{tr(S.remoteStep5, lang)}</li>
      </ol>
      <p class="muted">{tr(S.remoteJobBank, lang)}</p>
      <div class="row">{jb.map((j) => <a class="button primary" href={j.url} target="_blank" rel="noopener noreferrer nofollow">{j.label} ↗</a>)}</div>
      <Sources sources={['ircc-no-representative', 'ircc-work-permit-outside', 'jobbank-foreign', 'ircc-c16'].map((id) => sourceRef(rules, id, today))} />
    </details>
  );
}

export function Tracker() {
  const lang = useLang();
  const profile = useProfile();
  const mineCodes = useMemo(() => new Set([...(profile.targetNocs ?? []), ...(profile.currentNoc ? [profile.currentNoc] : [])]), [profile]);
  const [offers, setOffers] = useState<InternationalOffer[]>([]);
  const [dataDate, setDataDate] = useState('');
  const [state, setState] = useState<TrackerState>({ statuses: {} });
  // Dernière visite AVANT celle-ci : sert au badge « Nouveau » pendant toute la visite.
  const [since, setSince] = useState<string | undefined>();
  const [tab, setTab] = useState<Tab>('tout');
  const [job, setJob] = useState('');
  const [province, setProvince] = useState<'' | ProvinceCode>('');
  const [onlyMine, setOnlyMine] = useState(false);
  const [showUnverified, setShowUnverified] = useState(false);
  const [q, setQ] = useState('');
  const [shown, setShown] = useState(PAGE);

  useEffect(() => {
    loadInternationalOffers().then((f) => { setOffers(f.data); setDataDate(f.fetchedAt.slice(0, 10)); }).catch(() => undefined);
  }, []);
  useEffect(() => {
    void loadTracker().then((t) => {
      setSince(t.lastVisit);
      setState(t);
      void saveTracker({ ...t, lastVisit: todayIso() });
    });
  }, [profile]);

  const lastData = useMemo(() => offers.map((o) => o.lastSeen ?? '').sort().at(-1) ?? '', [offers]);
  const isNew = (o: InternationalOffer) => !!since && (o.firstSeen ?? o.date) > since;
  const setStatus = async (o: InternationalOffer, s: TrackerStatus | undefined) => {
    const statuses = { ...state.statuses };
    if (s) statuses[o.id] = s; else delete statuses[o.id];
    const next = { ...state, statuses, lastVisit: todayIso() };
    setState(next);
    await saveTracker(next);
    if (s === 'postule') {
      const d = todayIso();
      await upsertApplication({
        id: newId(), employer: o.company || o.title, job: o.title, date: d, status: 'envoyee', followUp: addDays(d, DEFAULT_FOLLOW_UP_DAYS),
        origin: 'site-emploi', adUrl: o.url, adText: `${o.title}\n${o.company}\n${o.location}\n${o.snippet}`, updatedAt: new Date().toISOString(),
      });
    }
  };

  // Filtres communs (métier, province, mes métiers, preuve, recherche), puis onglet de statut.
  const nq = normalize(q.trim());
  const verified = offers.filter((o) => o.evidence.length > 0);
  const filtered = offers.filter((o) => (showUnverified || o.evidence.length > 0) &&
    (!job || jobOf(o) === job) && (!province || o.province === province) && (!onlyMine || mineCodes.has(jobOf(o)))
    && (!nq || normalize(`${o.title} ${o.company} ${o.location}`).includes(nq)));
  const inTab = (o: InternationalOffer, t: Tab) => {
    const s = state.statuses[o.id];
    return t === 'tout' ? s !== 'ecarte' : t === 'nouveau' ? isNew(o) && s !== 'ecarte' : s === t;
  };
  const visible = filtered.filter((o) => inTab(o, tab))
    .sort((a, b) => Number(isNew(b)) - Number(isNew(a)) || Number(mineCodes.has(jobOf(b))) - Number(mineCodes.has(jobOf(a))) || (b.firstSeen ?? b.date).localeCompare(a.firstSeen ?? a.date));
  // Métiers des offres affichées (avec preuve seulement, sauf si l'on montre aussi les non vérifiables).
  const jobs = useMemo(() => {
    const m = new Map<string, number>();
    for (const o of offers) if (showUnverified || o.evidence.length > 0) m.set(jobOf(o), (m.get(jobOf(o)) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [offers, showUnverified]);
  const provinces = [...new Set(offers.map((o) => o.province).filter(Boolean))] as ProvinceCode[];
  const tabs: Array<[Tab, { fr: string; en: string }]> = [['tout', S.trackerTabAll], ['nouveau', S.trackerTabNew], ['interesse', S.trackerTabInterested], ['postule', S.trackerTabApplied], ['ecarte', S.trackerTabDismissed]];

  return (
    <section>
      <h1>{tr(S.trackerTitle, lang)}</h1>
      <ProfileBanner lang={lang} />
      <p class="muted">{tr(S.trackerIntro, lang)}</p>
      <p class="callout">{tr(S.trackerWarning, lang)}</p>
      <RemoteGuide nocs={[...mineCodes]} lang={lang} />
      <p>
        <strong>{tr(S.trackerStats, lang).replace('{n}', String(verified.length)).replace('{new}', String(verified.filter(isNew).length)).replace('{jobs}', String(jobs.length))}</strong>
        {dataDate && <span class="muted"> · {tr(S.trackerUpdated, lang)} {formatDate(dataDate, lang)}</span>}
      </p>

      <div class="chips" role="group" aria-label={tr(S.trackerTitle, lang)}>
        {tabs.map(([t, label]) => (
          <button type="button" class={`chip${tab === t ? ' primary' : ''}`} aria-pressed={tab === t} onClick={() => { setTab(t); setShown(PAGE); }}>
            {tr(label, lang)} ({filtered.filter((o) => inTab(o, t)).length})
          </button>
        ))}
      </div>
      <label>{lang === 'fr' ? 'Métier' : 'Occupation'}
        <select value={job} onChange={(e) => { setJob((e.target as HTMLSelectElement).value); setShown(PAGE); }}>
          <option value="">{tr(S.trackerAllJobs, lang)} ({showUnverified ? offers.length : verified.length})</option>
          {jobs.map(([code, n]) => <option value={code}>{jobLabel(code, lang)} ({n})</option>)}
        </select>
      </label>
      <label>{lang === 'fr' ? 'Province' : 'Province'}
        <select value={province} onChange={(e) => { setProvince((e.target as HTMLSelectElement).value as '' | ProvinceCode); setShown(PAGE); }}>
          <option value="">{tr(S.applyAllProvinces, lang)}</option>
          {provinces.map((c) => <option value={c}>{lang === 'fr' ? PROVINCE_NAMES[c].fr : PROVINCE_NAMES[c].en}</option>)}
        </select>
      </label>
      <label>{tr(S.applySearch, lang)}<input value={q} onInput={(e) => { setQ((e.target as HTMLInputElement).value); setShown(PAGE); }} /></label>
      {mineCodes.size > 0 && <label class="check"><input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine((e.target as HTMLInputElement).checked)} /> {tr(S.trackerMine, lang)}</label>}
      <label class="check"><input type="checkbox" checked={showUnverified} onChange={(e) => { setShowUnverified((e.target as HTMLInputElement).checked); setShown(PAGE); }} /> {tr(S.trackerShowUnverified, lang).replace('{n}', String(offers.length - verified.length))}</label>
      {showUnverified && <p class="muted">{tr(S.trackerUnverifiedHelp, lang)}</p>}

      {visible.length === 0 && <p class="muted">{tr(S.trackerNone, lang)}</p>}
      {visible.slice(0, shown).map((o) => (
        <TrackerCard key={o.id} o={o} isNew={isNew(o)} status={state.statuses[o.id]} lastData={lastData} onStatus={(s) => void setStatus(o, s)} lang={lang} />
      ))}
      {shown < visible.length && <button type="button" onClick={() => setShown(shown + PAGE)}>{tr(S.showMore, lang)} ({visible.length - shown})</button>}

      <Recruiters lang={lang} />
    </section>
  );
}
