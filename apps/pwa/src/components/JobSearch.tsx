/**
 * Recherche parmi TOUS les métiers de la CNP 2021 (516 groupes) : titre officiel, nom court et exemples officiels
 * (« soudeur », « camionneur », « développeur »…). L'index d'exemples n'est téléchargé qu'à la première recherche.
 */
import { useState } from 'preact/hooks';
import { findNoc, normalize } from '@verijob/core';
import { isCurated, nocData } from '../data';
import { STRINGS as S, tr, type Lang } from '../i18n';

let searchIndex: Promise<Record<string, string>> | undefined;
const loadIndex = () => (searchIndex ??= import('../../../../data/noc-search.json').then((m) => m.default as Record<string, string>));

const MAX = 8;

export function JobSearch({ selected, onAdd, onRemove, lang }: { selected: string[]; onAdd: (code: string) => void; onRemove: (code: string) => void; lang: Lang }) {
  const [q, setQ] = useState('');
  const [index, setIndex] = useState<Record<string, string>>();
  const words = normalize(q).split(/\s+/).filter((w) => w.length >= 2);
  const results = words.length && index
    ? nocData.nocs
      .map((n) => {
        const hay = `${normalize(n.titleFr)} ${normalize(n.titleEn)} ${normalize(n.jobFr ?? '')} ${normalize(n.jobEn ?? '')} ${index[n.code] ?? ''} ${n.code}`;
        if (!words.every((w) => hay.includes(w))) return undefined;
        // Mot trouvé dans le titre ou le nom court d'abord, métiers suivis ensuite.
        const inTitle = words.every((w) => `${normalize(n.titleFr)} ${normalize(n.titleEn)} ${normalize(n.jobFr ?? '')} ${normalize(n.jobEn ?? '')}`.includes(w));
        return { n, score: (inTitle ? 0 : 10) + (isCurated(n.code) ? 0 : 1) };
      })
      .filter((x): x is { n: (typeof nocData.nocs)[number]; score: number } => !!x)
      .sort((a, b) => a.score - b.score)
      .slice(0, MAX)
    : [];
  const others = selected.filter((c) => !isCurated(c));
  return (
    <div class="job-search">
      <label>{tr(S.jobSearchLabel, lang)}
        <input value={q} placeholder={tr(S.jobSearchPlaceholder, lang)}
          onFocus={() => { if (!index) void loadIndex().then(setIndex); }}
          onInput={(e) => { setQ((e.target as HTMLInputElement).value); if (!index) void loadIndex().then(setIndex); }} />
      </label>
      {words.length > 0 && !index && <p class="muted" role="status">{tr(S.loading, lang)}</p>}
      {words.length > 0 && index && !results.length && <p class="muted">{tr(S.jobSearchNone, lang)}</p>}
      {results.length > 0 && (
        <ul class="job-results">
          {results.map(({ n }) => (
            <li>
              <span>{lang === 'fr' ? n.titleFr : n.titleEn} <span class="muted">({n.code})</span></span>
              {selected.includes(n.code)
                ? <span class="ok">✓</span>
                : <button type="button" onClick={() => { onAdd(n.code); setQ(''); }}>{tr(S.jobSearchAdd, lang)}</button>}
            </li>
          ))}
        </ul>
      )}
      {others.length > 0 && (
        <div class="chips">
          {others.map((c) => {
            const n = findNoc(nocData, c);
            return (
              <button type="button" class="chip" title={tr(S.jobSearchRemove, lang)} onClick={() => onRemove(c)}>
                {(lang === 'fr' ? n?.jobFr : n?.jobEn) ?? c} ({c}) ✕
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
