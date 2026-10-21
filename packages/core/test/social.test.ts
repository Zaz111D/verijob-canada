import { describe, expect, it } from 'vitest';
import { publisherCheck, socialSearchLinks } from '../src';
import { rules } from './helpers';

describe('Recherches de publications récentes (mode liens)', () => {
  const links = socialSearchLinks(rules, { fr: 'couturière', en: 'sewer' });

  it('une recherche par site et par langue, filtres « récent » conservés', () => {
    expect(links).toHaveLength(rules.opportunities.socialSearches.length * 2);
    const li = links.find((l) => l.id === 'linkedin-posts-fr')!;
    expect(li.url).toContain('datePosted=%22past-week%22');
    expect(decodeURIComponent(li.url)).toContain('couturière Canada (EIMT OR "Mobilité francophone"');
    expect(links.find((l) => l.id === 'google-week-en')!.url).toContain('tbs=qdr:w');
  });

  it('sites sans opérateurs : métier + un seul mot-clé', () => {
    const fb = links.find((l) => l.id === 'facebook-posts-en')!;
    expect(decodeURIComponent(fb.url)).toContain('sewer Canada LMIA');
    expect(fb.url).not.toContain('OR');
  });

  it('métier en plusieurs mots entre guillemets', () => {
    const l = socialSearchLinks(rules, { fr: 'agent de sécurité', en: 'security guard' });
    expect(decodeURIComponent(l.find((x) => x.id === 'x-live-en')!.url)).toContain('"security guard" Canada');
  });
});

describe('Qui publie ? (publisherCheck)', () => {
  it('adresse au nom de l’entreprise', () => {
    const r = publisherCheck('Envoyez votre CV à rh@technofibra.com', 'Techno Fibra Inc.');
    expect(r.link).toBe('lie');
    expect(r.domains).toEqual(['technofibra.com']);
  });

  it('adresse d’un autre domaine : intermédiaire possible', () => {
    expect(publisherCheck('CV à jobs@recrutement-canada-express.com', 'Techno Fibra Inc.').link).toBe('autre');
  });

  it('messagerie gratuite seulement : autre', () => {
    expect(publisherCheck('Contact : technofibra.rh@gmail.com', 'Techno Fibra').link).toBe('autre');
  });

  it('ni adresse ni site : aucun ; réseaux sociaux ignorés', () => {
    const r = publisherCheck('Écrivez-moi en message privé https://www.linkedin.com/in/quelquun', 'Techno Fibra');
    expect(r.domains).toEqual([]);
    expect(r.link).toBe('aucun');
  });

  it('site de l’entreprise cité sans e-mail', () => {
    expect(publisherCheck('Postulez sur www.awl1947.com/emplois', 'Auvents W Lecours').link).toBe('autre');
    expect(publisherCheck('Postulez sur https://perfectioninc.ca/carrieres', 'Perfection Inc.').link).toBe('lie');
  });

  it('numéros hors Amérique du Nord repérés, pas les numéros canadiens', () => {
    const r = publisherCheck('Appelez le +237 6 99 12 34 56 ou le +1 418-555-1234');
    expect(r.foreignPhones).toEqual(['+237 6 99 12 34 56']);
    expect(r.link).toBeUndefined();
  });
});
