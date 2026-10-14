/**
 * Rondes d'invitations Entrée express (fichiers JSON officiels d'IRCC, FR et EN).
 * On ne garde que les 40 dernières rondes, avec leur catégorie (accessible ou non depuis l'étranger).
 * Une erreur ici n'arrête pas le pipeline : l'appli sait lire le fichier officiel en direct.
 *
 * Produit : apps/pwa/public/data/express-entry.json
 */
import { parseExpressEntryRounds, type RawRound, type Rules } from '../packages/core/src';
import { getJson } from './lib/http';
import { writeDataFile, type WrittenFile } from './lib/output';

export interface ExpressEntryStats { rounds: number; latest?: string; error?: string; file?: WrittenFile }

export async function fetchExpressEntry(rules: Rules): Promise<ExpressEntryStats> {
  console.log('▶ Entrée express : rondes d’invitations (canada.ca)');
  const urls = rules.expressEntry.roundsJson;
  try {
    const fr = await getJson<{ rounds?: RawRound[] }>(urls.fr);
    const en = await getJson<{ rounds?: RawRound[] }>(urls.en);
    const data = parseExpressEntryRounds(rules, { fr, en });
    if (!data.rounds.length) throw new Error('aucune ronde lisible dans le fichier officiel');
    const src = rules.sources[rules.expressEntry.roundsSource]!;
    const file = writeDataFile(
      'express-entry.json',
      {
        name: 'Entrée express — rondes d’invitations',
        publisher: 'Immigration, Réfugiés et Citoyenneté Canada (IRCC)',
        url: src.urlFr ?? src.urlEn,
        licence: 'Avis importants de Canada.ca (reproduction non commerciale autorisée)',
        files: [urls.fr, urls.en],
      },
      data.rounds.length,
      data,
    );
    console.log(`  ${data.rounds.length} rondes, la plus récente le ${data.rounds[0]!.date}`);
    return { rounds: data.rounds.length, latest: data.rounds[0]!.date, file };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.warn(`  ⚠ Rondes Entrée express non mises à jour : ${error}`);
    return { rounds: 0, error };
  }
}
