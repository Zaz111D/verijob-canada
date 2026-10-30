import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { pageStillShows, parseEmployerContacts } from '../build-employer-contacts';
import { MANUAL_DIR } from '../lib/paths';

const HEAD = 'employer,province,city,address,phone,phone_alt,email,scope,status,source_url,recorded_at,notes\n';

describe('coordonnées des employeurs', () => {
  it('le relevé du dépôt est valide', () => {
    const { out, errors } = parseEmployerContacts(readFileSync(join(MANUAL_DIR, 'coordonnees-employeurs.csv'), 'utf8'), new Date().toISOString().slice(0, 10));
    expect(errors).toEqual([]);
    expect(out.length).toBeGreaterThan(0);
    for (const c of out.filter((x) => x.status === 'verifie')) expect(c.phone ?? c.email).toBeTruthy();
  });

  it('rejette un e-mail gratuit, un téléphone mal formé, une source http et une date future', () => {
    const { errors } = parseEmployerContacts(
      HEAD + 'Exemple Inc,QC,Québec,,418 555 1234,,rh.exemple@gmail.com,entreprise,verifie,http://exemple.ca,2027-01-01,\n', '2026-10-20');
    expect(errors.join('\n')).toMatch(/phone invalide/);
    expect(errors.join('\n')).toMatch(/messagerie gratuite/);
    expect(errors.join('\n')).toMatch(/https/);
    expect(errors.join('\n')).toMatch(/recorded_at/);
  });

  it('accepte une ligne correcte et normalise la clé de l’employeur', () => {
    const { out, errors } = parseEmployerContacts(
      HEAD + 'Les Ateliers Exemple Inc.,QC,Québec,,1-800-555-1234,,RH@Exemple.ca,entreprise,verifie,https://exemple.ca/contact,2026-10-20,\n', '2026-10-20');
    expect(errors).toEqual([]);
    expect(out[0]).toMatchObject({ k: 'ateliers exemple', phone: '1-800-555-1234', email: 'rh@exemple.ca' });
  });
});

describe('contrôle des pages de coordonnées', () => {
  const page = (body: string) => `<html><body><p>${'Bienvenue chez nous. '.repeat(30)}</p>${body}</body></html>`;
  const c = { phone: '418-522-8271', phoneAlt: '1-866-522-8271', email: 'info@exemple.ca' };

  it('numéro toujours présent, quel que soit son format', () => {
    expect(pageStillShows(page('Tél. : (418) 522.8271'), c)).toBe('ok');
    expect(pageStillShows(page('Sans frais 1 866 522-8271'), c)).toBe('ok');
    expect(pageStillShows(page('<a href="mailto:info@exemple.ca">Écrivez-nous</a>'), { email: 'info@exemple.ca' })).toBe('ok');
  });

  it('page lisible sans le numéro : à revérifier', () => {
    expect(pageStillShows(page('Tél. : 418-555-0000'), c)).toBe('absent');
  });

  it('page anti-robot ou affichée par script : rien à conclure', () => {
    expect(pageStillShows('<title>Just a moment...</title>Enable JavaScript and cookies to continue', c)).toBe('bloque');
    expect(pageStillShows('<html><div id="root"></div><script>app()</script></html>', c)).toBe('bloque');
  });
});
