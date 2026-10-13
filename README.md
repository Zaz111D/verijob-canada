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
```
