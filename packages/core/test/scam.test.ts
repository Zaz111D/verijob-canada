import { describe, expect, it } from 'vitest';
import { analyzeOffer, extractWages, parseAmount } from '../src';
import { OFFERS } from './fixtures/offers';
import { nocData, rules, TODAY } from './helpers';

const analyze = (text: string, profile = {}) => analyzeOffer(text, { rules, nocData, profile, today: TODAY });

describe('Vérificateur d’offres — corpus', () => {
  it('contient au moins 15 exemples, FR et EN, arnaques et offres saines', () => {
    expect(OFFERS.length).toBeGreaterThanOrEqual(15);
    for (const lang of ['fr', 'en'] as const) {
      for (const kind of ['arnaque', 'saine'] as const) {
        expect(OFFERS.some((o) => o.lang === lang && o.kind === kind)).toBe(true);
      }
    }
  });

  for (const offer of OFFERS) {
    it(`[${offer.kind} ${offer.lang}] ${offer.name}`, () => {
      const res = analyze(offer.text, offer.profile);
      expect(res.signals.map((s) => s.id).sort()).toEqual([...offer.expected].sort());
      if (offer.kind === 'arnaque') expect(res.count).toBeGreaterThan(0);
    });
  }
});

describe('Vérificateur d’offres — sorties', () => {
  it('chaque signal a une explication FR/EN, des extraits et des sources datées', () => {
    for (const offer of OFFERS.filter((o) => o.kind === 'arnaque')) {
      for (const s of analyze(offer.text, offer.profile).signals) {
        expect(s.explanation.fr.length).toBeGreaterThan(20);
        expect(s.explanation.en.length).toBeGreaterThan(20);
        expect(s.evidence.length).toBeGreaterThan(0);
        expect(s.sources.length).toBeGreaterThan(0);
        for (const src of s.sources) {
          expect(src.url.fr).toMatch(/^https:\/\//);
          expect(src.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        }
      }
    }
  });

  it('résumé : « X signaux » ou « Aucun signal … ne garantit pas », jamais « offre sûre »', () => {
    const none = analyze('Kitchen helper, $16.50/hour, apply by email: jobs@example.ca');
    expect(none.summary.fr).toBe("Aucun signal d'alerte détecté — cela ne garantit pas que l'offre est authentique.");
    expect(none.summary.en).toContain('does not guarantee');
    const many = analyze(OFFERS[0]!.text);
    expect(many.summary.fr).toBe(`${many.count} signaux d'alerte détectés`);
    for (const offer of OFFERS) {
      const r = analyze(offer.text, offer.profile);
      const texts = [r.summary.fr, r.summary.en, r.disclaimer.fr, r.disclaimer.en].join(' ').toLowerCase();
      expect(texts).not.toMatch(/offre s[uû]re|safe offer|offre v[ée]rifi[ée]e|verified offer|employeur garanti/);
    }
  });

  it('affiche les extraits avec les accents d’origine', () => {
    const r = analyze('Réservation de votre place : 100 000 FCFA.');
    expect(r.signals[0]?.evidence[0]).toContain('Réservation');
  });

  it('les signaux forts passent en premier', () => {
    const r = analyze(OFFERS[0]!.text);
    expect(r.signals[0]?.severity).toBe('eleve');
    expect(r.signals.at(-1)?.severity).not.toBe('eleve');
  });

  it('PTAS : pas de signal pour un citoyen mexicain', () => {
    const r = analyze('Programme PTAS : ouvrier agricole en Ontario, 17 $ de l’heure.', { citizenship: 'MX' });
    expect(r.signals.map((s) => s.id)).not.toContain('ptas-afrique');
  });

  it('PTAS : explication personnalisée pour un ressortissant africain', () => {
    const r = analyze('SAWP jobs available now in Ontario.', { citizenship: 'SN' });
    expect(r.signals.find((s) => s.id === 'ptas-afrique')?.explanation.fr).toContain("D'après votre profil");
  });

  it('salaire : métier non reconnu → règle signalée comme non évaluée', () => {
    const r = analyze('Poste de rêve au Canada, 60 $ de l’heure.');
    expect(r.signals.map((s) => s.id)).not.toContain('salaire-irrealiste');
    expect(r.skipped.map((s) => s.id)).toContain('salaire-irrealiste');
  });

  it('salaire : utilise les salaires médians quand ils sont fournis', () => {
    const wageLookup = () => ({ medianHourly: 14 });
    const text = 'Farm worker in Ontario, $30 per hour.';
    expect(analyze(text).signals.map((s) => s.id)).not.toContain('salaire-irrealiste'); // 30 < seuil 36,92
    const r = analyzeOffer(text, { rules, nocData, today: TODAY, wageLookup });
    expect(r.signals.map((s) => s.id)).toContain('salaire-irrealiste'); // 30 > 2 × 14
  });

  it('analyse un long message en moins de 2 secondes', () => {
    const long = OFFERS.map((o) => o.text).join('\n').repeat(20);
    const t0 = Date.now();
    analyze(long);
    expect(Date.now() - t0).toBeLessThan(2000);
  });
});

describe('Extraction des salaires', () => {
  it.each([
    ['6,000', 6000],
    ['4 500', 4500],
    ['17,50', 17.5],
    ['17.50', 17.5],
    ['90 000', 90000],
    ['1,234.56', 1234.56],
  ])('parseAmount(%s) = %d', (s, n) => expect(parseAmount(s)).toBe(n));

  it('convertit mois / an / semaine en taux horaire', () => {
    expect(extractWages('salaire 4500$ par mois')[0]?.hourly).toBeCloseTo(25.96, 1);
    expect(extractWages('salary $7,000 monthly')[0]?.hourly).toBeCloseTo(40.38, 1);
    expect(extractWages('90 000 $ par an')[0]?.hourly).toBeCloseTo(43.27, 1);
    expect(extractWages('$17.25 hourly')[0]?.hourly).toBe(17.25);
    expect(extractWages("17,60 $ de l'heure")[0]?.hourly).toBe(17.6);
  });

  it('ignore les montants en FCFA', () => {
    expect(extractWages('350 000 fcfa par mois')).toEqual([]);
  });
});
