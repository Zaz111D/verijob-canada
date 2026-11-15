# VériJob Canada — dossier de présentation pour analyse

> Document destiné à être lu par d'autres personnes ou d'autres IA, pour une analyse critique du programme.
> État au **15 novembre 2026** (version en ligne `576099e`). Site : https://verijo.martinyamel14.workers.dev
> Code : dépôt GitHub `Zaz111D/verijob-canada` (TypeScript). Langues de l'appli : français (par défaut) et anglais.

---

## 1. En une phrase

Une application web gratuite (PWA, sans serveur ni compte) qui aide les personnes **en Afrique, francophones et anglophones**, à chercher un emploi au Canada **elles-mêmes, à distance et sans intermédiaire payant** : repérer les vraies offres ouvertes aux candidats de l'étranger, comprendre quelle voie d'immigration est réaliste, contacter directement les employeurs, et éviter les arnaques.

## 2. Le problème visé

- La recherche d'emploi au Canada depuis l'étranger est opaque : la plupart des offres en ligne exigent d'être déjà au Canada, et les candidats ne savent pas lesquelles sont vraiment accessibles.
- Beaucoup paient des « agences » ou « consultants » pour une démarche qu'ils peuvent faire seuls. Selon IRCC, **un représentant n'est pas nécessaire** : tous les demandeurs sont traités de la même manière, et tous les formulaires sont gratuits.
- Les arnaques sont nombreuses : frais de recrutement, « visa garanti », entretiens sur WhatsApp, faux courriels gouvernementaux.
- Les règles changent souvent : gel des EIMT bas salaire dans certaines villes, nouveaux programmes régionaux, quotas.

**Objectif déclaré** : faciliter et démystifier la recherche d'emploi. Le programme n'est pas réservé aux agences : tout le monde peut le faire à distance.

## 3. Public

- Personnes qui vivent **hors du Canada**, surtout en Afrique francophone (Cameroun, Côte d'Ivoire, Sénégal…), souvent sur téléphone Android avec une connexion limitée.
- Métiers surtout sans diplôme universitaire (TEER 3 à 5 de la CNP 2021) : agent·e de sécurité, aide de cuisine, préposé·e aux bénéficiaires, couturier·ère, manutentionnaire, soudeur·euse, chauffeur·euse… Les **516 métiers** de la classification officielle sont acceptés.
- Plusieurs profils par téléphone (la personne, son ou sa conjoint·e, un proche).

## 4. Principes de conception (non négociables)

1. **Sources officielles datées** : chaque règle d'immigration vient de `data/rules.json`, avec l'URL officielle, la date de vérification et la date de prochaine révision. Une règle périmée est signalée dans l'appli, et un contrôle automatique échoue sur GitHub.
2. **Aucune donnée personnelle envoyée** : profils, CV et suivi restent sur l'appareil (IndexedDB). Pas de compte, pas de traceur, pas de publicité.
3. **Respect des conditions d'utilisation** : le Guichet-Emplois, LinkedIn, Facebook, Indeed et X ne sont **jamais** lus automatiquement (liens pré-remplis seulement). Les sites protégés contre les robots (CNESST, gnb.ca, yukon.ca, adzuna.ca) ne sont jamais contournés.
4. **Jamais d'information inventée** : aucune adresse e-mail devinée, aucun « score magique ». Une estimation est présentée comme telle (« probable », « possible », « à préciser »).
5. **Honnêteté sur les preuves** : une offre n'est présentée comme « ouverte à l'étranger » que si l'annonce le dit, et la phrase est citée.
6. **Gratuit et léger** : hébergement gratuit (Cloudflare et GitHub Pages), fonctionnement hors ligne, coût 0 FCFA.

## 5. Fonctions (onglets)

| Onglet | Ce qu'il fait |
|---|---|
| **Accueil** | Cartes vers chaque fonction. |
| **Offre** | Analyse anti-arnaque d'une annonce collée : frais demandés, visa garanti, Western Union, faux e-mail gouvernemental, PTAS proposé à un Africain, entretien sur WhatsApp, « qui publie ? » (compare les adresses et sites cités au nom de l'entreprise). |
| **Où postuler** | Plateformes officielles du profil, employeurs classés par force de la preuve qu'ils recrutent à l'étranger, coordonnées relevées sur les sites officiels. Bouton « Appeler / écrire » : heures d'appel converties à l'heure locale, script d'appel qui répond à l'objection « l'immigration c'est compliqué », e-mail prêt. PDF « M'embaucher sans EIMT » pour l'employeur. Recherches prêtes sur les réseaux sociaux. |
| **Tracker** | Offres qui annoncent ouvertement recruter à l'étranger, tous métiers, mises à jour le lundi et le jeudi ; historique de 60 jours ; statut personnel par offre (intéressé·e, postulé → Suivi, écartée). Guide « Postuler soi-même, à distance — sans agence ». Section « Recruteurs en Afrique » : voies officielles et agences privées « permis à vérifier ». |
| **Régions** | 65 villes et régions qui peinent à recruter et ont un programme officiel : pilotes fédéraux rural et francophone (PICR / PICRF), programme REDI de l'Ontario (Kenora…), 31 communautés rurales de l'Alberta, Canada atlantique, Yukon, Territoires du Nord-Ouest, régions du Québec. Offres de tous métiers, employeurs désignés (≈ 2 900 relevés sur les listes officielles), badges « EIMT bas salaire possible / gelée » et « Mobilité francophone possible ». |
| **Emplois** | Évaluation des voies d'immigration par métier et province ; offres des métiers du profil (par défaut : seulement celles qui acceptent l'étranger). |
| **Démarcher** | Employeurs qui obtiennent des EIMT trimestre après trimestre pour les métiers du profil (listes officielles d'EDSC), modèles de message. |
| **Suivi** | Candidatures : statuts, relances, provenance, copie de l'annonce, export et import. |
| **Mon profil** | Langues (NCLC/CLB), expérience, métiers, provinces, études en français ; plusieurs profils. **Analyser mon CV** (lu sur l'appareil, sans IA) : métiers reconnus parmi les 516 de la CNP avec la ligne du CV qui le prouve, durées, diplôme, langues, permis et certificats (ce qu'ils valent au Canada) → ajout au profil en un clic ; offres de la semaine pour ces métiers (preuve de recrutement à l'étranger d'abord) ; métiers passerelles accessibles où des employeurs ont réellement obtenu des EIMT ; points à corriger au format canadien. |
| **CV** | Vérificateur de CV au format canadien (lu sur l'appareil) et CV d'exemple par métier, construit à partir des fonctions officielles de la CNP 2021, à télécharger en Word. |
| **Veille** | État des programmes, invitations Entrée express, actualités IRCC en direct, tirages de l'Alberta, alertes des salons (par exemple Destination Canada : inscriptions ouvertes, Tunis les 10 et 11 décembre 2026), règles en préparation. |

## 6. Logique d'immigration (moteur `packages/core`)

`evaluatePathways(profil, emploi)` renvoie, pour chaque voie, un statut (probable / possible / inconnue / bloquée), les raisons en langage simple et les sources officielles :

- **EIMT bas salaire** : gel dans les RMR où le chômage est d'au moins 6 % (liste valable jusqu'au 7 janvier 2027), exemptions estimées selon le métier, mesures rurales.
- **EIMT volet agricole, PTAS** (le PTAS est réservé au Mexique et aux Caraïbes : signalé comme arnaque s'il est proposé à un Africain).
- **Mobilité francophone** (code C16) : hors Québec, sans EIMT, avec une preuve de français NCLC 5 à l'oral. C'est souvent la voie la plus directe pour le public visé.
- **Pilotes communautaires PICR / PICRF** : employeur désigné, langue selon le TEER, 1 an d'expérience.
- **Ontario REDI** (volet Ontario Workforce Priority) : TEER 0-3 avec CLB 6, diplôme et 2 ans d'expérience ; TEER 4-5 avec 9 mois chez l'employeur, donc un permis de travail d'abord.
- **Projets pilotes des aides familiaux** (fermés aux nouvelles demandes au moment de la vérification).
- Classement « test de langue obligatoire ou non » pour chaque voie.

Le Québec a son propre parcours (EIMT + CAQ, Arrima, PSTQ). La Mobilité francophone ne s'y applique pas.

## 7. Données et mise à jour

Un pipeline (`npm run data`, GitHub Actions) télécharge, vérifie et publie des fichiers JSON statiques :

- **Données ouvertes officielles** : EIMT positives et refusées par employeur (EDSC, 8 trimestres), municipalités et RMR (Statistique Canada), salaires du Guichet-Emplois, statistiques mensuelles d'offres, permis par pays de citoyenneté (IRCC), rondes d'Entrée express.
- **Annonces d'emploi** : API officielle d'Adzuna (accès gratuit, 250 appels par jour). Chaque **lundi** (tout) et **jeudi** (tracker seulement) :
  - expressions exactes qui signalent un recrutement à l'étranger ;
  - offres par métier ;
  - offres par ville en région (86 villes, rayon de 30 km).
- **Relevés manuels sourcés** (`data/manual/*.csv`, URL et date par ligne) : employeurs désignés des communautés, employeurs désignés de Terre-Neuve-et-Labrador, coordonnées d'employeurs, preuves de recrutement en Afrique.
- **Contrôles hebdomadaires automatiques** : pages de coordonnées (le numéro est-il toujours affiché ?), nouvelles listes d'employeurs désignés (nouveau PDF repéré), pages de l'Ontario (date « Updated »), ouverture des inscriptions aux salons, tirages de l'Alberta.
- **Mise en ligne** : GitHub Actions construit le site et le publie dans une release ; Cloudflare le reprend. Depuis le 13 novembre 2026, la mise à jour planifiée enregistre un commit qui déclenche Cloudflare (avant, les données du lundi n'arrivaient en ligne qu'au prochain envoi de code). Une version publiée de plus de 7 jours est rafraîchie dès l'envoi de code suivant.

## 8. Tri des offres « ouvertes à l'étranger » (point le plus sensible)

L'API ne renvoie que le début de chaque annonce. Le tri (`classifyInternational`) relit le titre et l'extrait :

- **Preuve** : il faut une phrase positive, par exemple « LMIA approved », « visa sponsorship available », « will sponsor », « open to international applicants », « Mobilité francophone », « poste avec EIMT », ou une annonce publiée pour une demande d'EIMT. **Le mot « EIMT » seul ne suffit pas** : correction du 15 novembre 2026, après « Nous ne réalisons pas de EIMT » classé à tort comme preuve.
- **Refus**, l'offre est écartée partout :
  - « citoyens ou résidents permanents seulement », « must be currently authorized to work in Canada », « valid work permit required » ;
  - « no sponsorship », « No International Sponsorship Available », « ne réalisons pas d'EIMT » ;
  - visas américains (TN, EB-3, H-1B).
- **Non vérifiable** : Adzuna a trouvé « LMIA » dans l'annonce complète, mais la phrase n'est pas visible. Ces offres sont gardées seulement si l'employeur figure dans les listes officielles d'EIMT, et masquées par défaut.
- **Audit du 15 novembre 2026** : sur 60 offres présentées comme internationales, 8 le disaient vraiment, 27 disaient l'inverse ou étaient hors sujet, et 25 n'étaient pas vérifiables. Le tri a été resserré en conséquence.
- **Métier de l'offre** : reconnu parmi les 516 métiers (exemples illustratifs officiels de Statistique Canada en français et en anglais, plus des sigles comme 310T, AZ ou RN). 105 offres sur 118 classées lors d'un essai.

## 9. Recruteurs, agences et frais

- **Règle affichée partout** (EDSC, modifications de 2022) : l'employeur ne peut ni faire payer de frais de recrutement ou d'EIMT au travailleur, ni laisser un recruteur le faire. Seuls les frais du gouvernement (visa, permis) sont à la charge du candidat.
- **Voies officielles** mises en avant : Destination Canada (IRCC), stratégie du Nouveau-Brunswick pour l'Afrique francophone 2025-2030, Destination Manitoba.
- **Agences privées** : listées seulement si leur site publie un numéro de permis et une activité en Afrique. Elles sont marquées « permis à vérifier », avec le lien du registre officiel (CNESST, Colombie-Britannique, Saskatchewan, Manitoba, Nouvelle-Écosse), parce que le programme ne peut pas confirmer lui-même le permis. Ce n'est pas une recommandation.

## 10. Architecture technique

- **Monorepo TypeScript** :
  - `packages/core` : moteurs anti-arnaque, faisabilité, CV, tri international, régions, sans DOM ;
  - `apps/pwa` : Preact, Vite, vite-plugin-pwa (hors ligne, mise à jour automatique) ;
  - `scripts` : pipeline de données (tsx).
- **Bibliothèques** : idb-keyval (stockage local), jsPDF et pdfjs-dist (PDF générés et lus sur l'appareil), fflate.
- **Tests** : environ 320 tests (Vitest) sur le moteur, les règles, le pipeline et le tri. Typage strict. Les tests et le typage tournent à chaque construction.
- **Données publiées** : environ 40 fichiers JSON, chargés à la demande et mis en cache hors ligne.

## 11. Limites connues

1. **Peu d'offres « vraiment ouvertes à l'étranger »** : après le tri strict, on en compte une dizaine par semaine. Les employeurs l'écrivent rarement. La Mobilité francophone permet pourtant à beaucoup d'employeurs hors Québec d'embaucher sans EIMT, sans qu'ils le mentionnent.
2. **Extrait d'annonce seulement** (API Adzuna) : la page complète d'Adzuna est protégée par un CAPTCHA et n'est pas lue. Certaines preuves ou certains refus situés plus loin dans l'annonce ne sont pas vus.
3. **Le Guichet-Emplois**, source officielle n°1 (filtre « candidats étrangers »), est accessible par liens seulement : ses conditions interdisent la lecture automatique.
4. **Sites gouvernementaux protégés contre les robots** (CNESST, Nouveau-Brunswick, Yukon) : pas de vérification automatique des permis d'agence ni d'alertes du Nouveau-Brunswick.
5. **Relevés manuels** (employeurs désignés, coordonnées) : ils vieillissent. Les changements sont détectés chaque semaine, mais le nouveau relevé reste manuel.
6. **Reconnaissance du métier par mots-clés** : quelques erreurs possibles sur des titres vagues.
7. **Mise à jour automatique** : le correctif de mise en ligne du 13 novembre doit encore être confirmé par la mise à jour du 16 novembre.
8. **Ce n'est pas un avis juridique** : l'appli renvoie toujours aux pages officielles.

## 12. Questions pour l'analyse

1. Le tri « preuve / non vérifiable / refus » est-il le bon compromis entre trop d'offres trompeuses et trop peu d'offres ? Quelles formulations réelles d'annonces pourraient le tromper ?
2. Quelles **autres sources légales et gratuites** d'offres réellement ouvertes aux candidats de l'étranger pourrait-on utiliser (API officielles, flux autorisés) ?
3. L'évaluation des voies d'immigration (section 6) contient-elle des erreurs ou des oublis importants pour un candidat africain en 2026 ?
4. Le parcours « postuler soi-même, à distance » est-il complet et compréhensible pour une personne peu habituée aux démarches en ligne ?
5. Les mises en garde anti-arnaque couvrent-elles les arnaques actuelles, par exemple sur TikTok ou Telegram, ou les fausses « offres d'EIMT » ?
6. L'interface (11 onglets, téléphone, connexion limitée) est-elle trop chargée ? Que simplifier en premier ?
7. Y a-t-il des risques juridiques ou éthiques : présentation d'agences privées, usage des données publiques, mentions « non vérifiable » ?
8. Comment mesurer l'utilité réelle (candidatures envoyées, réponses obtenues) sans collecter de données personnelles ?

---

*Documents détaillés dans le dépôt : `README.md` (fonctions et installation), `docs/sources.md` (chaque source officielle, décision et vérification, datées), `docs/data-report.md` (rapport de la dernière mise à jour des données), `data/rules.json` (toutes les règles avec leurs sources).*
