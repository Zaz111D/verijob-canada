/**
 * Fonctions principales et conditions d'accès OFFICIELLES de chaque métier suivi (CNP 2021 v1.0, Statistique Canada),
 * en français et en anglais. Sert au « CV d'exemple pour ce poste » : chaque puce du CV d'exemple vient de ce fichier.
 *
 * Usage (rare : la CNP 2021 v1.0 ne change pas) : npx tsx scripts/build-noc-elements.ts
 * Produit : data/noc-elements.json (versionné, relu avant chaque commit)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { NocData, Rules } from '../packages/core/src';
import { download } from './lib/http';
import { ROOT } from './lib/paths';

const URL_FR = 'https://www.statcan.gc.ca/fr/sujets/norme/cnp/2021/indexV1/cnp-2021-v1.0-elements.csv';
const URL_EN = 'https://www.statcan.gc.ca/en/subjects/standard/noc/2021/indexV1/noc-2021-v1.0-elements.csv';

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

type Kind = 'duties' | 'requirements' | 'examples';
const KIND_FR: Record<string, Kind> = { 'Fonctions principales': 'duties', "Conditions d'accès à la profession": 'requirements', 'Exemple(s) illustratif(s)': 'examples' };
const KIND_EN: Record<string, Kind> = { 'Main duties': 'duties', 'Employment requirements': 'requirements', 'Illustrative example(s)': 'examples' };

function collect(rows: string[][], kinds: Record<string, Kind>, codes: Set<string>) {
  const out = new Map<string, Record<Kind, string[]>>();
  for (const r of rows) {
    const [level, code, , type, desc] = r;
    if (level !== '5' || !codes.has(code!) || !kinds[type!]) continue;
    if (!out.has(code!)) out.set(code!, { duties: [], requirements: [], examples: [] });
    out.get(code!)![kinds[type!]!].push(desc!.trim().replace(/\s+/g, ' '));
  }
  return out;
}

/** Ligne d'introduction (« Ce groupe exerce… ») retirée ; un intitulé de sous-groupe n'a pas de ponctuation finale. */
const isIntro = (s: string) => /^(ce groupe exerce|this group performs)/i.test(s);
const clean = (s: string) => s.replace(/\s*[;.]\s*$/, '');
const isHeading = (s: string) => !/[;.:]\s*$/.test(s) && s.split(' ').length <= 6;

export interface DutyGroup { headingFr?: string; headingEn?: string; items: Array<{ fr: string; en: string }> }
export interface NocElements { code: string; duties: DutyGroup[]; requirements: Array<{ fr: string; en: string }>; examplesFr: string[]; examplesEn: string[] }

const rules = JSON.parse(readFileSync(join(ROOT, 'data', 'rules.json'), 'utf8')) as Rules;
const nocData = JSON.parse(readFileSync(join(ROOT, 'data', 'noc.json'), 'utf8')) as NocData;
const codes = new Set([...nocData.nocs.map((n) => n.code), ...rules.occupationTransfers.map((t) => t.from)]);
const fr = collect(parseCsv((await download(URL_FR, { cacheName: 'noc/cnp-2021-v1.0-elements.csv' })).toString('utf8').replace(/^﻿/, '')), KIND_FR, codes);
const en = collect(parseCsv((await download(URL_EN, { cacheName: 'noc/noc-2021-v1.0-elements.csv' })).toString('utf8').replace(/^﻿/, '')), KIND_EN, codes);

const result: NocElements[] = [];
for (const code of [...codes].sort()) {
  const f = fr.get(code), e = en.get(code);
  if (!f || !e) throw new Error(`CNP ${code} absente des éléments`);
  const df = f.duties.filter((s) => !isIntro(s)), de = e.duties.filter((s) => !isIntro(s));
  if (df.length !== de.length || f.requirements.length !== e.requirements.length) {
    throw new Error(`CNP ${code} : nombre de lignes différent entre FR et EN (${df.length}/${de.length}, ${f.requirements.length}/${e.requirements.length})`);
  }
  const groups: DutyGroup[] = [];
  df.forEach((s, i) => {
    if (isHeading(s) && isHeading(de[i]!)) { groups.push({ headingFr: s, headingEn: de[i]!, items: [] }); return; }
    if (!groups.length) groups.push({ items: [] });
    groups.at(-1)!.items.push({ fr: clean(s), en: clean(de[i]!) });
  });
  result.push({
    code,
    duties: groups.filter((g) => g.items.length),
    requirements: f.requirements.map((s, i) => ({ fr: s.trim(), en: e.requirements[i]!.trim() })),
    examplesFr: f.examples, examplesEn: e.examples,
  });
}
writeFileSync(join(ROOT, 'data', 'noc-elements.json'), JSON.stringify({
  $comment: 'Généré par scripts/build-noc-elements.ts — ne pas modifier à la main. Textes officiels de Statistique Canada (CNP 2021 v1.0), Licence ouverte de Statistique Canada.',
  source: { id: 'statcan-noc-elements', urlFr: URL_FR, urlEn: URL_EN, verifiedAt: new Date().toISOString().slice(0, 10) },
  nocs: result,
}, null, 1) + '\n');
console.log(`${result.length} métiers écrits dans data/noc-elements.json`);
