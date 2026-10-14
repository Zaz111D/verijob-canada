import { describe, expect, it } from 'vitest';
import { classifyRound, filterNews, latestRoundByCategory, parseExpressEntryRounds, programStatuses } from '../src';
import { EE_EN, EE_FR, NEWS_FR } from './fixtures/ee-rounds';
import { rules, TODAY } from './helpers';

describe('Entrée express — rondes d’invitations', () => {
  const data = parseExpressEntryRounds(rules, { fr: EE_FR, en: EE_EN });

  it('lit les deux versions, ignore les lignes abîmées, trie du plus récent au plus ancien', () => {
    expect(data.rounds).toHaveLength(10);
    expect(data.rounds[0]).toEqual({
      number: 448, date: '2026-10-13',
      name: { fr: 'Programme des candidats des provinces', en: 'Provincial Nominee Program' },
      size: 752, crs: 772, category: 'pcp', access: 'nomination',
    });
    expect(data.rounds.map((r) => r.date)).toEqual([...data.rounds.map((r) => r.date)].sort().reverse());
  });

  it('nombres avec espace ou virgule de milliers', () => {
    const r = data.rounds.find((x) => x.number === 437)!;
    expect(r.size).toBe(5000);
    expect(r.crs).toBe(382);
  });

  it('une seule langue suffit', () => {
    const en = parseExpressEntryRounds(rules, { en: EE_EN });
    expect(en.rounds[1]?.name).toEqual({ fr: 'Trades Occupations, 2026-Version 3', en: 'Trades Occupations, 2026-Version 3' });
    expect(en.rounds[1]?.category).toBe('metiers');
  });

  it('catégories : accessibles depuis l’étranger ou non', () => {
    const cat = (n: number) => { const r = data.rounds.find((x) => x.number === n)!; return [r.category, r.access]; };
    expect(cat(437)).toEqual(['francais', 'etranger']);
    expect(cat(441)).toEqual(['sante', 'etranger']);
    expect(cat(447)).toEqual(['metiers', 'etranger']);
    expect(cat(434)).toEqual(['transport', 'etranger']);
    expect(cat(446)).toEqual(['cec', 'canada']);
    expect(cat(444)).toEqual(['canada-experience', 'canada']);
    expect(cat(440)).toEqual(['canada-experience', 'canada']);
    expect(cat(430)).toEqual(['autre', 'autre']);
    expect(classifyRound(rules, 'STEM occupations 2026-Version 1').category).toBe('stim');
    expect(classifyRound(rules, 'Education occupations (2026-Version 1)').category).toBe('education');
    expect(classifyRound(rules, 'No Program Specified').category).toBe('generale');
  });

  it('dernière ronde par catégorie, catégories accessibles d’abord', () => {
    const latest = latestRoundByCategory(rules, data);
    expect(latest[0]?.access).toBe('etranger');
    expect(latest.find((r) => r.category === 'francais')?.number).toBe(437); // et non 433
    const accesses = latest.map((r) => r.access);
    expect(accesses.indexOf('canada')).toBeGreaterThan(accesses.lastIndexOf('etranger'));
  });

  it('statut « Entrée express » dans la veille, avec NCLC 7 en français', () => {
    const ee = programStatuses(rules, TODAY).find((p) => p.id === 'entree-express')!;
    expect(ee.detail.fr).toContain('NCLC 7');
    expect(ee.detail.fr).toContain('santé et services sociaux');
    expect(ee.source.url.fr).toMatch(/^https:\/\/www\.canada\.ca\//);
  });
});

describe('Actualités IRCC (fil officiel)', () => {
  const news = filterNews(rules, NEWS_FR);

  it('garde les nouvelles utiles et écarte fiscalité, passeports, citoyenneté', () => {
    expect(news.map((n) => n.link.split('/').pop())).toEqual(['francophone.html', 'halifax.html', 'consultants.html']);
  });
  it('refuse les liens hors canada.ca et les flux invalides', () => {
    expect(news.some((n) => n.link.includes('exemple.test'))).toBe(false);
    expect(filterNews(rules, null)).toEqual([]);
    expect(filterNews(rules, { feed: { entry: 'x' } })).toEqual([]);
  });
  it('dates au format AAAA-MM-JJ, plus récentes d’abord', () => {
    expect(news[0]?.date).toBe('2026-09-29');
  });
  it('un même titre publié deux fois n’apparaît qu’une fois', () => {
    const e = NEWS_FR.feed.entry[1]!;
    const twice = filterNews(rules, { feed: { entry: [e, { ...e, link: `${e.link}?toronto` }] } });
    expect(twice).toHaveLength(1);
  });
});
