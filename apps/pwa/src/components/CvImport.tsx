/**
 * « Analyser mon CV » (onglet Profil) : le CV est lu sur le téléphone (cvfile.ts), rien n'est envoyé.
 * 1. métiers reconnus (CNP 2021), durées, diplôme, langues, permis et certificats → ajout au profil en un clic ;
 * 2. offres de la semaine pour ces métiers, celles qui prouvent recruter à l'étranger d'abord ;
 * 3. métiers passerelles (EIMT réellement accordées, données ouvertes d'EDSC) ;
 * 4. forme du CV au format canadien (analyzeCv, conseils du Guichet-Emplois).
 */
import { useState } from 'preact/hooks';
import {
  analyzeCv, extractCvProfile, findNoc, formatDate, isGigOffer, normalize, makeCatalogDetector, sourceRef, suggestBridges, teerOf, todayIso,
  type Bridge, type CurrentOffer, type CvAnalysis, type CvProfile, type InternationalOffer, type RegionOffer,
} from '@verijob/core';
import { loadCurrentOffers, loadInternationalOffers, loadLmiaByNoc, loadRegionOffers, nocData, rules } from '../data';
import { CvFileError, readCvFile } from '../cvfile';
import { STRINGS as S, tr, type Lang } from '../i18n';
import type { StoredProfile } from '../store';
import { Badge } from './common';
import { ADZUNA, OfferLinks } from './InternationalOffers';

const C = S.cvImport;
const ext = { target: '_blank', rel: 'noopener noreferrer nofollow' } as const;
const MAX_OFFERS = 12;

let detector: Promise<(t: string) => string | undefined> | undefined;
const loadDetector = () => (detector ??= import('../../../../data/noc-search.json').then((m) => makeCatalogDetector(m.default as Record<string, string>)));

type Offer = (CurrentOffer | RegionOffer | InternationalOffer) & { proof: boolean };
interface Result {
  profile: CvProfile;
  check: CvAnalysis;
  offers: Offer[];
  bridges: Bridge[];
  window?: string[];
}

const title = (code: string, lang: Lang) => { const n = findNoc(nocData, code); return n ? (lang === 'fr' ? n.titleFr : n.titleEn) : code; };
const years = (m: number, lang: Lang) => (m < 12 ? `${m} ${lang === 'fr' ? 'mois' : 'months'}` : `${(Math.round(m / 12 * 10) / 10).toLocaleString(lang)} ${lang === 'fr' ? 'an(s)' : 'year(s)'}`);
const codesOf = (o: { noc?: string; nocGuess?: string }) => [o.noc, o.nocGuess].filter(Boolean) as string[];

/**
 * Offres de la semaine pour ces métiers (`order` : métiers du CV, du plus long au plus court, puis ceux du profil) :
 * preuve de recrutement à l'étranger d'abord, puis le métier principal, puis les plus récentes. Une même annonce publiée
 * plusieurs fois (même titre, employeur et lieu) n'est montrée qu'une fois ; le travail à la tâche (plateformes) est écarté.
 */
async function offersFor(order: string[]): Promise<Offer[]> {
  const codes = new Set(order);
  const rank = (o: Offer) => Math.min(...codesOf(o).map((c) => order.indexOf(c)).filter((i) => i >= 0));
  const [intl, cur, reg] = await Promise.all([
    loadInternationalOffers().then((f) => f.data).catch(() => []),
    loadCurrentOffers().then((f) => f.data).catch(() => []),
    loadRegionOffers().then((f) => f.data).catch(() => []),
  ]);
  const seen = new Set<string>();
  const out: Offer[] = [];
  const add = (o: CurrentOffer | RegionOffer | InternationalOffer, proof: boolean) => {
    const same = normalize(`${o.title}|${o.company}|${o.location}`);
    if (seen.has(o.id) || seen.has(same) || isGigOffer(o) || !codesOf(o).some((c) => codes.has(c))) return;
    seen.add(o.id); seen.add(same);
    out.push({ ...o, proof });
  };
  for (const o of intl) if (o.evidence.length) add(o, true);
  for (const o of [...cur, ...reg]) add(o, !!o.intl);
  return out.sort((a, b) => Number(b.proof) - Number(a.proof) || rank(a) - rank(b) || b.date.localeCompare(a.date));
}

export function CvImport({ profile, onApply, lang }: { profile: StoredProfile; onApply: (p: StoredProfile) => void; lang: Lang }) {
  const [file, setFile] = useState<File>();
  const [pasted, setPasted] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [res, setRes] = useState<Result>();
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [applied, setApplied] = useState(false);

  const run = async () => {
    setBusy(true); setError(undefined); setRes(undefined); setApplied(false);
    try {
      const input = file ? await readCvFile(file) : { text: pasted, fileType: 'txt' as const };
      const today = todayIso();
      const detect = await loadDetector();
      const profileCv = extractCvProfile(input.text, { detect, today });
      const check = analyzeCv(input, { rules, today });
      const jobCodes = profileCv.jobs.map((j) => j.noc);
      const codes = [...new Set([...jobCodes, ...(profile.targetNocs ?? [])])];
      const lmiaFile = await loadLmiaByNoc().catch(() => undefined);
      const intlCounts: Record<string, number> = {};
      for (const o of (await loadInternationalOffers().catch(() => undefined))?.data ?? []) {
        if (o.evidence.length) for (const c of codesOf(o)) intlCounts[c] = (intlCounts[c] ?? 0) + 1;
      }
      const bridges = lmiaFile
        ? suggestBridges({ jobs: codes, education: profileCv.education?.level ?? (profile.education === 'aucun' ? undefined : profile.education), lmia: lmiaFile.data, intl: intlCounts })
        : [];
      setRes({ profile: profileCv, check, offers: await offersFor(codes), bridges, window: lmiaFile?.source.window });
      setChosen(new Set(jobCodes.slice(0, 3)));
    } catch (e) {
      setError(tr(S.cvErr[e instanceof CvFileError ? e.code : 'illisible'], lang));
    }
    setBusy(false);
  };

  const apply = () => {
    if (!res) return;
    const p = res.profile;
    onApply({
      ...profile,
      targetNocs: [...new Set([...(profile.targetNocs ?? []), ...chosen])],
      ...(p.experienceMonths && !profile.experienceMonths ? { experienceMonths: p.experienceMonths } : {}),
      ...(p.education && !profile.education ? { education: p.education.level } : {}),
    });
    setApplied(true);
  };

  const toggle = (c: string) => setChosen((s) => { const n = new Set(s); if (n.has(c)) n.delete(c); else n.add(c); return n; });
  const ready = !!file || pasted.trim().length > 40;

  return (
    <details class="panel" open={!!res}>
      <summary><strong>📄 {tr(C.title, lang)}</strong></summary>
      <p>{tr(C.intro, lang)}</p>
      <p class="callout">{tr(C.privacy, lang)}</p>
      <label>{tr(S.cvFile, lang)}
        <input type="file" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          onChange={(e) => { setFile((e.target as HTMLInputElement).files?.[0]); setRes(undefined); setError(undefined); }} />
      </label>
      <details>
        <summary>{tr(C.paste, lang)}</summary>
        <textarea rows={6} aria-label={tr(C.paste, lang)} value={pasted} onInput={(e) => setPasted((e.target as HTMLTextAreaElement).value)} />
      </details>
      <div class="row">
        <button type="button" class="primary" disabled={!ready || busy} onClick={() => void run()}>{tr(busy ? S.cvReading : C.analyze, lang)}</button>
      </div>
      {error && <p class="alert" role="status">{error}</p>}
      {res && <Results res={res} lang={lang} chosen={chosen} toggle={toggle} apply={apply} applied={applied}
        addNoc={(c) => onApply({ ...profile, targetNocs: [...new Set([...(profile.targetNocs ?? []), c])] })} profile={profile} />}
    </details>
  );
}

function Results({ res, lang, chosen, toggle, apply, applied, addNoc, profile }: {
  res: Result; lang: Lang; chosen: Set<string>; toggle: (c: string) => void; apply: () => void; applied: boolean; addNoc: (c: string) => void; profile: StoredProfile;
}) {
  const p = res.profile;
  const [shown, setShown] = useState(MAX_OFFERS);
  const proofCount = res.offers.filter((o) => o.proof).length;
  const fix = res.check.checks.filter((c) => c.status === 'a-corriger');
  const advice = res.check.checks.filter((c) => c.status === 'conseil');
  const fm = sourceRef(rules, rules.francophoneMobility.source, todayIso());
  return (
    <div class="result" aria-live="polite">
      {/* 1. Ce que l'appli a compris */}
      <h3>1. {tr(C.found, lang)}</h3>
      {p.jobs.length ? (
        <>
          <p class="muted">{tr(C.jobsHelp, lang)}</p>
          {p.jobs.map((j) => (
            <label class="check">
              <input type="checkbox" checked={chosen.has(j.noc)} onChange={() => toggle(j.noc)} />
              <span><strong>{title(j.noc, lang)}</strong> <span class="muted">({j.noc}, FEER {teerOf(j.noc)}{j.months ? ` · ${years(j.months, lang)}` : ''})</span>
                <br /><span class="muted">« {j.lines[0]} »</span></span>
            </label>
          ))}
        </>
      ) : <p class="alert">{tr(C.noJobs, lang)}</p>}
      <ul class="plain">
        <li>{tr(C.experience, lang)} : <strong>{p.experienceMonths ? years(p.experienceMonths, lang) : tr(C.unknown, lang)}</strong></li>
        <li>{tr(C.education, lang)} : <strong>{p.education ? tr(S.educationLevels[p.education.level], lang) : tr(C.unknown, lang)}</strong>{p.education && <span class="muted"> — « {p.education.evidence} »</span>}</li>
        <li>{tr(C.languages, lang)} : <strong>{[p.languages.fr && (lang === 'fr' ? 'français' : 'French'), p.languages.en && (lang === 'fr' ? 'anglais' : 'English')].filter(Boolean).join(', ') || tr(C.unknown, lang)}</strong></li>
      </ul>
      {p.languages.fr && <p class="callout">{tr(C.francophone, lang)} <a href={fm.url[lang]} {...ext}>{fm.title[lang]} ↗</a></p>}
      {p.education && p.education.level !== 'primaire' && (() => { const eca = sourceRef(rules, 'ircc-eca', todayIso()); return <p class="muted">{tr(C.eca, lang)} <a href={eca.url[lang]} {...ext}>{eca.title[lang]} ↗</a></p>; })()}
      <div class="row">
        <button type="button" class="primary" disabled={applied || (!chosen.size && !p.experienceMonths && !p.education)} onClick={apply}>
          {applied ? `✓ ${tr(C.applied, lang)}` : tr(C.apply, lang)}
        </button>
      </div>
      {applied && <p class="ok" role="status">{tr(C.appliedHelp, lang)}</p>}

      {p.credentials.length > 0 && (
        <>
          <h3>{tr(C.credentials, lang)}</h3>
          {p.credentials.map((c) => {
            const src = c.source ? sourceRef(rules, c.source, todayIso()) : undefined;
            const sec = c.id === 'securite' ? (profile.provinces ?? []).map((pr) => rules.securityLicences[pr]).filter(Boolean) as string[] : [];
            return (
              <article class="card-result">
                <p class="muted">« {c.evidence} »</p>
                <p>{c.note[lang]}</p>
                {src && <p class="muted"><a href={src.url[lang]} {...ext}>{src.title[lang]} ↗</a> — {src.verifiedAt}</p>}
                {sec.map((id) => { const s = sourceRef(rules, id, todayIso()); return <p class="muted"><a href={s.url[lang]} {...ext}>{s.title[lang]} ↗</a></p>; })}
              </article>
            );
          })}
        </>
      )}

      {/* 2. Offres */}
      <h3>2. {tr(C.offers, lang)} ({res.offers.length})</h3>
      <p class={proofCount ? 'muted' : 'callout'}>{tr(proofCount ? C.offersHelp : C.offersNoProof, lang).replace('{n}', String(proofCount))}</p>
      {res.offers.slice(0, shown).map((o) => (
        <article class="card-result">
          <h4>{o.title}</h4>
          <p><strong>{o.company || '—'}</strong> — {o.location}</p>
          <p class="muted">{tr(S.postedOn, lang)} {formatDate(o.date, lang)} · {codesOf(o).map((c) => title(c, lang))[0]}</p>
          {o.proof ? <p><Badge kind="ok">✓ {tr(S.currentIntl, lang)}</Badge></p> : <p><Badge kind="info">{tr(S.abroadNotSaid, lang)}</Badge></p>}
          {'evidence' in o && o.evidence[0] && <p class="quote">« {o.evidence[0]} »</p>}
          {o.scam.length > 0 && <p class="alert">{o.scam.length} {tr(S.intlScam, lang)}</p>}
          <OfferLinks o={o} lang={lang} />
          <p class="muted"><a href={o.url} {...ext}>{tr(C.openAd, lang)} ↗</a> · <a class="adzuna" href={ADZUNA} {...ext}>Adzuna</a></p>
        </article>
      ))}
      {res.offers.length > shown && <button type="button" onClick={() => setShown((n) => n + MAX_OFFERS)}>{tr(C.more, lang)}</button>}

      {/* 3. Passerelles */}
      <h3>3. {tr(C.bridges, lang)}</h3>
      <p class="muted">{tr(C.bridgesHelp, lang).replace('{window}', res.window?.length ? `${res.window[0]} – ${res.window.at(-1)}` : '')}</p>
      {res.bridges.length === 0 && <p class="muted">{tr(C.noBridges, lang)}</p>}
      {res.bridges.map((b) => {
        const added = profile.targetNocs?.includes(b.noc);
        return (
          <article class="card-result">
            <h4>{title(b.noc, lang)} <span class="muted">({b.noc}, FEER {b.teer})</span></h4>
            <p>
              {b.sameDomain && <><Badge kind="info">{tr(C.sameDomain, lang)}</Badge>{' '}</>}
              {b.intlNow > 0 && <Badge kind="ok">✓ {b.intlNow} {tr(C.intlNow, lang)}</Badge>}
            </p>
            <p>{tr(C.lmiaLine, lang).replace('{e}', b.employers.toLocaleString(lang)).replace('{p}', b.positions.toLocaleString(lang))}</p>
            {b.agriShare > 0.5 && <p class="muted">{tr(C.agri, lang)}</p>}
            <div class="row">
              <button type="button" disabled={added} onClick={() => addNoc(b.noc)}>{added ? `✓ ${tr(S.transferAdded, lang)}` : tr(S.transferAdd, lang)}</button>
              {added && <a class="button" href="#/demarcher">{tr(C.employers, lang)}</a>}
            </div>
          </article>
        );
      })}

      {/* 4. Forme du CV */}
      <h3>4. {tr(C.format, lang)}</h3>
      <p class={fix.length ? 'alert' : 'ok'}>{res.check.summary[lang]}</p>
      {fix.length > 0 && <ul>{fix.map((c) => <li><strong>{c.title[lang]}</strong>{c.evidence[0] ? <span class="muted"> — « {c.evidence[0]} »</span> : null}</li>)}</ul>}
      {advice.length > 0 && <details><summary>{tr(C.advice, lang)} ({advice.length})</summary><ul>{advice.map((c) => <li>{c.title[lang]} — <span class="muted">{c.explanation[lang]}</span></li>)}</ul></details>}
      <p><a class="button" href="#/cv">{tr(C.fullCheck, lang)}</a></p>
      <p class="muted">{tr(C.disclaimer, lang)}</p>
    </div>
  );
}
