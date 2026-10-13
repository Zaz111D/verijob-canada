import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
/** Fichiers bruts téléchargés (ignorés par git, régénérables). */
export const RAW_DIR = join(ROOT, 'data', 'raw');
/** Fichiers curés à la main (versionnés). */
export const MANUAL_DIR = join(ROOT, 'data', 'manual');
/** Fichiers JSON publiés avec la PWA (générés, ignorés par git). */
export const OUT_DIR = join(ROOT, 'apps', 'pwa', 'public', 'data');
export const DOCS_DIR = join(ROOT, 'docs');
