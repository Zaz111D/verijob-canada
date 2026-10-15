/**
 * Liste de démarchage : recruteurs récurrents (EIMT sur plusieurs trimestres) + employeurs désignés PICR/PICRF,
 * export CSV et modèle de message de candidature spontanée.
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import {
  addDays, DEFAULT_FOLLOW_UP_DAYS, filterProspects, findNoc, findTransfer, newId, PROVINCE_NAMES, prospectPathway, prospectsToCsv, RECURRING_QUARTERS, sourceRef, todayIso, totalPositions,
  type PathwayId, type Prospect, type ProvinceCode,
} from '@verijob/core';
import { Badge } from '../components/common';
import { AfricaBadge, AfricaSection } from '../components/Africa';
import { ContactLinks, HowToApply, websiteSearchUrl } from '../components/ContactLinks';
import { loadDesignated, loadPriorities, loadProspects, nocData, rules, type CommunityPriority, type DesignatedEmployer } from '../data';
import { STRINGS as S, tr, useLang, type Lang } from '../i18n';
import { upsertApplication, useApplications, useProfile, type StoredProfile } from '../store';
import { buildMessage } from '../templates';
import { openSampleCv } from './SampleCv';

const PAGE = 40;

/** Métier pour lequel un permis provincial est exigé (pages officielles dans rules.securityLicences). */
const SECURITY_NOC = '64410';

/** « 2026Q1 » → « 2026 T1 ». */
function quarterLabel(q: string, lang: Lang): string {
  const m = /^(\d{4})Q([1-4])$/.exec(q);
  return m ? `${m[1]} ${lang === 'fr' ? 'T' : 'Q'}${m[2]}` : q;
}

/** Page officielle du permis d'agent de sécurité de la province, si elle a été vérifiée. */
function licenceUrl(province: string, lang: Lang): string | undefined {
  const id = rules.securityLicences[province as ProvinceCode];
  return id ? sourceRef(rules, id, todayIso()).url[lang] : undefined;
}

function provinceLabel(code: string, lang: Lang): string {
  if (code === 'XX') return lang === 'fr' ? 'Siège hors Canada' : 'Head office abroad';
  return PROVINCE_NAMES[code as ProvinceCode]?.[lang] ?? code;
}
/** Intitulé de poste court pour les messages (sinon le titre officiel). */
function jobName(code: string, lang: Lang): string {
  const n = findNoc(nocData, code);
  return (lang === 'fr' ? n?.jobFr : n?.jobEn) ?? nocName(code, lang);
}
function nocName(code: string, lang: Lang): string {
  const n = findNoc(nocData, code);
  return n ? (lang === 'fr' ? n.titleFr : n.titleEn) : code;
}
function cmaText(g: string, lang: Lang, agricultureOnly = false): { kind: string; text: string } {
  if (agricultureOnly && g !== '-' && g !== '?') return { kind: 'ok', text: `${g} — ${tr(S.cmaAgriExempt, lang)}` };
  if (g === '-') return { kind: 'ok', text: tr(S.cmaOutside, lang) };
  if (g === '?') return { kind: 'info', text: tr(S.cmaUnknown, lang) };
  const frozen = rules.lmiaLowWage.cmas.find((c) => c.name === g)?.frozen;
  return { kind: frozen ? 'moyen' : 'ok', text: `${g} — ${tr(frozen ? S.cmaFrozen : S.cmaOpen, lang)}` };
}
/** Lien de recherche web neutre (seul le nom de l'employeur et sa ville sont envoyés au moteur de recherche). */
function download(name: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function minAll(l?: { speaking?: number; listening?: number; reading?: number; writing?: number }): number | undefined {
  const v = [l?.speaking, l?.listening, l?.reading, l?.writing];
  return v.every((x) => x !== undefined) ? Math.min(...(v as number[])) : undefined;
}

interface Target {
  employer: string; city: string; noc: string; pathway?: PathwayId;
  designated?: { program: 'RCIP' | 'FCIP'; community: string };
  lmiaHistory?: { quarters: number; last: string };
}

function MessagePanel({ target, profile, onClose }: { target: Target; profile: StoredProfile; onClose: () => void }) {
  const uiLang = useLang();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), [target]);
  const [lang, setLang] = useState<Lang>(uiLang);
  const [name, setName] = useState('');
  const [country, setCountry] = useState(() => {
    try { return profile.citizenship && profile.citizenship !== 'ZZ' ? new Intl.DisplayNames([uiLang], { type: 'region' }).of(profile.citizenship) ?? '' : ''; } catch { return ''; }
  });
  const [copied, setCopied] = useState(false);
  const fr = profile.french;
  const transfer = findTransfer(rules, profile.currentNoc, target.noc);
  const frenchOral = fr?.speaking !== undefined && fr?.listening !== undefined ? Math.min(fr.speaking, fr.listening) : undefined;
  const m = buildMessage({
    employer: target.employer, jobTitle: jobName(target.noc, lang), nocCode: target.noc, name, country,
    experienceMonths: profile.experienceMonths, frenchOral, englishMin: minAll(profile.english),
    pathway: target.pathway, designatedProgram: target.designated?.program, community: target.designated?.community,
    lmiaHistory: target.lmiaHistory,
    transfer: transfer && { job: lang === 'fr' ? transfer.fromJobFr : transfer.fromJobEn, skills: lang === 'fr' ? transfer.skillsFr : transfer.skillsEn },
    licence: target.noc === SECURITY_NOC,
  }, lang);
  const copy = async () => {
    try { await navigator.clipboard.writeText(`${m.subject}\n\n${m.body}`); setCopied(true); } catch { setCopied(false); }
  };
  return (
    <div class="panel" ref={ref} role="dialog" aria-label={tr(S.messageTitle, uiLang)}>
      <h2>{tr(S.messageTitle, uiLang)} — {target.employer}</h2>
      <div class="grid2">
        <label>{tr(S.yourName, uiLang)}<input value={name} onInput={(e) => setName((e.target as HTMLInputElement).value)} /></label>
        <label>{tr(S.yourCountry, uiLang)}<input value={country} onInput={(e) => setCountry((e.target as HTMLInputElement).value)} /></label>
      </div>
      <label>{tr(S.messageLang, uiLang)}
        <select value={lang} onChange={(e) => setLang((e.target as HTMLSelectElement).value as Lang)}>
          <option value="fr">Français</option><option value="en">English</option>
        </select>
      </label>
      <p><strong>{tr(S.subject, uiLang)} :</strong> {m.subject}</p>
      <textarea rows={14} readOnly value={m.body} />
      <p class="callout">{tr(S.messageAdvice, uiLang)}</p>
      <div class="row">
        <button type="button" class="primary" onClick={() => void copy()}>{tr(S.copy, uiLang)}</button>
        <a class="button" href={websiteSearchUrl(target.employer, target.city)} target="_blank" rel="noopener noreferrer">{tr(S.findWebsite, uiLang)}</a>
        <button type="button" onClick={onClose}>{tr(S.close, uiLang)}</button>
      </div>
      {copied && <p class="ok" role="status">{tr(S.copied, uiLang)}</p>}
    </div>
  );
}

export function Prospects() {
  const lang = useLang();
  const profile = useProfile();
  const [all, setAll] = useState<Prospect[]>();
  const [designated, setDesignated] = useState<DesignatedEmployer[]>([]);
  const [priorities, setPriorities] = useState<CommunityPriority[]>([]);
  const [error, setError] = useState(false);
  const [province, setProvince] = useState('');
  const [hideAgri, setHideAgri] = useState(false);
  const [onlyNew, setOnlyNew] = useState(false);
  const [windowStart, setWindowStart] = useState('');
  const [shown, setShown] = useState(PAGE);
  const [target, setTarget] = useState<Target>();
  const apps = useApplications();
  const isTracked = (name: string) => apps.some((a) => a.employer === name);
  const track = (employer: string, noc: string, verification: { lmiaFound?: boolean; designated?: boolean }) => {
    const d = new Date().toISOString().slice(0, 10);
    void upsertApplication({
      id: newId(), employer, job: jobName(noc, lang), date: d, status: 'a-envoyer',
      followUp: addDays(d, DEFAULT_FOLLOW_UP_DAYS), verification: { ...verification, checkedAt: d }, updatedAt: new Date().toISOString(),
    });
  };

  useEffect(() => {
    loadProspects().then((f) => { setAll(f.data); setWindowStart(f.source.window?.[0] ?? ''); }).catch(() => setError(true));
    loadDesignated().then((f) => setDesignated(f.data)).catch(() => undefined);
    loadPriorities().then((f) => setPriorities(f.data)).catch(() => undefined);
  }, []);

  const nocs = profile.targetNocs ?? [];
  const provinces = province ? [province] : profile.provinces ?? [];
  const list = useMemo(
    () => (all ? filterProspects(all, { nocs, provinces, excludeAgricultureOnly: hideAgri, onlyNew }) : []),
    [all, nocs.join(), provinces.join(), hideAgri, onlyNew],
  );
  const desList = useMemo(() => {
    const prio = (community: string, program: string) => priorities.some((p) => p.community === community && p.program === program && nocs.includes(p.noc));
    return designated
      .filter((d) => (d.hiring === 'recrute' || d.hiring === 'inconnu') && (!provinces.length || provinces.includes(d.province)))
      .map((d) => ({ d, star: prio(d.community, d.program) }))
      .sort((a, b) => Number(b.star) - Number(a.star) || Number(b.d.hiring === 'recrute') - Number(a.d.hiring === 'recrute') || a.d.community.localeCompare(b.d.community));
  }, [designated, priorities, nocs.join(), provinces.join()]);

  const nocSet = nocs.length ? new Set(nocs) : undefined;
  const exportProspects = () => {
    type Row = Record<string, string | number>;
    const rows = list.map((x): Row => {
      const r = prospectPathway(x, profile, { rules, nocData, nocs });
      return lang === 'fr'
        ? { Employeur: x.n, Ville: x.c, 'Code postal': x.pc, Province: provinceLabel(x.p, lang), RMR: cmaText(x.g, lang).text, 'Trimestres avec EIMT': x.q, 'Dernier trimestre': x.lq, Métiers: x.j.filter(([n]) => !nocSet || nocSet.has(n)).map(([n, c]) => `${n} ${nocName(n, lang)} (${c})`).join(' | '), Volets: x.s.join(', '), 'Postes refusés': x.neg, 'Nouveau recruteur': x.nw ? 'oui' : '', 'Voie estimée': `${r.best.nom.fr} : ${tr(S.status[r.best.statut], 'fr')}` }
        : { Employer: x.n, City: x.c, 'Postal code': x.pc, Province: provinceLabel(x.p, lang), CMA: cmaText(x.g, lang).text, 'Quarters with LMIAs': x.q, 'Latest quarter': x.lq, Jobs: x.j.filter(([n]) => !nocSet || nocSet.has(n)).map(([n, c]) => `${n} ${nocName(n, lang)} (${c})`).join(' | '), Streams: x.s.join(', '), 'Refused positions': x.neg, 'New recruiter': x.nw ? 'yes' : '', 'Estimated route': `${r.best.nom.en}: ${tr(S.status[r.best.statut], 'en')}` };
    });
    download(lang === 'fr' ? 'verijob-employeurs-a-contacter.csv' : 'verijob-employers-to-contact.csv', prospectsToCsv(rows));
  };
  const exportDesignated = () => {
    const rows = desList.map(({ d, star }): Record<string, string | number> => lang === 'fr'
      ? { Employeur: d.employer, Communauté: d.community, Province: provinceLabel(d.province, lang), Programme: d.program === 'RCIP' ? 'PICR' : 'PICRF', Recrutement: tr(S.hiringStatus[d.hiring], lang), 'Métier prioritaire': star ? 'oui' : '', Adresse: d.address, Source: d.sourceUrl, 'Relevé le': d.recordedAt }
      : { Employer: d.employer, Community: d.community, Province: provinceLabel(d.province, lang), Program: d.program, Hiring: tr(S.hiringStatus[d.hiring], lang), 'Priority job': star ? 'yes' : '', Address: d.address, Source: d.sourceUrl, 'Recorded on': d.recordedAt });
    download(lang === 'fr' ? 'verijob-employeurs-designes.csv' : 'verijob-designated-employers.csv', prospectsToCsv(rows));
  };

  return (
    <section>
      <h1>{tr(S.prospectsTitle, lang)}</h1>
      <p>{tr(S.prospectsIntro, lang)}</p>
      <p class="callout">{tr(S.prospectsWarning, lang)}</p>
      <AfricaSection citizenship={profile.citizenship} provinces={profile.provinces ?? []} lang={lang} />

      <fieldset>
        <legend>{tr(S.filters, lang)}</legend>
        <p class="muted">{nocs.length ? `${tr(S.allJobs, lang)} : ${nocs.map((n) => nocName(n, lang)).join(', ')}` : tr(S.noTargetJobs, lang)} — <a href="#/profil">{tr(S.navProfile, lang)}</a></p>
        <label for="pprov">{tr(S.province, lang)}</label>
        <select id="pprov" value={province} onChange={(e) => { setProvince((e.target as HTMLSelectElement).value); setShown(PAGE); }}>
          <option value="">{profile.provinces?.length ? profile.provinces.map((p) => provinceLabel(p, lang)).join(', ') : tr(S.allProvinces, lang).replace(/ \(.*\)/, '')}</option>
          {Object.keys(PROVINCE_NAMES).sort((a, b) => provinceLabel(a, lang).localeCompare(provinceLabel(b, lang), lang)).map((p) => <option value={p}>{provinceLabel(p, lang)}</option>)}
        </select>
        <label class="check"><input type="checkbox" checked={hideAgri} onChange={() => { setHideAgri(!hideAgri); setShown(PAGE); }} />{tr(S.hideAgriOnly, lang)}</label>
        <label class="check"><input type="checkbox" checked={onlyNew} onChange={() => { setOnlyNew(!onlyNew); setShown(PAGE); }} />{tr(S.onlyNew, lang)}</label>
      </fieldset>

      {!all && !error && <p role="status">{tr(S.loading, lang)}</p>}
      {error && <p class="alert">{tr(S.loadError, lang)}</p>}
      {target && <MessagePanel target={target} profile={profile} onClose={() => setTarget(undefined)} />}

      {all && (
        <>
          <div class="row">
            <strong>{list.length} {tr(S.resultsCount, lang)}</strong>
            {list.length > 0 && <button type="button" onClick={exportProspects}>{tr(S.exportCsv, lang)}</button>}
          </div>
          <p class="callout">{tr(S.directContact, lang)}</p>
          <HowToApply lang={lang} />
          {list.slice(0, shown).map((x) => {
            const r = prospectPathway(x, profile, { rules, nocData, nocs });
            const cma = cmaText(x.g, lang, x.s.every((s) => s === 'PA'));
            return (
              <article class="card-result">
                <h3>{x.n}</h3>
                <AfricaBadge name={x.n} lang={lang} />
                {x.q >= RECURRING_QUARTERS && <p><Badge kind="ok">{tr(S.recurringNeed, lang)}</Badge> <span class="muted">{tr(S.recurringNeedText, lang).replace('{q}', String(x.q))}</span></p>}
                {x.nw && <p><Badge kind="info">{tr(S.newRecruiter, lang)}</Badge> <span class="muted">{tr(S.newRecruiterText, lang).replace('{f}', quarterLabel(x.f ?? x.lq, lang)).replace('{start}', quarterLabel(windowStart || '?', lang))}</span></p>}
                <p>{x.c}, {provinceLabel(x.p, lang)} <Badge kind={cma.kind}>{cma.text}</Badge></p>
                <p>{x.q} {tr(S.quartersSeen, lang)} ({tr(S.lastQuarter, lang)} : {x.lq}) — {totalPositions(x, nocSet)} {tr(totalPositions(x, nocSet) > 1 ? S.positions : S.position, lang)}</p>
                <p class="muted">{x.j.filter(([n]) => !nocSet || nocSet.has(n)).map(([n, c]) => `${nocName(n, lang)} (${c})`).join(' ; ')}</p>
                {x.neg > 0 && <p class="warn">{x.neg} {tr(x.neg > 1 ? S.refused : S.refusedOne, lang)}</p>}
                {x.s.length === 1 && x.s[0] === 'PA' && <p class="muted">{tr(S.paWarning, lang)}</p>}
                <p>{tr(S.bestRoute, lang)} : <strong>{r.best.nom[lang]}</strong> <Badge kind={r.best.statut}>{tr(S.status[r.best.statut], lang)}</Badge></p>
                <div class="row">
                  <button type="button" class="primary" onClick={() => { setTarget({ employer: x.n, city: x.c, noc: r.noc, pathway: r.best.voie, lmiaHistory: { quarters: x.q, last: x.lq } }); }}>{tr(S.writeMessage, lang)}</button>
                  <button type="button" onClick={() => openSampleCv({ noc: r.noc, province: x.p })}>{tr(S.sampleOpen, lang)}</button>
                  <button type="button" disabled={isTracked(x.n)} onClick={() => track(x.n, r.noc, { lmiaFound: true })}>{isTracked(x.n) ? `✓ ${tr(S.tracked, lang)}` : tr(S.track, lang)}</button>
                </div>
                <ContactLinks name={x.n} city={x.c} province={x.p} postal={x.pc} lang={lang} />
                {r.noc === SECURITY_NOC && licenceUrl(x.p, lang) && (
                  <p><a href={licenceUrl(x.p, lang)} target="_blank" rel="noopener noreferrer">{tr(S.licenceLink, lang)} — {provinceLabel(x.p, lang)} ↗</a></p>
                )}
              </article>
            );
          })}
          {shown < list.length && <button type="button" onClick={() => setShown(shown + PAGE)}>{tr(S.showMore, lang)}</button>}
        </>
      )}

      <h2>{tr(S.designatedTitle, lang)}</h2>
      <p class="muted">{tr(S.designatedIntro, lang)}</p>
      <div class="row">
        <strong>{desList.length} {tr(S.resultsCount, lang)}</strong>
        {desList.length > 0 && <button type="button" onClick={exportDesignated}>{tr(S.exportCsv, lang)}</button>}
      </div>
      {desList.slice(0, shown).map(({ d, star }) => (
        <article class="card-result">
          <h3>{star ? '⭐ ' : ''}{d.employer}</h3>
          <AfricaBadge name={d.employer} lang={lang} />
          <p>{d.community} ({provinceLabel(d.province, lang)}) — {d.program === 'RCIP' ? (lang === 'fr' ? 'PICR' : 'RCIP') : (lang === 'fr' ? 'PICRF' : 'FCIP')} <Badge kind={d.hiring === 'recrute' ? 'ok' : 'info'}>{tr(S.hiringStatus[d.hiring], lang)}</Badge></p>
          {star && <p class="ok">{tr(S.priorityJob, lang)}</p>}
          <div class="row">
            <button type="button" class="primary" onClick={() => { setTarget({ employer: d.employer, city: d.community, noc: nocs[0] ?? '44101', designated: { program: d.program, community: d.community } }); }}>{tr(S.writeMessage, lang)}</button>
            <a class="button" href={d.sourceUrl} target="_blank" rel="noopener noreferrer">{d.community}</a>
            <button type="button" disabled={isTracked(d.employer)} onClick={() => track(d.employer, nocs[0] ?? '44101', { designated: true })}>{isTracked(d.employer) ? `✓ ${tr(S.tracked, lang)}` : tr(S.track, lang)}</button>
          </div>
          {d.address && <p>{tr(S.location, lang)} : {d.address}</p>}
          <ContactLinks name={d.employer} city={d.community} province={d.province} lang={lang} />
          <p class="muted">{tr(S.recordedOn, lang)} {d.recordedAt}</p>
        </article>
      ))}
    </section>
  );
}
