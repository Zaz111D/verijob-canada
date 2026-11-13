/**
 * Alberta (AAIP) : tirages publiés sur la page officielle « Processing information » (tableau « Draw information »),
 * relus chaque semaine. Surtout utile pour le volet de renouvellement rural (communautés désignées de l'onglet Régions).
 *
 * Produit : apps/pwa/public/data/aaip-draws.json
 */
import type { Rules } from '../packages/core/src';
import { USER_AGENT } from './lib/http';
import { writeDataFile, type WrittenFile } from './lib/output';

export interface AaipDraw { date: string; stream: string; minScore: number | null; invitations: string }
export interface AaipDrawsStats { draws: number; latest?: string; file: WrittenFile }

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const KEEP = 40;

const cell = (s: string) => s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&#8211;|&ndash;/g, '–').replace(/\s+/g, ' ').trim();

/** « November 2, 2026 » → « 2026-11-02 ». */
function isoDate(s: string): string | undefined {
  const m = /^([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})$/.exec(s.trim());
  const month = m ? MONTHS.indexOf(m[1]!.toLowerCase()) : -1;
  return m && month >= 0 ? `${m[3]}-${String(month + 1).padStart(2, '0')}-${m[2]!.padStart(2, '0')}` : undefined;
}

/** Lignes du tableau des tirages : date, volet, score minimum, nombre d'invitations (« Less than 10 » gardé tel quel). */
export function parseAaipDraws(html: string): AaipDraw[] {
  const out: AaipDraw[] = [];
  for (const row of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...row[1]!.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => cell(c[1]!));
    const date = cells[0] ? isoDate(cells[0]) : undefined;
    if (!date || cells.length < 4) continue;
    const score = Number(cells[2]);
    out.push({ date, stream: cells[1]!, minScore: Number.isFinite(score) && cells[2] !== '' ? score : null, invitations: cells[3]! });
  }
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

export async function fetchAaipDraws(rules: Rules): Promise<AaipDrawsStats> {
  console.log('▶ Alberta (AAIP) : tirages');
  const src = rules.sources['alberta-aaip-draws']!;
  const res = await fetch(src.urlEn!, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const draws = parseAaipDraws(await res.text()).slice(0, KEEP);
  if (!draws.length) throw new Error('aucun tirage trouvé dans la page (structure modifiée ?)');
  const file = writeDataFile('aaip-draws.json', {
    name: 'Alberta Advantage Immigration Program — tirages (Draw information)',
    publisher: 'Gouvernement de l’Alberta — relevé automatique VériJob',
    url: src.urlEn!,
    licence: 'Données publiques du gouvernement de l’Alberta',
  }, draws.length, draws);
  console.log(`  ${draws.length} tirages, le plus récent le ${draws[0]!.date} (${draws[0]!.stream})`);
  return { draws: draws.length, latest: draws[0]!.date, file };
}
