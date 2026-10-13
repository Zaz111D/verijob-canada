/**
 * Profil de l'utilisateur, stocké UNIQUEMENT sur l'appareil (IndexedDB via idb-keyval).
 * Rien n'est envoyé sur un serveur.
 */
import { del, get, set } from 'idb-keyval';
import { useEffect, useState } from 'preact/hooks';
import type { Profile } from '@verijob/core';

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
