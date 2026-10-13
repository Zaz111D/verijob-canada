/**
 * Vérificateur d'employeur : listes officielles EIMT (positives / refusées) et employeurs désignés PICR/PICRF.
 * Rappel permanent : absent ≠ faux, présent ≠ cette offre est vraie.
 */
import { useEffect, useState } from 'preact/hooks';
import { EMPLOYER_LIST_WARNING, findNoc, PROVINCE_NAMES, searchEmployers, type ProvinceCode } from '@verijob/core';
import { Badge } from '../components/common';
import {
  loadDesignated, loadEmployers, loadEmployersIndex, nocData, rules,
  type DesignatedEmployer, type EmployerRecord, type EmployersIndex,
} from '../data';
import { STRINGS as S, tr, useLang, type Lang } from '../i18n';
import { useProfile } from '../store';

const ALL = 'ALL';

function provinceLabel(code: string, lang: Lang): string {
  if (code === 'XX') return lang === 'fr' ? 'Siège social hors du Canada' : 'Head office outside Canada';
  return PROVINCE_NAMES[code as ProvinceCode]?.[lang] ?? code;
}

function nocTitle(code: string, index: EmployersIndex | undefined, lang: Lang): string {
  const n = findNoc(nocData, code);
  if (n) return lang === 'fr' ? n.titleFr : n.titleEn;
  return index?.nocTitles[code] ?? code;
}

function CmaStatus({ g }: { g: string }) {
  const lang = useLang();
  if (g === '-') return <Badge kind="ok">{tr(S.cmaOutside, lang)}</Badge>;
  if (g === '?') return <Badge kind="info">{tr(S.cmaUnknown, lang)}</Badge>;
  const frozen = rules.lmiaLowWage.cmas.find((c) => c.name === g)?.frozen;
  return <Badge kind={frozen ? 'moyen' : 'ok'}>{g} — {tr(frozen ? S.cmaFrozen : S.cmaOpen, lang)}</Badge>;
}

function LmiaCard({ r, index }: { r: EmployerRecord; index?: EmployersIndex }) {
  const lang = useLang();
  const quarters = [...new Set(r.p.map((e) => e[0]))].sort();
  const pos = r.p.reduce((s, e) => s + e[4], 0);
  const neg = r.x.reduce((s, e) => s + e[4], 0);
  const nocs = [...new Set([...r.p, ...r.x].map((e) => e[2]))];
  const streams = [...new Set(r.p.map((e) => e[1]))];
  return (
    <article class="card-result">
      <h3>{r.n}</h3>
      <p>{tr(S.location, lang)} : {r.c}{r.pc ? ` (${r.pc})` : ''}, {provinceLabel(r.prov ?? '', lang)}</p>
      <p><CmaStatus g={r.g} /></p>
      {pos > 0 && <p><Badge kind="ok">{tr(S.positive, lang)}</Badge> {pos} {tr(S.positions, lang)} — {tr(S.quarters, lang)} : {quarters.join(', ')}</p>}
      {neg > 0 && <p><Badge kind="eleve">{tr(S.negative, lang)}</Badge> {neg} {tr(S.positions, lang)} ({[...new Set(r.x.map((e) => e[0]))].sort().join(', ')})</p>}
      <p>{tr(S.jobs, lang)} : {nocs.map((c) => `${c} – ${nocTitle(c, index, lang)}`).join(' ; ')}</p>
      {streams.length > 0 && <p>{tr(S.streams, lang)} : {streams.map((s) => index?.streams[s]?.[lang] ?? s).join(', ')}</p>}
      {streams.includes('PA') && <p class="muted">{tr(S.paWarning, lang)}</p>}
    </article>
  );
}

function DesignatedCard({ d }: { d: DesignatedEmployer[] }) {
  const lang = useLang();
  const first = d[0]!;
  return (
    <article class="card-result">
      <h3>{first.employer}</h3>
      <p>{first.community} ({provinceLabel(first.province, lang)}) — {[...new Set(d.map((x) => x.program === 'RCIP' ? (lang === 'fr' ? 'PICR' : 'RCIP') : (lang === 'fr' ? 'PICRF' : 'FCIP')))].join(' + ')}</p>
      {first.address && <p>{tr(S.location, lang)} : {first.address}</p>}
      <p><Badge kind={first.hiring === 'recrute' ? 'ok' : first.hiring === 'inconnu' ? 'info' : 'moyen'}>{tr(S.hiringStatus[first.hiring], lang)}</Badge></p>
      <p class="muted"><a href={first.sourceUrl} target="_blank" rel="noopener noreferrer">{first.community}</a> — {tr(S.recordedOn, lang)} {first.recordedAt}</p>
    </article>
  );
}

export function CheckEmployer() {
  const lang = useLang();
  const profile = useProfile();
  const [index, setIndex] = useState<EmployersIndex>();
  const [province, setProvince] = useState<string>('');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [lmia, setLmia] = useState<EmployerRecord[] | undefined>();
  const [designated, setDesignated] = useState<DesignatedEmployer[][] | undefined>();

  useEffect(() => {
    loadEmployersIndex().then((f) => setIndex(f.data)).catch(() => setError(true));
  }, []);
  useEffect(() => {
    if (!province) setProvince(profile.provinces?.[0] ?? ALL);
  }, [profile]);

  const run = async (e?: Event) => {
    e?.preventDefault();
    if (!query.trim() || !index) return;
    setBusy(true); setError(false);
    try {
      const provs = province === ALL ? Object.keys(index.provinces) : [province];
      const records = (await Promise.all(provs.map(loadEmployers))).flat();
      setLmia(searchEmployers(records, query, 15).map((h) => h.item));
      const des = (await loadDesignated()).data;
      const groups = new Map<string, DesignatedEmployer[]>();
      for (const h of searchEmployers(des, query, 30)) {
        const key = `${h.item.community}|${h.item.k}`;
        groups.set(key, [...(groups.get(key) ?? []), h.item]);
      }
      setDesignated([...groups.values()].slice(0, 10));
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  const provinces = index ? Object.keys(index.provinces).sort((a, b) => provinceLabel(a, lang).localeCompare(provinceLabel(b, lang), lang)) : [];
  return (
    <section>
      <h1>{tr(S.employerTitle, lang)}</h1>
      <p>{tr(S.employerHelp, lang)}</p>
      <form onSubmit={(e) => void run(e)}>
        <label for="emp">{tr(S.employerName, lang)}</label>
        <input id="emp" type="search" autocomplete="off" value={query} onInput={(e) => setQuery((e.target as HTMLInputElement).value)} />
        <label for="prov">{tr(S.province, lang)}</label>
        <select id="prov" value={province} onChange={(e) => setProvince((e.target as HTMLSelectElement).value)}>
          <option value={ALL}>{tr(S.allProvinces, lang)}</option>
          {provinces.map((p) => <option value={p}>{provinceLabel(p, lang)}</option>)}
        </select>
        <button type="submit" class="primary" disabled={busy || !query.trim() || !index}>{tr(S.search, lang)}</button>
      </form>

      <p class="callout">{EMPLOYER_LIST_WARNING[lang]}</p>
      {index && <p class="muted">{tr(S.dataDate, lang)} {index.quarters[0]?.quarter} → {index.quarters.at(-1)?.quarter} — <a href={index.datasets.positive} target="_blank" rel="noopener noreferrer">open.canada.ca</a></p>}
      {busy && <p role="status">{tr(S.loading, lang)}</p>}
      {error && <p class="alert">{tr(S.loadError, lang)}</p>}

      {lmia && !busy && (
        <div class="result" aria-live="polite">
          <h2>{lmia.length ? tr(S.lmiaFound, lang) : tr(S.lmiaNotFound, lang)}</h2>
          {lmia.map((r) => <LmiaCard r={r} index={index} />)}
          <h2>{designated?.length ? tr(S.designatedFound, lang) : tr(S.designatedNone, lang)}</h2>
          {designated?.map((d) => <DesignatedCard d={d} />)}
        </div>
      )}
    </section>
  );
}
