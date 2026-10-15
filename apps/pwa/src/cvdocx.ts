/**
 * CV d'exemple en Word (.docx) modifiable, fabriqué sur le téléphone (rien n'est envoyé).
 * Fichier minimal conforme à Office Open XML : styles simples, vraies puces (liste Word), une colonne,
 * sans tableau ni zone de texte (lisible par les logiciels de tri des candidatures).
 * Les repères à remplacer [entre crochets] sont surlignés en jaune.
 */
import type { SampleCv } from '@verijob/core';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Texte découpé en morceaux : les [repères] sont surlignés. */
function runs(text: string, opts: { bold?: boolean; size?: number } = {}): string {
  const rPr = (hl: boolean) => `<w:rPr>${opts.bold ? '<w:b/>' : ''}${opts.size ? `<w:sz w:val="${opts.size}"/>` : ''}${hl ? '<w:highlight w:val="yellow"/>' : ''}</w:rPr>`;
  return text.split(/(\[[^\]]*\])/).filter(Boolean)
    .map((part) => `<w:r>${rPr(part.startsWith('['))}<w:t xml:space="preserve">${esc(part)}</w:t></w:r>`).join('');
}
const para = (text: string, o: { style?: string; bold?: boolean; size?: number; center?: boolean; bullet?: boolean; after?: number } = {}) =>
  `<w:p><w:pPr>${o.style ? `<w:pStyle w:val="${o.style}"/>` : ''}${o.bullet ? '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>' : ''}${o.after !== undefined ? `<w:spacing w:after="${o.after}"/>` : ''}${o.center ? '<w:jc w:val="center"/>' : ''}</w:pPr>${runs(text, o)}</w:p>`;

function documentXml(cv: SampleCv): string {
  const fr = cv.lang === 'fr';
  const H = (s: string) => para(s, { style: 'Heading1' });
  const body = [
    para(cv.header.name, { bold: true, size: 32, center: true, after: 0 }),
    para(cv.title, { bold: true, size: 24, center: true, after: 0 }),
    para(`${cv.header.location} | ${cv.header.contact}`, { center: true, after: 0 }),
    para(cv.header.availability, { center: true }),
    H(fr ? 'Profil' : 'Profile'), para(cv.summary),
    H(fr ? 'Compétences clés' : 'Key skills'), ...cv.skills.map((s) => para(s, { bullet: true })),
    H(fr ? 'Expérience professionnelle' : 'Work experience'),
    ...cv.experience.flatMap((j) => [
      para(`${j.title} — ${j.period}`, { bold: true, after: 0 }),
      para([j.employer, j.place].filter(Boolean).join(' — '), { after: 60 }),
      ...j.bullets.map((b) => para(`${b.text}${b.result ? ` — ${b.result}` : ''}`, { bullet: true })),
    ]),
    H(fr ? 'Formation' : 'Education'), ...cv.education.map((e) => para(e)),
    ...(cv.certifications.length ? [H(fr ? 'Certifications et permis' : 'Certifications and licences'), ...cv.certifications.map((c) => para(c, { bullet: true }))] : []),
    H(fr ? 'Langues' : 'Languages'), ...cv.languages.map((l) => para(l, { bullet: true })),
  ].join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`;
}

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="22"/><w:lang w:val="fr-CA"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="80" w:line="259" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="1F4E79"/></w:pBdr><w:spacing w:before="240" w:after="80"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:caps/><w:color w:val="1F4E79"/><w:sz w:val="24"/></w:rPr></w:style>
</w:styles>`;

const NUMBERING = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="singleLevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="360" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum>
<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
</w:numbering>`;

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/></Types>`;
const RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
const DOC_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/></Relationships>`;

/** Fichier .docx (octets). */
export async function sampleCvToDocx(cv: SampleCv): Promise<Uint8Array> {
  const { zipSync, strToU8 } = await import('fflate');
  return zipSync({
    '[Content_Types].xml': strToU8(CONTENT_TYPES),
    '_rels/.rels': strToU8(RELS),
    'word/_rels/document.xml.rels': strToU8(DOC_RELS),
    'word/document.xml': strToU8(documentXml(cv)),
    'word/styles.xml': strToU8(STYLES.replace('fr-CA', cv.lang === 'fr' ? 'fr-CA' : 'en-CA')),
    'word/numbering.xml': strToU8(NUMBERING),
  });
}

export { documentXml as _documentXmlForTests };
