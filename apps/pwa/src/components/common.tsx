/**
 * Composants partagés : mise en page, liste de sources, badges.
 */
import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { DISCLAIMER, type SourceRef } from '@verijob/core';
import { setLang, STRINGS as S, tr, useLang } from '../i18n';

export type Route = 'accueil' | 'offre' | 'employeur' | 'demarcher' | 'consultant' | 'profil';
const ROUTES: Route[] = ['accueil', 'offre', 'employeur', 'demarcher', 'consultant', 'profil'];

/** Routage par « #/page » : fonctionne sur tout hébergement statique. */
export function useRoute(): Route {
  const read = (): Route => {
    const r = location.hash.replace(/^#\/?/, '') as Route;
    return ROUTES.includes(r) ? r : 'accueil';
  };
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => { setRoute(read()); window.scrollTo(0, 0); };
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  return route;
}

function useOnline(): boolean {
  const [on, set] = useState(navigator.onLine);
  useEffect(() => {
    const up = () => set(true), down = () => set(false);
    addEventListener('online', up); addEventListener('offline', down);
    return () => { removeEventListener('online', up); removeEventListener('offline', down); };
  }, []);
  return on;
}

const NAV: Array<{ route: Route; label: keyof typeof S; icon: string }> = [
  { route: 'accueil', label: 'navHome', icon: '⌂' },
  { route: 'offre', label: 'navOffer', icon: '✉' },
  { route: 'employeur', label: 'navEmployer', icon: '⌕' },
  { route: 'demarcher', label: 'navProspects', icon: '✎' },
  { route: 'consultant', label: 'navConsultant', icon: '☑' },
  { route: 'profil', label: 'navProfile', icon: '☺' },
];

export function Layout({ route, children }: { route: Route; children: ComponentChildren }) {
  const lang = useLang();
  const online = useOnline();
  return (
    <div class="app">
      <header class="top">
        <a class="brand" href="#/accueil">{tr(S.appName, lang)}</a>
        <button class="lang" type="button" aria-label={tr(S.switchLangLabel, lang)} onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}>
          {tr(S.switchLang, lang)}
        </button>
      </header>
      {!online && <p class="offline" role="status">{tr(S.offline, lang)}</p>}
      <main>{children}</main>
      <footer class="disclaimer">{tr(DISCLAIMER, lang)}</footer>
      <nav class="tabs" aria-label="Navigation">
        {NAV.map((n) => (
          <a href={`#/${n.route}`} class={route === n.route ? 'active' : ''} aria-current={route === n.route ? 'page' : undefined}>
            <span aria-hidden="true">{n.icon}</span>
            {tr(S[n.label] as { fr: string; en: string }, lang)}
          </a>
        ))}
      </nav>
    </div>
  );
}

/** Sources officielles cliquables, avec date de vérification et alerte si périmée. */
export function Sources({ sources }: { sources: SourceRef[] }) {
  const lang = useLang();
  if (!sources.length) return null;
  return (
    <details class="sources">
      <summary>{tr(S.sources, lang)} ({sources.length})</summary>
      <ul>
        {sources.map((s) => (
          <li>
            <a href={s.url[lang]} target="_blank" rel="noopener noreferrer">{s.title[lang]}</a>
            <span class="muted"> — {tr(S.verifiedOn, lang)} {s.verifiedAt}</span>
            {s.stale && <strong class="warn"> ⚠ {tr(S.stale, lang)}</strong>}
          </li>
        ))}
      </ul>
    </details>
  );
}

export function Badge({ kind, children }: { kind: string; children: ComponentChildren }) {
  return <span class={`badge badge-${kind}`}>{children}</span>;
}
