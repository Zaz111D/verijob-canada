/**
 * Offres ouvertes aux candidats de l'étranger : carte d'une annonce Adzuna triée par le pipeline (classifyInternational)
 * et outils communs aux cartes d'offres (salaire, liens pour postuler). La liste est dans « Où postuler maintenant ».
 * Conditions de l'API Adzuna : chaque annonce affichée porte la mention « Adzuna » liée à adzuna.ca.
 */
import { employerSearchName, findNoc, jobBankLink, formatAmount, formatDate, type InternationalOffer, type ProvinceCode } from '@verijob/core';
import { nocData, rules } from '../data';
import { careersSearchUrl } from './ContactLinks';
import { STRINGS as S, tr, type Lang } from '../i18n';
import { openOfferCheck } from '../pages/CheckOffer';
import { openSampleCv } from '../pages/SampleCv';
import { Badge } from './common';
import { TestLine, type Grouped } from './TestGroups';

const ext = { target: '_blank', rel: 'noopener noreferrer nofollow' } as const;
export const ADZUNA = 'https://www.adzuna.ca/';

export function salary(o: { salaryMin: number | null; salaryMax: number | null; salaryPredicted: boolean }, lang: Lang): string | null {
  if (o.salaryMin === null) return null;
  // Adzuna ne précise pas l'unité : un montant de moins de 200 $ est un taux horaire, sinon un salaire annuel.
  const hourly = o.salaryMin < 200;
  const v = (n: number) => (hourly ? n : Math.round(n));
  const f = (n: number) => (lang === 'fr' ? `${formatAmount(v(n), 'fr')} $` : `$${formatAmount(v(n), 'en')}`);
  const unit = hourly ? '/h' : lang === 'fr' ? '/an' : '/year';
  const range = `${o.salaryMax && o.salaryMax > o.salaryMin ? `${f(o.salaryMin)} – ${f(o.salaryMax)}` : f(o.salaryMin)}${unit}`;
  return o.salaryPredicted ? `${range} (${tr(S.intlEstimated, lang)})` : range;
}

/** Titre sans précisions de quart ou de contrat (« Cook - Night Shift (Full time) » → « Cook »), pour une recherche. */
export function coreTitle(title: string): string {
  return title.split(/\s[-–|]\s|\s\(|\(/)[0]!.trim() || title;
}

/**
 * Comment atteindre l'annonce d'origine. Vu de l'étranger, Adzuna affiche le texte mais BLOQUE le bouton
 * « Postuler » (« not available in your region », constaté le 16 oct. 2026 depuis le Cameroun) :
 * on propose donc la recherche Guichet-Emplois (titre + employeur + province) et la page Carrières de l'employeur.
 */
export function OfferLinks({ o, lang }: { o: { title: string; company: string; location: string; province?: ProvinceCode; url: string }; lang: Lang }) {
  const jb = jobBankLink(rules, { keyword: [coreTitle(o.title), o.company && employerSearchName(o.company)].filter(Boolean).join(' '), province: o.province, anyCandidate: true });
  const city = o.location.split(',')[0] ?? '';
  return (
    <div class="row">
      <a class="button primary" href={jb.url} {...ext}>{tr(S.offerOnJobBank, lang)} ↗</a>
      {o.company && <a class="button" href={careersSearchUrl(o.company, city)} {...ext}>{tr(S.offerEmployerSite, lang)} ↗</a>}
      <a class="button" href={o.url} {...ext}>{tr(S.offerReadAdzuna, lang)} ↗</a>
    </div>
  );
}

export function OfferCard({ o, g, lang }: { o: InternationalOffer; g: Grouped; lang: Lang }) {
  const sal = salary(o, lang);
  const noc = findNoc(nocData, o.noc);
  return (
    <article class={`card-result ${o.scam.length ? 'sev-moyen' : ''}`}>
      <h3>{o.title}</h3>
      <p>{o.company || '—'} — {o.location}{o.province ? ` (${o.province})` : ''}</p>
      <p class="muted">{formatDate(o.date, lang)}{noc ? ` · ${noc.code} – ${lang === 'fr' ? noc.titleFr : noc.titleEn}` : ''}{sal ? ` · ${sal}` : ''}</p>
      {o.evidence.length > 0 ? (
        <>
          <p><Badge kind="ok">✓ {tr(S.intlTitle, lang)}</Badge></p>
          <p class="muted">{tr(S.intlProof, lang)} :</p>
          {o.evidence.slice(0, 2).map((e) => <p class="quote">« {e} »</p>)}
        </>
      ) : (
        <>
          <p><Badge kind="info">{tr(S.intlMatchedBadge, lang)}</Badge></p>
          <p class="muted">{tr(S.intlMatched, lang).replace('{mots}', (o.matched ?? []).map((m) => `« ${m} »`).join(', '))}</p>
        </>
      )}
      {o.lmia && (
        <p class="ok">✓ {tr(S.intlLmia, lang).replace('{n}', String(o.lmia.positions)).replace('{q}', o.lmia.lastQuarter)}{o.lmia.sameNoc ? tr(S.intlLmiaSameNoc, lang) : ''}. <a href="#/employeur">{tr(S.cardEmployerTitle, lang)} →</a></p>
      )}
      <TestLine g={g} lang={lang} />
      {o.caution.length > 0 && <p class="warn">{tr(S.intlCaution, lang)}</p>}
      {o.scam.length > 0 && <p class="alert">{o.scam.length} {tr(S.intlScam, lang)}</p>}
      <OfferLinks o={o} lang={lang} />
      <div class="row">
        <button type="button" onClick={() => openOfferCheck(`${o.title}\n${o.company}\n${o.location}\n${o.snippet}`)}>{tr(S.intlAnalyze, lang)}</button>
        <button type="button" onClick={() => openSampleCv({ noc: o.noc || undefined, title: o.title, text: o.snippet, province: o.province })}>{tr(S.sampleOpen, lang)}</button>
        <a class="adzuna" href={ADZUNA} {...ext} title={tr(S.intlPoweredBy, lang)}>Adzuna</a>
      </div>
    </article>
  );
}
