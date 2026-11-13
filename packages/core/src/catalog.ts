/**
 * Métier d'une annonce parmi les 516 groupes de la CNP 2021 (pas seulement les métiers suivis), d'après les
 * exemples illustratifs officiels de Statistique Canada en français et en anglais (data/noc-search.json).
 * Utilisé par le tracker international : une offre « LMIA » de mécanicien de camions ou d'aide-cuisinier doit être
 * rangée sous son métier même si l'appli ne suit pas ce métier en détail.
 */
import { normalize } from './text';

/** Minuscules sans accents, traits d'union et ponctuation en espaces (« heavy-duty » = « heavy duty »). */
const flat = (s: string) => normalize(s).replace(/[^a-z0-9']+/g, ' ').trim();

/**
 * « administrateur/administratrice des finances » → les deux formes ; « butcher - butcher shop » → aussi « butcher » ;
 * termes de 4 lettres au moins.
 */
function variants(term: string): string[] {
  const t = normalize(term).replace(/\s+/g, ' ').trim();
  const out = t.includes('/') ? [t.replace(/(\S+)\/(\S+)/g, '$1'), t.replace(/(\S+)\/(\S+)/g, '$2')] : [t];
  // Seulement un MOT précis avant le tiret : « branch manager - banking » ne doit pas devenir « branch manager ».
  for (const x of [...out]) {
    const head = x.includes(' - ') ? x.split(' - ')[0]! : '';
    if (head && !head.includes(' ') && !GENERIC.has(head)) out.push(head);
  }
  return [...new Set(out.map(flat))].filter((x) => x.length >= 4);
}

/**
 * Prépare la recherche une fois (≈ 30 000 termes) et renvoie une fonction titre → code CNP.
 * Le terme le plus long trouvé en mots entiers l'emporte (« truck mechanic » avant « mechanic »).
 */
export function makeCatalogDetector(index: Record<string, string>): (title: string) => string | undefined {
  // qualified : exemple précisé par un domaine (« branch manager - banking ») : jamais utilisé pour le repli par mots.
  const terms: Array<{ code: string; term: string; re: RegExp; qualified: boolean }> = [];
  for (const [code, list] of Object.entries(index)) {
    for (const raw of list.split(' | ')) {
      for (const term of variants(raw)) {
        terms.push({ code, term, qualified: raw.includes(' - '), re: new RegExp(`(^|[^a-z])${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}s?($|[^a-z])`) });
      }
    }
  }
  terms.sort((a, b) => b.term.length - a.term.length);
  const byLength = [...terms].reverse();
  return (title: string) => {
    const t = flat(title);
    const alias = ALIASES.find(([re]) => re.test(t))?.[1];
    if (alias) return alias;
    const exact = terms.find((x) => t.includes(x.term) && x.re.test(t))?.code;
    if (exact) return exact;
    // Sinon : le plus court exemple officiel qui contient TOUS les mots du titre (2 mots au moins) —
    // « truck mechanic » → « truck and transport mechanic », « heavy duty mechanic » → « heavy duty equipment mechanic ».
    const words = t.split(' ').filter((w) => w.length >= 3 && !NOISE.has(w));
    if (words.length < 2) return undefined;
    return byLength.find((x) => !x.qualified && words.every((w) => x.term.split(' ').some((tw) => tw === w || tw === `${w}s` || `${tw}s` === w)))?.code;
  };
}

/**
 * Sigles courants dans les titres, absents des exemples officiels : codes des métiers spécialisés de l'Ontario
 * (310T technicien de camions et d'autobus, 310S technicien de l'automobile, 421A technicien d'équipement lourd,
 * 309A électricien, 306A plombier), permis de conduire AZ / DZ, RN / RPN / LPN (soins infirmiers).
 */
const ALIASES: Array<[RegExp, string]> = [
  [/(^| )310 ?t( |$)/, '72410'],
  [/(^| )310 ?s( |$)/, '72410'],
  [/(^| )421 ?a( |$)/, '72401'],
  [/(^| )309 ?a( |$)/, '72200'],
  [/(^| )306 ?a( |$)/, '72300'],
  [/(^| )(az|dz|class 1|class 3)( | ?(driver|operator))/, '73300'],
  [/(^| )(rpn|lpn)( |$)/, '32101'],
  [/(^| )rn( |$)/, '31301'],
];

/** Mots trop larges pour désigner un métier à eux seuls. */
const GENERIC = new Set(['manager', 'director', 'supervisor', 'technician', 'clerk', 'worker', 'operator', 'assistant', 'helper', 'labourer',
  'labourers', 'attendant', 'agent', 'officer', 'coordinator', 'specialist', 'analyst', 'consultant', 'inspector', 'representative',
  'directeur', 'directrice', 'gestionnaire', 'superviseur', 'superviseure', 'technicien', 'technicienne', 'commis', 'ouvrier', 'ouvriere',
  'preposé', 'prepose', 'preposee', 'aide', 'agente', 'conseiller', 'conseillere', 'coordonnateur', 'coordonnatrice', 'operateur', 'operatrice']);

/** Mots des titres d'annonces qui ne disent rien du métier. */
const NOISE = new Set(['and', 'the', 'for', 'with', 'branch', 'general', 'site', 'store', 'location', 'night', 'nights', 'day', 'days', 'shift', 'shifts', 'full', 'part', 'time', 'temporary', 'permanent',
  'seasonal', 'casual', 'contract', 'senior', 'junior', 'lead', 'new', 'urgent', 'hiring', 'immediate', 'start', 'job', 'jobs', 'position', 'temps', 'plein',
  'partiel', 'nuit', 'jour', 'poste', 'urgent', 'recherche', 'lmia', 'eimt']);
