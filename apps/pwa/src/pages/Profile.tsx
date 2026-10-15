/**
 * Profil (stocké sur l'appareil) + voies d'immigration estimées pour chaque métier visé.
 */
import { useEffect, useState } from 'preact/hooks';
import {
  AFRICAN_COUNTRIES, evaluatePathways, findNoc, findTransfer, PROVINCE_NAMES, sourceRef, teerOf, todayIso,
  type LanguageLevels, type PathwayResult, type ProvinceCode,
} from '@verijob/core';
import { PathwayCards } from '../components/common';
import { nocData, rules } from '../data';
import { STRINGS as S, tr, useLang, type Lang } from '../i18n';
import { eraseProfile, saveProfile, useProfile, type StoredProfile } from '../store';

const SKILLS = ['speaking', 'listening', 'reading', 'writing'] as const;
const LEVELS = Array.from({ length: 12 }, (_, i) => i + 1);
const PROVINCES = Object.keys(PROVINCE_NAMES) as ProvinceCode[];
/** Code utilisé quand le pays n'est pas dans la liste (non admissible au PTAS). */
const OTHER = 'ZZ';

function countryName(code: string, lang: Lang): string {
  try {
    return new Intl.DisplayNames([lang], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}

function LevelGrid({ label, value, onChange }: { label: string; value?: LanguageLevels; onChange: (v: LanguageLevels) => void }) {
  const lang = useLang();
  return (
    <fieldset>
      <legend>{label}</legend>
      <div class="grid2">
        {SKILLS.map((k) => (
          <label>
            {tr(S[k], lang)}
            <select aria-label={`${label} — ${tr(S[k], lang)}`} value={value?.[k] ?? ''} onChange={(e) => {
              const v = (e.target as HTMLSelectElement).value;
              onChange({ ...value, [k]: v === '' ? undefined : Number(v) });
            }}>
              <option value="">{tr(S.dontKnow, lang)}</option>
              {LEVELS.map((l) => <option value={l}>{l}</option>)}
            </select>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Passerelle vers un métier proche : comparaison des fonctions officielles (CNP 2021), source cliquable. */
function TransferCard({ profile, onAdd }: { profile: StoredProfile; onAdd: (noc: string) => void }) {
  const lang = useLang();
  const t = findTransfer(rules, profile.currentNoc);
  if (!t) return null;
  const to = findNoc(nocData, t.to);
  const src = sourceRef(rules, t.source, todayIso());
  const added = profile.targetNocs?.includes(t.to);
  return (
    <div class="panel">
      <h3>{tr(S.transferTitle, lang)} : {to ? (lang === 'fr' ? to.titleFr : to.titleEn) : t.to} <span class="muted">({t.to})</span></h3>
      <p>{tr(S.transferIntro, lang)}</p>
      <table class="compare">
        <thead><tr><th>{tr(S.transferYourJob, lang)} ({t.from})</th><th>{tr(S.transferRelated, lang)} ({t.to})</th></tr></thead>
        <tbody>
          {t.shared.map((d) => (
            <tr>
              <td data-label={`${tr(S.transferYourJob, lang)} :`}>{lang === 'fr' ? d.fromFr : d.fromEn}</td>
              <td data-label={`${tr(S.transferRelated, lang)} :`}>{lang === 'fr' ? d.toFr : d.toEn}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p class="muted">{lang === 'fr' ? t.requirementsFr : t.requirementsEn}</p>
      <p class="muted"><a href={src.url[lang]} target="_blank" rel="noopener noreferrer">{src.title[lang]} ↗</a> — {src.verifiedAt}</p>
      <button type="button" disabled={added} onClick={() => onAdd(t.to)}>{added ? `✓ ${tr(S.transferAdded, lang)}` : tr(S.transferAdd, lang)}</button>
    </div>
  );
}

function Routes({ profile }: { profile: StoredProfile }) {
  const lang = useLang();
  const nocs = profile.targetNocs ?? [];
  if (!nocs.length) return <p class="muted">{tr(S.routesEmpty, lang)}</p>;
  const province = profile.provinces?.length === 1 ? profile.provinces[0] : undefined;
  return (
    <>
      <p class="muted">{tr(S.routesNote, lang)}</p>
      {nocs.map((code) => {
        const n = nocData.nocs.find((x) => x.code === code);
        const res: PathwayResult[] = evaluatePathways(profile, { noc: code, province }, { rules, nocData });
        return (
          <div class="route-group">
            <h3>{code} – {n ? (lang === 'fr' ? n.titleFr : n.titleEn) : ''} <span class="muted">(TEER {teerOf(code)})</span></h3>
            <PathwayCards results={res} />
          </div>
        );
      })}
    </>
  );
}

export function Profile() {
  const lang = useLang();
  const stored = useProfile();
  const [p, setP] = useState<StoredProfile>(stored);
  const [msg, setMsg] = useState<'saved' | 'erased' | ''>('');
  useEffect(() => setP(stored), [stored]);

  const toggle = <T extends string>(list: T[] | undefined, v: T): T[] =>
    list?.includes(v) ? list.filter((x) => x !== v) : [...(list ?? []), v];

  const countries = [...AFRICAN_COUNTRIES].map((c) => ({ c, name: countryName(c, lang) })).sort((a, b) => a.name.localeCompare(b.name, lang));
  const groups = [...new Set(nocData.nocs.map((n) => n.group))];

  return (
    <section>
      <h1>{tr(S.profileTitle, lang)}</h1>
      <p class="callout">{tr(S.profilePrivacy, lang)}</p>
      <form onSubmit={(e) => { e.preventDefault(); void saveProfile(p).then(() => setMsg('saved')); }}>
        <label for="country">{tr(S.citizenship, lang)}</label>
        <select id="country" value={p.citizenship ?? ''} onChange={(e) => setP({ ...p, citizenship: (e.target as HTMLSelectElement).value || undefined })}>
          <option value="">{tr(S.choose, lang)}</option>
          {countries.map(({ c, name }) => <option value={c}>{name}</option>)}
          <option value={OTHER}>{tr(S.other, lang)}</option>
        </select>

        <p class="muted">{tr(S.levelHelp, lang)}</p>
        <LevelGrid label={tr(S.frenchLevel, lang)} value={p.french} onChange={(v) => setP({ ...p, french: v })} />
        <LevelGrid label={tr(S.englishLevel, lang)} value={p.english} onChange={(v) => setP({ ...p, english: v })} />

        <fieldset>
          <legend>{tr(S.targetJobs, lang)}</legend>
          {groups.map((g) => (
            <div class="checks">
              {nocData.nocs.filter((n) => n.group === g).map((n) => (
                <label class="check">
                  <input type="checkbox" checked={p.targetNocs?.includes(n.code)} onChange={() => setP({ ...p, targetNocs: toggle(p.targetNocs, n.code) })} />
                  {lang === 'fr' ? n.titleFr : n.titleEn} <span class="muted">({n.code})</span>
                </label>
              ))}
            </div>
          ))}
          <label for="current">{tr(S.currentJob, lang)}</label>
          <select id="current" value={p.currentNoc ?? ''} onChange={(e) => setP({ ...p, currentNoc: (e.target as HTMLSelectElement).value || undefined })}>
            <option value="">{tr(S.currentJobNone, lang)}</option>
            {rules.occupationTransfers.map((t) => <option value={t.from}>{lang === 'fr' ? t.fromTitleFr : t.fromTitleEn} ({t.from})</option>)}
          </select>
          <TransferCard profile={p} onAdd={(noc) => setP({ ...p, targetNocs: [...(p.targetNocs ?? []), noc] })} />
        </fieldset>

        <fieldset>
          <legend>{tr(S.provincesWanted, lang)}</legend>
          <div class="checks grid2">
            {PROVINCES.map((code) => (
              <label class="check">
                <input type="checkbox" checked={p.provinces?.includes(code)} onChange={() => setP({ ...p, provinces: toggle(p.provinces, code) })} />
                {PROVINCE_NAMES[code][lang]}
              </label>
            ))}
          </div>
        </fieldset>

        <label for="exp">{tr(S.experience, lang)}</label>
        <input id="exp" type="number" min={0} max={600} inputMode="numeric" value={p.experienceMonths ?? ''}
          onInput={(e) => { const v = (e.target as HTMLInputElement).value; setP({ ...p, experienceMonths: v === '' ? undefined : Number(v) }); }} />

        <label for="edu">{tr(S.education, lang)}</label>
        <select id="edu" value={p.education ?? ''} onChange={(e) => setP({ ...p, education: ((e.target as HTMLSelectElement).value || undefined) as StoredProfile['education'] })}>
          <option value="">{tr(S.choose, lang)}</option>
          {(Object.keys(S.educationLevels) as Array<keyof typeof S.educationLevels>).map((k) => <option value={k}>{tr(S.educationLevels[k], lang)}</option>)}
        </select>

        <div class="row">
          <button type="submit" class="primary">{tr(S.save, lang)}</button>
          <button type="button" onClick={() => void eraseProfile().then(() => setMsg('erased'))}>{tr(S.erase, lang)}</button>
        </div>
        {msg && <p class="ok" role="status">{tr(S[msg], lang)}</p>}
      </form>

      <h2>{tr(S.routesTitle, lang)}</h2>
      <Routes profile={p} />
    </section>
  );
}
