/**
 * « CV d'exemple pour ce poste » : modèle de CV canadien pour un candidat hors Canada (@verijob/core, buildSampleCv),
 * adapté au métier et, si on la donne, à l'offre. Téléchargeable en Word modifiable. Rien n'est envoyé.
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import {
  buildSampleCv, findNoc, detectNocInText, normalize, sampleCvToText, sourceRef, todayIso,
  type NocElementsData, type SampleCv,
} from '@verijob/core';
import { Sources } from '../components/common';
import { sampleCvToDocx } from '../cvdocx';
import { curatedNocData, isCurated, loadNocElements, nocData, rules } from '../data';
import { STRINGS as S, tr, useLang, type Lang } from '../i18n';
import { useProfile } from '../store';
import { openCvCheck } from './CheckCv';

const HANDOFF_KEY = 'verijob-cv-exemple';
interface Handoff { noc?: string; title?: string; text?: string; province?: string }

/** Ouvre la page avec un métier et/ou une offre (depuis une offre, le profil, le vérificateur de CV). */
export function openSampleCv(h: Handoff) {
  try { sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(h)); } catch { /* l'utilisateur choisira le métier */ }
  location.hash = '#/cv-exemple';
}

/** Texte avec les [repères] surlignés. */
function Marked({ text }: { text: string }) {
  return <>{text.split(/(\[[^\]]*\])/).filter(Boolean).map((p) => (p.startsWith('[') ? <mark>{p}</mark> : p))}</>;
}

function Why({ k, lang }: { k: keyof typeof S.sampleWhy; lang: Lang }) {
  return <p class="why">💡 {tr(S.sampleWhy[k], lang)}</p>;
}

function Preview({ cv, lang }: { cv: SampleCv; lang: Lang }) {
  const fr = cv.lang === 'fr';
  return (
    <div class="paper" lang={cv.lang}>
      <div class="paper-head">
        <p class="paper-name"><Marked text={cv.header.name} /></p>
        <p class="paper-title">{cv.title}</p>
        <p><Marked text={`${cv.header.location} | ${cv.header.contact}`} /></p>
        <p>{cv.header.availability}</p>
      </div>
      <Why k="header" lang={lang} />
      <h3>{fr ? 'Profil' : 'Profile'}</h3>
      <p><Marked text={cv.summary} /></p>
      <Why k="summary" lang={lang} />
      <h3>{fr ? 'Compétences clés' : 'Key skills'}</h3>
      <ul>{cv.skills.map((s) => <li>{s}</li>)}</ul>
      <Why k="skills" lang={lang} />
      <h3>{fr ? 'Expérience professionnelle' : 'Work experience'}</h3>
      {cv.experience.map((j) => (
        <div class="paper-job">
          <p><strong><Marked text={j.title} /></strong> — <Marked text={j.period} /></p>
          <p class="muted"><Marked text={[j.employer, j.place].filter(Boolean).join(' — ')} /></p>
          <ul>
            {j.bullets.map((b) => (
              <li>
                <Marked text={b.text} />{b.result && <> — <mark>{b.result}</mark></>}
                {b.matched && <span class="chip kw">✓ {tr(S.sampleFromOffer, lang)}</span>}
              </li>
            ))}
          </ul>
        </div>
      ))}
      <Why k="experience" lang={lang} />
      <h3>{fr ? 'Formation' : 'Education'}</h3>
      {cv.education.map((e) => <p><Marked text={e} /></p>)}
      <Why k="education" lang={lang} />
      {cv.certifications.length > 0 && (
        <>
          <h3>{fr ? 'Certifications et permis' : 'Certifications and licences'}</h3>
          <ul>{cv.certifications.map((c) => <li><Marked text={c} /></li>)}</ul>
        </>
      )}
      <h3>{fr ? 'Langues' : 'Languages'}</h3>
      <ul>{cv.languages.map((l) => <li><Marked text={l} /></li>)}</ul>
      <Why k="languages" lang={lang} />
    </div>
  );
}

export function SampleCvPage() {
  const lang = useLang();
  const profile = useProfile();
  const [elements, setElements] = useState<NocElementsData | null>();
  const [noc, setNoc] = useState('');
  const [cvLang, setCvLang] = useState<Lang>(lang);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let h: Handoff = {};
    try { h = JSON.parse(sessionStorage.getItem(HANDOFF_KEY) ?? '{}') as Handoff; sessionStorage.removeItem(HANDOFF_KEY); } catch { /* rien */ }
    setTitle(h.title ?? '');
    setText(h.text ?? '');
    // Métier : celui de l'offre, sinon reconnu dans son texte, sinon le 1er métier du profil.
    const detected = h.text || h.title ? detectNocInText(nocData, normalize(`${h.title ?? ''} ${h.text ?? ''}`))?.code : undefined;
    setNoc(h.noc || detected || profile.targetNocs?.[0] || '');
    // Québec : CV en français ; ailleurs au Canada : en anglais (modifiable).
    if (h.province) setCvLang(h.province === 'QC' ? 'fr' : 'en');
  }, []);

  // Le profil est lu de façon asynchrone : on reprend son 1er métier dès qu'il arrive, si aucun n'est choisi.
  useEffect(() => { if (!noc && profile.targetNocs?.[0]) setNoc(profile.targetNocs[0]); }, [profile.targetNocs?.join()]);
  // Fonctions officielles du métier choisi (incluses pour les métiers suivis, sinon téléchargées) ; null = indisponibles.
  useEffect(() => {
    if (!noc) return;
    setElements(undefined);
    void loadNocElements(noc).then((e) => setElements(e ?? null));
  }, [noc]);
  // Liste du choix : métiers suivis, puis ceux du profil (et celui de l'offre) s'ils viennent du catalogue complet.
  const jobOptions = useMemo(() => {
    const extra = [...(profile.targetNocs ?? []), noc].filter((c) => c && !isCurated(c));
    return [...curatedNocData.nocs, ...[...new Set(extra)].map((c) => findNoc(nocData, c)).filter((n) => !!n)];
  }, [profile.targetNocs?.join(), noc]);

  const cv = useMemo(() => {
    if (!elements || !noc) return undefined;
    try {
      return buildSampleCv({ rules, nocData, elements, noc, lang: cvLang, profile, offer: { title, text } });
    } catch { return undefined; }
  }, [elements, noc, cvLang, title, text, profile]);

  const download = async () => {
    if (!cv) return;
    const bytes = await sampleCvToDocx(cv);
    const url = URL.createObjectURL(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `${cvLang === 'fr' ? 'CV-exemple' : 'sample-resume'}-${noc}.docx` });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const copy = async () => {
    if (!cv) return;
    try { await navigator.clipboard.writeText(sampleCvToText(cv)); setCopied(true); } catch { setCopied(false); }
  };

  const today = todayIso();
  return (
    <section>
      <h1>{tr(S.sampleTitle, lang)}</h1>
      <p class="callout">{tr(S.sampleIntro, lang)}</p>

      <div class="grid2">
        <label>{tr(S.sampleJob, lang)}
          <select value={noc} onChange={(e) => setNoc((e.target as HTMLSelectElement).value)}>
            <option value="">{tr(S.sampleChooseJob, lang)}</option>
            {jobOptions.map((n) => <option value={n!.code}>{lang === 'fr' ? n!.titleFr : n!.titleEn} ({n!.code})</option>)}
          </select>
        </label>
        <label>{tr(S.sampleLang, lang)}
          <select value={cvLang} onChange={(e) => setCvLang((e.target as HTMLSelectElement).value as Lang)}>
            <option value="fr">Français</option><option value="en">English</option>
          </select>
        </label>
      </div>
      <label>{tr(S.sampleOfferTitle, lang)}<input value={title} onInput={(e) => setTitle((e.target as HTMLInputElement).value)} /></label>
      <label for="sample-offer">{tr(S.sampleOfferText, lang)}</label>
      <textarea id="sample-offer" rows={4} value={text} onInput={(e) => setText((e.target as HTMLTextAreaElement).value)} />

      {noc && elements === undefined && <p role="status">{tr(S.loading, lang)}</p>}
      {elements === null && <p class="warn">{tr(S.sampleNoElements, lang)}</p>}
      {cv && (
        <>
          {cv.transferFrom && <p class="ok">{tr(S.sampleTransfer, lang)}</p>}
          <div class="row">
            <button type="button" class="primary" onClick={() => void download()}>{tr(S.sampleDownload, lang)}</button>
            <button type="button" onClick={() => void copy()}>{tr(S.sampleCopy, lang)}</button>
            {text.trim() && <button type="button" onClick={() => openCvCheck(`${title}\n${text}`)}>{tr(S.sampleCheck, lang)}</button>}
          </div>
          {copied && <p class="ok" role="status">{tr(S.copied, lang)}</p>}
          <p class="callout">{tr(S.sampleHonest, lang)}</p>

          {cv.offerToProve.length > 0 && (
            <>
              <p class="muted">{tr(S.sampleToProve, lang)}</p>
              <div class="chips">{cv.offerToProve.map((w) => <span class="chip chip-missing">{w}</span>)}</div>
            </>
          )}
          {cv.offerMatched.length > 0 && (
            <>
              <p class="muted">{tr(S.sampleMatched, lang)}</p>
              <div class="chips">{cv.offerMatched.map((w) => <span class="chip">✓ {w}</span>)}</div>
            </>
          )}

          <Preview cv={cv} lang={lang} />

          <details class="sources" open>
            <summary>{tr(S.sampleRequirements, lang)}</summary>
            <ul>{cv.requirements.map((r) => <li>{r}</li>)}</ul>
          </details>
          <Sources sources={[sourceRef(rules, 'statcan-noc-elements', today), sourceRef(rules, 'jobbank-resume', today)]} />
        </>
      )}
    </section>
  );
}
