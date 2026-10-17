/**
 * Composants partagés : mise en page, liste de sources, badges.
 */
import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { DISCLAIMER, staleSources, type PathwayResult, type SourceRef } from '@verijob/core';
import { rules } from '../data';
import { ActiveProfileChip } from './Profiles';
import { setLang, STRINGS as S, tr, useLang } from '../i18n';

export type Route = 'accueil' | 'offre' | 'employeur' | 'emplois' | 'demarcher' | 'suivi' | 'consultant' | 'profil' | 'veille' | 'cv' | 'cv-exemple' | 'postuler';
const ROUTES: Route[] = ['accueil', 'offre', 'employeur', 'emplois', 'demarcher', 'suivi', 'consultant', 'profil', 'veille', 'cv', 'cv-exemple', 'postuler'];

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
  { route: 'postuler', label: 'navApply', icon: '➤' },
  { route: 'emplois', label: 'navJobs', icon: '◎' },
  { route: 'demarcher', label: 'navProspects', icon: '✎' },
  { route: 'suivi', label: 'navTracking', icon: '☰' },
  { route: 'profil', label: 'navProfile', icon: '☺' },
];

export function Layout({ route, children }: { route: Route; children: ComponentChildren }) {
  const lang = useLang();
  const online = useOnline();
  const stale = staleSources(rules, new Date().toISOString().slice(0, 10)).length;
  return (
    <div class="app">
      <header class="top">
        <a class="brand" href="#/accueil">{tr(S.appName, lang)}</a>
        <ActiveProfileChip />
        <button class="lang" type="button" aria-label={tr(S.switchLangLabel, lang)} onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}>
          {tr(S.switchLang, lang)}
        </button>
      </header>
      {!online && <p class="offline" role="status">{tr(S.offline, lang)}</p>}
      {stale > 0 && <p class="offline" role="status"><a href="#/veille">{tr(S.staleBanner, lang)}</a></p>}
      <main>{children}</main>
      <footer class="disclaimer">
        <p>{tr(DISCLAIMER, lang)}</p>
        <p><a href="#/veille">{tr(S.navWatch, lang)}</a> · <a href="#/consultant">{tr(S.cardConsultantTitle, lang)}</a></p>
        <p class="muted version">{tr(S.versionLabel, lang)} {__BUILD__} · {__BUILD_DATE__}</p>
      </footer>
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

/** Cartes des voies d'immigration (statut, raisons, sources). */
export function PathwayCards({ results }: { results: PathwayResult[] }) {
  const lang = useLang();
  return (
    <>
      {results.map((r) => (
        <article class={`route st-${r.statut}`}>
          <div class="route-head">
            <strong>{r.nom[lang]}</strong>
            <Badge kind={r.statut}>{tr(S.status[r.statut], lang)}</Badge>
          </div>
          <ul>{r.raisons.map((x) => <li>{x[lang]}</li>)}</ul>
          <Sources sources={r.sources} />
        </article>
      ))}
    </>
  );
}
