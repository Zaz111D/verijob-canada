/**
 * « Employeurs qui ont fait leurs preuves en Afrique » (onglet Démarcher) et badge par employeur.
 * Seulement des preuves publiques datées (data/manual/recrutement-afrique.csv), plus les chiffres
 * officiels d'IRCC pour le pays de l'utilisateur. Aucune déduction ni estimation.
 */
import { useEffect, useState } from 'preact/hooks';
import {
  formatAmount, formatDate, isAfrican, isOldEvidence, permitSummary, PROVINCE_NAMES, recruiterEvidence, sortRecruiters, sourceRef, EVIDENCE_LABEL,
  type AfricanRecruiter, type PermitsData, type ProvinceCode,
} from '@verijob/core';
import { loadAfricanRecruiters, loadPermits, rules } from '../data';
import { STRINGS as S, tr, type Lang } from '../i18n';
import { Badge, Sources } from './common';
import { ContactLinks } from './ContactLinks';

const today = () => new Date().toISOString().slice(0, 10);
const ext = { target: '_blank', rel: 'noopener noreferrer' } as const;

/** Nom d'un pays dans la langue de l'interface (ex. CM → « Cameroun »). */
function countryName(code: string, lang: Lang): string {
  try { return new Intl.DisplayNames([lang === 'fr' ? 'fr-CA' : 'en-CA'], { type: 'region' }).of(code) ?? code; } catch { return code; }
}

function useRecruiters(): AfricanRecruiter[] | undefined {
  const [list, setList] = useState<AfricanRecruiter[]>();
  useEffect(() => { loadAfricanRecruiters().then((f) => setList(f.data)).catch(() => setList([])); }, []);
  return list;
}

function CountryStats({ citizenship, lang }: { citizenship?: string; lang: Lang }) {
  const [data, setData] = useState<PermitsData>();
  useEffect(() => { loadPermits().then((f) => setData(f.data)).catch(() => undefined); }, []);
  const src = sourceRef(rules, 'ircc-permits-citizenship', today());
  if (!citizenship || !isAfrican(citizenship)) return <p class="muted">{tr(S.statsChoose, lang)} <a href="#/profil">{tr(S.navProfile, lang)}</a></p>;
  if (!data) return null;
  const { last, current } = permitSummary(data, citizenship);
  const pays = countryName(citizenship.toUpperCase(), lang);
  const n = (x: number) => formatAmount(x, lang);
  const lastMonth = formatDate(`${data.lastMonth}-01`, lang).replace(/^1(er)? /, '');
  return (
    <article class="card-result">
      <h3>{tr(S.statsTitle, lang)} — {pays}</h3>
      {last && (
        <p>
          <strong>{last.year}</strong> : ≈ <strong>{n(last.tfwp)}</strong> {tr(S.statsTfwp, lang).replace('{pays}', pays)}
          {last.africanRank && <> ({tr(S.statsRank, lang).replace('{n}', String(last.africanRank))})</>}
          {' '}· ≈ {n(last.imp)} {tr(S.statsImp, lang)}.
        </p>
      )}
      {current && (
        <p><strong>{current.year}</strong> ({tr(S.statsPartial, lang)} {lastMonth}) : ≈ {n(current.tfwp)} PTET/TFWP · ≈ {n(current.imp)} PMI/IMP.</p>
      )}
      <p class="muted">{tr(S.statsNote, lang)}</p>
      <Sources sources={[src]} />
    </article>
  );
}

function RecruiterCard({ r, citizenship, lang }: { r: AfricanRecruiter; citizenship?: string; lang: Lang }) {
  const mine = !!citizenship && r.countries.includes(citizenship.toUpperCase());
  const old = isOldEvidence(r, today());
  return (
    <article class={`card-result ${old ? 'sev-moyen' : ''}`}>
      <div class="route-head"><strong>{r.employer}</strong>{mine && <Badge kind="ok">{tr(S.africaYourCountry, lang)}</Badge>}</div>
      <p>{[r.city, PROVINCE_NAMES[r.province as ProvinceCode]?.[lang] ?? r.province].filter(Boolean).join(', ')}{r.sector ? ` — ${r.sector}` : ''}</p>
      <p><Badge kind="info">{tr(EVIDENCE_LABEL[r.type], lang)}</Badge></p>
      <p>{r.evidence[lang]}</p>
      <p class="muted">{tr(S.africaCountries, lang)} : {r.countries.map((c) => countryName(c, lang)).join(', ')}</p>
      {old && <p class="warn">{tr(S.africaOld, lang)}</p>}
      <p class="muted">
        {tr(S.africaSource, lang)} : <a href={r.sourceUrl} {...ext}>{r.sourceTitle} ↗</a>
        {' '}({r.eventDate ? formatDate(r.eventDate, lang) : tr(S.africaUndated, lang)} — {tr(S.africaReadOn, lang)} {formatDate(r.recordedAt, lang)})
      </p>
      <ContactLinks name={r.employer} city={r.city} province={r.province} lang={lang} />
    </article>
  );
}

export function AfricaSection({ citizenship, provinces, lang }: { citizenship?: string; provinces: string[]; lang: Lang }) {
  const list = useRecruiters();
  const who = sourceRef(rules, 'who-safeguards-list', today());
  return (
    <>
      <h2>{tr(S.africaTitle, lang)}</h2>
      <p class="muted">{tr(S.africaIntro, lang)}</p>
      <CountryStats citizenship={citizenship} lang={lang} />
      {list && !list.length && <p class="muted">{tr(S.africaNone, lang)}</p>}
      {list && sortRecruiters(list, { citizenship, provinces, today: today() }).map((r) => <RecruiterCard r={r} citizenship={citizenship} lang={lang} />)}
      <p class="callout">{tr(S.whoNote, lang)}</p>
      <Sources sources={[who, sourceRef(rules, 'ircc-country-profiles', today())]} />
    </>
  );
}

/** Badge à côté d'un employeur quand une preuve publique de recrutement en Afrique existe. */
export function AfricaBadge({ name, lang }: { name: string; lang: Lang }) {
  const list = useRecruiters();
  const ev = list ? recruiterEvidence(list, name) : [];
  if (!ev.length) return null;
  return <p><a href={ev[0]!.sourceUrl} {...ext}><Badge kind="ok">✓ {tr(S.africaBadge, lang)}</Badge></a></p>;
}
