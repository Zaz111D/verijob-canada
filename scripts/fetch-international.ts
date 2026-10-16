/**
 * Offres ouvertes aux candidats de l'étranger, via l'API officielle d'Adzuna (accès gratuit de base :
 * 250 requêtes par jour, 1000 par semaine ; affichage autorisé avec la mention « Adzuna » liée au site).
 * Clés dans les secrets GitHub ADZUNA_APP_ID et ADZUNA_APP_KEY ; sans clés, l'étape est sautée.
 *
 * Méthode (après diagnostic du 15 oct. 2026) : l'API ne renvoie que le DÉBUT de chaque annonce, où la mention
 * « LMIA » ou « sponsorship » apparaît rarement. On demande donc à Adzuna des EXPRESSIONS EXACTES
 * (« lmia approved », « visa sponsorship »…), qu'il cherche dans l'annonce complète :
 * - tous métiers confondus (le métier est déduit du titre quand c'est possible) ;
 * - puis, pour chaque métier suivi, « métier + lmia / eimt / sponsorship ».
 * VériJob relit ensuite le titre + l'extrait : une annonce qui exige d'être déjà au Canada est écartée ;
 * si la phrase de preuve est dans l'extrait, elle est affichée, sinon l'appli indique l'expression trouvée
 * par Adzuna dans l'annonce complète (à vérifier en ouvrant l'offre). Contrôle anti-arnaque sur chaque annonce.
 *
 * Produit : apps/pwa/public/data/international-offers.json (+ international-diagnostic.json)
 */
import {
  analyzeOffer, classifyInternational, detectNocInText, employerKey, normalize,
  type InternationalOffer, type NocData, type Rules,
} from '../packages/core/src';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { adzunaClient, adzunaKeys, baseOffer, clean } from './lib/adzuna';
import { OUT_DIR } from './lib/paths';
import { writeDataFile, type WrittenFile } from './lib/output';

/** Expressions exactes du recrutement international (cherchées par Adzuna dans l'annonce complète). */
// Écartés après diagnostic (15 oct. 2026) :
// - « visa sponsorship », « international applicants » : surtout « without visa sponsorship » (souvent pour les États-Unis) ;
// - « temporary foreign worker » : au Québec, mention légale du permis des agences de placement
//   (« Temporary Foreign Worker Recruitment Agency Permit Number »), sans rapport avec l'ouverture du poste.
const PHRASES = ['lmia approved', 'positive lmia', 'lmia', 'eimt'];
/** Postes dont le TRAVAIL porte sur l'immigration ou le recrutement (ils citent « LMIA » comme tâche). */
const OFF_TOPIC_TITLE = /\b(immigration|lawyer|avocate?|paralegal|parajuriste|consultant|rcic|recruiter|recruteur|recruteuse|talent acquisition)\b/i;
/** Pour chaque métier suivi : au moins un de ces mots en plus du métier. */
const NOC_WORDS = 'lmia eimt';
const MAX_DAYS_OLD = 45;
const PER_PAGE = 50;

export interface InternationalStats { queries: number; seen: number; kept: number; closed: number; skipped?: string; file?: WrittenFile }

export async function fetchInternational(rules: Rules, nocData: NocData): Promise<InternationalStats> {
  console.log('▶ Offres ouvertes aux candidats de l’étranger (API Adzuna)');
  const keys = adzunaKeys();
  if (!keys) {
    console.log('  (clés ADZUNA_APP_ID / ADZUNA_APP_KEY absentes : étape sautée)');
    return { queries: 0, seen: 0, kept: 0, closed: 0, skipped: 'clés absentes' };
  }
  const offers = new Map<string, InternationalOffer>();
  const rejected = new Set<string>();
  const diag: Array<{ query: string; total: number; results: number; kept: number; closed: number }> = [];
  const api = adzunaClient(keys);
  let seen = 0, closed = 0;

  const search = async (label: string, params: Record<string, string>, matched: string) => {
    const body = await api.search({ max_days_old: String(MAX_DAYS_OLD), results_per_page: String(PER_PAGE), ...params });
    const stat = { query: label, total: body.total, results: body.results.length, kept: 0, closed: 0 };
    diag.push(stat);
    for (const j of body.results) {
      seen++;
      if (!j.id || !j.redirect_url || rejected.has(j.id)) continue;
      const title = clean(j.title), snippet = clean(j.description);
      if (OFF_TOPIC_TITLE.test(title)) continue;
      const text = `${title}.\n${snippet}`;
      const verdict = classifyInternational(text);
      if (verdict.status === 'ferme') { closed++; stat.closed++; rejected.add(j.id); offers.delete(j.id); continue; }
      const existing = offers.get(j.id);
      if (existing) { if (!existing.matched.includes(matched)) existing.matched.push(matched); continue; }
      offers.set(j.id, {
        ...baseOffer(j),
        title,
        // Métier déduit du TITRE seulement : Adzuna trouve le mot-clé n'importe où dans l'annonce.
        noc: detectNocInText(nocData, normalize(title))?.code ?? '',
        snippet,
        evidence: verdict.evidence,
        matched: [matched],
        caution: verdict.caution,
        scam: analyzeOffer(text, { rules, nocData }).signals.map((s) => s.id),
      });
      stat.kept++;
    }
  };

  for (const p of PHRASES) await search(`« ${p} »`, { what_phrase: p }, p);
  for (const n of nocData.nocs) {
    const what = (n.jobEn ?? n.titleEn).split(/[(/]/)[0]!.trim(); // Adzuna exige tous les mots de « what »
    await search(`${what} + (${NOC_WORDS})`, { what, what_or: NOC_WORDS }, 'lmia / eimt');
  }

  // Recoupement avec les listes officielles d'EIMT positives (fichiers employers-XX.json produits plus tôt par le
  // pipeline). Une offre sans phrase de preuve visible n'est gardée que si l'employeur y figure : l'expression
  // trouvée par Adzuna dans l'annonce complète peut être négative (« LMIA not supported »), la liste d'EDSC non.
  const byProvince = new Map<string, Map<string, { p: Array<[string, string, string, number, number]> }>>();
  const recordsOf = (prov: string) => {
    if (!byProvince.has(prov)) {
      const path = join(OUT_DIR, `employers-${prov}.json`);
      const recs = existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')).data as Array<{ k: string; p: Array<[string, string, string, number, number]> }>) : [];
      const m = new Map<string, { p: Array<[string, string, string, number, number]> }>();
      for (const r of recs) {
        const cur = m.get(r.k);
        if (cur) cur.p.push(...r.p); else m.set(r.k, { p: [...r.p] });
      }
      byProvince.set(prov, m);
    }
    return byProvince.get(prov)!;
  };
  let corroborated = 0, dropped = 0;
  for (const [oid, o] of offers) {
    const k = employerKey(o.company);
    const rec = k && o.province ? recordsOf(o.province).get(k) : undefined;
    if (rec && rec.p.length) {
      o.lmia = {
        positions: rec.p.reduce((s, e) => s + e[4], 0),
        lastQuarter: rec.p.map((e) => e[0]).sort().at(-1)!,
        sameNoc: !!o.noc && rec.p.some((e) => e[2] === o.noc),
      };
      corroborated++;
    } else if (!o.evidence.length) {
      offers.delete(oid);
      dropped++;
    }
  }
  console.log(`  recoupement EIMT : ${corroborated} employeurs trouvés dans les listes officielles, ${dropped} offres non vérifiables écartées`);
  const list = [...offers.values()].sort((a, b) => b.date.localeCompare(a.date));
  const file = writeDataFile(
    'international-offers.json',
    {
      name: 'Offres ouvertes aux candidats de l’étranger (tri VériJob sur les annonces Adzuna)',
      publisher: 'Adzuna (annonces) — tri et contrôle anti-arnaque par VériJob',
      url: 'https://www.adzuna.ca/',
      licence: 'Conditions de l’API Adzuna : affichage avec la mention « Adzuna » liée à adzuna.ca',
    },
    list.length,
    list,
  );
  writeDataFile(
    'international-diagnostic.json',
    { name: 'Diagnostic du tri des offres internationales', publisher: 'VériJob', url: 'https://www.adzuna.ca/', licence: 'Compteurs seulement' },
    diag.length,
    diag,
  );
  console.log(`  ${api.count} requêtes, ${seen} annonces lues, ${list.length} gardées, ${closed} écartées (Canada exigé)`);
  return { queries: api.count, seen, kept: list.length, closed, file };
}
