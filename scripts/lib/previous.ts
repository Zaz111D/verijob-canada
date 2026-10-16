/**
 * Fichiers de données de la version déjà publiée (release « site-latest », la même que celle de Cloudflare).
 * Sert à GARDER les offres Adzuna de la semaine précédente quand on n'appelle pas l'API (envoi de code)
 * ou quand elle échoue (quota gratuit dépassé, panne) : la section ne disparaît pas, et sa date reste la vraie.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { strFromU8, unzipSync } from 'fflate';
import { OUT_DIR } from './paths';

const DEFAULT_URL = 'https://github.com/Zaz111D/verijob-canada/releases/download/site-latest/site.zip';
let zip: Promise<Record<string, Uint8Array> | undefined> | undefined;

function previousZip(): Promise<Record<string, Uint8Array> | undefined> {
  zip ??= (async () => {
    try {
      const res = await fetch(process.env.SITE_ZIP_URL || DEFAULT_URL, { headers: { 'User-Agent': 'VeriJobCanada-data/0.1' } });
      if (!res.ok) return undefined;
      const buf = new Uint8Array(await res.arrayBuffer());
      return buf[0] === 0x50 && buf[1] === 0x4b ? unzipSync(buf) : undefined;
    } catch { return undefined; }
  })();
  return zip;
}

/** Recopie data/<name> de la version publiée dans apps/pwa/public/data. Renvoie sa date de mise à jour, ou undefined. */
export async function reusePrevious(name: string): Promise<{ fetchedAt: string; records: number } | undefined> {
  const raw = (await previousZip())?.[`data/${name}`];
  if (!raw) return undefined;
  try {
    const json = JSON.parse(strFromU8(raw)) as { fetchedAt: string; recordCount: number };
    mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(join(OUT_DIR, name), strFromU8(raw));
    return { fetchedAt: json.fetchedAt.slice(0, 10), records: json.recordCount };
  } catch { return undefined; }
}
