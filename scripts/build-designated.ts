/**
 * Employeurs désignés FCIP / RCIP et métiers prioritaires des communautés.
 *
 * Décision du 13 oct. 2026 : PAS de scraper. Ces listes sont curées à la main dans data/manual/
 * (une ligne = une source + une date de relevé). Ce script les VALIDE et les convertit en JSON.
 *
 * Produit : apps/pwa/public/data/designated-employers.json et community-priorities.json
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { employerKey, type Rules } from '../packages/core/src';
import { MANUAL_DIR } from './lib/paths';
import { writeDataFile, type WrittenFile } from './lib/output';
import { parseCsv, toRecords } from './lib/tabular';

const HIRING = new Set(['recrute', 'ne-recrute-pas', 'inconnu']);
const DATE = /^\d{4}-\d{2}-\d{2}$/;
/** Au-delà, une liste est signalée comme à revérifier. */
const MAX_AGE_DAYS = 90;

export interface DesignatedEmployer {
  community: string;
  province: string;
  program: 'RCIP' | 'FCIP';
  employer: string;
  k: string;
  sector: string;
  nocs: string[];
  hiring: 'recrute' | 'ne-recrute-pas' | 'inconnu';
  address: string;
  sourceUrl: string;
  recordedAt: string;
}

export interface DesignatedStats {
  employers: number;
  byCommunity: Array<{ community: string; program: string; employers: number; notHiring: number; recordedAt: string }>;
  communitiesWithoutData: string[];
  priorities: number;
  stale: string[];
  errors: string[];
  files: WrittenFile[];
}

function readCsv(name: string): Array<Record<string, string>> {
  return toRecords(parseCsv(readFileSync(join(MANUAL_DIR, name), 'utf8')), 0);
}

export function buildDesignated(rules: Rules, today: string): DesignatedStats {
  console.log('▶ Employeurs désignés FCIP/RCIP (fichiers curés à la main)');
  const communities = new Map(rules.communityPilots.communities.map((c) => [c.name, c]));
  const errors: string[] = [];
  const out: DesignatedEmployer[] = [];

  readCsv('designated-employers.csv').forEach((r, i) => {
    const line = i + 2;
    const c = communities.get(r['community'] ?? '');
    const program = r['program'] as 'RCIP' | 'FCIP';
    if (!c) return errors.push(`ligne ${line} : communauté inconnue « ${r['community']} »`);
    if (!c.programs.includes(program)) return errors.push(`ligne ${line} : ${c.name} ne participe pas au ${program}`);
    if (!r['employer']) return errors.push(`ligne ${line} : nom d'employeur vide`);
    if (!HIRING.has(r['hiring'] ?? '')) return errors.push(`ligne ${line} : statut « ${r['hiring']} » invalide (recrute | ne-recrute-pas | inconnu)`);
    if (!/^https:\/\//.test(r['source_url'] ?? '')) return errors.push(`ligne ${line} : source_url manquante ou non https`);
    if (!DATE.test(r['recorded_at'] ?? '')) return errors.push(`ligne ${line} : recorded_at doit être AAAA-MM-JJ`);
    const nocs = (r['nocs'] ?? '').split(/[;\s]+/).filter(Boolean);
    if (nocs.some((n) => !/^\d{5}$/.test(n))) return errors.push(`ligne ${line} : codes CNP invalides « ${r['nocs']} »`);
    out.push({
      community: c.name, province: c.province, program, employer: r['employer']!, k: employerKey(r['employer']!),
      sector: r['sector'] ?? '', nocs, hiring: r['hiring'] as DesignatedEmployer['hiring'], address: r['address'] ?? '',
      sourceUrl: r['source_url']!, recordedAt: r['recorded_at']!,
    });
  });

  const priorities = readCsv('community-priorities.csv').filter((r, i) => {
    const c = communities.get(r['community'] ?? '');
    const ok = !!c && c.programs.includes(r['program'] as 'RCIP' | 'FCIP') && /^\d{5}$/.test(r['noc'] ?? '') && /^https:\/\//.test(r['source_url'] ?? '') && DATE.test(r['recorded_at'] ?? '');
    if (!ok) errors.push(`community-priorities.csv ligne ${i + 2} invalide`);
    return ok;
  });

  if (errors.length) throw new Error(`Fichiers curés invalides :\n  ${errors.join('\n  ')}`);

  const groups = new Map<string, DesignatedStats['byCommunity'][number]>();
  for (const e of out) {
    const key = `${e.community}|${e.program}`;
    const g = groups.get(key) ?? { community: e.community, program: e.program, employers: 0, notHiring: 0, recordedAt: e.recordedAt };
    g.employers++;
    if (e.hiring === 'ne-recrute-pas') g.notHiring++;
    if (e.recordedAt < g.recordedAt) g.recordedAt = e.recordedAt;
    groups.set(key, g);
  }
  const ageDays = (d: string) => (Date.parse(today) - Date.parse(d)) / 86_400_000;
  const stale = [...groups.values()].filter((g) => ageDays(g.recordedAt) > MAX_AGE_DAYS).map((g) => `${g.community} (${g.program}, relevé le ${g.recordedAt})`);

  const source = {
    name: 'Employeurs désignés et métiers prioritaires — pilotes PICR / PICRF (relevés manuels)',
    publisher: 'Sites des communautés participantes (liens par ligne)',
    url: rules.sources[rules.communityPilots.source]!.urlFr ?? rules.sources[rules.communityPilots.source]!.urlEn,
    licence: 'Données factuelles publiques relevées à la main ; voir la source de chaque ligne',
  };
  const files = [
    writeDataFile('designated-employers.json', source, out.length, out),
    writeDataFile('community-priorities.json', source, priorities.length, priorities.map((p) => ({
      community: p['community'], program: p['program'], noc: p['noc'], title: p['title'], year: p['year'],
      sourceUrl: p['source_url'], recordedAt: p['recorded_at'], notes: p['notes'] || undefined,
    }))),
  ];
  const withData = new Set(out.map((e) => e.community));
  console.log(`  ${out.length} employeurs désignés, ${priorities.length} métiers prioritaires`);
  return {
    employers: out.length,
    byCommunity: [...groups.values()],
    communitiesWithoutData: [...communities.keys()].filter((c) => !withData.has(c)),
    priorities: priorities.length,
    stale,
    errors,
    files,
  };
}
