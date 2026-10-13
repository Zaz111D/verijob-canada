/**
 * Vérificateur de consultant : guide pas à pas + lien direct vers le registre public du CICC.
 * Aucune interrogation automatique du registre (pas de scraping).
 */
import { useState } from 'preact/hooks';
import { sourceRef } from '@verijob/core';
import { Sources } from '../components/common';
import { rules } from '../data';
import { STRINGS as S, tr, useLang } from '../i18n';

export function CheckConsultant() {
  const lang = useLang();
  const [num, setNum] = useState('');
  const today = new Date().toISOString().slice(0, 10);
  const register = sourceRef(rules, rules.authorizedRepresentatives.registerSource, today);
  const authorized = sourceRef(rules, rules.authorizedRepresentatives.source, today);
  const clean = num.trim().toUpperCase().replace(/\s/g, '');
  const ok = /^R\d{6}$/.test(clean);

  return (
    <section>
      <h1>{tr(S.consultantTitle, lang)}</h1>
      <p>{tr(S.consultantIntro, lang)}</p>
      <ol class="steps">
        <li>{tr(S.consultantStep1, lang)}</li>
        <li>{tr(S.consultantStep2, lang)}</li>
        <li>{tr(S.consultantStep3, lang)}</li>
        <li>{tr(S.consultantStep4, lang)}</li>
      </ol>
      <label for="num">{tr(S.consultantNumber, lang)}</label>
      <input id="num" value={num} placeholder="R123456" autocomplete="off" onInput={(e) => setNum((e.target as HTMLInputElement).value)} />
      {clean && <p class={ok ? 'ok' : 'alert'} role="status">{tr(ok ? S.consultantFormatOk : S.consultantFormatBad, lang)}</p>}
      <p class="row">
        <a class="button primary" href={register.url[lang]} target="_blank" rel="noopener noreferrer">{tr(S.openRegister, lang)}</a>
        <a class="button" href={authorized.url[lang]} target="_blank" rel="noopener noreferrer">{tr(S.openAuthorized, lang)}</a>
      </p>
      <p>{tr(S.consultantOthers, lang)}</p>
      <p class="muted">{tr(S.noRecommendation, lang)}</p>
      <Sources sources={[register, authorized]} />
    </section>
  );
}
