/**
 * Classification nationale des professions (CNP 2021 v1.0, Statistique Canada), fichier « éléments » FR et EN.
 *
 * - data/noc-elements.json : fonctions principales et conditions d'accès OFFICIELLES des métiers suivis (CV d'exemple) ;
 * - data/noc-catalog.json  : les 516 métiers (code, titre officiel, nom court = 1er exemple illustratif), pour choisir
 *                            n'importe quel métier dans le profil ;
 * - data/noc-search.json   : exemples illustratifs de chaque métier (« soudeur », « camionneur »…), pour la recherche ;
 * - apps/pwa/public/data/noc/<code>.json (pipeline, writeAllNocElements) : fonctions officielles de CHAQUE métier,
 *   chargées seulement quand on prépare un CV pour ce métier.
 *
 * Usage (rare : la CNP 2021 v1.0 ne change pas) : npx tsx scripts/build-noc-elements.ts
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NocData, Rules } from '../packages/core/src';
import { download } from './lib/http';
import { OUT_DIR, ROOT } from './lib/paths';

const URL_FR = 'https://www.statcan.gc.ca/fr/sujets/norme/cnp/2021/indexV1/cnp-2021-v1.0-elements.csv';
const URL_EN = 'https://www.statcan.gc.ca/en/subjects/standard/noc/2021/indexV1/noc-2021-v1.0-elements.csv';
const SOURCE = { id: 'statcan-noc-elements', urlFr: URL_FR, urlEn: URL_EN };

/** Lecture CSV simple (guillemets doublés, virgules dans les champs). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.length > 1) rows.push(row);
      row = [];
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

type Kind = 'duties' | 'requirements' | 'examples' | 'all';
const KIND_FR: Record<string, Kind> = { 'Fonctions principales': 'duties', "Conditions d'accès à la profession": 'requirements', 'Exemple(s) illustratif(s)': 'examples', 'Tous les exemples': 'all' };
const KIND_EN: Record<string, Kind> = { 'Main duties': 'duties', 'Employment requirements': 'requirements', 'Illustrative example(s)': 'examples', 'All examples': 'all' };

interface Raw { title: string; duties: string[]; requirements: string[]; examples: string[]; all: string[] }

function collect(rows: string[][], kinds: Record<string, Kind>) {
  const out = new Map<string, Raw>();
  for (const r of rows) {
    const [level, code, title, type, desc] = r;
    if (level !== '5' || !/^\d{5}$/.test(code ?? '')) continue;
    if (!out.has(code!)) out.set(code!, { title: title!.trim(), duties: [], requirements: [], examples: [], all: [] });
    const k = kinds[type!];
    if (k) out.get(code!)![k].push(desc!.trim().replace(/\s+/g, ' '));
  }
  return out;
}

/** Ligne d'introduction (« Ce groupe exerce… ») retirée ; un intitulé de sous-groupe n'a pas de ponctuation finale. */
const isIntro = (s: string) => /^(ce groupe exerce|this group performs)/i.test(s);
const clean = (s: string) => s.replace(/\s*[;.]\s*$/, '');
const isHeading = (s: string) => !/[;.:]\s*$/.test(s) && s.split(' ').length <= 6;

export interface DutyGroup { headingFr?: string; headingEn?: string; items: Array<{ fr: string; en: string }> }
export interface NocElements { code: string; duties: DutyGroup[]; requirements: Array<{ fr: string; en: string }>; examplesFr: string[]; examplesEn: string[] }
/** Entrée du catalogue : code, titres officiels, nom court (1er exemple illustratif). */
export interface CatalogEntry { c: string; tf: string; te: string; jf: string; je: string }

/** Lit les deux fichiers officiels (cache data/raw/noc) et renvoie les données de tous les métiers. */
export async function readNocFiles(): Promise<{ fr: Map<string, Raw>; en: Map<string, Raw> }> {
  const fr = collect(parseCsv((await download(URL_FR, { cacheName: 'noc/cnp-2021-v1.0-elements.csv' })).toString('utf8').replace(/^﻿/, '')), KIND_FR);
  const en = collect(parseCsv((await download(URL_EN, { cacheName: 'noc/noc-2021-v1.0-elements.csv' })).toString('utf8').replace(/^﻿/, '')), KIND_EN);
  return { fr, en };
}

/**
 * Fonctions et conditions d'un métier, FR et EN appariées ligne à ligne.
 * Si les deux langues n'ont pas le même nombre de lignes, on ne peut pas les apparier sans risque : undefined
 * (strict = true : erreur, pour les métiers suivis).
 */
export function elementsFor(code: string, fr: Raw | undefined, en: Raw | undefined, strict = false): NocElements | undefined {
  if (!fr || !en) { if (strict) throw new Error(`CNP ${code} absente des éléments`); return undefined; }
  const df = fr.duties.filter((s) => !isIntro(s)), de = en.duties.filter((s) => !isIntro(s));
  if (df.length !== de.length || fr.requirements.length !== en.requirements.length) {
    if (strict) throw new Error(`CNP ${code} : nombre de lignes différent entre FR et EN (${df.length}/${de.length}, ${fr.requirements.length}/${en.requirements.length})`);
    return undefined;
  }
  const groups: DutyGroup[] = [];
  df.forEach((s, i) => {
    if (isHeading(s) && isHeading(de[i]!)) { groups.push({ headingFr: s, headingEn: de[i]!, items: [] }); return; }
    if (!groups.length) groups.push({ items: [] });
    groups.at(-1)!.items.push({ fr: clean(s), en: clean(de[i]!) });
  });
  return {
    code,
    duties: groups.filter((g) => g.items.length),
    requirements: fr.requirements.map((s, i) => ({ fr: s.trim(), en: en.requirements[i]!.trim() })),
    examplesFr: fr.examples, examplesEn: en.examples,
  };
}

/** Pipeline : un fichier de fonctions officielles par métier (chargé à la demande par le CV d'exemple). */
export async function writeAllNocElements(): Promise<{ written: number; skipped: string[] }> {
  console.log('▶ CNP 2021 : fonctions officielles de chaque métier (CV d’exemple pour tous les métiers)');
  const { fr, en } = await readNocFiles();
  const dir = join(OUT_DIR, 'noc');
  mkdirSync(dir, { recursive: true });
  const skipped: string[] = [];
  let written = 0;
  const verifiedAt = new Date().toISOString().slice(0, 10);
  for (const code of [...fr.keys()].sort()) {
    const el = elementsFor(code, fr.get(code), en.get(code));
    if (!el || !el.duties.length) { skipped.push(code); continue; }
    writeFileSync(join(dir, `${code}.json`), JSON.stringify({ source: { ...SOURCE, verifiedAt }, nocs: [el] }));
    written++;
  }
  console.log(`  ${written} métiers écrits dans data/noc/ ; ${skipped.length} sans appariement FR/EN fiable (pas de CV d’exemple)`);
  return { written, skipped };
}

/** Exemples à éviter comme nom court : niveaux ou statuts (« apprenti cuisinier », « chef comptable »). */
const NOT_SHORT = /^(apprenti|apprentie|apprentice|compagnon|compagne|journeyman|chef|head|senior|superviseur|superviseure|supervisor|surveillant|surveillante|assistant|assistante|aide|helper|stagiaire|trainee)/i;
const strip = (s: string) => s.replace(/\s*\(.*?\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
const stem = (w: string) => w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').slice(0, 5);
/**
 * Nom court d'un métier, pour les messages et le CV (« cuisinier/cuisinière », « welder ») : parmi les exemples officiels,
 * le plus court qui n'est pas un niveau (apprenti, chef…), de préférence celui qui commence comme le titre officiel.
 */
function shortName(raw: Raw): string {
  const first = stem(raw.title.split(/[\s/,]/)[0] ?? '');
  const ok = (list: string[]) => [...new Set(list.map(strip))].filter((x) => x && !NOT_SHORT.test(x));
  const starts = (x: string) => stem(x.split(/[\s/]/)[0] ?? '') === first;
  const shortest = (list: string[]) => [...list].sort((a, b) => a.split(' ').length - b.split(' ').length || a.length - b.length)[0];
  // 1) exemple illustratif qui commence comme le titre ; 2) n'importe quel exemple qui commence comme le titre ;
  // 3) exemple illustratif le plus court ; 4) titre officiel.
  const ill = ok(raw.examples), all = ok(raw.all);
  return shortest(ill.filter(starts)) ?? shortest(all.filter(starts)) ?? shortest(ill) ?? strip(raw.title);
}

/** Exemples gardés pour la recherche : les illustratifs et les courts (3 mots au plus), 25 au plus par métier. */
function searchTerms(raw: Raw): string[] {
  const n = (w: string) => strip(w).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/œ/g, 'oe');
  return [...new Set([...raw.examples, ...raw.all.filter((x) => strip(x).split(' ').length <= 3)].map(n))].slice(0, 25);
}

// ---------------------------------------------------------------------------
// Exécution directe : fichiers versionnés (relus avant chaque commit).
// ---------------------------------------------------------------------------
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const rules = JSON.parse(readFileSync(join(ROOT, 'data', 'rules.json'), 'utf8')) as Rules;
  const nocData = JSON.parse(readFileSync(join(ROOT, 'data', 'noc.json'), 'utf8')) as NocData;
  const { fr, en } = await readNocFiles();
  const verifiedAt = new Date().toISOString().slice(0, 10);
  const curated = [...new Set([...nocData.nocs.map((n) => n.code), ...rules.occupationTransfers.map((t) => t.from)])].sort();
  const result = curated.map((code) => elementsFor(code, fr.get(code), en.get(code), true)!);
  writeFileSync(join(ROOT, 'data', 'noc-elements.json'), JSON.stringify({
    $comment: 'Généré par scripts/build-noc-elements.ts — ne pas modifier à la main. Textes officiels de Statistique Canada (CNP 2021 v1.0), Licence ouverte de Statistique Canada.',
    source: { ...SOURCE, verifiedAt },
    nocs: result,
  }, null, 1) + '\n');

  const codes = [...fr.keys()].filter((c) => en.has(c)).sort();
  const catalog: CatalogEntry[] = codes.map((c) => ({
    c, tf: fr.get(c)!.title, te: en.get(c)!.title,
    jf: shortName(fr.get(c)!), je: shortName(en.get(c)!),
  }));
  writeFileSync(join(ROOT, 'data', 'noc-catalog.json'), JSON.stringify({
    $comment: 'Généré par scripts/build-noc-elements.ts — les 516 groupes de base de la CNP 2021 v1.0 (Statistique Canada). jf/je = 1er exemple illustratif officiel.',
    source: { ...SOURCE, verifiedAt },
    nocs: catalog,
  }) + '\n');
  // Index de recherche : tous les exemples officiels (FR et EN), pour trouver « camionneur » dans 73300.
  const search: Record<string, string> = {};
  for (const c of codes) search[c] = [...new Set([...searchTerms(fr.get(c)!), ...searchTerms(en.get(c)!)])].join(' | ');
  writeFileSync(join(ROOT, 'data', 'noc-search.json'), JSON.stringify(search) + '\n');
  console.log(`${result.length} métiers suivis dans data/noc-elements.json ; ${catalog.length} métiers dans data/noc-catalog.json`);
}
