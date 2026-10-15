/**
 * Offres récentes (onglet Emplois), d'après les données ouvertes mensuelles du Guichet-Emplois.
 * Pas d'employeur ni de lien dans ces données : on renvoie vers une recherche Guichet-Emplois (mode liens).
 */
import { useEffect, useState } from 'preact/hooks';
import {
  EDUCATION_LABEL, EXPERIENCE_LABEL, findNoc, formatAmount, formatDate, jobBankLink, PROVINCE_NAMES, recentPostings, TERM_LABEL, TYPE_LABEL,
  type PostingsData, type PostingView, type ProvinceCode,
} from '@verijob/core';
import { loadPostings, nocData, rules } from '../data';
import { STRINGS as S, tr, type Lang } from '../i18n';
import { Badge } from './common';
import { openSampleCv } from '../pages/SampleCv';
import { countGroups, inTab, makeGrouper, TestLine, TestTabs, type Grouped, type TestTab } from './TestGroups';
import { useProfile } from '../store';

const MONTHS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const monthName = (ym: string, lang: Lang) => `${(lang === 'fr' ? MONTHS_FR : MONTHS_EN)[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;

function CmaBadge({ cma, lang }: { cma: string; lang: Lang }) {
  if (cma === '-') return <Badge kind="ok">{tr(S.cmaOutside, lang)}</Badge>;
  if (cma === '?') return null;
  const frozen = rules.lmiaLowWage.cmas.find((c) => c.name === cma)?.frozen;
  return <Badge kind={frozen ? 'moyen' : 'info'}>{cma} · {tr(frozen ? S.cmaFrozen : S.cmaOpen, lang)}</Badge>;
}

function PostingCard({ p, g, lang }: { p: PostingView; g: Grouped; lang: Lang }) {
  const link = jobBankLink(rules, { keyword: p.title });
  const facts = [
    p.salary?.[lang],
    p.type && tr(TYPE_LABEL[p.type], lang),
    p.term && tr(TERM_LABEL[p.term], lang),
    p.education && tr(EDUCATION_LABEL[p.education], lang),
    p.experience && tr(EXPERIENCE_LABEL[p.experience], lang),
    p.vacancies > 1 ? `${p.vacancies} ${tr(S.positionsShort, lang)}` : null,
  ].filter(Boolean);
  return (
    <article class="card-result">
      <h3>{p.title}</h3>
      <p class="muted">{tr(S.postedOn, lang)} {formatDate(p.date, lang)} — {p.city || '—'} ({p.province})</p>
      <p><CmaBadge cma={p.cma} lang={lang} /></p>
      <p>{facts.join(' · ')}</p>
      <TestLine g={g} lang={lang} />
      <div class="row">
        <a class="button" href={link.url} target="_blank" rel="noopener noreferrer">{tr(S.findOnJobBank, lang)} ↗</a>
        <button type="button" onClick={() => openSampleCv({ noc: p.noc, title: p.title, province: p.province })}>{tr(S.sampleOpen, lang)}</button>
      </div>
    </article>
  );
}

export function RecentPostings({ nocs, provinces, lang }: { nocs: string[]; provinces: ProvinceCode[]; lang: Lang }) {
  const [data, setData] = useState<{ d: PostingsData; source: string }>();
  const [tab, setTab] = useState<TestTab>('sans-test');
  const profile = useProfile();
  useEffect(() => { loadPostings().then((f) => setData({ d: f.data, source: f.source.url })).catch(() => undefined); }, []);
  if (!data) return null;
  const { d } = data;
  // Lieu → situation RMR connue (gel des EIMT bas salaire) pour une évaluation juste de la voie.
  const grouper = makeGrouper(profile);
  const groupOf = (p: PostingView) => grouper({ noc: p.noc, province: p.province, ...(p.cma === '-' ? { outsideCma: true } : p.cma !== '?' ? { city: p.cma } : {}) });
  const all = nocs.flatMap((code) => recentPostings(d, code, provinces, 8).map((p) => ({ p, g: groupOf(p) })));
  const counts = countGroups(all.map((e) => e.g));
  return (
    <>
      <h2>{tr(S.postingsTitle, lang)}</h2>
      <p class="muted">{tr(S.postingsIntro, lang)}</p>
      <p><strong>{tr(S.postingsMonth, lang)} {monthName(d.month, lang)}</strong> — <a href={data.source} target="_blank" rel="noopener noreferrer">open.canada.ca ↗</a></p>
      {all.length > 0 && <TestTabs counts={counts} value={tab} onChange={setTab} lang={lang} />}
      {!nocs.length && <p class="muted">{tr(S.postingsNeedProfile, lang)} <a href="#/profil">{tr(S.navProfile, lang)}</a></p>}
      {nocs.map((code) => {
        const n = findNoc(nocData, code);
        const list = all.filter((e) => e.p.noc === code && inTab(e.g, tab));
        const provs = (provinces.length ? provinces : (Object.keys(d.stats[code] ?? {}) as ProvinceCode[]));
        return (
          <details class="sources" open={nocs.length === 1}>
            <summary><strong>{code} – {lang === 'fr' ? n?.titleFr : n?.titleEn}</strong></summary>
            <ul>
              {provs.map((p) => {
                const s = d.stats[code]?.[p];
                if (!s) return provinces.length ? <li>{PROVINCE_NAMES[p][lang]} : 0 {tr(S.statOffers, lang)}</li> : null;
                return (
                  <li>
                    <strong>{PROVINCE_NAMES[p][lang]}</strong> : {s.n} {tr(S.statOffers, lang)}, {s.vac} {tr(S.statPositions, lang)}
                    {s.medHourly !== null && <> · {tr(S.statMedian, lang)} {formatAmount(s.medHourly, lang)} $/h</>}
                    {s.noDegreePct !== null && <> · {s.noDegreePct} % {tr(S.statNoDegree, lang)}</>}
                    {s.noExpPct !== null && <> · {s.noExpPct} % {tr(S.statNoExp, lang)}</>}
                    {s.seasonalPct > 0 && <> · {s.seasonalPct} % {tr(S.statSeasonal, lang)}</>}
                  </li>
                );
              })}
            </ul>
            {list.length ? list.map(({ p, g }) => <PostingCard p={p} g={g} lang={lang} />) : <p class="muted">{tr(S.postingsNone, lang)}</p>}
          </details>
        );
      })}
    </>
  );
}
