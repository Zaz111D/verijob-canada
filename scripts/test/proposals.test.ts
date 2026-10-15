import { describe, expect, it } from 'vitest';
import { pageModifiedDate } from '../fetch-proposals';

describe('date de modification d’une page canada.ca', () => {
  it('lit la balise dcterms.modified, dans les deux ordres d’attributs', () => {
    expect(pageModifiedDate('<meta name="dcterms.modified" title="W3CDTF" content="2026-04-07">')).toBe('2026-04-07');
    expect(pageModifiedDate('<meta content="2026-04-07" name="dcterms.modified">')).toBe('2026-04-07');
    expect(pageModifiedDate('<html></html>')).toBeNull();
  });
});
