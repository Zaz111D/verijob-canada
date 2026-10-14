import { describe, expect, it } from 'vitest';
import { classifyInternational } from '../src';

const status = (t: string) => classifyInternational(t).status;

describe('Offres ouvertes aux candidats de l’étranger', () => {
  it.each([
    'Food processing labourer. LMIA approved position, accommodation available.',
    'Personal support worker — we will sponsor your work permit for the right candidate.',
    'Visa sponsorship available for qualified welders.',
    'International applicants are welcome to apply.',
    'Open to foreign workers. Housing provided.',
    'Poste avec EIMT approuvée, logement fourni.',
    'Les candidatures internationales sont bienvenues.',
    'Recrutement international : soudeurs recherchés pour notre usine.',
    'Admissible à la Mobilité francophone (hors Québec).',
    'This position is advertised in compliance with the Temporary Foreign Worker Program requirements.',
  ])('ouverte : %s', (t) => expect(status(t)).toBe('ouvert'));

  it.each([
    'Must be a Canadian citizen or permanent resident.',
    'Canadian citizens and permanent residents only.',
    'We do not offer sponsorship.',
    'Sponsorship is not available for this role.',
    'Applicants must already reside in Canada.',
    'Valid work permit required.',
    'Vous devez être citoyen canadien ou résident permanent.',
    'Citoyens canadiens seulement.',
    'Aucun parrainage offert.',
    'No LMIA for this position.',
    'Applicants must be legally authorized to work in the United States without current or future visa sponsorship.',
    'This role is offered without visa sponsorship.',
    'Poste sans parrainage.',
    'Not a LMIA position.',
    'Please note that we do not offer LMIA or sponsorship for this role.',
    'We are unable to support work permits.',
    'Nous n’offrons pas d’EIMT pour ce poste.',
  ])('fermée : %s', (t) => expect(status(t)).toBe('ferme'));

  it('une exigence explicite l’emporte sur une mention d’EIMT', () => {
    const v = classifyInternational('LMIA may be considered. Canadian citizens and permanent residents only.');
    expect(v.status).toBe('ferme');
    expect(v.evidence.length).toBeGreaterThan(0);
    expect(v.against[0]).toContain('permanent residents only');
  });

  it('sans mention : inconnue (pas affichée comme ouverte)', () => {
    expect(status('Kitchen helper, full time, $17/hour, Halifax.')).toBe('inconnu');
  });

  it('« légalement autorisé à travailler au Canada » : simple prudence, pas un refus', () => {
    const v = classifyInternational('LMIA approved. Candidates must be legally entitled to work in Canada.');
    expect(v.status).toBe('ouvert');
    expect(v.caution).toHaveLength(1);
  });

  it('extraits avec les accents d’origine', () => {
    expect(classifyInternational('Poste avec EIMT approuvée.').evidence[0]).toBe('Poste avec EIMT approuvée.');
  });
});
