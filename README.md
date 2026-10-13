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
| **Offre** | Collez un message : l'appli liste les signaux d'alerte (frais demandés, visa « garanti », Western Union, faux e-mail gouvernemental, PTAS proposé à un Africain…), avec une explication simple et la source officielle de chacun. Elle ne dit jamais « offre sûre ». |
| **Employeur** | Recherche tolérante aux fautes dans les listes officielles d'EIMT positives et refusées (8 derniers trimestres) et dans les employeurs désignés des pilotes PICR/PICRF. |
| **Emplois** | Lien vers les offres du Guichet-Emplois ouvertes aux candidats étrangers, mots-clés à copier, villes où les EIMT bas salaire sont gelées, et évaluation d'un poste trouvé. |
| **Démarcher** | Employeurs qui obtiennent des EIMT pour vos métiers trimestre après trimestre, et employeurs désignés. Export CSV, modèle de message de candidature FR/EN, bouton « Suivre ». |
| **Suivi** | Vos candidatures : statut, relances, notes, export et import (sauvegarde JSON). |
| **Mon profil** | Pays, niveaux de langue, métiers, provinces. Affiche les voies d'immigration possibles (probable, possible, bloquée, à préciser), toujours avec les raisons et les sources. |
| **Consultant** | Guide pour vérifier un consultant dans le registre officiel du CICC (accessible depuis l'accueil et le pied de page). |
| **Ce qui a changé** | État des programmes, prochaines dates (nouvelle liste des RMR…), historique des changements, fraîcheur des données (accessible depuis l'accueil et le pied de page). |

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

Règles d'accès respectées :
- **Job Bank n'est jamais lu automatiquement**, car ses conditions d'utilisation l'interdisent. L'appli ne fait que des liens.
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

### Employeurs désignés PICR/PICRF
Ajoutez ou corrigez des lignes dans `data/manual/designated-employers.csv`. Colonnes :

`community, program (RCIP|FCIP), employer, sector, nocs, hiring (recrute|ne-recrute-pas|inconnu|retire), address, source_url, recorded_at, notes`

Le pipeline refuse un fichier invalide et signale les relevés de plus de 90 jours. Huit communautés restent à relever à la main : leurs sites bloquent les robots (voir `docs/sources.md`, §13).

### Liens Job Bank pré-filtrés (optionnel)
Seul le filtre « candidats étrangers » (`fglo=1`) est confirmé. Pour avoir des liens filtrés par métier et province :
1. faites une recherche à la main sur jobbank.gc.ca (mot-clé, province, offres pour candidats étrangers) ;
2. copiez l'adresse obtenue dans `data/rules.json` → `jobBank.searchTemplate`, en remplaçant le mot-clé par `{keyword}` et la province par `{province}`.

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
   - **Build command** : `npm ci && npm run data && npm run build -w @verijob/pwa`
   - **Build output directory** : `apps/pwa/dist`
   - La version de Node (24) est lue automatiquement dans le fichier `.node-version`.
4. Cliquez sur **Save and Deploy**. Après environ 10 minutes, le site est en ligne à `https://verijob-canada.pages.dev` (ou une adresse proche).

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
