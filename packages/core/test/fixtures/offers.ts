/**
 * Corpus d'offres pour tester le vérificateur.
 * Les arnaques reprennent des formulations typiques (WhatsApp, Facebook, e-mail) ;
 * les offres saines imitent des annonces réelles (Job Bank, sites d'employeurs).
 * Tous les noms, numéros et adresses sont fictifs.
 */
import type { Profile } from '../../src';

export interface OfferFixture {
  name: string;
  lang: 'fr' | 'en';
  kind: 'arnaque' | 'saine';
  text: string;
  profile?: Profile;
  /** Ensemble EXACT des règles attendues (ni plus, ni moins). */
  expected: string[];
}

export const OFFERS: OfferFixture[] = [
  // ------------------------------------------------------------- Arnaques FR
  {
    name: 'WhatsApp fermes : frais EIMT + visa garanti + Western Union',
    lang: 'fr',
    kind: 'arnaque',
    text: `URGENT !!! Recrutement pour fermes au Canada 🇨🇦
Visa garanti à 100%, sans entretien.
Salaire 4500$ par mois.
Frais de dossier EIMT : 350 000 FCFA à envoyer par Western Union ou Orange Money avant vendredi.
Places limitées ! Contact : canada.recrutement2026@gmail.com`,
    expected: ['frais-candidat', 'garantie', 'urgence', 'moyen-paiement', 'email-gratuit'],
  },
  {
    name: 'PTAS proposé à un Camerounais + salaire irréaliste',
    lang: 'fr',
    kind: 'arnaque',
    profile: { citizenship: 'CM' },
    text: `Bonne nouvelle ! Le programme PTAS (travailleurs agricoles saisonniers) recrute au Cameroun.
Poste : ouvrier agricole en Ontario, 45$/heure.
Inscription : 50 000 FCFA via MTN Mobile Money.`,
    expected: ['ptas-afrique', 'salaire-irrealiste', 'frais-candidat', 'moyen-paiement'],
  },
  {
    name: 'Aide-soignante : RP garantie + logée chez la famille + agent',
    lang: 'fr',
    kind: 'arnaque',
    text: `Recherche aide-soignante pour famille canadienne à Toronto.
Résidence permanente garantie après 6 mois !
Logée et nourrie chez la famille.
Contactez notre agent au +237 690 00 00 00.`,
    expected: ['aide-familial-rp', 'aide-familial-loge', 'agent-non-autorise'],
  },
  {
    name: 'Faux IRCC : loterie + Gmail + carte cadeau',
    lang: 'fr',
    kind: 'arnaque',
    text: `IRCC Canada : Félicitations, votre profil a été sélectionné à la loterie des visas de travail Canada 2026.
Écrivez à ircc.canada.visa@gmail.com ou visitez www.canada-gov-immigration.org
Frais de traitement : 200 $ par carte cadeau.`,
    expected: ['usurpation-gouvernement', 'loterie', 'frais-candidat', 'moyen-paiement', 'email-gratuit'],
  },
  {
    name: 'Cabinet de consultants sans numéro CICC',
    lang: 'fr',
    kind: 'arnaque',
    text: `Cabinet XYZ Consulting, consultant en immigration agréé.
Nous vous trouvons un emploi au Canada avec EIMT approuvée.
Payez 1 500 000 FCFA pour le contrat de travail.`,
    expected: ['agent-non-autorise', 'frais-candidat'],
  },
  {
    name: 'Usine de poisson : salaire gonflé + réservation sur compte personnel',
    lang: 'fr',
    kind: 'arnaque',
    text: `Usine de poisson au Nouveau-Brunswick, 6 500 $ par mois, nourri logé.
Réservation de votre place : 100 000 FCFA à verser sur mon compte personnel.
Dernières places !`,
    expected: ['salaire-irrealiste', 'frais-candidat', 'moyen-paiement', 'urgence'],
  },
  {
    name: 'Agence de voyage : emploi garanti + acompte',
    lang: 'fr',
    kind: 'arnaque',
    text: `Agence de voyage Canada Express : on s'occupe de tout, billet + visa + emploi garanti.
Acompte de 250 000 FCFA.`,
    expected: ['agent-non-autorise', 'garantie', 'frais-candidat'],
  },
  // ------------------------------------------------------------- Arnaques EN
  {
    name: 'Canadian Farms: no interview, high salary, LMIA fee via MoneyGram',
    lang: 'en',
    kind: 'arnaque',
    text: `Canadian Farms Ltd urgently needs 200 farm workers.
No IELTS, no interview! Guaranteed work permit.
Salary $7,000 monthly.
Pay the LMIA processing fee of $850 via MoneyGram to our agent.
Offer expires tonight. Email: hr.canadianfarms@yahoo.com`,
    expected: ['garantie', 'salaire-irrealiste', 'frais-candidat', 'moyen-paiement', 'urgence', 'email-gratuit', 'agent-non-autorise'],
  },
  {
    name: 'Lucky draw + fake embassy + Bitcoin',
    lang: 'en',
    kind: 'arnaque',
    text: `Congratulations! You have been selected in the Canada Lucky Draw for jobs.
Contact the Embassy at canada.embassy.jobs@outlook.com and send the registration fee by Bitcoin.`,
    expected: ['loterie', 'email-gratuit', 'usurpation-gouvernement', 'frais-candidat', 'moyen-paiement'],
  },
  {
    name: 'Caregiver: PR directly + live-in + deposit',
    lang: 'en',
    kind: 'arnaque',
    text: `Caregiver needed in Vancouver. Live-in with the family.
You will get your PR directly after 12 months.
Deposit of $500 required to hold the position.`,
    expected: ['aide-familial-rp', 'aide-familial-loge', 'frais-candidat'],
  },
  {
    name: 'SAWP for Nigerians + application fee',
    lang: 'en',
    kind: 'arnaque',
    profile: { citizenship: 'NG' },
    text: `SAWP 2026 recruitment for Nigerians! Seasonal Agricultural Worker Program jobs in Ontario farms.
Apply now with $300 application fee.`,
    expected: ['ptas-afrique', 'frais-candidat'],
  },
  // ------------------------------------------------------------- Offres saines FR
  {
    name: 'Ferme au Québec, employeur paie EIMT et billet',
    lang: 'fr',
    kind: 'saine',
    text: `Ouvrier agricole – Ferme Tremblay Inc., Saint-Rémi (Québec).
Salaire : 17,60 $ de l'heure, 40 heures par semaine.
L'employeur paie les frais d'EIMT et le billet d'avion aller-retour.
Aucuns frais ne sont demandés aux travailleurs.
Postulez par courriel : rh@fermetremblay.ca`,
    expected: [],
  },
  {
    name: 'Préposé aux bénéficiaires à Moncton (Guichet-Emplois)',
    lang: 'fr',
    kind: 'saine',
    text: `Préposé(e) aux bénéficiaires – Résidence Les Pins, Moncton (N.-B.).
19,50 $/h. Offre ouverte aux candidats étrangers via le Guichet-Emplois.
Envoyez votre CV à emplois@residencelespins.ca.`,
    expected: [],
  },
  {
    name: 'Aide à domicile à Sudbury, frais de permis payés à IRCC',
    lang: 'fr',
    kind: 'saine',
    text: `Aide de maintien à domicile à Sudbury (Ontario). Employeur désigné PICRF.
Salaire 20,00 $ l'heure. Niveau de français NCLC 5 requis.
Vous devez payer vous-même les frais de permis de travail et de biométrie auprès d'IRCC.`,
    expected: [],
  },
  {
    name: 'Consultant réglementé avec numéro CICC',
    lang: 'fr',
    kind: 'saine',
    text: `Manœuvre en transformation alimentaire, Saint-Hyacinthe.
Le consultant réglementé Jean Dupont (CICC R712345) accompagne l'employeur.
Aucuns frais ne vous seront facturés.`,
    expected: [],
  },
  // ------------------------------------------------------------- Offres saines EN
  {
    name: 'Fish plant in Nova Scotia, employer covers LMIA fees',
    lang: 'en',
    kind: 'saine',
    text: `Fish plant worker – Atlantic Seafoods Ltd., Yarmouth, NS.
$17.25 hourly, 40 to 50 hours per week.
Employer covers LMIA fees and return airfare.
Apply at careers@atlanticseafoods.ca. We never ask candidates for money.`,
    expected: [],
  },
  {
    name: 'Home support worker in Calgary (live-out, mentions PR status)',
    lang: 'en',
    kind: 'saine',
    text: `Home support worker, private household, Calgary AB.
$22.50 hourly. Live-out position.
Must have a valid work permit or be a Canadian citizen/PR.`,
    expected: [],
  },
  {
    name: 'Greenhouse labourer, seasonal contract (Pay: … per hour)',
    lang: 'en',
    kind: 'saine',
    text: `Greenhouse labourer – Sunrise Greenhouses Inc., Leamington, ON.
Seasonal contract, 8 months, pay $17.60 per hour, overtime after 44 hours.`,
    expected: [],
  },
  {
    name: 'Food plant in Brandon, designated RCIP employer, no fees',
    lang: 'en',
    kind: 'saine',
    text: `General labourer, food processing plant in Brandon, MB. $18.50/hr.
Designated employer under the Rural Community Immigration Pilot.
Applications by email only: jobs@prairiefoods.ca. No fees are charged to applicants.`,
    expected: [],
  },
  {
    name: 'Job Bank "Urgent need" label is not pressure',
    lang: 'en',
    kind: 'saine',
    text: `Urgent need: Kitchen helper, Halifax NS, $16.50/hour. Apply by email: hiring@harbourgrill.ca`,
    expected: [],
  },
];
