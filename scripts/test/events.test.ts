import { describe, expect, it } from 'vitest';
import { eventState, registrationLinks } from '../check-events';
import { buildAipEmployers } from '../build-designated';

const DC = { url: 'https://www.canada.ca/x', section: ['Comment s', 'Destination Canada Éducation'] as [string, string], open: 'maintenant ouvertes', closed: 'fermées', links: 'forms-formulaires' };
const page = (forum: string) => `<p>Sur cette page</p><ul><li>Comment s’inscrire</li><li>Destination Canada Éducation</li></ul>${'<p>texte</p>'.repeat(40)}
  <h2>Comment s’inscrire</h2><h3>22e édition</h3><p>${forum}</p>
  <h3>Destination Canada Éducation</h3><p>Les inscriptions sont pour le moment fermées.</p>`;

describe('salons : inscriptions ouvertes ?', () => {
  it('lit seulement la section du Forum (pas la table des matières ni Destination Canada Éducation)', () => {
    expect(eventState(page('Les inscriptions pour les participants sont maintenant ouvertes.'), DC)).toBe('ouvert');
    expect(eventState(page('Les inscriptions sont fermées.'), DC)).toBe('ferme');
    expect(eventState(page('Les inscriptions ouvriront à l’automne.'), DC)).toBe('inconnu');
  });
  it('phrase « fermé » disparue → à vérifier ; page vide → inconnu', () => {
    const jq = { url: 'https://www.quebec.ca/x', closed: 'No Journées Québec events' };
    expect(eventState(`<p>No Journées Québec events will take place before June 30, 2025.</p>${'<p>texte de la page</p>'.repeat(30)}`, jq)).toBe('ferme');
    expect(eventState(`<p>Journées Québec Maroc : inscriptions du 1er au 15 décembre.</p>${'<p>texte de la page</p>'.repeat(30)}`, jq)).toBe('a-verifier');
    expect(eventState('<div id="app"></div>', jq)).toBe('inconnu');
  });
  it('liens d’inscription officiels, avec la ville', () => {
    const html = '<a href="https://forms-formulaires.alpha.canada.ca/fr/id/abc">Tunis</a> <a href="https://exemple.com/inscription">Agence</a>';
    expect(registrationLinks(html, 'https://www.canada.ca/', 'forms-formulaires')).toEqual([{ label: 'Tunis', url: 'https://forms-formulaires.alpha.canada.ca/fr/id/abc' }]);
  });
});

describe('Canada atlantique : relevé des employeurs désignés', () => {
  it('le fichier du dépôt est valide', () => {
    const r = buildAipEmployers(new Date().toISOString().slice(0, 10));
    expect(r.employers).toBeGreaterThan(500);
  });
});
