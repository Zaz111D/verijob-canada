/**
 * Lecture de fichiers tabulaires sans dépendance lourde :
 * - XLSX : décompression (fflate) + lecture XML de la 1re feuille ;
 * - CSV : parseur simple gérant les guillemets ;
 * - ZIP : extraction d'un fichier.
 */
import { strFromU8, unzipSync } from 'fflate';

export type Row = string[];

/** Lit la première feuille d'un classeur XLSX. Renvoie une liste de lignes (cellules vides = ''). */
export function readXlsx(buf: Buffer): Row[] {
  const files = unzipSync(new Uint8Array(buf));
  const shared: string[] = [];
  const ss = files['xl/sharedStrings.xml'];
  if (ss) {
    for (const si of strFromU8(ss).matchAll(/<si>([\s\S]*?)<\/si>/g)) {
      shared.push(decodeXml([...(si[1] ?? '').matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join('')));
    }
  }
  const sheetName = Object.keys(files)
    .filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n))
    .sort()[0];
  if (!sheetName) throw new Error('Aucune feuille dans le classeur');
  const xml = strFromU8(files[sheetName]!);
  const rows: Row[] = [];
  for (const r of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const row: Row = [];
    for (const c of (r[1] ?? '').matchAll(/<c ([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = c[1] ?? '';
      const ref = /r="([A-Z]+)\d+"/.exec(attrs)?.[1] ?? '';
      const type = /t="([^"]+)"/.exec(attrs)?.[1];
      const inner = c[2] ?? '';
      let val = '';
      if (type === 's') val = shared[Number(/<v>([\s\S]*?)<\/v>/.exec(inner)?.[1])] ?? '';
      else if (type === 'inlineStr') val = decodeXml([...inner.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join(''));
      else val = decodeXml(/<v>([\s\S]*?)<\/v>/.exec(inner)?.[1] ?? '');
      row[colIndex(ref)] = val;
    }
    rows.push(Array.from(row, (v) => v ?? ''));
  }
  return rows;
}

function colIndex(ref: string): number {
  let n = 0;
  for (const ch of ref) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, '&');
}

/** Parseur CSV (séparateur configurable, guillemets doublés). */
export function parseCsv(text: string, sep = ','): Row[] {
  const rows: Row[] = [];
  let row: Row = [];
  let field = '';
  let quoted = false;
  const t = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i]!;
    if (quoted) {
      if (ch === '"') {
        if (t[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && t[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += ch;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c !== ''));
}

/** Extrait un fichier d'une archive ZIP (premier nom qui correspond). */
export function unzipOne(buf: Buffer, match: (name: string) => boolean): string {
  const files = unzipSync(new Uint8Array(buf));
  const name = Object.keys(files).find(match);
  if (!name) throw new Error(`Fichier introuvable dans l'archive (${Object.keys(files).join(', ')})`);
  return strFromU8(files[name]!);
}

/** Transforme des lignes en objets à partir d'une ligne d'en-têtes. */
export function toRecords(rows: Row[], headerIndex: number): Array<Record<string, string>> {
  const header = rows[headerIndex]!.map((h) => h.trim());
  return rows.slice(headerIndex + 1).map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? '').trim()])));
}
