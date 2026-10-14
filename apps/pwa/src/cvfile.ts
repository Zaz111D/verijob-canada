/**
 * Lecture d'un CV sur le téléphone (rien n'est envoyé) : PDF (pdf.js, chargé seulement ici),
 * Word .docx (archive zip lue avec fflate) ou texte brut.
 * Renvoie le texte et quelques indices de mise en page pour le vérificateur (@verijob/core, analyzeCv).
 */
import type { CvInput } from '@verijob/core';

export const MAX_CV_BYTES = 5 * 1024 * 1024;

export class CvFileError extends Error {
  constructor(public code: 'trop-gros' | 'format' | 'illisible') { super(code); }
}

export async function readCvFile(file: File): Promise<CvInput> {
  if (file.size > MAX_CV_BYTES) throw new CvFileError('trop-gros');
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf') || file.type === 'application/pdf') return readPdf(file);
  if (name.endsWith('.docx')) return readDocx(file);
  if (name.endsWith('.txt') || file.type.startsWith('text/')) return { text: await file.text(), fileName: file.name, fileType: 'txt' };
  throw new CvFileError('format');
}

async function readPdf(file: File): Promise<CvInput> {
  // pdf.js est lourd : chargé à la demande, puis gardé en cache par le service worker.
  const [pdfjs, worker] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  let doc;
  try {
    doc = await task.promise;
  } catch {
    throw new CvFileError('illisible');
  }
  const parts: string[] = [];
  let hasImage = false;
  const imageOps = new Set([pdfjs.OPS.paintImageXObject, pdfjs.OPS.paintInlineImageXObject]);
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    let line = '';
    for (const item of content.items) {
      if (!('str' in item)) continue;
      line += item.str;
      if (item.hasEOL) { parts.push(line); line = ''; }
    }
    if (line) parts.push(line);
    // Photo probable : une image sur la 1re page.
    if (i === 1) hasImage = (await page.getOperatorList()).fnArray.some((op) => imageOps.has(op));
  }
  const pages = doc.numPages;
  await task.destroy();
  return { text: parts.join('\n'), fileName: file.name, fileType: 'pdf', pages, hasImage };
}

async function readDocx(file: File): Promise<CvInput> {
  const { unzipSync, strFromU8 } = await import('fflate');
  let files: Record<string, Uint8Array>;
  try { files = unzipSync(new Uint8Array(await file.arrayBuffer())); } catch { throw new CvFileError('illisible'); }
  const docXml = files['word/document.xml'];
  if (!docXml) throw new CvFileError('illisible');
  const xml = strFromU8(docXml);
  const text = xml
    .replace(/<w:tab\/>/g, '\t')
    .replace(/<w:br[^>]*\/>/g, '\n')
    .replace(/<\/w:p>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
  const app = files['docProps/app.xml'] ? strFromU8(files['docProps/app.xml']) : '';
  const pages = Number(/<Pages>(\d+)<\/Pages>/.exec(app)?.[1]) || undefined;
  return {
    text,
    fileName: file.name,
    fileType: 'docx',
    pages,
    hasImage: Object.keys(files).some((f) => f.startsWith('word/media/')),
    hasTables: xml.includes('<w:tbl>') || xml.includes('<w:tbl '),
    hasTextBoxes: xml.includes('w:txbxContent'),
  };
}
