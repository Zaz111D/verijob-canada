/**
 * Employeurs ayant fait leurs preuves dans le recrutement en Afrique — relevés manuels
 * (data/manual/recrutement-afrique.csv). Une ligne = une source publique lue et datée.
 * Ce script VALIDE le fichier (pays, dates, adresse https, type de preuve) et le convertit en JSON.
 *
 * Produit : apps/pwa/public/data/african-recruiters.json
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AFRICAN_COUNTRIES, employerKey, type AfricanRecruiter, type EvidenceType } from '../packages/core/src';
import { MANUAL_DIR } from './lib/paths';
import { writeDataFile, type WrittenFile } from './lib/output';
import { parseCsv, toRecords } from './lib/tabular';

const TYPES = new Set<EvidenceType>(['page-employeur', 'presse', 'mission', 'gouvernement']);
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const PROVINCES = new Set(['NL', 'PE', 'NS', 'NB', 'QC', 'ON', 'MB', 'SK', 'AB', 'BC', 'YT', 'NT', 'NU']);

export interface AfricanRecruitersStats { rows: number; employers: number; file: WrittenFile }

export function buildAfricanRecruiters(today: string): AfricanRecruitersStats {
  console.log('▶ Employeurs ayant recruté en Afrique (relevés manuels)');
  const path = join(MANUAL_DIR, 'recrutement-afrique.csv');
  const errors: string[] = [];
  const rows: AfricanRecruiter[] = [];
  toRecords(parseCsv(readFileSync(path, 'utf8')), 0).forEach((r, i) => {
    const line = i + 2;
    const countries = (r['countries'] ?? '').split('|').map((c) => c.trim().toUpperCase()).filter(Boolean);
    const type = (r['evidence_type'] ?? '') as EvidenceType;
    const bad = (m: string) => errors.push(`ligne ${line} : ${m}`);
    if (!r['employer']?.trim()) bad('employeur manquant');
    if (!PROVINCES.has(r['province'] ?? '')) bad(`province invalide « ${r['province']} »`);
    if (!countries.length || countries.some((c) => !AFRICAN_COUNTRIES.has(c))) bad(`pays invalides « ${r['countries']} » (codes ISO-2 de pays d'Afrique)`);
    if (!TYPES.has(type)) bad(`type de preuve invalide « ${type} »`);
    if (!(r['evidence_fr'] ?? '').trim() || !(r['evidence_en'] ?? '').trim()) bad('preuve FR/EN manquante');
    if (r['event_date'] && !DATE.test(r['event_date'])) bad(`date invalide « ${r['event_date']} »`);
    if (!/^https:\/\//.test(r['source_url'] ?? '')) bad('source_url doit commencer par https://');
    if (!DATE.test(r['recorded_at'] ?? '') || (r['recorded_at'] ?? '') > today) bad(`recorded_at invalide « ${r['recorded_at']} »`);
    rows.push({
      employer: (r['employer'] ?? '').trim(),
      k: employerKey(r['employer'] ?? ''),
      province: r['province'] ?? '',
      city: (r['city'] ?? '').trim(),
      sector: (r['sector'] ?? '').trim(),
      countries,
      type,
      evidence: { fr: (r['evidence_fr'] ?? '').trim(), en: (r['evidence_en'] ?? '').trim() },
      eventDate: r['event_date'] ?? '',
      sourceTitle: (r['source_title'] ?? '').trim(),
      sourceUrl: r['source_url'] ?? '',
      recordedAt: r['recorded_at'] ?? '',
    });
  });
  if (errors.length) throw new Error(`recrutement-afrique.csv invalide :\n${errors.join('\n')}`);
  const file = writeDataFile(
    'african-recruiters.json',
    {
      name: 'Employeurs ayant recruté en Afrique — preuves publiques relevées à la main',
      publisher: 'VériJob Canada (chaque ligne cite sa source)',
      url: 'https://github.com/Zaz111D/verijob-canada/blob/main/data/manual/recrutement-afrique.csv',
      licence: 'Relevé VériJob ; voir la licence de chaque source',
    },
    rows.length,
    rows,
  );
  const employers = new Set(rows.map((r) => r.k)).size;
  console.log(`  ${rows.length} preuves, ${employers} employeurs`);
  return { rows: rows.length, employers, file };
}
