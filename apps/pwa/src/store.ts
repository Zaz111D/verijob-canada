/**
 * Profil de l'utilisateur, stocké UNIQUEMENT sur l'appareil (IndexedDB via idb-keyval).
 * Rien n'est envoyé sur un serveur.
 */
import { del, get, set } from 'idb-keyval';
import { useEffect, useState } from 'preact/hooks';
import type { Application, Profile } from '@verijob/core';

export interface StoredProfile extends Profile {
  education?: 'aucun' | 'primaire' | 'secondaire' | 'postsecondaire' | 'universite';
}

const KEY = 'verijob-profil';
let cache: StoredProfile | undefined;
const listeners = new Set<(p: StoredProfile) => void>();

export async function loadProfile(): Promise<StoredProfile> {
  if (cache) return cache;
  try {
    cache = (await get<StoredProfile>(KEY)) ?? {};
  } catch {
    cache = {}; // IndexedDB indisponible (navigation privée) : profil en mémoire seulement
  }
  return cache;
}

export async function saveProfile(p: StoredProfile): Promise<void> {
  cache = p;
  listeners.forEach((f) => f(p));
  try { await set(KEY, p); } catch { /* voir loadProfile */ }
}

export async function eraseProfile(): Promise<void> {
  cache = {};
  listeners.forEach((f) => f({}));
  try { await del(KEY); } catch { /* voir loadProfile */ }
}

// ---------------------------------------------------------------------------
// Suivi des candidatures (même principe : uniquement sur l'appareil)
// ---------------------------------------------------------------------------

const APPS_KEY = 'verijob-candidatures';
let appsCache: Application[] | undefined;
const appsListeners = new Set<(a: Application[]) => void>();

export async function loadApplications(): Promise<Application[]> {
  if (appsCache) return appsCache;
  try { appsCache = (await get<Application[]>(APPS_KEY)) ?? []; } catch { appsCache = []; }
  return appsCache;
}

export async function saveApplications(list: Application[]): Promise<void> {
  appsCache = list;
  appsListeners.forEach((f) => f(list));
  try { await set(APPS_KEY, list); } catch { /* IndexedDB indisponible : en mémoire seulement */ }
}

/** Ajoute ou remplace une candidature (même id). */
export async function upsertApplication(a: Application): Promise<void> {
  const list = await loadApplications();
  await saveApplications([...list.filter((x) => x.id !== a.id), a]);
}

export function useApplications(): Application[] {
  const [list, setList] = useState<Application[]>(appsCache ?? []);
  useEffect(() => {
    appsListeners.add(setList);
    void loadApplications().then(setList);
    return () => { appsListeners.delete(setList); };
  }, []);
  return list;
}

/** Profil courant (vide tant qu'il n'est pas chargé). */
export function useProfile(): StoredProfile {
  const [p, setP] = useState<StoredProfile>(cache ?? {});
  useEffect(() => {
    listeners.add(setP);
    void loadProfile().then(setP);
    return () => { listeners.delete(setP); };
  }, []);
  return p;
}
