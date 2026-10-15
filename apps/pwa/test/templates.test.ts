import { describe, expect, it } from 'vitest';
import { buildMessage, type MessageData } from '../src/templates';

const base: MessageData = { employer: 'Ferme Tremblay', jobTitle: 'Manœuvres à la récolte', nocCode: '85101', name: 'Awa', country: 'Cameroun' };

describe('modèles de candidature', () => {
  it('remplit employeur, métier, nom et pays (FR et EN)', () => {
    for (const lang of ['fr', 'en'] as const) {
      const m = buildMessage({ ...base, experienceMonths: 30 }, lang);
      expect(m.subject).toContain('85101');
      expect(m.body).toContain('Ferme Tremblay');
      expect(m.body).toContain('Awa');
      expect(m.body).toMatch(lang === 'fr' ? /2 ans d’expérience/ : /2 years of experience/);
    }
  });
  it('adapte le paragraphe à la voie : agricole, Mobilité francophone, pilote désigné', () => {
    expect(buildMessage({ ...base, pathway: 'eimt-agricole' }, 'fr').body).toContain('volet agricole');
    expect(buildMessage({ ...base, pathway: 'mobilite-francophone', frenchOral: 6 }, 'fr').body).toContain('Mobilité francophone');
    expect(buildMessage({ ...base, designatedProgram: 'FCIP', community: 'Sudbury' }, 'en').body).toContain('Francophone Community Immigration Pilot (FCIP) in Sudbury');
  });
  it('cite l’historique public d’EIMT, sans répéter « déjà recruté »', () => {
    const fr = buildMessage({ ...base, lmiaHistory: { quarters: 5, last: '2026Q1' } }, 'fr').body;
    expect(fr).toContain('pendant 5 trimestres (dernière : 2026 T1)');
    expect(fr).not.toContain('Je sais que vous avez déjà recruté');
    expect(buildMessage({ ...base, lmiaHistory: { quarters: 1, last: '2026Q1' } }, 'en').body).toContain('obtained LMIAs recently (latest: 2026 Q1)');
  });
  it('met en avant l’expérience d’un métier proche et le permis provincial', () => {
    const m = buildMessage({
      ...base, jobTitle: 'agent·e de sécurité', nocCode: '64410', experienceMonths: 48, licence: true,
      transfer: { job: 'agent·e de services correctionnels (gardien·ne de prison)', skills: 'rondes et contrôle des accès' },
    }, 'fr').body;
    expect(m).toContain('J’ai 4 ans d’expérience comme agent·e de services correctionnels (gardien·ne de prison) : rondes et contrôle des accès.');
    expect(m).toContain('permis provincial');
    expect(m).not.toContain('dans ce métier');
    expect(m).not.toMatch(/\n\n\n/);
  });
  it('repères visibles si le nom ou le pays manquent', () => {
    const m = buildMessage({ ...base, name: '', country: '' }, 'fr');
    expect(m.body).toContain('[Votre nom]');
    expect(m.body).toContain('[votre pays]');
  });
  it('jamais de mention de paiement ni de promesse', () => {
    for (const lang of ['fr', 'en'] as const) {
      for (const pathway of ['eimt-agricole', 'mobilite-francophone', 'eimt-bas-salaire'] as const) {
        const t = buildMessage({ ...base, pathway }, lang).body.toLowerCase();
        expect(t).not.toMatch(/payer|paiement|frais|pay |fee|garanti|guarantee/);
      }
    }
  });
});
