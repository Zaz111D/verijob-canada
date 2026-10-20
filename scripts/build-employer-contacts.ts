/**
 * Coordonnées des employeurs relevées À LA MAIN sur leur SITE OFFICIEL (data/manual/coordonnees-employeurs.csv).
 * Une ligne = une page officielle lue, datée. Seulement les coordonnées de l'entreprise (standard, RH, info@, emplois@),
 * jamais celles d'un employé nommé. « inaccessible » = site bloqué depuis l'étranger ou protégé : à vérifier à la main.
 * Ce script VALIDE le fichier et le convertit en JSON pour l'appli (onglet Où postuler, annuaire PDF).
 *
 * Produit : apps/pwa/public/data/employer-contacts.json
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { employerKey, isFreeEmail } from '../packages/core/src';
import { MANUAL_DIR } from './lib/paths';
import { writeDataFile, type WrittenFile } from './lib/output';
import { parseCsv, toRecords } from './lib/tabular';

export interface EmployerContact {
  /** Clé de l'employeur (employerKey) et province, pour le rapprocher des listes officielles. */
  k: string; p: string; n: string; c: string;
  address?: string; phone?: string; phoneAlt?: string; email?: string;
  scope: 'entreprise' | 'usine' | 'succursale' | 'siege';
  status: 'verifie' | 'inaccessible';
  source: string; recordedAt: string; notes?: string;
}

const PROVINCES = new Set(['NL', 'PE', 'NS', 'NB', 'QC', 'ON', 'MB', 'SK', 'AB', 'BC', 'YT', 'NT', 'NU']);
const PHONE = /^(1-)?[2-9]\d{2}-\d{3}-\d{4}$/;
const EMAIL = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const SCOPES = new Set(['entreprise', 'usine', 'succursale', 'siege']);

export interface EmployerContactsStats { rows: number; verified: number; inaccessible: number; file: WrittenFile }

/** Lit et contrôle le relevé : renvoie les lignes et la liste des erreurs (ligne par ligne). */
export function parseEmployerContacts(csv: string, today: string): { out: EmployerContact[]; errors: string[] } {
  const errors: string[] = [];
  const out: EmployerContact[] = [];
  toRecords(parseCsv(csv), 0).forEach((r, i) => {
    const bad = (m: string) => errors.push(`ligne ${i + 2} : ${m}`);
    const get = (k: string) => (r[k] ?? '').trim();
    const status = get('status');
    if (!get('employer')) bad('employeur manquant');
    if (!PROVINCES.has(get('province'))) bad(`province invalide « ${get('province')} »`);
    if (!SCOPES.has(get('scope'))) bad(`portée invalide « ${get('scope')} »`);
    if (status !== 'verifie' && status !== 'inaccessible') bad(`statut invalide « ${status} »`);
    for (const k of ['phone', 'phone_alt']) if (get(k) && !PHONE.test(get(k))) bad(`${k} invalide « ${get(k)} » (format 418-555-1234 ou 1-800-555-1234)`);
    if (get('email') && (!EMAIL.test(get('email')) || isFreeEmail(get('email')))) bad(`e-mail invalide ou messagerie gratuite « ${get('email')} »`);
    if (status === 'verifie' && !get('phone') && !get('email')) bad('ligne « verifie » sans téléphone ni e-mail');
    if (!/^https:\/\//.test(get('source_url'))) bad('source_url doit commencer par https://');
    if (!DATE.test(get('recorded_at')) || get('recorded_at') > today) bad(`recorded_at invalide « ${get('recorded_at')} »`);
    out.push({
      k: employerKey(get('employer')), p: get('province'), n: get('employer'), c: get('city'),
      ...(get('address') ? { address: get('address') } : {}),
      ...(get('phone') ? { phone: get('phone') } : {}),
      ...(get('phone_alt') ? { phoneAlt: get('phone_alt') } : {}),
      ...(get('email') ? { email: get('email').toLowerCase() } : {}),
      scope: get('scope') as EmployerContact['scope'], status: status as EmployerContact['status'],
      source: get('source_url'), recordedAt: get('recorded_at'),
      ...(get('notes') ? { notes: get('notes') } : {}),
    });
  });
  return { out, errors };
}

export function buildEmployerContacts(today: string): EmployerContactsStats {
  console.log('▶ Coordonnées des employeurs (relevées sur leurs sites officiels)');
  const { out, errors } = parseEmployerContacts(readFileSync(join(MANUAL_DIR, 'coordonnees-employeurs.csv'), 'utf8'), today);
  if (errors.length) throw new Error(`coordonnees-employeurs.csv invalide :\n${errors.join('\n')}`);
  const file = writeDataFile('employer-contacts.json', {
    name: 'Coordonnées des employeurs relevées sur leurs sites officiels',
    publisher: 'Relevé manuel VériJob (une page officielle par ligne, datée)',
    url: 'https://github.com/Zaz111D/verijob-canada/blob/main/data/manual/coordonnees-employeurs.csv',
    licence: 'Coordonnées publiques d’entreprises, publiées sur leurs propres sites',
  }, out.length, out);
  const verified = out.filter((x) => x.status === 'verifie').length;
  console.log(`  ${out.length} lignes : ${verified} vérifiées, ${out.length - verified} sites inaccessibles depuis l’étranger`);
  return { rows: out.length, verified, inaccessible: out.length - verified, file };
}

// Exécution directe : contrôle le relevé et régénère le fichier sans lancer tout le pipeline.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) buildEmployerContacts(new Date().toISOString().slice(0, 10));
