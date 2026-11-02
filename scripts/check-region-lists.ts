/**
 * Contrôle hebdomadaire des sources de l'onglet « Régions », sans rien interpréter (un humain relève ensuite) :
 *
 * - listes d'employeurs désignés (PICR / PICRF) relevées à la main : la liste a-t-elle changé ?
 *   · liste en PDF : le PDF relevé existe-t-il encore, et la page de la communauté pointe-t-elle toujours vers lui ?
 *     (les communautés publient chaque nouvelle liste sous un nouveau nom de fichier) ;
 *   · liste sur une page web : les employeurs relevés y figurent-ils encore (80 % au moins) ?
 * - pages de l'Ontario (REDI, volet Ontario Workforce Priority) : date « Updated » plus récente que celle de rules.json ?
 *
 * Produit : apps/pwa/public/data/regions-status.json
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { normalize, type Rules } from '../packages/core/src';
import type { AipEmployer, DesignatedEmployer } from './build-designated';
import { USER_AGENT } from './lib/http';
import { OUT_DIR } from './lib/paths';
import { writeDataFile, type WrittenFile } from './lib/output';

export type ListCheck = 'meme' | 'changee' | 'inconnu';
export interface RegionSourceStatus {
  /** Communauté (liste d'employeurs désignés) ou identifiant de source (page de l'Ontario). */
  id: string;
  kind: 'liste' | 'page';
  url: string;
  result: ListCheck;
  /** Nouvelle liste repérée sur la page de la communauté. */
  newUrl?: string;
  /** Part des employeurs relevés encore présents sur la page (listes web). */
  found?: number;
  checkedAt: string;
}
export interface RegionsStatusStats { checked: number; changed: string[]; file: WrittenFile }

const MIN_FOUND = 0.8;
const LIST_LINK = /designated[-_ %]*employers?|employeurs?[-_ %]*d[ée]sign|employer[-_ %]*list|liste[-_ %]*des[-_ %]*employeurs/i;
/** Documents pour les employeurs (guides, formulaires) : pas des listes. */
const NOT_LIST = /guideline|application|form|checklist|de-?designation|lignes[-_ ]directrices|formulaire|guide/i;
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

async function get(url: string): Promise<{ status: number; url: string; body: string } | undefined> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(20_000) });
    const pdf = /pdf/.test(res.headers.get('content-type') ?? '');
    return { status: res.status, url: res.url, body: pdf ? '' : await res.text() };
  } catch { return undefined; }
}

const visibleText = (html: string) => normalize(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#0?39;|&rsquo;|&#8217;/g, "'")).replace(/\s+/g, ' ');

/** Liens d'une page (adresses absolues) avec leur texte. */
export function pageLinks(html: string, base: string): Array<{ href: string; text: string }> {
  return [...html.matchAll(/<a\b[^>]*href="([^"#]+)"[^>]*>([\s\S]{0,300}?)<\/a>/gi)].flatMap((m) => {
    try { return [{ href: new URL(m[1]!.replace(/&amp;/g, '&'), base).href, text: m[2]!.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() }]; } catch { return []; }
  });
}

/** Liste en PDF : le fichier relevé est-il encore celui que la page de la communauté propose ? */
export function pdfListCheck(recorded: string, pages: Array<{ html: string; url: string }>): { result: ListCheck; newUrl?: string } {
  const file = recorded.split('/').pop()!.toLowerCase();
  const links = pages.flatMap((p) => pageLinks(p.html, p.url));
  if (links.some((l) => l.href.toLowerCase().endsWith(file))) return { result: 'meme' };
  const other = links.find((l) => /\.pdf(\?|$)/i.test(l.href) && LIST_LINK.test(`${l.href} ${l.text}`) && !NOT_LIST.test(`${l.href} ${l.text}`));
  return other ? { result: 'changee', newUrl: other.href } : { result: 'inconnu' };
}

/** Liste sur une page web : part des employeurs relevés encore présents. */
export function htmlListFound(html: string, employers: string[]): number | undefined {
  const text = visibleText(html);
  if (text.length < 400 || !employers.length) return undefined; // page vide ou affichée par script
  const key = (e: string) => normalize(e).replace(/\s+/g, ' ').trim().slice(0, 24);
  return employers.filter((e) => text.includes(key(e))).length / employers.length;
}

/** « Updated: October 13, 2026 » (ontario.ca) → « 2026-10-13 ». */
export function ontarioUpdated(html: string): string | undefined {
  const m = /Updated:\s*<?[^A-Za-z]*([A-Z][a-z]+) (\d{1,2}), (\d{4})/.exec(html.replace(/<[^>]+>/g, ' '));
  const month = m ? MONTHS.indexOf(m[1]!.toLowerCase()) : -1;
  return m && month >= 0 ? `${m[3]}-${String(month + 1).padStart(2, '0')}-${m[2]!.padStart(2, '0')}` : undefined;
}

export async function checkRegionSources(rules: Rules, today: string): Promise<RegionsStatusStats> {
  console.log('▶ Régions : listes d’employeurs désignés et pages de l’Ontario');
  const designated = JSON.parse(readFileSync(join(OUT_DIR, 'designated-employers.json'), 'utf8')).data as DesignatedEmployer[];
  const bySource = new Map<string, DesignatedEmployer[]>();
  for (const e of designated) bySource.set(`${e.community}|${e.sourceUrl}`, [...(bySource.get(`${e.community}|${e.sourceUrl}`) ?? []), e]);
  const out: RegionSourceStatus[] = [];

  for (const [key, rows] of bySource) {
    const [community, url] = key.split('|') as [string, string];
    const status: RegionSourceStatus = { id: community, kind: 'liste', url, result: 'inconnu', checkedAt: today };
    if (/\.pdf(\?|$)/i.test(url)) {
      const pdf = await get(url);
      if (pdf && pdf.status === 404) status.result = 'changee';
      // Page de la liste (si connue) ou de la communauté, puis ses pages « employeurs » ou « RCIP / FCIP ».
      const c = rules.communityPilots.communities.find((x) => x.name === community);
      const home = await get(c?.listPage ?? c?.url ?? '');
      const pages = home && home.status < 400 ? [{ html: home.body, url: home.url }] : [];
      if (home && status.result !== 'changee') {
        for (const l of pageLinks(home.body, home.url).filter((x) => /employ|rcip|fcip|ppicf|designat/i.test(x.href + x.text) && !/\.pdf/i.test(x.href)).slice(0, 6)) {
          const p = await get(l.href);
          if (p && p.status < 400) pages.push({ html: p.body, url: p.url });
        }
        Object.assign(status, pdfListCheck(url, pages));
      }
    } else {
      const page = await get(url);
      const found = page && page.status < 400 ? htmlListFound(page.body, rows.map((r) => r.employer)) : undefined;
      if (found !== undefined) {
        status.found = Math.round(found * 100) / 100;
        status.result = found >= MIN_FOUND ? 'meme' : 'changee';
      }
    }
    out.push(status);
    console.log(`  ${community} : ${status.result}${status.newUrl ? ` → ${status.newUrl}` : ''}${status.found !== undefined ? ` (${Math.round(status.found * 100)} % retrouvés)` : ''}`);
  }

  // Programme d'immigration au Canada atlantique : listes provinciales (page web).
  const aip = JSON.parse(readFileSync(join(OUT_DIR, 'aip-employers.json'), 'utf8')).data as AipEmployer[];
  for (const url of [...new Set(aip.map((e) => e.sourceUrl))]) {
    const rows = aip.filter((e) => e.sourceUrl === url);
    const id = `AIP-${rows[0]!.province}`;
    const page = await get(url);
    const found = page && page.status < 400 ? htmlListFound(page.body, rows.map((r) => r.employer)) : undefined;
    const status: RegionSourceStatus = { id, kind: 'liste', url, result: found === undefined ? 'inconnu' : found >= MIN_FOUND ? 'meme' : 'changee', checkedAt: today };
    if (found !== undefined) status.found = Math.round(found * 100) / 100;
    out.push(status);
    console.log(`  ${id} : ${status.result}${found !== undefined ? ` (${Math.round(found * 100)} % retrouvés)` : ''}`);
  }

  for (const id of [rules.regions.redi.source, rules.regions.redi.streamSource]) {
    const src = rules.sources[id]!;
    const url = (src.urlFr ?? src.urlEn)!;
    const page = await get(url);
    const updated = page ? ontarioUpdated(page.body) : undefined;
    out.push({ id, kind: 'page', url, result: !updated ? 'inconnu' : src.pageModified && updated > src.pageModified ? 'changee' : 'meme', checkedAt: today });
    console.log(`  ${id} : page mise à jour le ${updated ?? '?'}${src.pageModified && updated && updated > src.pageModified ? ' ⚠ CHANGÉE depuis la dernière vérification' : ''}`);
  }

  const file = writeDataFile('regions-status.json', {
    name: 'Régions — contrôle des listes d’employeurs désignés et des pages de l’Ontario',
    publisher: 'Sites des communautés et ontario.ca — relevé automatique VériJob',
    url: 'https://www.canada.ca/fr/immigration-refugies-citoyennete/services/immigrer-canada/pilotes-rurale-franco.html',
    licence: 'Résultats du contrôle seulement',
  }, out.length, out);
  return { checked: out.length, changed: out.filter((o) => o.result === 'changee').map((o) => o.id), file };
}
