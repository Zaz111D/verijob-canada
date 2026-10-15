/**
 * Vérificateur de CV : le fichier est lu sur le téléphone (cvfile.ts), analysé par @verijob/core (analyzeCv).
 * Rien n'est envoyé ni enregistré.
 */
import { useEffect, useState } from 'preact/hooks';
import { analyzeCv, type CvAnalysis, type CvCategory, type CvCheck } from '@verijob/core';
import { Badge, Sources } from '../components/common';
import { CvFileError, readCvFile } from '../cvfile';
import { rules } from '../data';
import { STRINGS as S, tr, useLang, type Lang } from '../i18n';
import { openSampleCv } from './SampleCv';

/** Offre transmise par une autre page (ex. « Vérifier mon CV pour cette offre » dans le Suivi). */
const HANDOFF_KEY = 'verijob-cv-offre';

export function openCvCheck(offerText: string) {
  try { sessionStorage.setItem(HANDOFF_KEY, offerText); } catch { /* l'utilisateur collera l'offre */ }
  location.hash = '#/cv';
}

const KIND = { 'a-corriger': 'eleve', conseil: 'moyen', ok: 'ok' } as const;
const CATEGORIES: CvCategory[] = ['lisibilite', 'format', 'contenu', 'coherence', 'offre'];

function CheckCard({ c, lang }: { c: CvCheck; lang: Lang }) {
  return (
    <article class={`signal sev-${KIND[c.status]}`}>
      <Badge kind={KIND[c.status]}>{tr(S.cvStatus[c.status], lang)}</Badge>
      <h3>{c.title[lang]}</h3>
      <p>{c.explanation[lang]}</p>
      {c.evidence.length > 0 && (
        <>
          <p class="muted">{tr(c.category === 'offre' ? S.cvMissingWords : S.cvEvidence, lang)}</p>
          <ul class="evidence">{c.evidence.map((e) => <li>« {e} »</li>)}</ul>
        </>
      )}
      {c.sources.length ? <Sources sources={c.sources} /> : <p class="muted">{tr(S.cvTechnical, lang)}</p>}
    </article>
  );
}

export function CheckCv() {
  const lang = useLang();
  const [file, setFile] = useState<File>();
  const [offer, setOffer] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<CvAnalysis>();

  useEffect(() => {
    try {
      const handed = sessionStorage.getItem(HANDOFF_KEY);
      sessionStorage.removeItem(HANDOFF_KEY);
      if (handed) setOffer(handed);
    } catch { /* voir openCvCheck */ }
  }, []);

  const run = async () => {
    if (!file) return;
    setBusy(true); setError(undefined); setResult(undefined);
    try {
      const input = await readCvFile(file);
      setResult(analyzeCv(input, { rules, offerText: offer, today: new Date().toISOString().slice(0, 10) }));
    } catch (e) {
      setError(tr(S.cvErr[e instanceof CvFileError ? e.code : 'illisible'], lang));
    }
    setBusy(false);
  };

  const builder = rules.cv.resumeBuilder[lang];
  return (
    <section>
      <h1>{tr(S.cvTitle, lang)}</h1>
      <p>{tr(S.cvIntro, lang)}</p>
      <p class="callout">{tr(S.cvPrivacy, lang)}</p>
      <label>{tr(S.cvFile, lang)}
        <input type="file" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          onChange={(e) => { setFile((e.target as HTMLInputElement).files?.[0]); setResult(undefined); setError(undefined); }} />
      </label>
      <label for="cv-offer">{tr(S.cvOffer, lang)}</label>
      <textarea id="cv-offer" rows={6} value={offer} onInput={(e) => setOffer((e.target as HTMLTextAreaElement).value)} />
      <div class="row">
        <button type="button" class="primary" disabled={!file || busy} onClick={() => void run()}>{tr(busy ? S.cvReading : S.cvAnalyze, lang)}</button>
        <button type="button" onClick={() => openSampleCv({ text: offer })}>{tr(S.sampleTitle, lang)}</button>
      </div>
      {error && <p class="alert" role="status">{error}</p>}

      {result && (
        <div class="result" aria-live="polite">
          <h2 class={result.toFix ? 'alert' : 'ok'}>{result.summary[lang]}</h2>
          {result.keywords && (
            <article class="card-result">
              <h3>{tr(S.cvCategory.offre, lang)} : {Math.round(result.keywords.ratio * 100)} %</h3>
              <div class="meter" role="img" aria-label={`${Math.round(result.keywords.ratio * 100)} %`}>
                <span style={{ width: `${Math.round(result.keywords.ratio * 100)}%` }} />
              </div>
              {result.keywords.missing.length > 0 && (
                <>
                  <p class="muted">{tr(S.cvMissingWords, lang)}</p>
                  <div class="chips">{result.keywords.missing.map((w) => <span class="chip chip-missing">{w}</span>)}</div>
                </>
              )}
              {result.keywords.matched.length > 0 && (
                <>
                  <p class="muted">{tr(S.cvFoundWords, lang)}</p>
                  <div class="chips">{result.keywords.matched.map((w) => <span class="chip">✓ {w}</span>)}</div>
                </>
              )}
            </article>
          )}
          {CATEGORIES.map((cat) => {
            const items = result.checks.filter((c) => c.category === cat && c.status !== 'ok');
            return items.length ? (<><h2>{tr(S.cvCategory[cat], lang)}</h2>{items.map((c) => <CheckCard c={c} lang={lang} />)}</>) : null;
          })}
          {result.checks.some((c) => c.status === 'ok') && (
            <details class="sources">
              <summary>{tr(S.cvShowOk, lang)} ({result.checks.filter((c) => c.status === 'ok').length})</summary>
              {result.checks.filter((c) => c.status === 'ok').map((c) => <CheckCard c={c} lang={lang} />)}
            </details>
          )}
          <p class="muted">{result.disclaimer[lang]}</p>
          <p class="callout">{tr(S.cvBuilder, lang)} <a href={builder} target="_blank" rel="noopener noreferrer">↗</a></p>
        </div>
      )}
    </section>
  );
}
