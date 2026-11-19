# Rapport de contrôle des données

> Généré automatiquement par `npm run data` le 2026-11-19. Ne pas modifier à la main.

## 1. Fichiers publiés (`apps/pwa/public/data/`)

| Fichier | Enregistrements | Taille | Taille compressée (gzip) |
|---|---:|---:|---:|
| cma-lookup.json | 5 019 | 103 Ko | 31 Ko |
| employers-index.json | 14 | 28 Ko | 8 Ko |
| employers-AB.json | 11 706 | 1 811 Ko | 359 Ko |
| employers-BC.json | 15 192 | 2 474 Ko | 502 Ko |
| employers-MB.json | 1 520 | 238 Ko | 49 Ko |
| employers-NB.json | 657 | 107 Ko | 25 Ko |
| employers-NL.json | 143 | 26 Ko | 7 Ko |
| employers-NS.json | 878 | 144 Ko | 31 Ko |
| employers-NT.json | 77 | 15 Ko | 4 Ko |
| employers-NU.json | 23 | 6 Ko | 2 Ko |
| employers-ON.json | 22 390 | 3 553 Ko | 720 Ko |
| employers-PE.json | 235 | 41 Ko | 9 Ko |
| employers-QC.json | 15 782 | 2 735 Ko | 562 Ko |
| employers-SK.json | 1 744 | 274 Ko | 55 Ko |
| employers-XX.json | 184 | 44 Ko | 10 Ko |
| employers-YT.json | 73 | 13 Ko | 3 Ko |
| lmia-by-noc.json | 473 | 9 Ko | 3 Ko |
| prospects.json | 12 635 | 2 301 Ko | 466 Ko |
| wages.json | 351 | 15 Ko | 3 Ko |
| designated-employers.json | 2 231 | 720 Ko | 70 Ko |
| community-priorities.json | 76 | 16 Ko | 2 Ko |
| aip-employers.json | 650 | 227 Ko | 27 Ko |
| express-entry.json | 40 | 9 Ko | 1 Ko |
| postings.json | 1 753 | 245 Ko | 37 Ko |
| african-recruiters.json | 7 | 6 Ko | 2 Ko |
| permits-africa.json | 53 | 12 Ko | 3 Ko |
| international-offers.json | 131 | 137 Ko | 21 Ko |
| proposals-status.json | 1 | 0 Ko | 0 Ko |
| current-offers.json | 988 | 553 Ko | 111 Ko |
| regions-status.json | 17 | 3 Ko | 1 Ko |
| events-status.json | 2 | 1 Ko | 1 Ko |
| **Total** | | **15 867 Ko** | **3 128 Ko** |

Chaque fichier contient `{ source, fetchedAt, recordCount, data }`. L'appli ne charge le fichier d'une province que lorsqu'on en a besoin.

## 2. EIMT — listes d'employeurs (EDSC)

| Trimestre | Lignes positives | Postes approuvés | Lignes négatives | Postes refusés | Lignes ignorées |
|---|---:|---:|---:|---:|---:|
| 2024Q3 | 20 590 | 49 121 | 905 | 1 505 | 0 |
| 2024Q4 | 17 745 | 58 653 | 1 984 | 3 615 | 0 |
| 2025Q1 | 17 952 | 51 328 | 2 634 | 3 888 | 0 |
| 2025Q2 | 15 273 | 36 010 | 2 148 | 3 017 | 0 |
| 2025Q3 | 11 278 | 29 818 | 2 061 | 2 912 | 0 |
| 2025Q4 | 9 737 | 47 487 | 2 368 | 3 392 | 0 |
| 2026Q1 | 8 790 | 33 216 | 3 008 | 4 596 | 0 |
| 2026Q2 | 7 340 | 21 511 | 2 242 | 3 626 | 4 |

- Enregistrements (employeur × province × code postal) : **70 604** — employeurs distincts (clé de nom) : **69 654**
- Adresses réparées (apostrophe abîmée « � » à la source) : 0
- Postes approuvés par volet : PA 153 375 · LW 95 954 · HW 70 904 · GTS 5 317 · PR 1 594
  (PA = agriculture primaire, PTAS et volet agricole confondus ; LW = bas salaire ; HW = haut salaire ; GTS = talents mondiaux ; PR = résidence permanente seulement)

### Situation par rapport aux RMR (gel des EIMT bas salaire)

| Situation | Enregistrements | Postes approuvés |
|---|---:|---:|
| Dans une RMR | 50 020 (71 %) | 172 904 (53 %) |
| Hors RMR (municipalité connue) | 12 873 (18 %) | 80 533 (25 %) |
| Inconnue (ville non reconnue) | 7 711 (11 %) | 73 707 (23 %) |

### Métiers TEER 4–5 les plus fréquents (postes approuvés, tous trimestres retenus)

| CNP | Métier | Postes |
|---|---|---:|
| 85101 | Harvesting labourers | 112 730 |
| 85103 | Nursery and greenhouse labourers | 21 510 |
| 85100 | Livestock labourers | 13 439 |
| 94142 | Fish and seafood plant workers | 10 309 |
| 75110 | Construction trades helpers and labourers | 6 183 |
| 65201 | Food counter attendants, kitchen helpers and related support occupations | 5 152 |
| 95106 | Labourers in food and beverage processing | 4 593 |
| 85121 | Landscaping and grounds maintenance labourers | 3 841 |
| 95107 | Labourers in fish and seafood processing | 3 225 |
| 84120 | Specialized livestock workers and farm machinery operators | 3 109 |
| 65310 | Light duty cleaners | 2 486 |
| 94141 | Industrial butchers and meat cutters, poultry preparers and related workers | 1 356 |
| 75101 | Material handlers | 1 229 |
| 94140 | Process control and machine operators, food and beverage processing | 1 189 |
| 75119 | Other trades helpers and labourers | 820 |
| 65211 | Operators and attendants in amusement, recreation and sport | 809 |
| 65100 | Cashiers | 732 |
| 95109 | Other labourers in processing, manufacturing and utilities | 601 |
| 65102 | Store shelf stockers, clerks and order fillers | 570 |
| 64100 | Retail salespersons and visual merchandisers | 487 |

### Aperçu « recruteurs récurrents » (métiers ciblés, EIMT positives sur ≥ 2 trimestres)

10 614 employeurs. Les 20 premiers :

| Employeur | Province | Ville | RMR | Trimestres | Postes | Volets | CNP |
|---|---|---|---|---:|---:|---|---|
| Procyk Farms (1994) Ltd | ON | WILSONVILLE | ? | 8 | 1 551 | PA | 85101 |
| Pure Flavor Farms LP | ON | Leamington | Windsor | 8 | 771 | PA | 85101 |
| Cultures Gen V inc. | QC | Ste-Clotilde | hors RMR | 8 | 734 | LW, PA | 85121, 85101 |
| Brookdale Treeland Nurseries | ON | Schomberg | ? | 8 | 713 | PA | 85103 |
| Aliments Nortera Inc. | QC | Brossard | Montréal | 8 | 685 | LW | 75101, 94140, 95106 |
| Olymel S.E.C/L.P | QC | Boucherville | Montréal | 8 | 669 | LW, PA | 75101, 94141, 95106, 84120, 94140 |
| Les Jardins Vegibec inc. | QC | Oka | Montréal | 8 | 638 | PA, HW | 85101, 73300, 84120 |
| Algoma Orchards Corp. | ON | Newcastle | ? | 8 | 598 | PA | 85101 |
| Nature Fresh Farms Inc. | ON | Leamington | Windsor | 8 | 585 | PA | 85101 |
| Great Lakes Greenhouses Inc. | ON | Leamington | Windsor | 8 | 441 | PA | 85101 |
| Verger Caron Inc. | QC | Frelighsburg | hors RMR | 8 | 389 | PA | 85101, 85100 |
| Les Productions Horticoles Demers inc | QC | Lévis | Québec | 8 | 388 | PA, LW | 85101, 75119, 84120 |
| Mucci Pac Ltd. | ON | Kingsville | Windsor | 8 | 372 | PA | 85101 |
| Jardins FMS Daigneault Inc. | QC | Saint-Patrice-De-Sherrington | hors RMR | 8 | 369 | PA | 85101 |
| 1454410 Ontario Inc | ON | Kingsville | Windsor | 8 | 368 | PA | 85101 |
| Les Fines Herbes de Chez Nous Inc. | QC | St-Mathieu-de-Beloeil | Montréal | 8 | 340 | PA | 85101 |
| Biscuits Leclerc Ltée | QC | St-Augustin-de-Desmaure | ? | 8 | 304 | HW, LW | 94140, 95106 |
| Mucci Farms | ON | Kingsville | Windsor | 8 | 302 | PA | 85101 |
| 1454411 Ontario Inc | ON | Staples | ? | 8 | 300 | PA | 85101 |
| SOUTHSHORE GREENHOUSES INC. | ON | KINGSVILLE | Windsor | 8 | 231 | PA | 85101 |

## 3. Municipalités → RMR (Statistique Canada, Recensement 2021)

- Municipalités (SDR) : 5 161 — dans une RMR : 556 — hors RMR : 4 452 — noms ambigus : 11
- RMR de `rules.json` retrouvées dans le tableau officiel : 41 / 41

## 4. Salaires Job Bank (2026)

- 36 métiers ciblés couverts, 351 valeurs (Canada + provinces).

## 5. Employeurs désignés FCIP / RCIP (relevés manuels)

| Communauté | Programme | Employeurs | « Ne recrute pas » | Retirés du programme | Relevé le |
|---|---|---:|---:|---:|---|
| Sudbury | RCIP | 350 | 3 | 0 | 2026-10-13 |
| Sudbury | FCIP | 95 | 1 | 0 | 2026-10-13 |
| Sault Ste. Marie | RCIP | 158 | 11 | 0 | 2026-10-13 |
| Altona/Rhineland | RCIP | 23 | 1 | 0 | 2026-10-13 |
| Claresholm | RCIP | 23 | 19 | 0 | 2026-10-13 |
| Brandon | RCIP | 41 | 7 | 0 | 2026-10-13 |
| West Kootenay | RCIP | 299 | 0 | 3 | 2026-10-13 |
| Péninsule acadienne | FCIP | 37 | 4 | 0 | 2026-10-13 |
| Timmins | RCIP | 150 | 26 | 0 | 2026-10-13 |
| Timmins | FCIP | 26 | 3 | 0 | 2026-10-13 |
| Moose Jaw | RCIP | 133 | 0 | 0 | 2026-10-13 |
| Peace Liard | RCIP | 280 | 0 | 0 | 2026-10-13 |
| Thunder Bay | RCIP | 494 | 84 | 0 | 2026-11-02 |
| Pictou County | RCIP | 59 | 55 | 0 | 2026-11-02 |
| Steinbach | RCIP | 47 | 0 | 0 | 2026-11-02 |
| Superior East | FCIP | 16 | 1 | 0 | 2026-11-02 |

- Programme d'immigration au Canada atlantique : 650 employeurs désignés (relevé du 2026-11-02)
- Métiers prioritaires relevés : 76
- Communautés sans relevé pour l'instant (4) : North Bay, North Okanagan Shuswap, St-Pierre-Jolys, Kelowna

## 6. Entrée express — rondes d'invitations (IRCC)

- 40 rondes gardées, la plus récente le 2026-10-28.

## 7. Offres du Guichet-Emplois (données ouvertes, mensuelles)

- Mois 2026-10 : 59 130 offres au total, 22 616 pour les métiers suivis, 1 753 gardées en détail (les plus récentes par métier et province).

## 8. Recrutement en Afrique

- Preuves relevées à la main (`data/manual/recrutement-afrique.csv`) : 7 preuves, 7 employeurs.
- Permis de travail par pays de citoyenneté (IRCC) : 53 pays d'Afrique, jusqu'à 2026-09.

## 9. Offres ouvertes aux candidats de l'étranger (API Adzuna, tri VériJob)

- 58 requêtes, 920 annonces lues, **131 ouvertes à l'international**, 60 écartées (Canada exigé).

## 10. Offres actuelles avec lien direct (API Adzuna)

- 75 requêtes, 2 338 annonces lues, **988 gardées** (titre conforme au métier).

## 11. Règles en préparation

- 1 page(s) vérifiée(s). Aucune page modifiée.

## 12. Régions (Kenora, pilotes PICR / PICRF, Québec en région)

- Offres des villes en région (API Adzuna) : version publiée gardée (données du 2026-11-16, 2 211 offres).
- Sources contrôlées : 17. **⚠ Liste ou page changée : Thunder Bay, Pictou County, Steinbach, ontario-oinp-owp — relever la nouvelle liste (data/manual/designated-employers.csv) ou relire la page, puis mettre à jour rules.json.**

## 13. Salons de recrutement

- Tirages de l'Alberta : 40, le plus récent le 2026-11-02.

- 2 salon(s) vérifié(s). Inscriptions ouvertes : destination-canada.
