/**
 * Radar d'offres en MODE LIENS : Job Bank n'est jamais lu automatiquement (conditions d'utilisation).
 * L'utilisateur ouvre le site officiel, et peut ensuite faire évaluer un poste trouvé.
 */
import { useEffect, useState } from 'preact/hooks';
import {
  evaluatePathways, findNoc, formatDate, jobBankLink, sourceRef, PROVINCE_NAMES, probableRmrExemption, searchEmployers,
  type CmaLookup, type PathwayResult, type ProvinceCode,
} from '@verijob/core';
import { Badge, PathwayCards, Sources } from '../components/common';
import { loadCmaLookup, loadDesignated, loadEmployers, nocData, rules } from '../data';
import { STRINGS as S, tr, useLang, type Lang } from '../i18n';
import { useProfile } from '../store';

const PROVINCES = (Object.keys(PROVINCE_NAMES) as ProvinceCode[]);
const today = () => new Date().toISOString().slice(0, 10);

function CopyChip({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" class="chip" onClick={() => { void navigator.clipboard?.writeText(text).then(() => setDone(true)).catch(() => undefined); }}>
      {done ? '✓ ' : ''}{text}
    </button>
  );
}

function WhereToLook({ provinces, nocs, lang }: { provinces: ProvinceCode[]; nocs: string[]; lang: Lang }) {
  const allExempt = nocs.length > 0 && nocs.every((n) => probableRmrExemption(rules, nocData, n));
  const rm = rules.ruralMeasures;
  return (
    <>
      <h2>{tr(S.whereTitle, lang)}</h2>
      {!allExempt && <p class="muted">{tr(S.frozenAdvice, lang)}</p>}
      {provinces.map((p) => {
        const frozen = rules.lmiaLowWage.cmas.filter((c) => c.province === p && c.frozen).map((c) => c.name);
        const pm = rm.provinces[p];
        const active = pm && today() >= pm.from && today() <= rm.validTo;
        return (
          <article class="card-result">
            <h3>{PROVINCE_NAMES[p][lang]}</h3>
            {!allExempt && <p>{tr(S.frozenIn, lang)} : {frozen.length ? frozen.join(', ') : '—'}</p>}
            <p>
              <Badge kind={active ? 'ok' : 'info'}>{tr(active ? S.ruralActive : S.ruralNone, lang)}</Badge>
              {active && <span class="muted"> {pm!.cap15 ? '15 %' : ''} → {formatDate(rm.validTo, lang)}</span>}
            </p>
          </article>
        );
      })}
      <Sources sources={[sourceRef(rules, rules.lmiaLowWage.source, today()), sourceRef(rules, rm.source, today())]} />
    </>
  );
}

export function Jobs() {
  const lang = useLang();
  const profile = useProfile();
  const nocs = profile.targetNocs ?? [];
  const provinces = (profile.provinces?.length ? profile.provinces : []) as ProvinceCode[];

  // Formulaire « évaluer un poste trouvé »
  const [noc, setNoc] = useState('');
  const [province, setProvince] = useState<ProvinceCode | ''>('');
  const [city, setCity] = useState('');
  const [wage, setWage] = useState('');
  const [liveIn, setLiveIn] = useState(false);
  const [employer, setEmployer] = useState('');
  const [lookup, setLookup] = useState<CmaLookup>();
  const [result, setResult] = useState<{ pathways: PathwayResult[]; lmia?: string[]; designated?: string[] }>();

  useEffect(() => { loadCmaLookup().then((f) => setLookup(f.data)).catch(() => undefined); }, []);
  useEffect(() => {
    if (!noc && nocs[0]) setNoc(nocs[0]);
    if (!province && provinces[0]) setProvince(provinces[0]);
  }, [profile]);

  const evaluate = async (e: Event) => {
    e.preventDefault();
    if (!noc) return;
    const pathways = evaluatePathways(profile, {
      noc, province: province || undefined, city: city.trim() || undefined,
      hourlyWage: wage ? Number(wage.replace(',', '.')) : undefined, liveIn,
    }, { rules, nocData, cmaLookup: lookup });
    let lmia: string[] | undefined;
    let designated: string[] | undefined;
    if (employer.trim()) {
      try {
        const recs = province ? await loadEmployers(province) : [];
        lmia = searchEmployers(recs, employer, 3).map((h) => `${h.item.n} — ${h.item.c} (${[...new Set(h.item.p.map((x) => x[0]))].length} ${tr(S.quartersSeen, lang)})`);
        designated = searchEmployers((await loadDesignated()).data, employer, 3).map((h) => `${h.item.employer} — ${h.item.community} (${h.item.program})`);
      } catch { /* hors ligne : la vérification employeur reste disponible dans l'onglet dédié */ }
    }
    setResult({ pathways, lmia, designated });
  };

  const main = jobBankLink(rules);
  return (
    <section>
      <h1>{tr(S.jobsTitle, lang)}</h1>
      <p>{tr(S.jobsIntro, lang)}</p>
      <p><a class="button primary" href={main.url} target="_blank" rel="noopener noreferrer">{tr(S.jobsOpen, lang)} ↗</a></p>
      <p class="muted">{tr(S.jobsLinkNote, lang)}</p>
      <p class="callout">{tr(S.jobsIcon, lang)}</p>

      {nocs.length > 0 && (
        <>
          <h2>{tr(S.keywords, lang)}</h2>
          {nocs.map((code) => {
            const n = findNoc(nocData, code);
            const words = [...new Set([n?.jobEn, n?.titleEn, n?.jobFr].filter(Boolean) as string[])];
            const link = jobBankLink(rules, { keyword: n?.jobEn ?? code, province: provinces[0] });
            return (
              <article class="card-result">
                <h3>{code} – {lang === 'fr' ? n?.titleFr : n?.titleEn}</h3>
                <div class="chips">{words.map((w) => <CopyChip text={w} />)}<CopyChip text={code} /></div>
                {link.filtered && <a class="button" href={link.url} target="_blank" rel="noopener noreferrer">{tr(S.openFiltered, lang)} ↗</a>}
              </article>
            );
          })}
        </>
      )}
      {provinces.length > 0 && <WhereToLook provinces={provinces} nocs={nocs} lang={lang} />}
      {!nocs.length && <p class="muted">{tr(S.routesEmpty, lang)} <a href="#/profil">{tr(S.navProfile, lang)}</a></p>}

      <h2>{tr(S.evalTitle, lang)}</h2>
      <p>{tr(S.evalIntro, lang)}</p>
      <form onSubmit={(e) => void evaluate(e)}>
        <label for="enoc">{tr(S.evalJob, lang)}</label>
        <select id="enoc" value={noc} onChange={(e) => setNoc((e.target as HTMLSelectElement).value)}>
          <option value="">{tr(S.choose, lang)}</option>
          {nocData.nocs.map((n) => <option value={n.code}>{n.code} – {lang === 'fr' ? n.titleFr : n.titleEn}</option>)}
        </select>
        <div class="grid2">
          <label>{tr(S.province, lang)}
            <select value={province} onChange={(e) => setProvince((e.target as HTMLSelectElement).value as ProvinceCode)}>
              <option value="">{tr(S.choose, lang)}</option>
              {PROVINCES.map((p) => <option value={p}>{PROVINCE_NAMES[p][lang]}</option>)}
            </select>
          </label>
          <label>{tr(S.evalCity, lang)}<input value={city} onInput={(e) => setCity((e.target as HTMLInputElement).value)} /></label>
        </div>
        <label for="ewage">{tr(S.evalWage, lang)}</label>
        <input id="ewage" inputMode="decimal" value={wage} placeholder="17,60" onInput={(e) => setWage((e.target as HTMLInputElement).value)} />
        {rules.liveInCaregiver.nocs.includes(noc) && (
          <label class="check"><input type="checkbox" checked={liveIn} onChange={() => setLiveIn(!liveIn)} />{tr(S.evalLiveIn, lang)}</label>
        )}
        <label for="eemp">{tr(S.evalEmployer, lang)}</label>
        <input id="eemp" value={employer} onInput={(e) => setEmployer((e.target as HTMLInputElement).value)} />
        <button type="submit" class="primary" disabled={!noc}>{tr(S.evalButton, lang)}</button>
      </form>

      {result && (
        <div class="result" aria-live="polite">
          <PathwayCards results={result.pathways} />
          {result.lmia && (
            <article class="card-result">
              <h3>{result.lmia.length ? tr(S.lmiaFound, lang) : tr(S.lmiaNotFound, lang)}</h3>
              <ul>{result.lmia.map((x) => <li>{x}</li>)}</ul>
              <h3>{result.designated?.length ? tr(S.designatedFound, lang) : tr(S.designatedNone, lang)}</h3>
              <ul>{result.designated?.map((x) => <li>{x}</li>)}</ul>
              <p><a href="#/employeur">{tr(S.cardEmployerTitle, lang)}</a></p>
            </article>
          )}
          <p class="callout">{tr(S.evalPasteText, lang)} <a href="#/offre">{tr(S.cardOfferTitle, lang)}</a></p>
        </div>
      )}
    </section>
  );
}
