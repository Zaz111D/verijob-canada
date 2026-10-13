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
apps/pwa               interface (Phase 3)
scripts/               pipeline de données (Phase 2) + contrôle des règles
docs/sources.md        rapport de vérification des sources (Phase 0)
```

## Tester en local

```bash
npm install
npm test                 # tests unitaires du moteur
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
| `wages.json` | Salaires bas / médian / haut des métiers ciblés | Salaires Job Bank, open.canada.ca |
| `designated-employers.json`, `community-priorities.json` | Employeurs désignés et métiers prioritaires PICR/PICRF | Relevés manuels : `data/manual/*.csv` |

- Les téléchargements sont polis : user-agent identifiable et pause de 20 s entre deux requêtes vers open.canada.ca (`Crawl-delay`). Ils sont mis en cache dans `data/raw/`.
- **Job Bank n'est jamais lu automatiquement**, car ses conditions d'utilisation l'interdisent.
- Les employeurs désignés sont **relevés à la main** dans `data/manual/designated-employers.csv`. Chaque ligne indique sa source et la date du relevé. Le pipeline refuse un fichier invalide.
