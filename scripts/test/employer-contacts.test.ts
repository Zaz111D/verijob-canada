import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseEmployerContacts } from '../build-employer-contacts';
import { MANUAL_DIR } from '../lib/paths';

const HEAD = 'employer,province,city,address,phone,phone_alt,email,scope,status,source_url,recorded_at,notes\n';

describe('coordonnées des employeurs', () => {
  it('le relevé du dépôt est valide', () => {
    const { out, errors } = parseEmployerContacts(readFileSync(join(MANUAL_DIR, 'coordonnees-employeurs.csv'), 'utf8'), '2026-10-20');
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
