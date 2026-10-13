import { describe, expect, it } from 'vitest';
import { zipSync, strToU8 } from 'fflate';
import { parseAddress } from '../fetch-lmia';
import { parseCsv, readXlsx, toRecords } from '../lib/tabular';

describe('parseAddress', () => {
  it('ville, province, code postal', () => {
    expect(parseAddress('Slave Lake, AB T0G 2A0')).toEqual({ city: 'Slave Lake', postal: 'T0G 2A0', repaired: false });
  });
  it('répare l’apostrophe abîmée à la source', () => {
    const a = parseAddress('St. John\ufffds, NL A1B 1W3');
    expect(a.city).toBe("St. John's");
    expect(a.repaired).toBe(true);
  });
  it('code postal collé ou absent', () => {
    expect(parseAddress('St.john, NL A1A2N3').postal).toBe('A1A 2N3');
    expect(parseAddress('Moncton, NB').postal).toBe('');
    expect(parseAddress('Moncton, NB').city).toBe('Moncton');
  });
});

describe('parseCsv', () => {
  it('gère guillemets, virgules et guillemets doublés', () => {
    const rows = parseCsv('a,b,c\r\n"1,5","dit ""bonjour""",x\n');
    expect(rows).toEqual([['a', 'b', 'c'], ['1,5', 'dit "bonjour"', 'x']]);
  });
  it('toRecords associe les en-têtes', () => {
    expect(toRecords(parseCsv('nom,ville\nFerme,Saint-Rémi'), 0)).toEqual([{ nom: 'Ferme', ville: 'Saint-Rémi' }]);
  });
});

describe('readXlsx', () => {
  it('lit chaînes partagées, chaînes en ligne, nombres et cellules vides', () => {
    const sheet = `<worksheet><sheetData>
      <row r="1"><c r="A1" t="s"><v>0</v></c><c r="C1" t="s"><v>1</v></c></row>
      <row r="2"><c r="A2" t="inlineStr"><is><t>Ferme &amp; Fils</t></is></c><c r="B2"><v>12</v></c></row>
    </sheetData></worksheet>`;
    const shared = '<sst><si><t>Employer</t></si><si><r><t>Appro</t></r><r><t>ved</t></r></si></sst>';
    const buf = Buffer.from(zipSync({ 'xl/worksheets/sheet1.xml': strToU8(sheet), 'xl/sharedStrings.xml': strToU8(shared) }));
    expect(readXlsx(buf)).toEqual([['Employer', '', 'Approved'], ['Ferme & Fils', '12']]);
  });
});
