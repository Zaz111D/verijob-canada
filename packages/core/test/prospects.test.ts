import { describe, expect, it } from 'vitest';
import { filterProspects, prospectPathway, prospectsToCsv, type Prospect } from '../src';
import { nocData, rules, TODAY } from './helpers';

const base = { k: '', pc: '', neg: 0 };
const LIST: Prospect[] = [
  { ...base, n: 'Ferme A', k: 'ferme a', p: 'ON', c: 'Simcoe', g: '?', q: 8, lq: '2026Q1', s: ['PA'], j: [['85101', 500]] },
  { ...base, n: 'Usine B', k: 'usine b', p: 'NS', c: 'Halifax', g: 'Halifax', q: 4, lq: '2025Q4', s: ['LW'], j: [['94142', 40]] },
  { ...base, n: 'Entrepôt C', k: 'entrepot c', p: 'ON', c: 'Toronto', g: 'Toronto', q: 3, lq: '2026Q1', s: ['LW'], j: [['75101', 10]] },
  { ...base, n: 'Ferme D', k: 'ferme d', p: 'QC', c: 'Saint-Rémi', g: '-', q: 8, lq: '2026Q1', s: ['PA', 'LW'], j: [['85101', 900], ['85121', 5]] },
  { ...base, n: 'Ponctuel E', k: 'ponctuel e', p: 'ON', c: 'London', g: 'London', q: 1, lq: '2026Q1', s: ['LW'], j: [['75101', 3]] },
];

describe('filterProspects', () => {
  it('filtre par métier et province, trie par régularité puis postes', () => {
    expect(filterProspects(LIST, { nocs: ['85101'] }).map((x) => x.n)).toEqual(['Ferme D', 'Ferme A']);
    expect(filterProspects(LIST, { provinces: ['ON'] }).map((x) => x.n)).toEqual(['Ferme A', 'Entrepôt C']);
  });
  it('exclut les employeurs uniquement en agriculture primaire si demandé', () => {
    expect(filterProspects(LIST, { nocs: ['85101'], excludeAgricultureOnly: true }).map((x) => x.n)).toEqual(['Ferme D']);
  });
  it('ignore les employeurs vus sur un seul trimestre', () => {
    expect(filterProspects(LIST, {}).some((x) => x.n === 'Ponctuel E')).toBe(false);
  });
});

describe('prospectPathway', () => {
  const opts = { rules, nocData, today: TODAY };
  it('usine de poisson à Halifax : EIMT possible (exemption estimée) ; PTAS jamais mis en avant', () => {
    const r = prospectPathway(LIST[1]!, { citizenship: 'CM' }, opts);
    expect(r.noc).toBe('94142');
    expect(r.best.voie).toBe('eimt-bas-salaire');
    expect(r.best.statut).toBe('possible');
  });
  it('manutentionnaire à Toronto + francophone NCLC 5 : Mobilité francophone probable', () => {
    const r = prospectPathway(LIST[2]!, { french: { speaking: 5, listening: 5 } }, opts);
    expect(r.best.voie).toBe('mobilite-francophone');
    expect(r.best.statut).toBe('probable');
  });
  it('ferme : volet agricole, jamais le PTAS', () => {
    const r = prospectPathway(LIST[0]!, { citizenship: 'CM' }, opts);
    expect(r.best.voie).toBe('eimt-agricole');
  });
});

describe('prospectsToCsv', () => {
  it('BOM UTF-8, séparateur « ; », guillemets échappés', () => {
    const csv = prospectsToCsv([{ Employeur: 'Ferme "Les Pins"; Inc', Postes: 12 }]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('Employeur;Postes\r\n');
    expect(csv).toContain('"Ferme ""Les Pins""; Inc";12');
  });
});
