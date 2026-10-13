/**
 * Vérificateur d'offre : analyse locale d'un message collé (aucun envoi sur Internet).
 */
import { useState } from 'preact/hooks';
import { analyzeOffer, PROVINCE_NAMES, SEVERITY_LABEL, type ScamAnalysis } from '@verijob/core';
import { Badge, Sources } from '../components/common';
import { getWageLookup, nocData, rules } from '../data';
import { STRINGS as S, tr, useLang } from '../i18n';
import { useProfile } from '../store';

const EXAMPLE = `URGENT !!! Recrutement pour fermes au Canada 🇨🇦
Visa garanti à 100%, sans entretien. Salaire 7000$ par mois.
Frais de dossier EIMT : 350 000 FCFA à envoyer par Western Union avant vendredi.
Places limitées ! Contact : canada.recrutement2026@gmail.com`;

export function CheckOffer() {
  const lang = useLang();
  const profile = useProfile();
  const [text, setText] = useState('');
  const [result, setResult] = useState<ScamAnalysis | undefined>();

  const run = async (t = text) => {
    if (!t.trim()) return;
    const wageLookup = await getWageLookup();
    setResult(analyzeOffer(t, { rules, nocData, profile, wageLookup }));
  };

  return (
    <section>
      <h1>{tr(S.offerTitle, lang)}</h1>
      <p>{tr(S.offerHelp, lang)}</p>
      <label class="sr-only" for="offer">{tr(S.offerTitle, lang)}</label>
      <textarea id="offer" rows={8} value={text} placeholder={tr(S.offerPlaceholder, lang)}
        onInput={(e) => setText((e.target as HTMLTextAreaElement).value)} />
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
          {result.skipped.map((k) => <p class="muted">{tr(S.notEvaluated, lang)} : {k.reason[lang]}</p>)}
          {result.count > 0 && <p class="callout">{tr(S.afterSignals, lang)}</p>}
          <p><a href="#/employeur">{tr(S.cardEmployerTitle, lang)}</a> · <a href="#/consultant">{tr(S.cardConsultantTitle, lang)}</a></p>
        </div>
      )}
    </section>
  );
}
