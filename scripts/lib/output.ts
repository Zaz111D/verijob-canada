/**
 * Écriture des fichiers publiés : chaque fichier contient { source, fetchedAt, recordCount, data }.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { OUT_DIR } from './paths';

export interface DataSource {
  name: string;
  publisher: string;
  url: string;
  licence: string;
  /** Fichiers d'origine précis (URL de téléchargement). */
  files?: string[];
  /** Trimestres couverts (listes d'EIMT), du plus ancien au plus récent. */
  window?: string[];
  /** Métiers interrogés (offres actuelles). */
  nocs?: string[];
}

export interface DataFile<T> {
  source: DataSource;
  fetchedAt: string;
  recordCount: number;
  data: T;
}

export interface WrittenFile {
  file: string;
  records: number;
  bytes: number;
  gzipBytes: number;
}

/** Écrit un fichier JSON compact et renvoie sa taille (brute et compressée, pour le contrôle 3G). */
export function writeDataFile<T>(name: string, source: DataSource, recordCount: number, data: T): WrittenFile {
  const payload: DataFile<T> = { source, fetchedAt: new Date().toISOString(), recordCount, data };
  const json = JSON.stringify(payload);
  mkdirSync(dirname(join(OUT_DIR, name)), { recursive: true });
  writeFileSync(join(OUT_DIR, name), json);
  return { file: name, records: recordCount, bytes: Buffer.byteLength(json), gzipBytes: gzipSync(json).length };
}

export const OGL = 'Licence du gouvernement ouvert – Canada';
export const STATCAN_OL = 'Licence ouverte de Statistique Canada';
