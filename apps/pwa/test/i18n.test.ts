import { describe, expect, it } from 'vitest';
import { STRINGS } from '../src/i18n';

/** Parcourt l'arbre des textes et renvoie les feuilles { fr, en }. */
function leaves(node: unknown, path = ''): Array<{ path: string; fr: unknown; en: unknown }> {
  if (node && typeof node === 'object' && 'fr' in node && 'en' in node) {
    const n = node as { fr: unknown; en: unknown };
    return [{ path, fr: n.fr, en: n.en }];
  }
  return Object.entries(node as object).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k));
}

describe('textes de l’interface', () => {
  const all = leaves(STRINGS);
  it('chaque texte existe en français et en anglais, non vide', () => {
    expect(all.length).toBeGreaterThan(80);
    for (const l of all) {
      expect(typeof l.fr === 'string' && l.fr.trim().length > 0, `${l.path}.fr`).toBe(true);
      expect(typeof l.en === 'string' && l.en.trim().length > 0, `${l.path}.en`).toBe(true);
    }
  });
  it('aucune formulation interdite (« offre sûre », « vérifiée », « garanti »)', () => {
    for (const l of all) {
      const t = `${l.fr} ${l.en}`.toLowerCase();
      expect(t, l.path).not.toMatch(/offre s[uû]re|safe offer|offre v[ée]rifi[ée]e|verified offer|employeur garanti|guaranteed employer/);
    }
  });
});
