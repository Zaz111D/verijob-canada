import { describe, expect, it } from 'vitest';
import { networks, recruitmentEvents, riskyChannels, searchLinks } from '../src';
import { rules, TODAY } from './helpers';

describe('Pistes d’emploi (mode liens)', () => {
  it('liens de recherche encodés, « Canada » par défaut', () => {
    const links = searchLinks(rules, { keyword: 'aide-soignant' });
    const indeed = links.find((l) => l.id === 'indeed')!;
    expect(indeed.url).toBe('https://ca.indeed.com/jobs?q=aide-soignant&l=Canada');
    expect(indeed.filtered).toBe(true);
    const li = searchLinks(rules, { keyword: 'farm worker', location: 'New Brunswick' }).find((l) => l.id === 'linkedin')!;
    expect(li.url).toBe('https://www.linkedin.com/jobs/search/?keywords=farm%20worker&location=New%20Brunswick');
  });

  it('sans mot-clé : page d’accueil du site, non filtrée', () => {
    const indeed = searchLinks(rules).find((l) => l.id === 'indeed')!;
    expect(indeed).toMatchObject({ url: 'https://ca.indeed.com/', filtered: false });
  });

  it('Québec emploi seulement si le Québec est visé (ou aucune province choisie)', () => {
    expect(searchLinks(rules, { provinces: ['NB'] }).some((l) => l.id === 'quebec-emploi')).toBe(false);
    expect(searchLinks(rules, { provinces: ['QC'] }).some((l) => l.id === 'quebec-emploi')).toBe(true);
    expect(searchLinks(rules).some((l) => l.id === 'quebec-emploi')).toBe(true);
  });

  it('chaque lien a une note FR/EN et une date de vérification', () => {
    for (const s of rules.opportunities.searchSites) {
      expect(s.noteFr.length).toBeGreaterThan(20);
      expect(s.noteEn.length).toBeGreaterThan(20);
      expect(s.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('salons : les plus récents d’abord, une édition de plus d’un an est signalée', () => {
    const ev = recruitmentEvents(rules, TODAY);
    expect(ev[0]?.id).toBe('destination-canada');
    expect(ev.find((e) => e.id === 'destination-canada')?.old).toBe(false);
    expect(ev.find((e) => e.id === 'destination-manitoba')?.old).toBe(true);
    for (const e of ev) expect(e.source.url.fr).toMatch(/^https:\/\//);
  });

  it('réseaux : la piste qui concerne le pays de l’utilisateur passe en premier', () => {
    expect(networks(rules, TODAY, 'SN')[0]).toMatchObject({ id: 'services-publics-emploi', forYourCountry: true });
    expect(networks(rules, TODAY, 'CM').every((n) => !n.forYourCountry)).toBe(true);
    expect(networks(rules, TODAY).find((n) => n.id === 'communautes-picr')?.internal).toBe('#/demarcher');
  });

  it('canaux à risque sourcés (Centre antifraude du Canada)', () => {
    const r = riskyChannels(rules, TODAY);
    expect(r.length).toBeGreaterThanOrEqual(2);
    expect(r.every((x) => x.source.id === 'cafc-job-scams')).toBe(true);
  });
});
