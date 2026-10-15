/**
 * Règles en préparation (rules.proposals) : chaque semaine, on relit la date « Date de modification » des pages
 * officielles (FR et EN). Si elle est plus récente que la date notée dans rules.json, l'appli prévient
 * « la page a changé : vérifiez » — sans rien interpréter (un humain relit et met rules.json à jour).
 *
 * Produit : apps/pwa/public/data/proposals-status.json
 */
import type { Rules } from '../packages/core/src';
import { USER_AGENT } from './lib/http';
import { writeDataFile, type WrittenFile } from './lib/output';

export interface ProposalStatus { id: string; pageModified: string | null; changed: boolean; checkedAt: string }
export interface ProposalsStats { checked: number; changed: string[]; file?: WrittenFile; error?: string }

/** Date « dcterms.modified » d'une page canada.ca (AAAA-MM-JJ), ou null. */
export function pageModifiedDate(html: string): string | null {
  return /<meta[^>]+name="dcterms\.modified"[^>]+content="(\d{4}-\d{2}-\d{2})"/.exec(html)?.[1]
    ?? /<meta[^>]+content="(\d{4}-\d{2}-\d{2})"[^>]+name="dcterms\.modified"/.exec(html)?.[1] ?? null;
}

export async function fetchProposals(rules: Rules, today: string): Promise<ProposalsStats> {
  console.log('▶ Règles en préparation : dates de modification des pages officielles');
  const out: ProposalStatus[] = [];
  for (const p of rules.proposals) {
    const src = rules.sources[p.source]!;
    const dates: string[] = [];
    for (const url of [src.urlFr, src.urlEn].filter(Boolean) as string[]) {
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
      if (!res.ok) throw new Error(`HTTP ${res.status} pour ${url}`);
      const d = pageModifiedDate(await res.text());
      if (d) dates.push(d);
    }
    const pageModified = dates.sort().at(-1) ?? null;
    const changed = !!pageModified && !!src.pageModified && pageModified > src.pageModified;
    out.push({ id: p.id, pageModified, changed, checkedAt: today });
    console.log(`  ${p.id} : page modifiée le ${pageModified ?? '?'}${changed ? ' ⚠ CHANGÉE depuis la dernière vérification' : ''}`);
  }
  const file = writeDataFile('proposals-status.json', {
    name: 'Règles en préparation — dates de modification des pages officielles',
    publisher: 'IRCC (canada.ca) — relevé automatique VériJob',
    url: 'https://www.canada.ca/fr/immigration-refugies-citoyennete/organisation/mandat/lois-reglements/plan-prospectif-reglementation.html',
    licence: 'Dates seulement',
  }, out.length, out);
  return { checked: out.length, changed: out.filter((o) => o.changed).map((o) => o.id), file };
}
