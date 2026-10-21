/**
 * Vérificateur d'offre : analyse locale d'un message collé (aucun envoi sur Internet).
 */
import { useEffect, useState } from 'preact/hooks';
import { analyzeOffer, employerKey, publisherCheck, PROVINCE_NAMES, SEVERITY_LABEL, type PublisherCheck, type ScamAnalysis } from '@verijob/core';
import { Badge, Sources } from '../components/common';
import { getWageLookup, loadEmployerContacts, nocData, rules, type EmployerContact } from '../data';
import { openEmployerCheck } from './CheckEmployer';
import { STRINGS as S, tr, useLang, type Lang } from '../i18n';
import { useProfile } from '../store';

const EXAMPLE = `URGENT !!! Recrutement pour fermes au Canada 🇨🇦
Visa garanti à 100%, sans entretien. Salaire 7000$ par mois.
Frais de dossier EIMT : 350 000 FCFA à envoyer par Western Union avant vendredi.
Places limitées ! Contact : canada.recrutement2026@gmail.com`;

/** Texte transmis par une autre page (ex. « Analyser cette annonce » dans le Suivi). */
const HANDOFF_KEY = 'verijob-offre-a-analyser';

export function openOfferCheck(text: string) {
  try { sessionStorage.setItem(HANDOFF_KEY, text); } catch { /* stockage indisponible : l'utilisateur collera le texte */ }
  location.hash = '#/offre';
}

export function CheckOffer() {
  const lang = useLang();
  const profile = useProfile();
  const [text, setText] = useState('');
  const [result, setResult] = useState<ScamAnalysis | undefined>();
  const [company, setCompany] = useState('');
  const [individual, setIndividual] = useState(false);
  const [who, setWho] = useState<{ check: PublisherCheck; official: EmployerContact[] } | undefined>();

  const run = async (t = text) => {
    if (!t.trim()) return;
    const wageLookup = await getWageLookup();
    setResult(analyzeOffer(t, { rules, nocData, profile, wageLookup }));
    const check = publisherCheck(t, company);
    let official: EmployerContact[] = [];
    if (company.trim()) {
      const all = await loadEmployerContacts().then((f) => f.data).catch(() => [] as EmployerContact[]);
      official = all.filter((c) => c.k === employerKey(company));
      // Domaine officiel relevé (site ou e-mail de l'entreprise) : la publication cite bien l'entreprise.
      const host = (u: string) => u.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]!.toLowerCase();
      const officialDomains = new Set(official.flatMap((c) => [host(c.source), ...(c.email ? [c.email.split('@')[1]!] : [])]));
      if (check.link === 'autre' && check.domains.some((d) => officialDomains.has(d))) check.link = 'lie';
    }
    setWho({ check, official });
  };

  useEffect(() => {
    let handed: string | null = null;
    try { handed = sessionStorage.getItem(HANDOFF_KEY); sessionStorage.removeItem(HANDOFF_KEY); } catch { /* voir openOfferCheck */ }
    if (handed) { setText(handed); void run(handed); }
  }, []);

  return (
    <section>
      <h1>{tr(S.offerTitle, lang)}</h1>
      <p>{tr(S.offerHelp, lang)}</p>
      <label class="sr-only" for="offer">{tr(S.offerTitle, lang)}</label>
      <textarea id="offer" rows={8} value={text} placeholder={tr(S.offerPlaceholder, lang)}
        onInput={(e) => setText((e.target as HTMLTextAreaElement).value)} />
      <label>{tr(S.postCompany, lang)}<input value={company} placeholder={tr(S.postCompanyPlaceholder, lang)} onInput={(e) => setCompany((e.target as HTMLInputElement).value)} /></label>
      <label class="check"><input type="checkbox" checked={individual} onChange={(e) => setIndividual((e.target as HTMLInputElement).checked)} /> {tr(S.postIndividual, lang)}</label>
      <div class="row">
        <button type="button" class="primary" onClick={() => void run()} disabled={!text.trim()}>{tr(S.offerButton, lang)}</button>
        <button type="button" onClick={() => { setText(''); setResult(undefined); }}>{tr(S.offerClear, lang)}</button>
        <button type="button" class="link" onClick={() => { setText(EXAMPLE); void run(EXAMPLE); }}>{tr(S.offerExample, lang)}</button>
      </div>

      {result && (
        <div class="result" aria-live="polite">
          <h2 class={result.count ? 'alert' : 'ok'}>{result.summary[lang]}</h2>
          {(result.detectedNoc || result.detectedProvince) && (
            <p class="muted">
              {tr(S.detected, lang)} :{' '}
              {result.detectedNoc && <>{tr(S.detectedJob, lang)} {result.detectedNoc.code} – {result.detectedNoc.title[lang]}. </>}
              {result.detectedProvince && <>{tr(S.detectedProvince, lang)} : {PROVINCE_NAMES[result.detectedProvince][lang]}.</>}
            </p>
          )}
          {result.signals.map((s) => (
            <article class={`signal sev-${s.severity}`}>
              <Badge kind={s.severity}>{SEVERITY_LABEL[s.severity][lang]}</Badge>
              <h3>{s.title[lang]}</h3>
              <p>{s.explanation[lang]}</p>
              <p class="muted">{tr(S.evidence, lang)}</p>
              <ul class="evidence">{s.evidence.map((e) => <li>« {e} »</li>)}</ul>
              <Sources sources={s.sources} />
            </article>
          ))}
          {who && <Publisher who={who} company={company} individual={individual} lang={lang} />}
          {result.skipped.map((k) => <p class="muted">{tr(S.notEvaluated, lang)} : {k.reason[lang]}</p>)}
          {result.count > 0 && <p class="callout">{tr(S.afterSignals, lang)}</p>}
          <p><a href="#/employeur">{tr(S.cardEmployerTitle, lang)}</a> · <a href="#/consultant">{tr(S.cardConsultantTitle, lang)}</a></p>
        </div>
      )}
    </section>
  );
}

/** « Qui publie ? » : publication d'un particulier, adresses citées comparées à l'entreprise, coordonnées officielles. */
function Publisher({ who, company, individual, lang }: { who: { check: PublisherCheck; official: EmployerContact[] }; company: string; individual: boolean; lang: Lang }) {
  const { check, official } = who;
  return (
    <article class="card-result">
      <h3>{tr(S.postWhoTitle, lang)}</h3>
      {individual && <p class="warn">{tr(S.postIndividualWarning, lang)}</p>}
      {check.domains.length > 0 && <p class="muted">{tr(S.postDomains, lang)} {check.domains.join(', ')}</p>}
      {check.link === 'lie' && <p>{tr(S.postLinkOwn, lang)}</p>}
      {check.link === 'autre' && <p class="warn">{tr(S.postLinkOther, lang)}</p>}
      {check.link === 'aucun' && <p class="warn">{tr(S.postLinkNone, lang)}</p>}
      {check.link === undefined && <p class="muted">{tr(S.postNoCompany, lang)}</p>}
      {check.foreignPhones.length > 0 && <p class="warn">{tr(S.postForeignPhone, lang).replace('{p}', check.foreignPhones.join(', '))}</p>}
      {official.filter((c) => c.status === 'verifie').map((c) => (
        <p>
          {tr(S.postOfficial, lang)} {c.phone && <a href={`tel:+1${c.phone.replace(/^1-/, '').replace(/-/g, '')}`}>📞 {c.phone}</a>} {c.email && <a href={`mailto:${c.email}`}>✉ {c.email}</a>}{' '}
          <span class="muted">(<a href={c.source} target="_blank" rel="noopener noreferrer nofollow">{c.source.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}</a>, {c.recordedAt})</span>
        </p>
      ))}
      {company.trim() && <button type="button" onClick={() => openEmployerCheck(company.trim())}>{tr(S.postCheckEmployer, lang)}</button>}
    </article>
  );
}
