# VériJob Canada (nom provisoire)

PWA gratuite et sans serveur qui aide les candidats africains, francophones et anglophones, à :
1. **ne pas se faire arnaquer** ;
2. trouver des emplois **réellement accessibles depuis l'étranger**, avec une estimation honnête de la voie d'immigration ;
3. cibler les employeurs qui recrutent vraiment à l'international.

> Outil d'information gratuit, non affilié au gouvernement du Canada. Ce n'est pas un avis juridique. Vérifiez toujours sur canada.ca.

## Structure

```
data/rules.json        règles d'immigration versionnées (source officielle + dates pour chaque règle)
data/noc.json          métiers CNP 2021 ciblés (titres officiels, mots-clés, secteur probable)
data/manual/           fichiers curés à la main (employeurs désignés FCIP/RCIP…)
packages/core          moteur anti-arnaque + moteur de faisabilité (TypeScript, sans DOM)
apps/pwa               PWA Preact (profil, vérificateurs, bilingue, hors ligne)
scripts/               pipeline de données (Phase 2) + contrôle des règles
docs/sources.md        rapport de vérification des sources (Phase 0)
```

## Tester en local

```bash
npm install
npm run data             # 1re fois : prépare les données (≈ 6 min)
npm run dev -w @verijob/pwa   # appli sur http://localhost:5173
npm test                 # tests unitaires (moteur, pipeline, textes de l'appli)
npm run typecheck        # vérification TypeScript
npm run check:rules      # signale les règles dont la date de révision est dépassée
npm run data             # pipeline : télécharge et prépare les données (≈ 6 min la 1re fois)
```

## Données

`npm run data` produit les fichiers JSON utilisés hors ligne par la PWA dans `apps/pwa/public/data/`, ainsi que le rapport de contrôle [docs/data-report.md](docs/data-report.md).

| Fichier | Contenu | Source |
|---|---|---|
| `employers-index.json`, `employers-<PROV>.json` | Employeurs ayant reçu une EIMT positive ou négative (8 derniers trimestres), un fichier par province | EDSC, open.canada.ca |
| `cma-lookup.json` | Municipalité → RMR (gel des EIMT bas salaire) | Statistique Canada, Recensement 2021 |
| `prospects.json` | Recruteurs récurrents : EIMT positives sur ≥ 2 trimestres pour les métiers ciblés (liste de démarchage) | EDSC, open.canada.ca |
| `wages.json` | Salaires bas / médian / haut des métiers ciblés | Salaires Job Bank, open.canada.ca |
| `designated-employers.json`, `community-priorities.json` | Employeurs désignés et métiers prioritaires PICR/PICRF | Relevés manuels : `data/manual/*.csv` |

- Les téléchargements sont polis : user-agent identifiable et pause de 20 s entre deux requêtes vers open.canada.ca (`Crawl-delay`). Ils sont mis en cache dans `data/raw/`.
- **Job Bank n'est jamais lu automatiquement**, car ses conditions d'utilisation l'interdisent.
- Les employeurs désignés sont **relevés à la main** dans `data/manual/designated-employers.csv`. Chaque ligne indique sa source et la date du relevé. Le pipeline refuse un fichier invalide.

## L'application (PWA)

- **Pages** : Accueil, Analyser une offre, Vérifier un employeur, Emplois (radar Job Bank en mode liens + évaluation d'un poste trouvé), Démarcher (employeurs à contacter + modèles de message + export CSV), Mon profil (voies d'immigration estimées), Vérifier un consultant et Ce qui a changé (veille réglementaire) depuis l'accueil et le pied de page.
- **Bilingue** : français par défaut, bouton « English » en haut à droite (choix mémorisé sur l'appareil).
- **Vie privée** : le profil est stocké uniquement sur le téléphone (IndexedDB). Aucun tracker, aucune publicité, aucune donnée envoyée.
- **Hors ligne** : l'appli et les petits fichiers de données sont mis en cache à l'installation. La liste d'employeurs d'une province reste disponible hors ligne après sa première consultation.
- **Version de production** : `npm run build -w @verijob/pwa`, puis `npm run preview -w @verijob/pwa` (http://localhost:4173). Le service worker n'est actif qu'en production.
- **Icônes** : `node scripts/make-icons.mjs`.

## Radar Job Bank : activer les liens pré-filtrés

Les conditions d'utilisation de Job Bank interdisent tout accès automatisé. VériJob ne fait donc **que des liens**. Seul le filtre « candidats étrangers » (`fglo=1`) est confirmé.

Pour activer des liens filtrés par métier et province :
1. sur jobbank.gc.ca, faites une recherche à la main (mot-clé, province, offres pour candidats étrangers) ;
2. copiez l'adresse obtenue dans `data/rules.json` → `jobBank.searchTemplate`, en remplaçant le mot-clé par `{keyword}` et la province par `{province}`.
