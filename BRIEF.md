# PROMPT CLAUDE CODE — « VériJob Canada » (nom provisoire)

> Copie tout ce fichier dans Claude Code (ou place-le à la racine du projet sous le nom `BRIEF.md` et dis : « Lis BRIEF.md et commence par la Phase 0 »).

---

## 0. Ton rôle et les règles de travail

Tu es un ingénieur logiciel senior. Tu construis avec moi (Jessica, ingénieure logiciel au Cameroun) une **PWA gratuite, sans serveur**, qui aide les Africains **ne résidant pas encore au Canada** (francophones ET anglophones) à :

1. **ne pas se faire arnaquer** (pilier principal) ;
2. **trouver des emplois réellement accessibles depuis l'étranger**, avec une estimation honnête de la voie d'immigration possible ;
3. **cibler les employeurs qui recrutent vraiment à l'international**, pour les démarcher directement.

Règles de travail :
- Travaille **par phases**. À la fin de chaque phase : résume ce qui est fait, ce qui reste, et **attends mon feu vert** avant la phase suivante.
- **Phase 0 obligatoire avant tout code** : vérifier les sources de données (voir §4). Les règles d'immigration changent tous les trimestres : ne code jamais une règle « en dur » sans source officielle datée.
- Pose-moi une question dès qu'une décision est irréversible ou ambiguë (ex. : scraper un site dont les conditions d'utilisation ne sont pas claires).
- Code propre, commenté en français, tests unitaires pour toute la logique métier.
- Interface **bilingue FR/EN** dès le départ (FR par défaut, bascule visible).

---

## 1. Le problème réel (contexte métier — lis attentivement)

- La plupart des annonces de Job Bank exigent d'être déjà citoyen, résident permanent, ou résident temporaire avec permis de travail. Ces annonces disent explicitement de ne pas postuler sinon. **Un agrégateur naïf d'« offres LMIA » vend donc de faux espoirs.**
- Job Bank possède une **section dédiée aux candidats étrangers** : des offres d'employeurs qui recrutent hors du Canada. **C'est la source principale du radar d'offres.**
- Les arnaques typiques : frais demandés au candidat pour « l'EIMT » ou le « contrat », « visa garanti », faux employeurs, consultants non réglementés, paiement par transfert à un particulier.

### Profil des utilisateurs cibles (MVP)
Métiers peu qualifiés ou avec formation sur le tas : **manœuvre / labourer, aide-soignant à domicile / caregiver, ouvrier agricole / farm worker**, et tout emploi TEER 4–5.

---

## 2. Les voies d'immigration à modéliser (le « moteur de faisabilité »)

Pour chaque offre ou employeur, l'appli estime **quelle(s) voie(s) sont réalistes** pour l'utilisateur. Ces règles doivent vivre dans un fichier de données versionné (`data/rules.json`), **chaque règle avec : source officielle (URL), date de vérification, date de prochaine révision**. Ne jamais les coder en dur dans la logique.

État connu au 13 octobre 2026 (**à revérifier en Phase 0 sur les sites officiels canada.ca / IRCC / EDSC**) :

| Voie | Règle clé | Impact sur nos métiers |
|---|---|---|
| **EIMT/LMIA volet bas salaire** | EDSC refuse de traiter les EIMT bas salaire dans les RMR (CMA) où le chômage ≥ 6 %. Liste mise à jour chaque trimestre (dernière : 9 oct. 2026). Les lieux de travail **hors RMR** ne sont pas visés par cette mesure. Exemptions possibles par métier/secteur. | Score fort pour employeurs ruraux / hors RMR ; score faible si l'emploi est dans une RMR gelée. |
| **EIMT volet agricole** | Ouvert aux travailleurs de **tout pays**. | Voie principale pour « farm worker » depuis l'Afrique. |
| **PTAS / SAWP** | Réservé au Mexique + pays des Caraïbes (accords bilatéraux). | **Pas accessible aux Africains** → l'appli doit le dire clairement et signaler comme suspecte toute offre « SAWP » adressée à un Africain. |
| **Mobilité francophone (C16)** | Dispense d'EIMT, emploi **hors Québec**, TEER 0 à 5 **sauf agriculture primaire TEER 4/5**. Exige NCLC 5 en expression et compréhension orales (à vérifier). | Excellente voie pour **francophones** : manœuvre (hors agriculture), aide à domicile/caregiver (NOC 44101), transformation alimentaire, etc. Non applicable aux anglophones sans niveau de français. |
| **Programmes pilotes aides familiaux (HCWP)** | **Fermés aux nouvelles demandes du 31 mars 2026 au 30 mars 2030** (selon publication IRCC — à vérifier). | Afficher clairement : pas de voie RP directe « caregiver » actuellement. Rediriger vers C16 (francophones) ou EIMT. Signaler : les postes d'aide familial **résidant** (live-in) font aussi l'objet d'un refus de traitement EIMT. |
| **PICRF / FCIP et PICR / RCIP** (pilotes communautaires 2025–2030) | Voie RP pilotée par l'employeur : il faut une offre d'un **employeur désigné** par la communauté. Chaque communauté publie sa liste d'employeurs désignés (souvent en PDF, avec mention « not hiring »), ses métiers prioritaires et ses fenêtres de recommandation. | Source en or pour la **liste de démarchage** (notamment le secteur santé / soins de longue durée). |
| **Québec** | Règles propres (liste de traitement simplifié, moratoires locaux, missions de recrutement). C16 ne s'applique pas au Québec. | Module d'info séparé, phase ultérieure. |

### Codes CNP/NOC 2021 de départ (**à valider en Phase 0 contre la table officielle CNP 2021 et la liste officielle « agriculture primaire »**)
- Agricole (primaire) : 85100, 85101, 85103, 84120 (+ vérifier 85102 aquaculture)
- Soins à domicile : 44100 (garde d'enfants à domicile), 44101 (aide de maintien à domicile / caregiver)
- Manœuvres et transformation : 75110, 75101, 94141, 94142, 95106, 95107, 95109
- Nettoyage : 65310
- Ajouter ce que la Phase 0 révèle comme fréquent dans les EIMT positives TEER 4–5.

### Sortie du moteur
Pour chaque offre/employeur : liste des voies `{voie, statut: "probable" | "possible" | "bloquée" | "inconnue", raisons[], sources[]}`. **Toujours expliquer pourquoi** en langage simple, jamais un score magique.

---

## 3. Fonctionnalités du MVP (ordre de priorité)

### 3.1 Profil (stocké localement, jamais envoyé)
Pays de citoyenneté, langues + niveau estimé (NCLC/CLB), métiers visés (codes CNP), provinces préférées, expérience (mois), formation.

### 3.2 Vérificateur anti-arnaque ⭐ (pilier principal)
- **Vérifier un employeur** : recherche floue (fautes, abréviations, « Inc./Ltd/Ltée ») dans :
  - les listes officielles d'employeurs ayant reçu une **EIMT positive** (et **négative**) publiées chaque trimestre sur open.canada.ca, par volet, CNP et lieu ;
  - les listes d'employeurs désignés FCIP/RCIP.
  - Résultat : trouvé/non trouvé, pour quels métiers, quelle province, quel trimestre. **Toujours afficher** : « Cette liste exclut les employeurs dont le nom contient un nom de personne, et elle a un retard de plusieurs mois. Absent ≠ faux. Présent ≠ cette offre est vraie. »
- **Analyser une offre collée** (texte WhatsApp, e-mail, Facebook) : moteur de règles explicable (pas d'IA en ligne), chaque règle déclenchée affichée avec son explication. Règles minimales :
  - frais demandés au candidat (EIMT, contrat, « dossier », « traitement », « réservation ») — rappeler que les frais d'EIMT sont à la charge de l'employeur, qui ne peut pas les récupérer auprès du travailleur (à confirmer en Phase 0 avec la source officielle) ;
  - « visa garanti », « 100 % », « sans entretien », urgence artificielle ;
  - paiement par Western Union, MoneyGram, Mobile Money, crypto, ou vers un particulier ;
  - adresse e-mail gratuite (gmail, yahoo, outlook…) pour un « grand employeur » ;
  - salaire irréaliste pour le métier (comparer aux salaires médians Job Bank par CNP/province si disponibles) ;
  - « SAWP » ou « programme saisonnier » proposé à un ressortissant africain ;
  - « caregiver avec résidence permanente garantie » (pilotes fermés) ;
  - mention d'un « agent » sans numéro de membre CICC.
  - Résultat formulé **uniquement** comme : « X signaux d'alerte détectés » / « Aucun signal d'alerte détecté — cela ne garantit pas que l'offre est authentique ». **Jamais « offre sûre ».**
- **Vérifier un consultant** : guide pas à pas + lien direct vers le registre public du CICC (pas de scraping).

### 3.3 Radar d'offres accessibles depuis l'étranger
- Source : section « candidats étrangers » de Job Bank, filtrée sur les CNP du profil.
- Chaque offre enrichie par le moteur de faisabilité (§2) + statut RMR gelée/non gelée + employeur présent ou non dans les listes EIMT.
- Si le scraping n'est pas autorisé (voir Phase 0) → **mode liens** : générer des URL de recherche Job Bank pré-filtrées, ouvertes dans le navigateur.

### 3.4 Liste de démarchage employeurs (« recruteurs récurrents »)
- À partir des EIMT positives : employeurs ayant obtenu des EIMT **plusieurs trimestres** pour les CNP ciblés, par province, avec volet (agricole, bas salaire…) et nombre de postes.
- Plus employeurs désignés FCIP/RCIP (avec mention « recrute / ne recrute pas »).
- Export CSV + modèles de message de candidature spontanée FR/EN.

### 3.5 Veille réglementaire
Page « Ce qui a changé » alimentée par `rules.json` : dates des listes RMR, statut des programmes (ouvert/fermé), prochaine mise à jour attendue. Alerte visible si une règle a dépassé sa date de révision (« donnée possiblement périmée »).

### 3.6 Mon suivi de candidatures
Tableau local (IndexedDB) : employeur, poste, date, statut, relance, notes, résultat de vérification. Export/import JSON pour sauvegarde.

---

## 4. Phase 0 — Vérification des sources (AVANT TOUT CODE)

Produis un rapport `docs/sources.md` qui, pour chaque source, indique : URL exacte, format (CSV/XLSX/PDF/HTML), fréquence de mise à jour, dernière date disponible, licence, et **si l'accès automatisé est permis** (lire robots.txt et conditions d'utilisation).

Sources à vérifier :
1. open.canada.ca — PTET/TFWP « Liste des employeurs ayant reçu une EIMT positive » et « …négative » (trimestriel, XLSX/CSV).
2. open.canada.ca — statistiques EIMT par CNP/province (pour les volumes).
3. EDSC — page « Refus de traiter une demande d'EIMT » + tableau des taux de chômage par RMR (trimestriel).
4. Job Bank — page candidats étrangers + format des pages d'offres (données structurées RDFa ?) + robots.txt + conditions d'utilisation.
5. IRCC — pages officielles : Mobilité francophone, pilotes aides familiaux (statut), PTAS/SAWP (pays), FCIP/RCIP (liste des communautés + lien vers chaque liste d'employeurs désignés).
6. Table officielle CNP 2021 (codes, TEER) + liste officielle des CNP « agriculture primaire ».
7. CICC — URL du registre public.

**Si une source n'autorise pas l'accès automatisé → ne pas la scraper.** Proposer une alternative (liens profonds, saisie manuelle assistée) et me demander.

À la fin de la Phase 0, propose-moi la version validée du tableau §2 et de la liste CNP §2, puis attends mon accord.

---

## 5. Architecture technique (coût d'exploitation : 0 FCFA)

- **Front** : Vite + TypeScript + Preact (léger, adapté aux téléphones d'entrée de gamme et à la data mobile limitée). `vite-plugin-pwa` pour l'installation et le hors-ligne.
- **Recherche locale** : MiniSearch ou Fuse.js sur des index JSON pré-calculés et **compressés** (garder chaque fichier de données le plus petit possible ; charger à la demande par province si nécessaire).
- **Stockage local** : IndexedDB (via `idb-keyval`) pour profil et suivi. Aucune donnée personnelle ne quitte l'appareil.
- **Pipeline de données** (`/scripts`, Node.js) :
  - `fetch-lmia.ts` : télécharge les XLSX/CSV EIMT positifs/négatifs, normalise (noms d'entreprises, CNP, provinces, trimestre), déduplique, produit `public/data/employers-*.json`.
  - `fetch-cma-rates.ts` : produit `public/data/cma-freeze.json` (si la page n'est pas exploitable automatiquement → fichier saisi à la main avec source et date).
  - `fetch-designated.ts` : FCIP/RCIP (souvent PDF → `pdf-parse`, sinon CSV curé à la main dans `data/manual/`).
  - `fetch-jobbank.ts` : **seulement si autorisé en Phase 0**, avec délai entre requêtes, user-agent identifiable, champs minimaux, lien vers l'offre d'origine.
  - Chaque fichier généré contient `{ source, fetchedAt, recordCount, data }`.
- **Automatisation gratuite** : GitHub Actions planifiée (hebdomadaire) qui exécute les scripts et republie le site.
- **Hébergement** : GitHub Pages ou Cloudflare Pages (gratuit).
- **Plus tard (hors MVP)** : extension Chrome réutilisant le même moteur (`/packages/core`), puis bot Telegram. Structure le code en monorepo léger dès maintenant : `packages/core` (moteur de règles + faisabilité + recherche, sans dépendance au DOM) et `apps/pwa`.

---

## 6. Exigences éthiques et légales (non négociables)

- Mention permanente : « Outil d'information gratuit, non affilié au gouvernement du Canada. Ce n'est pas un avis juridique. Vérifiez toujours sur canada.ca. »
- Jamais de « offre vérifiée », « employeur garanti », « offre sûre ».
- Chaque information affichée a sa **source cliquable et sa date**.
- Aucune collecte de données, aucun tracker, aucune publicité.
- Aucune recommandation de consultant ou d'agence en particulier.
- Contenu lisible par des personnes peu à l'aise avec l'administratif : phrases courtes, exemples concrets.

---

## 7. Phases de livraison

- **Phase 0** — Rapport sources + validation des règles et CNP. ⏸ Attendre mon accord.
- **Phase 1** — Squelette monorepo, `packages/core` (moteur anti-arnaque + moteur de faisabilité) avec **tests unitaires** sur au moins 15 exemples d'offres réelles/fictives (arnaques et offres saines), FR et EN. ⏸
- **Phase 2** — Pipeline données EIMT + RMR + désignés FCIP/RCIP, fichiers JSON générés et vérifiés (afficher quelques statistiques de contrôle). ⏸
- **Phase 3** — PWA : Profil, Vérificateur (employeur + offre + consultant), bilingue, hors-ligne. ⏸
- **Phase 4** — Liste de démarchage + export CSV + modèles de messages. ⏸
- **Phase 5** — Radar Job Bank (ou mode liens) + Veille réglementaire. ⏸
- **Phase 6** — Suivi de candidatures, GitHub Actions, déploiement gratuit, README d'installation en français. ⏸

À chaque phase : montre-moi comment tester en local (`npm run dev`) et liste les limites connues.

---

## 8. Critères de réussite du MVP

1. Je colle un message WhatsApp d'arnaque typique → l'appli liste les signaux d'alerte avec explications, en moins de 2 secondes, hors ligne.
2. Je tape le nom d'une ferme ou d'une usine → je sais si elle a obtenu des EIMT, pour quels métiers, où, et quand.
3. Je choisis « caregiver, francophone, NCLC 5 » → l'appli m'explique honnêtement que les pilotes RP sont fermés, mais que la Mobilité francophone hors Québec est une voie possible, avec liens officiels.
4. Je choisis « farm worker, Cameroun » → l'appli explique que le PTAS/SAWP n'est pas accessible, que le volet agricole l'est, et me donne la liste des employeurs agricoles ayant eu des EIMT récemment.
5. Le site complet fonctionne sur un Android d'entrée de gamme en 3G, et coûte 0 FCFA par mois à héberger.
