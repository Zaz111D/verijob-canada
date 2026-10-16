/**
 * Le marché des métiers du profil (onglet Emplois) : STATISTIQUES des données ouvertes mensuelles du Guichet-Emplois.
 * Ces données n'ont ni lien ni numéro d'offre (vérifié le 16 oct. 2026) : on n'affiche donc pas d'« offres » à cliquer,
 * mais des chiffres, et un bouton par province vers la recherche officielle « ouvert aux candidats étrangers » (mode liens).
 */
import { useEffect, useState } from 'preact/hooks';
import { findNoc, formatAmount, jobBankLink, PROVINCE_NAMES, type PostingsData, type ProvinceCode } from '@verijob/core';
import { loadPostings, nocData, rules } from '../data';
import { STRINGS as S, tr, type Lang } from '../i18n';

const MONTHS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const monthName = (ym: string, lang: Lang) => `${(lang === 'fr' ? MONTHS_FR : MONTHS_EN)[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;
const ext = { target: '_blank', rel: 'noopener noreferrer' } as const;

export function RecentPostings({ nocs, provinces, lang }: { nocs: string[]; provinces: ProvinceCode[]; lang: Lang }) {
  const [data, setData] = useState<{ d: PostingsData; source: string }>();
  useEffect(() => { loadPostings().then((f) => setData({ d: f.data, source: f.source.url })).catch(() => undefined); }, []);
  if (!data) return null;
  const { d } = data;
  return (
    <>
      <h2>{tr(S.postingsTitle, lang)}</h2>
      <p class="muted">{tr(S.postingsIntro, lang)}</p>
      <p><strong>{tr(S.postingsMonth, lang)} {monthName(d.month, lang)}</strong> — <a href={data.source} {...ext}>open.canada.ca ↗</a></p>
      {!nocs.length && <p class="muted">{tr(S.postingsNeedProfile, lang)} <a href="#/profil">{tr(S.navProfile, lang)}</a></p>}
      {nocs.map((code) => {
        const n = findNoc(nocData, code);
        const keyword = n?.jobEn ?? code;
        const provs = (provinces.length ? provinces : (Object.keys(d.stats[code] ?? {}) as ProvinceCode[]));
        return (
          <details class="sources" open={nocs.length === 1}>
            <summary><strong>{code} – {lang === 'fr' ? n?.titleFr : n?.titleEn}</strong></summary>
            <ul>
              {provs.map((p) => {
                const s = d.stats[code]?.[p];
                const link = jobBankLink(rules, { keyword, province: p });
                return (
                  <li>
                    <strong>{PROVINCE_NAMES[p][lang]}</strong> : {s ? <>
                      {s.n} {tr(S.statOffers, lang)}, {s.vac} {tr(S.statPositions, lang)}
                      {s.medHourly !== null && <> · {tr(S.statMedian, lang)} {formatAmount(s.medHourly, lang)} $/h</>}
                      {s.noDegreePct !== null && <> · {s.noDegreePct} % {tr(S.statNoDegree, lang)}</>}
                      {s.noExpPct !== null && <> · {s.noExpPct} % {tr(S.statNoExp, lang)}</>}
                      {s.seasonalPct > 0 && <> · {s.seasonalPct} % {tr(S.statSeasonal, lang)}</>}
                    </> : <>0 {tr(S.statOffers, lang)}</>}
                    <br /><a class="button" href={link.url} {...ext}>{tr(S.jobBankProvince, lang)} ↗</a>
                  </li>
                );
              })}
            </ul>
          </details>
        );
      })}
    </>
  );
}
