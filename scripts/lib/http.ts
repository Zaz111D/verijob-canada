/**
 * Téléchargements polis et mis en cache.
 * - user-agent identifiable ;
 * - délai minimal entre deux requêtes vers le même hôte (respect du Crawl-delay de robots.txt) ;
 * - cache disque dans data/raw/ : un fichier déjà téléchargé n'est pas redemandé.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { RAW_DIR } from './paths';

export const USER_AGENT = 'VeriJobCanada-pipeline/0.1 (outil gratuit anti-arnaque, sans but lucratif)';

/** Délai minimal entre deux requêtes par hôte, en millisecondes. */
const HOST_DELAY_MS: Record<string, number> = {
  'open.canada.ca': 20_000, // robots.txt : Crawl-delay: 20
  'www150.statcan.gc.ca': 3_000,
  'www.statcan.gc.ca': 3_000,
};
const DEFAULT_DELAY_MS = 3_000;
const lastRequest = new Map<string, number>();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function politeFetch(url: string): Promise<Response> {
  const host = new URL(url).host;
  const wait = (lastRequest.get(host) ?? 0) + (HOST_DELAY_MS[host] ?? DEFAULT_DELAY_MS) - Date.now();
  if (wait > 0) {
    console.log(`  … pause de ${Math.ceil(wait / 1000)} s (délai demandé par ${host})`);
    await sleep(wait);
  }
  lastRequest.set(host, Date.now());
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status} pour ${url}`);
  return res;
}

/** Télécharge (ou relit depuis le cache) un fichier binaire. */
export async function download(url: string, opts: { cacheName?: string; refresh?: boolean } = {}): Promise<Buffer> {
  const name = opts.cacheName ?? `${createHash('sha1').update(url).digest('hex').slice(0, 12)}-${url.split('/').pop()?.split('?')[0] ?? 'file'}`;
  const path = join(RAW_DIR, name);
  if (!opts.refresh && existsSync(path)) return readFileSync(path);
  console.log(`  ↓ ${url}`);
  const buf = Buffer.from(await (await politeFetch(url)).arrayBuffer());
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, buf);
  return buf;
}

/** Appel JSON (non mis en cache : sert à découvrir les nouveaux fichiers). */
export async function getJson<T>(url: string): Promise<T> {
  return (await (await politeFetch(url)).json()) as T;
}
