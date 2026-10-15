import { describe, expect, it } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';
import elementsJson from '../../../data/noc-elements.json';
import nocJson from '../../../data/noc.json';
import rulesJson from '../../../data/rules.json';
import { buildSampleCv, type NocData, type NocElementsData, type Rules } from '@verijob/core';
import { sampleCvToDocx } from '../src/cvdocx';

describe('CV d’exemple en Word', () => {
  it('produit un .docx complet : styles, vraies puces, repères surlignés, caractères échappés', async () => {
    const cv = buildSampleCv({
      rules: rulesJson as unknown as Rules, nocData: nocJson as unknown as NocData, elements: elementsJson as unknown as NocElementsData,
      noc: '64410', lang: 'fr', profile: { currentNoc: '43201' }, offer: { title: 'Agent de sécurité <nuit> & week-end' },
    });
    const files = unzipSync(await sampleCvToDocx(cv));
    expect(Object.keys(files).sort()).toEqual(['[Content_Types].xml', '_rels/.rels', 'word/_rels/document.xml.rels', 'word/document.xml', 'word/numbering.xml', 'word/styles.xml']);
    const doc = strFromU8(files['word/document.xml']!);
    expect(doc).toContain('Agent de sécurité &lt;nuit&gt; &amp; week-end');
    expect(doc).toContain('<w:numId w:val="1"/>');
    expect(doc).toContain('<w:highlight w:val="yellow"/>');
    expect(doc).toContain('[Prénom NOM]');
    expect(doc).not.toMatch(/<w:tbl>|<w:drawing>/); // une colonne, sans tableau ni image (logiciels de tri)
  });
});
