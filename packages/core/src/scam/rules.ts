/**
 * Règles du vérificateur d'offres (anti-arnaque).
 *
 * Principes :
 * - chaque règle est explicable : titre + explication simple + extraits du texte + sources officielles ;
 * - pas d'IA en ligne : uniquement des expressions régulières sur le texte normalisé
 *   (minuscules, sans accents) ;
 * - les valeurs réglementaires (montants, dates, pays) viennent de data/rules.json.
 */
import { isAfrican } from '../geo';
import { teerOf } from '../noc';
import { extractWages, hasWageRate } from '../salary';
import { excerpt, formatAmount, formatCad, formatDate } from '../text';
import type { ScamContext, ScamRule } from './types';

// ---------------------------------------------------------------------------
// Outils
// ---------------------------------------------------------------------------

/** Extraits (texte d'origine) des phrases qui vérifient le prédicat. */
function matchingSegments(ctx: ScamContext, test: (norm: string) => boolean): string[] {
  return ctx.segments.filter((s) => test(s.norm)).map((s) => excerpt(s.raw));
}

function hitIfAny(evidence: string[]) {
  return evidence.length > 0 ? { evidence } : undefined;
}

const EMAIL_RE = /[a-z0-9._%+-]+@([a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,})/g;
const URL_DOMAIN_RE = /(?:https?:\/\/|www\.)([a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,})/g;
const BARE_DOMAIN_RE = /\b([a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|org|net|info|online|site|xyz|biz|top|ca))\b/g;

/** Messageries gratuites (le nom de domaine commence par l'un de ces fournisseurs). */
const FREE_MAIL_RE = /^(gmail|googlemail|yahoo|ymail|outlook|hotmail|live|msn|aol|icloud|me|proton|protonmail|gmx|mail|yandex|zoho)\.[a-z.]+$/;

/** Mots qui, dans un nom de domaine ou une adresse, imitent un service public. */
const GOV_TOKENS = new Set([
  'gov', 'gouv', 'govt', 'gouvernement', 'government', 'ircc', 'cic', 'esdc', 'edsc',
  'servicecanada', 'gc', 'ambassade', 'embassy', 'highcommission',
]);

function isOfficialDomain(domain: string): boolean {
  return domain === 'canada.ca' || domain.endsWith('.canada.ca') || domain.endsWith('.gc.ca');
}

function emails(norm: string): Array<{ address: string; local: string; domain: string }> {
  return [...norm.matchAll(EMAIL_RE)].map((m) => ({
    address: m[0],
    local: m[0].split('@')[0] ?? '',
    domain: m[1] ?? '',
  }));
}

function domains(norm: string): string[] {
  const out = new Set<string>();
  for (const re of [URL_DOMAIN_RE, BARE_DOMAIN_RE]) for (const m of norm.matchAll(re)) if (m[1]) out.add(m[1]);
  for (const e of emails(norm)) out.add(e.domain);
  return [...out];
}

// ---------------------------------------------------------------------------
// Expressions
// ---------------------------------------------------------------------------

const FEE_STRONG = /\b(frais|fee|fees|caution|depot|acompte|cotisation|tarif|deposit)\b/;
const FEE_WEAK = /\b(payer|payez|paye|payes|paiement|versement|verser|versez|cout|coute|montant|pay|paying|payment|charge|charged|cost|costs)\b/;
/** Le salaire (« rate of pay ») ou le secteur d'activité (« payment processing company ») ne sont pas des frais. */
const NOT_A_FEE = /\b(rate of pay|pay rate|premium pay|taux de remuneration|payment (processing|solutions?|technology|technologies|company|industry|platform)|electronic payments?|traitement des paiements)\b/;
/** « Envoyez » ne parle d'argent que si un montant ou le mot « argent » suit (sinon : envoyer un CV, une copie…). */
const SEND_MONEY = /\b(envoyer|envoyez|envoie|send|transfer|transferer|transferez)\b[^.!?\n]{0,40}\b(argent|money|somme|fonds|funds)\b/;
const MONEY = /(\d[\d .,]*\s?(fcfa|f cfa|cfa|xaf|xof|naira|ngn|cedis?|ghs|ksh|kes|\$|cad|usd|euros?|eur|€|dollars?)(?![a-z])|(\$|€|usd|cad)\s?\d)/;
const FEE_TARGET = /\b(eimt|lmia|contrat|contract|dossier|file|traitement|processing|reservation|reserver|booking|placement|recrutement|recruitment|inscription|registration|offre d'emploi|job offer|lettre d'offre|offer letter|approbation|approval|application|candidature|hold the position|secure your (spot|place|position)|votre place)\b/;
const VISA_CONTEXT = /\b(visa|permis de travail|work permit|biometrie|biometrics|ircc)\b/;
const FEE_NEGATION = /\b(aucun|aucuns|aucune|pas de frais|sans frais|gratuit|gratuite|gratuitement|jamais|free of charge|no fee|no fees|never|not charged|without any (fee|cost)|without (fee|cost)|employeur (paie|paye|prend en charge|assume|couvre)|employer (pays|covers|will pay|will cover|is responsible|bears))\b/;

const GUAR_TARGET = '(visa|visas|permis|emploi|job|travail|work permit|approbation|approval|eimt|lmia|succes|success|reussite|admission|embauche|placement)';
const GUAR_WORD = "(garanti|garantie|garantis|garanties|guarantee|guaranteed|assure|assuree|100 ?%)(?![a-z])";
const GUAR_RE_1 = new RegExp(`\\b${GUAR_TARGET}\\b[^.!?\\n]{0,40}${GUAR_WORD}`);
const GUAR_RE_2 = new RegExp(`${GUAR_WORD}[^.!?\\n]{0,40}\\b${GUAR_TARGET}\\b`);
const GUAR_NEGATED = /\b(aucun|aucune|pas de|no|not|ne|n'est pas|isn't|is not)\b[^.!?\n]{0,20}(garanti|guarantee)/;
const NO_INTERVIEW = /\b(sans entretien|pas d'entretien|aucun entretien|no interview|without (an )?interview|no ielts|sans ielts|sans test de langue|no language test)\b/;

const URGENCY = /\b(places limitees|nombre de places limite|dernieres places|plus que \d+ places|limited (slots|places|spots|seats)|last (few )?(slots|places|spots)|only \d+ (slots|places|spots) left|avant (ce soir|demain)|dans les \d+ ?h(eures)?|within \d+ ?(h|hours)|aujourd'hui seulement|today only|offre expire|offer expires|expires? (today|tonight|soon)|expire (ce soir|aujourd'hui|bientot)|ne ratez pas|don't miss|dont miss|depechez|hurry|act (now|fast)|deadline (today|tomorrow|tonight))\b/;

const PAYMENT_CHANNEL = /\b(western union|moneygram|money gram|mobile money|momo|orange money|mtn money|airtel money|wave (money|mobile|senegal)|via wave|par wave|ria money|via ria|par ria|worldremit|world remit|remitly|taptap send|bitcoin|btc|usdt|crypto|cryptomonnaie|binance|carte cadeau|cartes cadeaux|gift card|gift cards|itunes card|google play card|compte personnel|compte bancaire personnel|personal account|personal bank account)\b/;

const LOTTERY = /\b(loterie|tirage au sort|lottery|lucky draw|visa lottery|selectionnee? au hasard|randomly selected)\b/;

const ORG_CLAIM = /\b(inc|ltd|ltee|limited|limitee|corp|corporation|farm|farms|ferme|fermes|hospital|hopital|enterprise|enterprises|entreprise|entreprises|company|compagnie|foods|gouvernement|government|ircc|cic|edsc|esdc|service canada|immigration canada|ambassade|embassy|haut-commissariat|high commission|ministere|ministry|cabinet|agence|agency)\b/;

const AGENT = /\b(agent|agente|agents|agence|agences|cabinet|consultant|consultante|consultants|consultancy|consulting|conseiller en immigration|conseillere en immigration|agency|intermediaire|facilitateur|facilitator|demarcheur)\b(?! d'entretien| de securite| de nettoyage| de bord| d'accueil)/;
const CICC_NUMBER = /\br ?\d{6}\b/;
/**
 * Formules NORMALES des annonces canadiennes, retirées avant les règles « frais » et « agent » (vues le 16 oct. 2026
 * sur de vraies annonces du Guichet-Emplois reprises par Adzuna) : le lieu de travail ou l'employeur lui-même
 * (« Private security agency », « United Way Anchor Agency »), et la mention « Relocation costs not covered by employer ».
 */
const BENIGN = /\b(private security agenc(y|ies)|security agenc(y|ies)|agences? de securite( privee)?|(anchor|community|social services?|non-profit|not-for-profit|partner|government|public|home care|health care|healthcare|nursing) agenc(y|ies)|agency (staff|policies|procedures|programs?)|relocation costs? (are )?(not )?(covered|paid|reimbursed)( by (the )?employer)?|frais de (reinstallation|demenagement)( non)? (couverts|rembourses|payes)( par l'employeur)?|(meat|food|fish|seafood|poultry|beverage) processing)\b/g;
/** Contexte d'immigration : sans lui, « agent » ou « agence » désigne un employeur ou un métier, pas un intermédiaire. */
const IMMIGRATION_CONTEXT = /\b(visas?|permis de travail|work permits?|immigration|immigrer|immigrate|eimt|lmia|residence permanente|permanent residen\w*|ircc|ambassade|embassy|consulat|consulate)\b/;
const LAWYER = /\b(avocat|avocate|barreau|law society|lawyer|notaire|chambre des notaires|notary|parajuriste|paralegal)\b/;

const SAWP = /\b(sawp|ptas|seasonal agricultural workers? program(me)?|programme (des|de) travailleurs agricoles saisonniers|travailleurs agricoles saisonniers|programme agricole saisonnier|seasonal agricultural program)\b/;

const CAREGIVER = /\b(caregivers?|care givers?|aides?[- ]soignante?s?|aides?[- ]familia(l|le|les|ux)|aide a domicile|aide de maintien a domicile|nanny|nannies|nounou|garde d'enfants|gardienne? d'enfants|home support workers?|home child care|babysitter|baby-sitter|auxiliaire de vie|personal support workers?)\b/;
const PERMANENT_RESIDENCE = /\b(residence permanente|residents? permanents?|residente permanente|permanent residence|permanent residency|permanent resident|pr card|carte de resident|pr|rp)\b/;
const PR_PROMISE = /\b(garanti\w*|guarantee\w*|direct|directe|directement|directly|automatique\w*|automatic\w*|assuree?|apres \d+|after \d+|obten\w*|obtain\w*|get your|you will (get|receive|obtain)|recevrez)\b/;
const LIVE_IN = /\b(live[- ]in|logee?s? (chez|par|dans) (l'employeur|la famille|votre employeur)|nourrie?s?,? et logee?s?|logee?s? et nourrie?s?|logee?s?,? nourrie?s?|nourrie?s?,? logee?s?|vivre (chez|avec) (la famille|l'employeur)|live with (the )?(family|employer)|room and board (in|at) the employer)\b/;

// Petites annonces, groupes de messagerie (variantes décrites par le Centre antifraude du Canada).
const MESSAGING_APP = /\b(whatsapp|whats app|telegram|messenger|wa\.me|t\.me)\b/;
const MESSAGING_NEGATED = /\b(jamais|never|aucun|aucune|ne (communiqu|contact)\w* pas|do(es)? not (communicate|contact))\b/;
const ID_DOC = /\b(copie|copies|scan|scanne|photo|photos|photocopie|copy|picture|image)\b[^.!?\n]{0,40}\b(passeport|passport|carte d'identite|cni|piece d'identite|pieces d'identite|id card|identity card|national id|acte de naissance|birth certificate)\b/;
const SEND_VERB = /\b(envoyer|envoyez|envoie|envoi|transmettre|transmettez|fournir|fournissez|joindre|joignez|send|provide|submit|attach|share)\b/;
const SECRET_DATA = /\b(coordonnees bancaires|numero de (votre )?compte bancaire|releve d'identite bancaire|rib|bank details|bank account (number|details)|numero d'assurance sociale|social insurance number|code pin|code secret|code de verification|code recu par sms|mot de passe|password|verification code|otp)\b/;
const CHEQUE = /\b(cheque|cheques|check)\b[^.!?\n]{0,40}\b(deposer|deposez|encaisser|encaissez|deposit|cash)\b|\b(deposer|deposez|encaisser|encaissez|deposit|cash)\b[^.!?\n]{0,40}\b(cheque|cheques|check)\b/;
const MONEY_MULE = /\b(agent financier|agente financiere|financial agent|client mystere|cliente mystere|mystery shopper|recevoir (des |les )?(paiements|virements|fonds) (sur|dans) votre compte|receive (payments|funds|transfers) (in|into|to|on) your (bank )?account|renvoyer (l'argent|le reste|la difference)|send (back )?the (rest|difference|balance))\b/;

// ---------------------------------------------------------------------------
// Règles
// ---------------------------------------------------------------------------

export const SCAM_RULES: ScamRule[] = [
  {
    id: 'frais-candidat',
    severity: 'eleve',
    title: { fr: "On vous demande de l'argent pour l'emploi", en: 'You are asked to pay for the job' },
    explanation: (r) => ({
      fr: `Au Canada, les frais d'EIMT (${formatAmount(r.fees.lmiaProcessingFeeCad, 'fr')} $ par poste) sont payés par l'employeur et ne peuvent pas être récupérés auprès du travailleur. Il est aussi interdit de facturer au travailleur des frais de recrutement, de « dossier » ou de « réservation ». Seuls les frais officiels du permis de travail et de la biométrie, payés directement à IRCC, sont à votre charge.`,
      en: `In Canada, the LMIA fee ($${formatAmount(r.fees.lmiaProcessingFeeCad, 'en')} per position) is paid by the employer and cannot be recovered from the worker. Charging the worker recruitment, "file" or "reservation" fees is also prohibited. Only the official work permit and biometrics fees, paid directly to IRCC, are yours to pay.`,
    }),
    sourceIds: (r) => [r.fees.source],
    detect: (ctx) =>
      hitIfAny(
        matchingSegments(ctx, (s) => {
          s = s.replace(BENIGN, ' ');
          if (FEE_NEGATION.test(s) || NOT_A_FEE.test(s)) return false;
          const wage = hasWageRate(s);
          const pays = FEE_STRONG.test(s) || ((FEE_WEAK.test(s) || SEND_MONEY.test(s) || MONEY.test(s)) && !wage);
          if (FEE_TARGET.test(s) && pays) return true;
          // « Acompte de 250 000 FCFA », « Deposit of $500 » : frais explicites, hors frais de visa.
          return FEE_STRONG.test(s) && MONEY.test(s) && !VISA_CONTEXT.test(s) && !wage;
        }),
      ),
  },
  {
    id: 'garantie',
    severity: 'eleve',
    title: { fr: 'Promesse de visa ou d’emploi « garanti »', en: 'Promise of a "guaranteed" visa or job' },
    explanation: () => ({
      fr: "Personne ne peut garantir un visa ou un permis de travail : la décision appartient uniquement à IRCC (le gouvernement du Canada). Un vrai employeur fait toujours passer un entretien. « 100 % », « garanti » ou « sans entretien » sont des signes classiques d'arnaque.",
      en: 'Nobody can guarantee a visa or work permit: only IRCC (the Government of Canada) decides. A real employer always interviews candidates. "100%", "guaranteed" or "no interview" are classic scam signs.',
    }),
    sourceIds: () => ['ircc-fraud'],
    detect: (ctx) =>
      hitIfAny(
        matchingSegments(
          ctx,
          (s) => NO_INTERVIEW.test(s) || ((GUAR_RE_1.test(s) || GUAR_RE_2.test(s)) && !GUAR_NEGATED.test(s)),
        ),
      ),
  },
  {
    id: 'urgence',
    severity: 'moyen',
    title: { fr: 'Pression pour décider vite', en: 'Pressure to decide quickly' },
    explanation: () => ({
      fr: "« Places limitées », « avant ce soir »… Les escrocs créent une urgence pour vous empêcher de vérifier. Un vrai recrutement vous laisse le temps de vérifier l'employeur.",
      en: '"Limited places", "before tonight"… Scammers create urgency so you do not take time to check. Real recruitment gives you time to verify the employer.',
    }),
    sourceIds: () => ['ircc-fraud'],
    detect: (ctx) => hitIfAny(matchingSegments(ctx, (s) => URGENCY.test(s))),
  },
  {
    id: 'moyen-paiement',
    severity: 'eleve',
    title: { fr: 'Paiement par transfert, Mobile Money, crypto ou carte cadeau', en: 'Payment by money transfer, mobile money, crypto or gift card' },
    explanation: () => ({
      fr: "Western Union, MoneyGram, Mobile Money, cryptomonnaie, cartes cadeaux ou compte personnel : ces paiements sont presque impossibles à récupérer. Un employeur canadien ou le gouvernement ne vous demandera jamais de payer ainsi.",
      en: 'Western Union, MoneyGram, mobile money, cryptocurrency, gift cards or a personal account: these payments are almost impossible to get back. A Canadian employer or the government will never ask you to pay this way.',
    }),
    sourceIds: (r) => ['ircc-fraud', r.fees.source],
    detect: (ctx) => hitIfAny(matchingSegments(ctx, (s) => PAYMENT_CHANNEL.test(s))),
  },
  {
    id: 'loterie',
    severity: 'eleve',
    title: { fr: 'Loterie ou tirage au sort', en: 'Lottery or lucky draw' },
    explanation: () => ({
      fr: "Le Canada n'attribue pas d'emplois ni de permis de travail par loterie ou tirage au sort. Un message qui vous dit que vous avez « gagné » ou été « tiré au sort » est une arnaque.",
      en: 'Canada does not give jobs or work permits through a lottery or lucky draw. A message saying you "won" or were "randomly selected" is a scam.',
    }),
    sourceIds: () => ['ircc-fraud'],
    detect: (ctx) => hitIfAny(matchingSegments(ctx, (s) => LOTTERY.test(s))),
  },
  {
    id: 'usurpation-gouvernement',
    severity: 'eleve',
    title: { fr: 'Adresse qui imite le gouvernement', en: 'Address imitating the government' },
    explanation: () => ({
      fr: "Les sites du gouvernement du Canada sont sur canada.ca ou se terminent par .gc.ca. Une adresse Gmail « ircc… » ou un site « canada-gov-… .org » n'est pas officiel.",
      en: 'Government of Canada websites are on canada.ca or end with .gc.ca. A Gmail address like "ircc…" or a website like "canada-gov-….org" is not official.',
    }),
    sourceIds: () => ['ircc-fraud'],
    detect: (ctx) => {
      const evidence: string[] = [];
      for (const d of domains(ctx.norm)) {
        if (!isOfficialDomain(d) && d.split(/[.-]/).some((t) => GOV_TOKENS.has(t))) evidence.push(d);
      }
      for (const e of emails(ctx.norm)) {
        if (FREE_MAIL_RE.test(e.domain) && e.local.split(/[._-]/).some((t) => GOV_TOKENS.has(t))) {
          evidence.push(e.address);
        }
      }
      return hitIfAny([...new Set(evidence)]);
    },
  },
  {
    id: 'email-gratuit',
    severity: 'moyen',
    title: { fr: 'Adresse e-mail gratuite pour une organisation', en: 'Free e-mail address for an organization' },
    explanation: () => ({
      fr: "L'offre se présente comme une entreprise, une ferme ou un service officiel, mais utilise une adresse Gmail, Yahoo, Outlook… Une vraie organisation écrit normalement depuis l'adresse de son propre site. Vérifiez l'employeur avant de répondre.",
      en: 'The offer presents itself as a company, farm or official service, but uses a Gmail, Yahoo, Outlook… address. A real organization normally writes from its own website domain. Check the employer before replying.',
    }),
    sourceIds: () => ['ircc-fraud'],
    detect: (ctx) => {
      if (!ORG_CLAIM.test(ctx.norm)) return undefined;
      return hitIfAny(emails(ctx.norm).filter((e) => FREE_MAIL_RE.test(e.domain)).map((e) => e.address));
    },
  },
  {
    id: 'agent-non-autorise',
    severity: 'moyen',
    title: { fr: 'Agent ou consultant sans numéro de licence', en: 'Agent or consultant without a licence number' },
    explanation: () => ({
      fr: "Seuls peuvent être payés pour vous aider : les consultants inscrits au registre du CICC (numéro du type R123456), les avocats membres d'un barreau canadien, les notaires du Québec et les parajuristes de l'Ontario. Demandez le numéro et vérifiez-le vous-même dans le registre public du CICC.",
      en: 'Only these people can be paid to help you: consultants listed in the CICC register (number like R123456), lawyers who are members of a Canadian law society, Quebec notaries and Ontario paralegals. Ask for the number and check it yourself in the CICC public register.',
    }),
    sourceIds: (r) => [r.authorizedRepresentatives.source, r.authorizedRepresentatives.registerSource],
    detect: (ctx) => {
      if (CICC_NUMBER.test(ctx.norm) || LAWYER.test(ctx.norm)) return undefined;
      if (!IMMIGRATION_CONTEXT.test(ctx.norm)) return undefined;
      // « Agent financier » est une autre arnaque (règle « cheque-ou-mule »), pas un agent d'immigration.
      return hitIfAny(matchingSegments(ctx, (s) => AGENT.test(s.replace(BENIGN, ' ').replace(/\b(financial agent|agente? financiere?)\b/g, ''))));
    },
  },
  {
    id: 'ptas-afrique',
    severity: 'eleve',
    title: { fr: 'Programme saisonnier (PTAS/SAWP) proposé hors des pays admissibles', en: 'Seasonal program (SAWP) offered outside eligible countries' },
    explanation: (r) => ({
      fr: `Le Programme des travailleurs agricoles saisonniers (PTAS/SAWP) est réservé aux citoyens du Mexique et de ${r.sawp.countries.length - 1} pays des Caraïbes. Aucun pays africain n'y participe. Pour un emploi agricole, la voie ouverte à tous les pays est le « volet agricole » de l'EIMT.`,
      en: `The Seasonal Agricultural Worker Program (SAWP) is only for citizens of Mexico and ${r.sawp.countries.length - 1} Caribbean countries. No African country takes part. For farm work, the route open to all countries is the LMIA "Agricultural Stream".`,
    }),
    sourceIds: (r) => [r.sawp.source, r.agricultural.source],
    detect: (ctx) => {
      const c = ctx.profile.citizenship?.toUpperCase();
      if (c && ctx.rules.sawp.countries.includes(c)) return undefined;
      const hit = hitIfAny(matchingSegments(ctx, (s) => SAWP.test(s)));
      if (hit && c && isAfrican(c)) {
        return {
          ...hit,
          explanation: {
            fr: `D'après votre profil, vous n'êtes pas citoyen d'un pays admissible au PTAS/SAWP (Mexique + ${ctx.rules.sawp.countries.length - 1} pays des Caraïbes). Cette offre ne peut donc pas être réelle pour vous. Pour un emploi agricole, cherchez plutôt le « volet agricole » de l'EIMT, ouvert à tous les pays.`,
            en: `According to your profile, you are not a citizen of a SAWP country (Mexico + ${ctx.rules.sawp.countries.length - 1} Caribbean countries). This offer cannot be real for you. For farm work, look for the LMIA "Agricultural Stream", open to all countries.`,
          },
        };
      }
      return hit;
    },
  },
  {
    id: 'aide-familial-rp',
    severity: 'eleve',
    title: { fr: 'Résidence permanente promise pour un poste d’aide familial', en: 'Permanent residence promised for a caregiver job' },
    explanation: (r) => ({
      fr: `Les programmes pilotes de résidence permanente pour aides familiaux n'acceptent aucune nouvelle demande du ${formatDate(r.homeCareWorkerPilots.closedFrom, 'fr')} au ${formatDate(r.homeCareWorkerPilots.closedUntil, 'fr')}. Personne ne peut donc vous promettre une résidence permanente « directe » comme aide familial en ce moment.`,
      en: `The caregiver permanent residence pilots accept no new applications from ${formatDate(r.homeCareWorkerPilots.closedFrom, 'en')} to ${formatDate(r.homeCareWorkerPilots.closedUntil, 'en')}. So nobody can promise you "direct" permanent residence as a caregiver right now.`,
    }),
    sourceIds: (r) => [r.homeCareWorkerPilots.source],
    detect: (ctx) => {
      if (!CAREGIVER.test(ctx.norm)) return undefined;
      return hitIfAny(matchingSegments(ctx, (s) => PERMANENT_RESIDENCE.test(s) && PR_PROMISE.test(s)));
    },
  },
  {
    id: 'aide-familial-loge',
    severity: 'info',
    title: { fr: 'Aide familial logé chez l’employeur', en: 'Live-in caregiver' },
    explanation: () => ({
      fr: "Le gouvernement refuse de traiter les demandes d'EIMT pour les aides familiaux obligés de vivre chez l'employeur, sauf besoins médicaux importants justifiés. Une telle offre a donc très peu de chances d'aboutir à un permis de travail.",
      en: 'The government refuses to process LMIA applications for caregivers required to live in the employer’s home, except for justified high medical needs. Such an offer is therefore very unlikely to lead to a work permit.',
    }),
    sourceIds: (r) => [r.liveInCaregiver.source],
    detect: (ctx) => {
      if (!CAREGIVER.test(ctx.norm)) return undefined;
      return hitIfAny(matchingSegments(ctx, (s) => LIVE_IN.test(s)));
    },
  },
  {
    id: 'salaire-irrealiste',
    severity: 'moyen',
    title: { fr: 'Salaire anormalement élevé pour ce métier', en: 'Unusually high pay for this job' },
    explanation: () => ({
      fr: 'Le salaire annoncé est bien au-dessus de ce que paie ce métier au Canada. Les escrocs promettent de gros salaires pour attirer les victimes.',
      en: 'The advertised pay is far above what this job pays in Canada. Scammers promise high wages to attract victims.',
    }),
    sourceIds: (r) => [r.wageThresholds.source],
    detect: (ctx) => {
      const wages = extractWages(ctx.norm);
      if (wages.length === 0) return undefined;
      const noc = ctx.detectedNoc;
      if (!noc) {
        return {
          skipped: {
            fr: "Salaire trouvé, mais le métier n'a pas été reconnu : impossible de comparer.",
            en: 'Pay found, but the job was not recognised: cannot compare.',
          },
        };
      }
      const max = wages.reduce((a, b) => (b.hourly > a.hourly ? b : a));
      const teer = teerOf(noc.code);
      const prov = ctx.detectedProvince;
      const ref = ctx.wageLookup?.(noc.code, prov);
      let limit: number;
      let reason: { fr: string; en: string };
      if (ref) {
        limit = ref.medianHourly * 2;
        reason = {
          fr: `plus du double du salaire médian de ce métier (${formatCad(ref.medianHourly, 'fr')}/h)`,
          en: `more than twice the median wage for this job (${formatCad(ref.medianHourly, 'en')}/h)`,
        };
      } else if (teer >= 4) {
        // Sans données salariales : un métier peu qualifié payé au-dessus du seuil « haut salaire »
        // de la province (médiane provinciale de TOUS les emplois + 20 %) est très inhabituel.
        const t = ctx.rules.wageThresholds.hourlyCad;
        const provinces = ['NL', 'PE', 'NS', 'NB', 'QC', 'ON', 'MB', 'SK', 'AB', 'BC'];
        limit = prov && t[prov] !== undefined ? t[prov]! : Math.max(...provinces.map((p) => t[p] ?? 0));
        reason = {
          fr: `au-dessus du seuil « haut salaire » ${prov ? `de la province (${prov})` : 'le plus élevé des provinces'} : ${formatCad(limit, 'fr')}/h, alors que c'est un métier peu qualifié (TEER ${teer})`,
          en: `above the "high-wage" threshold ${prov ? `of the province (${prov})` : 'of any province'}: ${formatCad(limit, 'en')}/h, although this is a low-skilled job (TEER ${teer})`,
        };
      } else {
        return {
          skipped: {
            fr: 'Pas de données salariales pour ce métier qualifié : comparaison impossible pour le moment.',
            en: 'No wage data for this skilled job yet: cannot compare.',
          },
        };
      }
      if (max.hourly <= limit) return undefined;
      return {
        evidence: [excerpt(max.match)],
        explanation: {
          fr: `Salaire annoncé ≈ ${formatCad(max.hourly, 'fr')}/h pour « ${noc.titleFr} » : c'est ${reason.fr}. Les escrocs promettent de gros salaires pour attirer les victimes.`,
          en: `Advertised pay ≈ ${formatCad(max.hourly, 'en')}/h for "${noc.titleEn}": that is ${reason.en}. Scammers promise high wages to attract victims.`,
        },
      };
    },
  },
  // ----- Règles propres aux petites annonces et aux groupes de messagerie (Centre antifraude du Canada)
  {
    id: 'messagerie-seule',
    severity: 'moyen',
    title: { fr: 'Contact ou « entretien » par WhatsApp ou Telegram', en: 'Contact or "interview" by WhatsApp or Telegram' },
    explanation: () => ({
      fr: "Les escrocs contactent leurs victimes par WhatsApp, Telegram ou Messenger et y font de faux « entretiens » par écrit. Un vrai employeur canadien a un site, une adresse e-mail à son nom et fait un entretien en direct (vidéo, téléphone ou en personne). Vérifiez l'employeur avant de continuer.",
      en: 'Scammers contact victims on WhatsApp, Telegram or Messenger and hold fake written "interviews" there. A real Canadian employer has a website, an e-mail address in its own name and interviews you live (video, phone or in person). Check the employer before going further.',
    }),
    sourceIds: () => ['cafc-job-scams'],
    detect: (ctx) => hitIfAny(matchingSegments(ctx, (s) => MESSAGING_APP.test(s) && !MESSAGING_NEGATED.test(s))),
  },
  {
    id: 'documents-sensibles',
    severity: 'moyen',
    title: { fr: 'Demande de documents ou de données personnelles', en: 'Request for documents or personal data' },
    explanation: () => ({
      fr: "On vous demande une copie de votre passeport ou de votre pièce d'identité, vos coordonnées bancaires, un code ou un mot de passe. Ces informations servent aux escrocs à voler votre identité ou votre argent. N'envoyez jamais de code, de mot de passe ni de coordonnées bancaires. Pour le passeport, attendez d'avoir vérifié l'employeur et passé un vrai entretien.",
      en: 'You are asked for a copy of your passport or ID, your bank details, a code or a password. Scammers use this to steal your identity or your money. Never send a code, password or bank details. For your passport, wait until you have checked the employer and had a real interview.',
    }),
    sourceIds: () => ['cafc-job-scams', 'ircc-fraud'],
    detect: (ctx) => hitIfAny(matchingSegments(ctx, (s) => (ID_DOC.test(s) && SEND_VERB.test(s)) || SECRET_DATA.test(s))),
  },
  {
    id: 'cheque-ou-mule',
    severity: 'eleve',
    title: { fr: 'Chèque à encaisser ou argent à faire transiter', en: 'Cheque to cash or money to pass on' },
    explanation: () => ({
      fr: "On vous envoie un chèque à déposer, ou on vous demande de recevoir de l'argent sur votre compte pour le renvoyer ailleurs (« agent financier », « client mystère »). Le chèque est faux et vous devrez rembourser la banque ; faire transiter de l'argent fait de vous une « mule », ce qui est du blanchiment d'argent.",
      en: 'You are sent a cheque to deposit, or asked to receive money in your account and send it on ("financial agent", "mystery shopper"). The cheque is fake and you will owe the bank; passing money on makes you a "money mule", which is money laundering.',
    }),
    sourceIds: () => ['cafc-job-scams'],
    detect: (ctx) => hitIfAny(matchingSegments(ctx, (s) => CHEQUE.test(s) || MONEY_MULE.test(s))),
  },
];
