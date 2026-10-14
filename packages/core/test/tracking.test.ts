import { describe, expect, it } from 'vitest';
import {
  addDays, dueFollowUps, exportApplications, mergeApplications, parseImport, sortApplications, MAX_AD_TEXT, type Application,
} from '../src';

const app = (over: Partial<Application>): Application => ({
  id: 'a1', employer: 'Ferme A', job: 'Ouvrier agricole', date: '2026-10-01', status: 'envoyee', updatedAt: '2026-10-01T10:00:00Z', ...over,
});

describe('relances', () => {
  it('addDays gère les fins de mois', () => {
    expect(addDays('2026-10-25', 10)).toBe('2026-11-04');
  });
  it('relances dues : date passée et statut non terminé', () => {
    const list = [
      app({ id: '1', followUp: '2026-10-10' }),
      app({ id: '2', followUp: '2026-10-20' }),
      app({ id: '3', followUp: '2026-10-05', status: 'refus' }),
      app({ id: '4' }),
    ];
    expect(dueFollowUps(list, '2026-10-13').map((a) => a.id)).toEqual(['1']);
    expect(sortApplications(list, '2026-10-13')[0]?.id).toBe('1');
  });
});

describe('export / import', () => {
  it('aller-retour sans perte', () => {
    const list = [app({ id: 'x', notes: 'Relancer par e-mail', followUp: '2026-10-20', verification: { lmiaFound: true, checkedAt: '2026-10-01' } })];
    const r = parseImport(JSON.stringify(exportApplications(list, '2026-10-13T00:00:00Z')));
    expect(r).toEqual({ ok: true, applications: list, rejected: 0 });
  });
  it('provenance, lien et copie de l’annonce : conservés et contrôlés', () => {
    const ok = app({ id: 'pa', origin: 'petite-annonce', adUrl: 'https://exemple.test/annonce/42', adText: 'Soudeur, 30 $/h, Moncton.' });
    const file = { app: 'verijob-canada', kind: 'candidatures', version: 1, exportedAt: 'x', applications: [
      ok,
      { ...app({ id: 'mauvaise-provenance' }), origin: 'pirate' },
      { ...app({ id: 'lien-js' }), adUrl: 'javascript:alert(1)' },
      { ...app({ id: 'trop-long' }), adText: 'x'.repeat(MAX_AD_TEXT + 1) },
    ] };
    const r = parseImport(JSON.stringify(file));
    expect(r.ok && r.applications).toEqual([ok]);
    expect(r.ok && r.rejected).toBe(3);
  });
  it('refuse un fichier qui n’est pas une sauvegarde VériJob', () => {
    expect(parseImport('pas du json')).toEqual({ ok: false, error: 'json' });
    expect(parseImport(JSON.stringify({ applications: [] }))).toEqual({ ok: false, error: 'format' });
  });
  it('rejette les lignes invalides et ignore les champs inconnus', () => {
    const file = { app: 'verijob-canada', kind: 'candidatures', version: 1, exportedAt: 'x', applications: [
      app({ id: 'ok' }), { ...app({ id: 'bad' }), date: '13/10/2026' }, { ...app({ id: 'extra' }), hack: '<script>' },
    ] };
    const r = parseImport(JSON.stringify(file));
    expect(r.ok && r.applications.map((a) => a.id)).toEqual(['ok', 'extra']);
    expect(r.ok && r.rejected).toBe(1);
    expect(r.ok && 'hack' in r.applications[1]!).toBe(false);
  });
  it('fusion : ajoute les nouvelles, garde la version la plus récente', () => {
    const current = [app({ id: '1', notes: 'ancien', updatedAt: '2026-10-01T00:00:00Z' }), app({ id: '2', notes: 'local', updatedAt: '2026-10-10T00:00:00Z' })];
    const incoming = [app({ id: '1', notes: 'nouveau', updatedAt: '2026-10-05T00:00:00Z' }), app({ id: '2', notes: 'vieux', updatedAt: '2026-10-02T00:00:00Z' }), app({ id: '3' })];
    const r = mergeApplications(current, incoming);
    expect(r.added).toBe(1);
    expect(r.updated).toBe(1);
    expect(r.merged.find((a) => a.id === '1')?.notes).toBe('nouveau');
    expect(r.merged.find((a) => a.id === '2')?.notes).toBe('local');
  });
});
