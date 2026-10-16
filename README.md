# VériJob Canada (nom provisoire)

Application web gratuite (PWA), sans serveur, qui aide les candidats africains, francophones et anglophones, qui ne vivent **pas encore au Canada** à :

1. **ne pas se faire arnaquer** : analyse d'une offre reçue par WhatsApp, e-mail ou Facebook, et vérification d'un employeur ou d'un consultant ;
2. **trouver des emplois réellement accessibles depuis l'étranger**, avec une estimation honnête de la voie d'immigration ;
3. **cibler les employeurs qui recrutent vraiment à l'international** et les contacter directement.

> Outil d'information gratuit, non affilié au gouvernement du Canada. Ce n'est pas un avis juridique. Vérifiez toujours sur canada.ca.

- **Coût d'hébergement** : 0 FCFA (GitHub Pages ou Cloudflare Pages).
- **Hors ligne** : fonctionne sans connexion une fois installée.
- **Vie privée** : aucune donnée envoyée, aucun traceur, aucune publicité.

---

## 1. Ce que fait l'application

| Onglet | Rôle |
|---|---|
| **Offre** | Collez un message : l'appli liste les signaux d'alerte (frais demandés, visa « garanti », Western Union, faux e-mail gouvernemental, PTAS proposé à un Africain, « entretien » sur WhatsApp/Telegram, copie du passeport ou code demandés, faux chèque…), avec une explication simple et la source officielle de chacun. Elle ne dit jamais « offre sûre ». |
| **Employeur** | Recherche tolérante aux fautes dans les listes officielles d'EIMT positives et refusées (8 derniers trimestres) et dans les employeurs désignés des pilotes PICR/PICRF. |
| **Emplois** | Lien vers les offres du Guichet-Emplois ouvertes aux candidats étrangers, mots-clés à copier, villes où les EIMT bas salaire sont gelées. Autres sites (Indeed, LinkedIn, Québec emploi) avec recherche pré-remplie, salons de recrutement (Destination Canada, Destination Manitoba, Journées Québec), réseaux (services publics d'emploi partenaires, réseaux francophones, communautés PICR/PICRF), mises en garde sur les groupes WhatsApp/Facebook et les petites annonces. Évaluation d'un poste trouvé. |
| **Vérifier mon CV** | Ajoutez votre CV (PDF, Word .docx ou texte) et l'offre visée : format canadien (règles du Guichet-Emplois), renseignements personnels à retirer, cohérence des dates, langue, mots de l'offre présents ou absents, lisibilité par les logiciels de tri (ATS). Le CV est lu sur le téléphone et n'est envoyé nulle part (accessible depuis l'accueil et depuis chaque candidature du Suivi). |
| **CV d'exemple** | Pour chaque métier ou chaque offre (boutons « CV d'exemple » sur les offres, les employeurs, le profil et le vérificateur de CV) : CV canadien d'un candidat **fictif** vivant hors du Canada. Chaque puce est une fonction **officielle** du métier (CNP 2021, Statistique Canada), triée selon les mots de l'offre ; les repères à remplacer (nom, dates, résultats chiffrés) sont surlignés ; un conseil du Guichet-Emplois accompagne chaque section. Profil « métier actuel » (ex. gardien·ne de prison) : le CV part des tâches communes. Téléchargement **Word (.docx) modifiable**, fabriqué sur le téléphone. |
| **Démarcher** | Mise en relation directe (sans intermédiaire) : employeurs qui obtiennent des EIMT pour vos métiers trimestre après trimestre (badge « Besoin récurrent » à partir de 3 trimestres, même sans offre affichée), **nouveaux recruteurs** (première EIMT dans les 2 derniers trimestres publiés), employeurs désignés. Recherche de la page Carrières, message FR/EN qui cite l'historique public d'EIMT de l'employeur, bouton « Suivre » (relance notée). Pour les agents de sécurité : lien vers la page officielle du permis provincial. Export CSV. |
| **Suivi** | Vos candidatures : statut, relances, notes, provenance de l'offre (petite annonce, Job Bank, salon…), lien et **copie du texte de l'annonce** (preuve si elle disparaît), bouton « Analyser cette annonce », export et import (sauvegarde JSON). |
| **Mon profil** | **Plusieurs profils par téléphone** (vous, votre conjoint·e, un proche) : chacun garde ses métiers, langues, provinces et son suivi de candidatures, sans compte ; règle « venir en couple » (permis ouvert du conjoint). Pays, niveaux de langue, métiers, provinces, métier actuel s'il n'est pas dans la liste (ex. gardien·ne de prison → agent·e de sécurité, avec la comparaison des fonctions officielles de la CNP 2021). Affiche les voies d'immigration possibles (probable, possible, bloquée, à préciser), toujours avec les raisons et les sources. |
| **Consultant** | Guide pour vérifier un consultant dans le registre officiel du CICC (accessible depuis l'accueil et le pied de page). |
| **Programmes et actualités** | État des programmes (dont Entrée express et ses catégories accessibles depuis l'étranger), dernières invitations Entrée express par catégorie avec le score minimum, **actualités d'IRCC lues en direct** sur canada.ca, prochaines dates, historique des changements, fraîcheur des données (accessible depuis l'accueil et le pied de page). |

L'appli est en français par défaut. Le bouton **English** en haut à droite bascule en anglais, et ce choix est mémorisé.

---

## 2. Installation sur votre ordinateur

### Prérequis
- **Node.js 22 ou plus récent** (recommandé : 24) : https://nodejs.org
- **Git** : https://git-scm.com
- Une connexion Internet pour la première préparation des données (environ 15 Mo à télécharger).

### Étapes
```bash
git clone <adresse-de-votre-dépôt> verijob-canada
cd verijob-canada
npm install
npm run data
npm run dev -w @verijob/pwa
```
Ouvrez ensuite **http://localhost:5173**.

`npm run data` prépare les données. **La première fois, comptez environ 6 minutes** : le portail open.canada.ca demande d'attendre 20 secondes entre deux téléchargements, et le script respecte ce délai. Les exécutions suivantes réutilisent les fichiers déjà téléchargés (dossier `data/raw/`).

### Autres commandes
| Commande | Effet |
|---|---|
| `npm test` | Tous les tests unitaires (moteur anti-arnaque, faisabilité, pipeline, textes de l'appli) |
| `npm run typecheck` | Vérification TypeScript |
| `npm run check:rules` | Liste les règles dont la date de révision est dépassée (code de sortie 1 si c'est le cas) |
| `npm run build -w @verijob/pwa` | Version de production dans `apps/pwa/dist/` |
| `npm run preview -w @verijob/pwa` | Teste la version de production sur http://localhost:4173 (le mode hors ligne n'est actif qu'ici) |
| `node scripts/make-icons.mjs` | Régénère les icônes |

---

## 3. Organisation du projet

```
data/rules.json          Règles d'immigration : chaque section a une source officielle, une date de
                         vérification et une date de prochaine révision. Jamais de règle « en dur » dans le code.
data/noc.json            Les 20 métiers CNP 2021 ciblés (titres officiels, intitulés courts, mots-clés)
data/manual/             Relevés faits à la main (employeurs désignés PICR/PICRF, métiers prioritaires)
packages/core/           Moteur (TypeScript, sans dépendance au navigateur) : anti-arnaque, faisabilité,
                         recherche d'employeurs, démarchage, veille, suivi des candidatures
apps/pwa/                Application Preact + Vite + vite-plugin-pwa
scripts/                 Pipeline de données (npm run data) et utilitaires
docs/sources.md          Vérification des sources (Phase 0) et décisions prises
docs/data-report.md      Rapport de contrôle généré par le pipeline
.github/workflows/       Automatisation hebdomadaire (données + déploiement)
```

---

## 4. Données et sources

| Fichier publié (`apps/pwa/public/data/`) | Contenu | Source |
|---|---|---|
| `employers-index.json`, `employers-<PROV>.json` | Employeurs ayant reçu une EIMT positive ou refusée, un fichier par province | EDSC, open.canada.ca (licence ouverte) |
| `prospects.json` | Recruteurs récurrents (EIMT sur au moins 2 trimestres pour les métiers ciblés) | idem |
| `cma-lookup.json` | Municipalité → RMR (gel des EIMT bas salaire) | Statistique Canada, Recensement 2021 |
| `wages.json` | Salaires bas, médian et haut des métiers ciblés | Salaires Job Bank, open.canada.ca |
| `designated-employers.json`, `community-priorities.json` | Employeurs désignés et métiers prioritaires PICR/PICRF | Relevés manuels : `data/manual/*.csv` |
| `postings.json` | Offres du dernier mois pour les métiers suivis : statistiques par métier et province, et offres récentes (date, ville, salaire, études, expérience) | « Offres d'emploi affichées sur le Guichet-Emplois », données ouvertes mensuelles d'EDSC (open.canada.ca). Sans nom d'employeur ni lien : l'appli propose une recherche sur le Guichet-Emplois. |
| `express-entry.json` | 40 dernières rondes d'invitations Entrée express, avec leur catégorie | Fichiers JSON officiels d'IRCC (canada.ca) |

Lu **en direct** par l'appli (pas de fichier) : le fil d'actualités d'IRCC (`api.io.canada.ca`) à l'ouverture de « Programmes et actualités », et le fichier officiel des rondes Entrée express quand on appuie sur « Actualiser maintenant ». Canada.ca autorise cette lecture depuis un navigateur ; le service worker garde la dernière réponse pour le mode hors ligne.

Règles d'accès respectées :
- **Job Bank n'est jamais lu automatiquement**, car ses conditions d'utilisation l'interdisent. L'appli ne fait que des liens.
- Même règle pour **Indeed, LinkedIn, Québec emploi et les sites de petites annonces** : aucun n'est lu ; l'appli ouvre seulement une recherche pré-remplie (`rules.json` → `opportunities`).
- Les téléchargements s'identifient clairement et respectent les délais demandés par chaque site (`Crawl-delay`).
- Aucune protection anti-robots n'est contournée. Les sites protégés sont relevés à la main.

---

## 5. Maintenance (à faire régulièrement)

### Chaque trimestre : les règles
`npm run check:rules` indique ce qui est à revoir. Dates clés :

- **Liste des RMR gelées** : EDSC la publie chaque trimestre. Prochaine date : **8 janvier 2027**, sur la page « Refus de traiter » (lien dans `rules.json` → `sources.esdc-refusal`). Mettez à jour `lmiaLowWage.cmas[].frozen`, `validFrom`, `validTo`, `nextUpdate`, puis la date `verifiedAt` / `nextReview` de la source. Ajoutez une entrée dans `changes`.
- **Autres règles** (seuils salariaux, Mobilité francophone, pilotes, mesures rurales…) : relisez la page officielle de chaque source, corrigez si besoin, puis repoussez `nextReview`.
- Après chaque modification, lancez `npm test` : les tests vérifient que chaque règle a bien une source datée.

Tant qu'une règle est périmée, l'appli affiche un bandeau « données possiblement périmées ». Le workflow GitHub signale aussi l'échec par e-mail.

### Salons, réseaux et actualités
- **Salons de recrutement** (`rules.json` → `opportunities.events`) : leurs sources sont à revoir tous les 2 mois (`nextReview`). Mettez à jour `statusFr`/`statusEn` et `lastEditionEnd` quand une nouvelle édition est annoncée (Destination Canada : inscriptions annoncées pour l'automne 2026).
- **Actualités IRCC** : si des nouvelles inutiles apparaissent (ou si des nouvelles utiles manquent), ajustez les listes de mots `liveNews.include` / `liveNews.exclude`.
- **Entrée express** : si IRCC crée une nouvelle catégorie, ajoutez-la dans `expressEntry.categories` (sinon elle s'affiche comme « Cas particulier »).

### Employeurs désignés PICR/PICRF
Ajoutez ou corrigez des lignes dans `data/manual/designated-employers.csv`. Colonnes :

`community, program (RCIP|FCIP), employer, sector, nocs, hiring (recrute|ne-recrute-pas|inconnu|retire), address, source_url, recorded_at, notes`

Le pipeline refuse un fichier invalide et signale les relevés de plus de 90 jours. Huit communautés restent à relever à la main : leurs sites bloquent les robots (voir `docs/sources.md`, §13).

### Liens Job Bank
`jobBank.searchTemplate` a été relevé à la main le 14 oct. 2026 : `searchstring` (mot-clé ou nom d'employeur) et `fglo=1` (offres ouvertes aux candidats internationaux) fonctionnent ; la province ne peut pas être imposée par l'adresse. Si le Guichet-Emplois change son format, refaites une recherche dans un navigateur et recopiez l'adresse en remplaçant le mot-clé par `{keyword}`.

### Offres ouvertes aux candidats de l'étranger (Adzuna)
Les sites d'emploi ne peuvent pas être lus automatiquement (conditions d'utilisation), sauf par une API officielle. Le pipeline utilise l'**API Adzuna** (accès de base gratuit : 250 requêtes par jour, 1 000 par semaine ; affichage autorisé avec la mention « Adzuna » liée à adzuna.ca). Clés dans les secrets GitHub `ADZUNA_APP_ID` et `ADZUNA_APP_KEY` ; sans clés, l'étape est sautée et la section n'apparaît pas.

Pour chaque métier suivi : annonces des 45 derniers jours contenant le métier et au moins un mot du recrutement international. VériJob (`classifyInternational`) garde seulement celles qui disent explicitement accepter les candidats de l'étranger (EIMT/LMIA, parrainage, candidatures internationales) et écarte celles qui exigent d'être déjà au Canada ; chaque offre gardée affiche la phrase qui le prouve et passe dans le vérificateur d'arnaques. Adzuna ne fournit qu'un extrait de l'annonce. On lui demande donc des expressions exactes (« lmia », « eimt », « lmia approved », « positive lmia ») qu'il cherche dans l'annonce complète ; une offre est gardée seulement si la phrase de preuve est visible dans l'extrait **ou** si l'employeur figure dans les listes officielles d'EIMT positives d'EDSC (même province). Écartés après diagnostic : « visa sponsorship » (surtout « without visa sponsorship »), « temporary foreign worker » (au Québec, mention légale du permis des agences de placement), postes dont le travail porte sur l'immigration. Le fichier `international-diagnostic.json` publié avec les données donne le volume par requête.

### Employeurs qui ont fait leurs preuves en Afrique
Ajoutez une ligne dans `data/manual/recrutement-afrique.csv` seulement après avoir **lu vous-même** une source publique : page officielle de l'employeur, article de presse reconnue ou communiqué. Colonnes :

`employer, province, city, sector, countries (codes ISO-2 séparés par |), evidence_type (page-employeur|presse|mission|gouvernement), evidence_fr, evidence_en, event_date, source_title, source_url, recorded_at`

Écrivez exactement ce que la source prouve : des embauches chiffrées, ou seulement une mission de recrutement. Ne citez jamais le nom d'un travailleur. Les listes de blogs (« 30 entreprises qui recrutent en Afrique ») ne sont pas des preuves. Le pipeline refuse un fichier invalide ; l'appli signale les preuves de plus de 3 ans.

### Fonctions officielles des métiers (CV d'exemple)
`data/noc-elements.json` est produit par `npx tsx scripts/build-noc-elements.ts` à partir du fichier « éléments » de la CNP 2021 (Statistique Canada). À relancer après l'ajout d'un métier dans `data/noc.json` ou d'une passerelle ; le test vérifie que chaque métier y figure.

### Offres actuelles et liens pour postuler
- **Offres actuelles** (`current-offers.json`) : deux requêtes Adzuna par métier suivi (terme anglais, puis terme français `searchFr` de `data/noc.json` pour les annonces du Québec), annonces des 21 derniers jours, gardées seulement si le **titre** correspond au métier. Un métier ou un terme ajouté est interrogé dès l'envoi de code suivant (`source.nocs`). Chaque `searchFr` doit figurer dans les mots-clés du métier (le test le vérifie).
- **Quota gratuit d'Adzuna** (250 appels par jour, 1 000 par semaine ; environ 46 appels par mise à jour) : l'API n'est appelée que le **lundi** (ou lors d'un lancement manuel du workflow). À chaque envoi de code, et si l'API échoue, les offres déjà publiées sont reprises de la release « site-latest » avec leur vraie date (`scripts/lib/previous.ts`).
- **Vu de l'étranger, Adzuna bloque son bouton « Postuler »** (« not available in your region », constaté le 16 oct. 2026 depuis le Cameroun). Chaque offre propose donc : « Trouver et postuler sur le Guichet-Emplois » (titre + employeur + province, sans le filtre « candidats étrangers » pour ne pas cacher l'annonce), « Site de l'employeur » (page Carrières) et « Lire l'annonce (Adzuna) ».
- Les données ouvertes mensuelles du Guichet-Emplois n'ont **ni lien ni numéro d'offre** : elles ne servent plus qu'aux **statistiques** du marché, avec un bouton par province vers la recherche officielle « ouvert aux candidats étrangers » (`fprov` + `fglo=1`, vérifiés à la main).

### Test de langue obligatoire ou non (offres divisées)
`rules.json › languageTest` classe chaque voie : test **non obligatoire** pour obtenir le permis (EIMT : art. 200 du Règlement ; Mobilité francophone : preuve d'études en français acceptée, instructions C16) ou **obligatoire** (pilotes PICR/PICRF, résidence permanente). Les offres internationales, les offres récentes et les employeurs de **Démarcher** sont divisés en onglets « Sans test de langue obligatoire » / « Test de langue obligatoire », selon le profil. Toute nouvelle voie doit y être classée (le test l'exige).

### Règles en préparation
`rules.json › proposals` liste les règles annoncées mais pas en vigueur (ex. test de langue obligatoire pour certains permis du Programme de mobilité internationale). Chaque semaine, le pipeline relit la date de modification de la page officielle (`proposals-status.json`) : si elle a changé, l'appli et `docs/data-report.md` (§ 11) le signalent. Relisez alors la page et mettez à jour `status`, `detailFr/En` et `checkedAt`.

### Québec et couple
`rules.json › quebec` : étapes officielles du MIFI (offre d'emploi, déclaration d'intérêt Arrima et Portail employeurs, EIMT avec autorisation conjointe, CAQ puis permis de travail, français niveau 4 à l'oral pour renouveler le CAQ après 3 ans à partir du 17 déc. 2028, PSTQ/PEQ pour rester). Affiché dans **Emplois** et **Démarcher** quand le Québec est visé. `rules.json › family` : permis de travail ouvert du conjoint (IRCC, et page du MIFI), avec ses exceptions. Pages à revérifier à chaque révision.

### Passerelles de métier et permis provinciaux
`rules.json › occupationTransfers` : un métier d'origine peu accessible depuis l'étranger vers un métier proche. N'ajoutez une passerelle que si les **fonctions principales officielles** des deux groupes (fichier « éléments » de la CNP 2021, Statistique Canada) se recoupent ; citez-les telles quelles. `rules.json › securityLicences` : n'ajoutez une province qu'après avoir ouvert vous-même la page officielle du permis.

### Adresses pour postuler
Les listes officielles d'EIMT ne donnent que la ville et le code postal de l'employeur. L'appli ne devine jamais d'adresse e-mail : elle propose ses offres sur le Guichet-Emplois (chaque offre indique comment postuler), la recherche de son site officiel et la carte. Dans le Suivi, la personne note le contact et la page officielle où elle l'a trouvé ; une adresse Gmail/Yahoo est signalée.

---

## 6. Mise en ligne gratuite

### Option A : GitHub Pages (recommandée, entièrement automatique)
1. Créez un compte sur https://github.com, puis un **nouveau dépôt** (par exemple `verijob-canada`). Il peut être public ou privé. Avec un compte gratuit, GitHub Pages exige un dépôt public.
2. Dans le dossier du projet :
   ```bash
   git remote add origin https://github.com/<votre-compte>/verijob-canada.git
   git push -u origin main
   ```
3. Sur GitHub, ouvrez **Settings → Pages**, puis à **Source**, choisissez **GitHub Actions**.
4. Ouvrez l'onglet **Actions** et lancez le workflow **« Données et déploiement »** (bouton *Run workflow*). Il prend environ 10 minutes.
5. L'adresse du site s'affiche dans le résumé du workflow, sous la forme `https://<votre-compte>.github.io/verijob-canada/`.

Ensuite, **chaque lundi**, le workflow rafraîchit les données officielles, relance les tests et republie le site. Il se déclenche aussi à chaque `git push`.

### Option B : Cloudflare Pages (recommandée en complément)
Certains réseaux bloquent les serveurs de GitHub Pages : c'est le cas de notre connexion de développement. Cloudflare Pages (adresse en `….pages.dev`) a des serveurs en Afrique (Lagos, Johannesburg, Nairobi…).

1. Créez un compte gratuit sur https://dash.cloudflare.com/sign-up.
2. Ouvrez **Workers & Pages → Create → onglet Pages → Connect to Git**, autorisez GitHub et choisissez le dépôt `verijob-canada`.
3. Réglages de build :
   - **Framework preset** : `None`
   - **Build command** : `npm ci && node scripts/fetch-built-site.mjs`
     (Cloudflare récupère le site déjà construit par GitHub Actions dans la release `site-latest` : les serveurs de construction de Cloudflare sont bloqués par Statistique Canada)
   - **Build output directory** : `apps/pwa/dist`
   - La version de Node (24) est lue automatiquement dans le fichier `.node-version`.
4. Cliquez sur **Save and Deploy**. Après environ 10 minutes, le site est en ligne à `https://verijob-canada.pages.dev` (ou une adresse proche).

**Variante « Worker »** (si Cloudflare a créé un projet Worker plutôt que Pages) : le fichier `wrangler.jsonc` à la racine est déjà prêt (nom du projet : `verijo`, à adapter). Dans le projet, ouvrez **Settings → Build**, puis réglez la *Build command* (`npm ci && node scripts/fetch-built-site.mjs`) et la *Deploy command* : `npx wrangler deploy`. Activez ensuite l'adresse publique dans **Settings → Domains & Routes → workers.dev → Enable**.

Cloudflare reconstruit le site à chaque `git push`. Pour le **rafraîchissement hebdomadaire des données** :
1. dans Cloudflare, ouvrez le projet, puis **Settings → Builds → Deploy hooks**, créez un hook (nom : `hebdo`, branche : `main`) et copiez son adresse ;
2. sur GitHub, ouvrez **Settings → Secrets and variables → Actions → New repository secret**, avec le nom `CLOUDFLARE_DEPLOY_HOOK` et l'adresse copiée comme valeur.

Le workflow du lundi déclenchera alors aussi la reconstruction Cloudflare. Le fichier `apps/pwa/public/_headers` règle le cache : les mises à jour arrivent vite sur les téléphones.

### Installer l'appli sur un téléphone
Ouvrez l'adresse du site dans Chrome sur Android, puis choisissez **⋮ → Ajouter à l'écran d'accueil**. L'appli fonctionne ensuite hors ligne. Une province déjà consultée reste disponible sans connexion.

---

## 7. Principes (non négociables)

- Jamais de formulation « offre vérifiée », « employeur garanti » ou « offre sûre ». Les tests le vérifient.
- Chaque information affichée a sa source officielle cliquable et sa date.
- Aucune collecte de données, aucun traceur, aucune publicité. Le profil et le suivi restent sur le téléphone.
- Aucune recommandation de consultant ou d'agence en particulier.
- Phrases courtes et exemples concrets.

## 8. Limites connues

- **Listes EIMT** : elles ont 6 à 9 mois de retard et excluent les employeurs portant un nom de personne (donc la plupart des familles qui emploient une aide familiale). Absent ≠ faux ; présent ≠ offre vraie.
- **Agriculture primaire** : le volet mélange le PTAS (Mexique, Caraïbes) et le volet agricole, ouvert à tous.
- **Villes** : environ 22 % des postes ont une situation RMR « inconnue » (localités situées à l'intérieur d'une municipalité plus grande).
- **Québec** : les règles propres au Québec (CAQ, listes provinciales) ne sont pas encore modélisées. L'appli le signale.
- **Détection des arnaques** : elle repose sur des règles et des mots-clés. Une arnaque bien rédigée peut passer : d'où la mention « cela ne garantit pas que l'offre est authentique ».
- **Mesures** : le comportement sur un vrai téléphone Android d'entrée de gamme en 3G reste à mesurer une fois le site en ligne.
