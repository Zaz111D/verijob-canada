/**
 * Outils sur les codes CNP (NOC) 2021.
 */
import type { NocData, NocEntry, OccupationTransfer, Rules } from './types';
import { normalize } from './text';

/** TEER d'un code CNP 2021 = 2e chiffre (ex. 85101 → 5, 44101 → 4). */
export function teerOf(code: string): number {
  if (!/^\d{5}$/.test(code)) throw new Error(`Code CNP 2021 invalide : « ${code} »`);
  return Number(code[1]);
}

export function findNoc(nocData: NocData, code: string): NocEntry | undefined {
  return nocData.nocs.find((n) => n.code === code);
}

export function isPrimaryAgriculture(rules: Rules, code: string): boolean {
  return rules.agricultural.primaryAgricultureNocs.includes(code);
}

/** Libellé lisible « 85101 – Manœuvres à la récolte ». */
export function nocLabel(nocData: NocData, code: string): { fr: string; en: string } {
  const n = findNoc(nocData, code);
  return n
    ? { fr: `${code} – ${n.titleFr}`, en: `${code} – ${n.titleEn}` }
    : { fr: `CNP ${code}`, en: `NOC ${code}` };
}

/**
 * Reconnaît un métier dans un texte normalisé.
 * Le mot-clé le plus long gagne (« farm labourer » l'emporte sur « labourer »).
 */
export function detectNocInText(nocData: NocData, normText: string): NocEntry | undefined {
  let best: { entry: NocEntry; len: number } | undefined;
  for (const entry of nocData.nocs) {
    // Titre d'un métier voisin (ex. « infirmière auxiliaire » n'est pas « infirmière autorisée »).
    if (entry.notKeywords?.some((k) => normalize(k) && new RegExp(`(^|[^a-z])${escapeRegExp(normalize(k))}($|[^a-z])`).test(normText))) continue;
    for (const kw of entry.keywords) {
      const k = normalize(kw);
      const re = new RegExp(`(^|[^a-z])${escapeRegExp(k)}s?($|[^a-z])`);
      if (re.test(normText) && (!best || k.length > best.len)) best = { entry, len: k.length };
    }
  }
  return best?.entry;
}

/**
 * Estime si un métier est exempté du gel des RMR (refus de traiter).
 * Le fichier EIMT ne contient pas le secteur (SCIAN) : c'est une ESTIMATION d'après le métier.
 * Renvoie le motif de l'exemption, ou undefined.
 */
export function probableRmrExemption(
  rules: Rules,
  nocData: NocData,
  code: string,
  opts: { privateHousehold?: boolean } = {},
): { kind: 'primaryAgriculture' | 'naics' | 'inHomeCaregiver'; naics?: string } | undefined {
  const ex = rules.lmiaLowWage.exemptions;
  if (ex.primaryAgriculture && isPrimaryAgriculture(rules, code)) return { kind: 'primaryAgriculture' };
  if (ex.inHomeCaregiverNocs.includes(code) && opts.privateHousehold !== false) {
    return { kind: 'inHomeCaregiver' };
  }
  const naics = findNoc(nocData, code)?.probableNaics;
  if (naics) {
    const hit = ex.naics.find((n) => naics.startsWith(n));
    if (hit) return { kind: 'naics', naics: hit };
  }
  return undefined;
}

export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Passerelle officielle d'un métier d'origine vers un métier proche (voir rules.occupationTransfers). */
export function findTransfer(rules: Rules, from: string | undefined, to?: string): OccupationTransfer | undefined {
  if (!from) return undefined;
  return rules.occupationTransfers.find((t) => t.from === from && (!to || t.to === to));
}

/**
 * Grande catégorie professionnelle de la CNP 2021 (1er chiffre du code : 1 affaires, 2 sciences, 3 santé,
 * 4 enseignement-droit-services sociaux, 5 arts, 6 ventes et services, 7 métiers et transport,
 * 8 ressources naturelles et agriculture, 9 fabrication) d'après le SECTEUR publié par une communauté
 * pour ses employeurs désignés (libellés variables : « Sales & Service », « Health Sector »…). undefined si inconnu.
 */
export function sectorCategory(sector: string): number | undefined {
  const s = normalize(sector);
  if (!s.trim()) return undefined;
  if (/manufactur|utilit|fabrication/.test(s)) return 9;
  if (/natural resource|agricult|ressources naturelles/.test(s)) return 8;
  if (/trades|transport|equipment|metiers/.test(s)) return 7;
  if (/sales|service(s)? sector|^sales|vente/.test(s) || /sales & service|sales and service/.test(s)) return 6;
  if (/arts|culture|recreation|sport/.test(s)) return 5;
  if (/education|law|social|community|government|enseignement/.test(s)) return 4;
  if (/health|sante/.test(s)) return 3;
  if (/natural and applied|applied science|sciences/.test(s)) return 2;
  if (/business|finance|administration|affaires/.test(s)) return 1;
  return undefined;
}

/** Grande catégorie d'un code CNP (1er chiffre ; 0 = gestion). */
export const nocCategory = (code: string): number => Number(code[0]);
