# Rapport de contrôle des données

> Généré automatiquement par `npm run data` le 2026-10-13. Ne pas modifier à la main.

## 1. Fichiers publiés (`apps/pwa/public/data/`)

| Fichier | Enregistrements | Taille | Taille compressée (gzip) |
|---|---:|---:|---:|
| cma-lookup.json | 5 019 | 103 Ko | 31 Ko |
| employers-index.json | 14 | 28 Ko | 8 Ko |
| employers-AB.json | 13 635 | 2 140 Ko | 417 Ko |
| employers-BC.json | 16 323 | 2 674 Ko | 540 Ko |
| employers-MB.json | 1 823 | 287 Ko | 58 Ko |
| employers-NB.json | 704 | 115 Ko | 27 Ko |
| employers-NL.json | 174 | 31 Ko | 8 Ko |
| employers-NS.json | 987 | 162 Ko | 35 Ko |
| employers-NT.json | 89 | 16 Ko | 4 Ko |
| employers-NU.json | 23 | 6 Ko | 2 Ko |
| employers-ON.json | 24 104 | 3 841 Ko | 772 Ko |
| employers-PE.json | 243 | 43 Ko | 10 Ko |
| employers-QC.json | 17 106 | 2 968 Ko | 609 Ko |
| employers-SK.json | 1 998 | 316 Ko | 63 Ko |
| employers-XX.json | 206 | 49 Ko | 11 Ko |
| employers-YT.json | 69 | 13 Ko | 3 Ko |
| wages.json | 191 | 9 Ko | 2 Ko |
| designated-employers.json | 1 615 | 516 Ko | 48 Ko |
| community-priorities.json | 76 | 16 Ko | 2 Ko |
| **Total** | | **13 333 Ko** | **2 650 Ko** |

Chaque fichier contient `{ source, fetchedAt, recordCount, data }`. L'appli ne charge le fichier d'une province que lorsqu'on en a besoin.

## 2. EIMT — listes d'employeurs (EDSC)

| Trimestre | Lignes positives | Postes approuvés | Lignes négatives | Postes refusés | Lignes ignorées |
|---|---:|---:|---:|---:|---:|
| 2024Q2 | 23 350 | 52 947 | 903 | 1 424 | 1 |
| 2024Q3 | 20 590 | 49 121 | 905 | 1 505 | 0 |
| 2024Q4 | 17 745 | 58 653 | 1 984 | 3 615 | 0 |
| 2025Q1 | 17 952 | 51 328 | 2 634 | 3 888 | 0 |
| 2025Q2 | 15 273 | 36 010 | 2 148 | 3 017 | 0 |
| 2025Q3 | 11 278 | 29 818 | 2 061 | 2 912 | 0 |
| 2025Q4 | 9 737 | 47 487 | 2 368 | 3 392 | 0 |
| 2026Q1 | 8 790 | 33 216 | 3 008 | 4 596 | 0 |

- Enregistrements (employeur × province × code postal) : **77 484** — employeurs distincts (clé de nom) : **76 426**
- Adresses réparées (apostrophe abîmée « � » à la source) : 0
- Postes approuvés par volet : PA 156 143 · LW 115 491 · HW 78 946 · GTS 5 731 · PR 2 269
  (PA = agriculture primaire, PTAS et volet agricole confondus ; LW = bas salaire ; HW = haut salaire ; GTS = talents mondiaux ; PR = résidence permanente seulement)

### Situation par rapport aux RMR (gel des EIMT bas salaire)

| Situation | Enregistrements | Postes approuvés |
|---|---:|---:|
| Dans une RMR | 55 611 (72 %) | 194 991 (54 %) |
| Hors RMR (municipalité connue) | 13 568 (18 %) | 85 611 (24 %) |
| Inconnue (ville non reconnue) | 8 305 (11 %) | 77 978 (22 %) |

### Métiers TEER 4–5 les plus fréquents (postes approuvés, tous trimestres retenus)

| CNP | Métier | Postes |
|---|---|---:|
| 85101 | Harvesting labourers | 114 408 |
| 85103 | Nursery and greenhouse labourers | 22 073 |
| 85100 | Livestock labourers | 13 726 |
| 94142 | Fish and seafood plant workers | 10 269 |
| 65201 | Food counter attendants, kitchen helpers and related support occupations | 8 051 |
| 75110 | Construction trades helpers and labourers | 7 879 |
| 95106 | Labourers in food and beverage processing | 4 838 |
| 85121 | Landscaping and grounds maintenance labourers | 4 021 |
| 84120 | Specialized livestock workers and farm machinery operators | 3 264 |
| 65310 | Light duty cleaners | 3 260 |
| 95107 | Labourers in fish and seafood processing | 3 216 |
| 94141 | Industrial butchers and meat cutters, poultry preparers and related workers | 1 645 |
| 75101 | Material handlers | 1 621 |
| 94140 | Process control and machine operators, food and beverage processing | 1 205 |
| 65100 | Cashiers | 1 137 |
| 75119 | Other trades helpers and labourers | 1 010 |
| 95109 | Other labourers in processing, manufacturing and utilities | 847 |
| 65211 | Operators and attendants in amusement, recreation and sport | 810 |
| 64100 | Retail salespersons and visual merchandisers | 704 |
| 65102 | Store shelf stockers, clerks and order fillers | 702 |

### Aperçu « recruteurs récurrents » (métiers ciblés, EIMT positives sur ≥ 2 trimestres)

6 532 employeurs. Les 20 premiers :

| Employeur | Province | Ville | RMR | Trimestres | Postes | Volets | CNP |
|---|---|---|---|---:|---:|---|---|
| Procyk Farms (1994) Ltd | ON | WILSONVILLE | ? | 8 | 1 546 | PA | 85101 |
| S SUNDHER ORCHARDS LTD. | BC | Kelowna | Kelowna | 8 | 973 | PA | 85101 |
| Cultures Gen V inc. | QC | Ste-Clotilde | hors RMR | 8 | 757 | LW, PA | 85121, 85101, 85103 |
| Pure Flavor Farms LP | ON | Leamington | Windsor | 8 | 737 | PA | 85101 |
| Brookdale Treeland Nurseries | ON | Schomberg | ? | 8 | 728 | PA | 85103 |
| Aliments Nortera Inc. | QC | Brossard | Montréal | 8 | 634 | LW | 75101, 94140, 95106 |
| Algoma Orchards Corp. | ON | Newcastle | ? | 8 | 573 | PA | 85101 |
| Nature Fresh Farms Inc. | ON | Leamington | Windsor | 8 | 530 | PA | 85101 |
| Great Lakes Greenhouses Inc. | ON | Leamington | Windsor | 8 | 496 | PA | 85101 |
| Verger Caron Inc. | QC | Frelighsburg | hors RMR | 8 | 434 | PA | 85101, 85100 |
| Les Productions Horticoles Demers inc | QC | Lévis | Québec | 8 | 397 | PA, LW | 85101, 75119, 84120 |
| 1454410 Ontario Inc | ON | Kingsville | Windsor | 8 | 369 | PA | 85101 |
| Les Fines Herbes de Chez Nous Inc. | QC | St-Mathieu-de-Beloeil | Montréal | 8 | 367 | PA | 85101 |
| Jardins FMS Daigneault Inc. | QC | Saint-Patrice-De-Sherrington | hors RMR | 8 | 362 | PA | 85100, 85101 |
| Monette Farms Ltd. | SK | Swift Current | hors RMR | 8 | 346 | PA | 85101, 84120 |
| 1454411 Ontario Inc | ON | Staples | ? | 8 | 302 | PA | 85101 |
| 1059066 Ontario Inc. | ON | Windham Centre | ? | 8 | 286 | PA | 85101 |
| Mucci Farms | ON | Kingsville | Windsor | 8 | 279 | PA | 85101 |
| SOUTHSHORE GREENHOUSES INC. | ON | KINGSVILLE | Windsor | 8 | 257 | PA | 85101 |
| Biscuits Leclerc Ltée | QC | Saint-Augustin-De-Desmaures | Québec | 8 | 252 | HW, LW | 94140, 95106 |

## 3. Municipalités → RMR (Statistique Canada, Recensement 2021)

- Municipalités (SDR) : 5 161 — dans une RMR : 556 — hors RMR : 4 452 — noms ambigus : 11
- RMR de `rules.json` retrouvées dans le tableau officiel : 41 / 41

## 4. Salaires Job Bank (2025)

- 20 métiers ciblés couverts, 191 valeurs (Canada + provinces).

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

- Métiers prioritaires relevés : 76
- Communautés sans relevé pour l'instant (8) : Pictou County, North Bay, Thunder Bay, Steinbach, North Okanagan Shuswap, Superior East, St-Pierre-Jolys, Kelowna
