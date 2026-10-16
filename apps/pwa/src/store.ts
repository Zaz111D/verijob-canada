/**
 * Profils et suivi des candidatures, stockés UNIQUEMENT sur l'appareil (IndexedDB via idb-keyval).
 * Rien n'est envoyé sur un serveur, il n'y a pas de compte.
 *
 * Plusieurs profils par téléphone (ex. « Moi », « Mon épouse », un ami) : chacun a ses métiers, langues,
 * provinces et ses candidatures. Le profil actif sert à toutes les pages.
 *   verijob-profils           → { active, list: [{ id, name }] }
 *   verijob-profil:<id>       → données du profil
 *   verijob-candidatures:<id> → candidatures du profil
 * Les anciennes clés uniques (« verijob-profil », « verijob-candidatures ») sont reprises dans le premier profil.
 */
import { del, get, set } from 'idb-keyval';
import { useEffect, useState } from 'preact/hooks';
import type { Application, Profile } from '@verijob/core';

export interface StoredProfile extends Profile {
  education?: 'aucun' | 'primaire' | 'secondaire' | 'postsecondaire' | 'universite';
}
export interface ProfileIndex { active: string; list: Array<{ id: string; name: string }> }

const INDEX_KEY = 'verijob-profils';
const LEGACY_PROFILE = 'verijob-profil';
const LEGACY_APPS = 'verijob-candidatures';
const profileKey = (id: string) => `verijob-profil:${id}`;
const appsKey = (id: string) => `verijob-candidatures:${id}`;

/** IndexedDB peut être indisponible (navigation privée) : tout reste alors en mémoire pour la session. */
async function safeGet<T>(k: string): Promise<T | undefined> { try { return await get<T>(k); } catch { return undefined; } }
async function safeSet(k: string, v: unknown): Promise<void> { try { await set(k, v); } catch { /* en mémoire seulement */ } }
async function safeDel(k: string): Promise<void> { try { await del(k); } catch { /* en mémoire seulement */ } }

const newProfileId = () => `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

let index: ProfileIndex | undefined;
let indexLoading: Promise<ProfileIndex> | undefined;
let cache: StoredProfile | undefined;
let appsCache: Application[] | undefined;
const indexListeners = new Set<(i: ProfileIndex) => void>();
const listeners = new Set<(p: StoredProfile) => void>();
const appsListeners = new Set<(a: Application[]) => void>();

export function loadIndex(): Promise<ProfileIndex> {
  if (index) return Promise.resolve(index);
  indexLoading ??= (async () => {
    let i = await safeGet<ProfileIndex>(INDEX_KEY);
    if (!i?.list?.length) {
      // Première ouverture avec plusieurs profils : on reprend l'ancien profil unique et ses candidatures.
      const id = newProfileId();
      i = { active: id, list: [{ id, name: '' }] };
      const legacy = await safeGet<StoredProfile>(LEGACY_PROFILE);
      const legacyApps = await safeGet<Application[]>(LEGACY_APPS);
      if (legacy) await safeSet(profileKey(id), legacy);
      if (legacyApps) await safeSet(appsKey(id), legacyApps);
      await safeSet(INDEX_KEY, i);
      // Les anciennes clés ne sont effacées qu'une fois la copie faite.
      if (legacy && (await safeGet(profileKey(id)))) await safeDel(LEGACY_PROFILE);
      if (legacyApps && (await safeGet(appsKey(id)))) await safeDel(LEGACY_APPS);
    }
    if (!i.list.some((p) => p.id === i!.active)) i.active = i.list[0]!.id;
    index = i;
    return i;
  })();
  return indexLoading;
}

async function saveIndex(i: ProfileIndex): Promise<void> {
  index = i;
  indexListeners.forEach((f) => f(i));
  await safeSet(INDEX_KEY, i);
}

export async function loadProfile(): Promise<StoredProfile> {
  if (cache) return cache;
  const i = await loadIndex();
  cache = (await safeGet<StoredProfile>(profileKey(i.active))) ?? {};
  return cache;
}

export async function saveProfile(p: StoredProfile): Promise<void> {
  const i = await loadIndex();
  cache = p;
  listeners.forEach((f) => f(p));
  await safeSet(profileKey(i.active), p);
}

/** Vide le profil actif (ses candidatures sont gardées). */
export async function eraseProfile(): Promise<void> {
  const i = await loadIndex();
  cache = {};
  listeners.forEach((f) => f({}));
  await safeDel(profileKey(i.active));
}

/** Change de profil actif : toutes les pages se mettent à jour. */
export async function switchProfile(id: string): Promise<void> {
  const i = await loadIndex();
  if (!i.list.some((p) => p.id === id) || i.active === id) return;
  await saveIndex({ ...i, active: id });
  cache = undefined;
  appsCache = undefined;
  const [p, a] = await Promise.all([loadProfile(), loadApplications()]);
  listeners.forEach((f) => f(p));
  appsListeners.forEach((f) => f(a));
}

export async function createProfile(name: string): Promise<string> {
  const i = await loadIndex();
  const id = newProfileId();
  await saveIndex({ ...i, list: [...i.list, { id, name: name.trim() }] });
  await switchProfile(id);
  return id;
}

export async function renameProfile(id: string, name: string): Promise<void> {
  const i = await loadIndex();
  await saveIndex({ ...i, list: i.list.map((p) => (p.id === id ? { ...p, name: name.trim() } : p)) });
}

/** Supprime un profil et ses candidatures de ce téléphone (impossible pour le dernier profil). */
export async function deleteProfile(id: string): Promise<void> {
  const i = await loadIndex();
  if (i.list.length < 2) return;
  const list = i.list.filter((p) => p.id !== id);
  if (i.active === id) await switchProfile(list[0]!.id);
  await saveIndex({ ...(index ?? i), list });
  await safeDel(profileKey(id));
  await safeDel(appsKey(id));
}

/** Profils de ce téléphone et profil actif. */
export function useProfiles(): ProfileIndex | undefined {
  const [i, setI] = useState<ProfileIndex | undefined>(index);
  useEffect(() => {
    indexListeners.add(setI);
    void loadIndex().then(setI);
    return () => { indexListeners.delete(setI); };
  }, []);
  return i;
}

// ---------------------------------------------------------------------------
// Suivi des candidatures du profil actif (même principe : uniquement sur l'appareil)
// ---------------------------------------------------------------------------

export async function loadApplications(): Promise<Application[]> {
  if (appsCache) return appsCache;
  const i = await loadIndex();
  appsCache = (await safeGet<Application[]>(appsKey(i.active))) ?? [];
  return appsCache;
}

export async function saveApplications(list: Application[]): Promise<void> {
  const i = await loadIndex();
  appsCache = list;
  appsListeners.forEach((f) => f(list));
  await safeSet(appsKey(i.active), list);
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

/** Profil actif (vide tant qu'il n'est pas chargé). */
export function useProfile(): StoredProfile {
  const [p, setP] = useState<StoredProfile>(cache ?? {});
  useEffect(() => {
    listeners.add(setP);
    void loadProfile().then(setP);
    return () => { listeners.delete(setP); };
  }, []);
  return p;
}
