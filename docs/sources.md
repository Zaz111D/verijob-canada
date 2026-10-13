# Phase 0 — Rapport de vérification des sources

> Vérification faite le **13 octobre 2026**. Toutes les dates « modifié le » sont celles affichées sur les pages officielles ce jour-là.
> Les URL canada.ca sont les versions **anglaises vérifiées** (sauf refus.html, vérifiée en FR). Les versions FR seront relevées via le bouton « Français » de chaque page et ajoutées à `rules.json`.
> Légende accès automatisé : ✅ permis · ⚠️ permis avec réserves · ⛔ interdit · ❓ non précisé

---

## 1. Synthèse

| # | Source | Format | Fréquence | Dernière donnée dispo | Licence | Accès automatisé |
|---|---|---|---|---|---|---|
| 1a | EIMT **positives** — liste employeurs (open.canada.ca) | XLSX (EN + FR) | Trimestrielle | **T1 2026** (jan.–mars), publié 21 juil. 2026 | Licence du gouvernement ouvert – Canada | ✅ (API CKAN + téléchargement ; `Crawl-delay: 20`) |
| 1b | EIMT **négatives** — liste employeurs | XLSX (EN + FR) | Trimestrielle | **T1 2026**, publié 21 juil. 2026 | idem | ✅ |
| 2 | Statistiques EIMT (volumes par CNP/province/pays) | XLSX/CSV | Trimestrielle | 2025 confirmé ; T1–T2 2026 non trouvés | idem | ✅ |
| 3 | EDSC — Refus de traiter (RMR ≥ 6 %) | HTML | Trimestrielle | Taux du **9 oct. 2026** ; prochaine MAJ **8 janv. 2027** | Avis importants canada.ca | ⚠️ robots.txt ne l'interdit pas ; **saisie manuelle recommandée** (4×/an) |
| 4a | Job Bank — recherche « candidats étrangers » | HTML (+ flux RSS) | Continue | Temps réel | — | ⛔ **interdit par les conditions d'utilisation** |
| 4b | Job Bank — données ouvertes des offres | CSV UTF-16, mensuel | Mensuelle | Sept. 2026 | Gouvernement ouvert | ✅ mais **inutile pour le radar** (voir §4) |
| 5 | IRCC — C16, aides familiaux, PTAS, FCIP/RCIP | HTML | Ad hoc | voir §5 | canada.ca | Saisie manuelle dans `rules.json` |
| 5b | 18 sites communautaires FCIP/RCIP (employeurs désignés) | HTML hétérogène / PDF | Ad hoc | variable | **Aucune licence indiquée** | ❓ → question pour toi |
| 6 | CNP 2021 v1.0 (Statistique Canada) | CSV EN + FR | Stable | v1.0 (MAJ 17 avr. 2026) | Licence ouverte de Statistique Canada | ✅ |
| 7 | Registre public du CICC | HTML (recherche) | Temps réel | — | — | Lien profond seulement (pas de scraping, conformément au brief) |

---

## 2. Listes d'employeurs EIMT (sources 1a, 1b)

- **Positives** : https://open.canada.ca/data/fr/dataset/90fed587-1364-4f33-a9ee-208181dc0b97
- **Négatives** : https://open.canada.ca/data/fr/dataset/f82f66f2-a22b-4511-bccf-e1d74db39ae5
- **Découverte automatique des nouveaux fichiers** (testé, fonctionne) :
  `https://open.canada.ca/data/api/action/package_show?id=<id du jeu>` → `license_id: ca-ogl-lgo`, `frequency: P3M`.
- Fichiers les plus récents :
  - `tfwp_2026q1_pos_en.xlsx` / `_fr.xlsx`, `tfwp_2025q4_pos_*`, `tfwp_2025q3_pos_*`, `tfwp_2025q2_pos_*`
  - `tfwp_2026q1_neg_en.xlsx` / `_fr.xlsx`, `tfwp_2025q4_neg_*`, `tfwp_2025q3_neg_*`
- **Colonnes réelles** (vérifiées dans le fichier T1 2026) :
  `Province/Territory | Program Stream | Employer | Address | Occupation | Incorporate Status | Approved LMIAs | Approved Positions`
  (négatif : `Requested LMIAs | Requested Positions`). `Occupation` = `"85101-Harvesting labourers"` (CNP 2021, 5 chiffres). `Address` contient ville + province + **code postal**.
- **Volets présents** : `Primary Agriculture`, `Low Wage`, `High Wage`, `Global Talent Stream`, `Permanent Resident Only`.

### Statistiques de contrôle — EIMT positives T1 2026
- 8 790 lignes, ~7 884 employeurs distincts.
- Postes approuvés : Agriculture primaire **18 402** · Bas salaire **8 009** · Haut salaire 6 319 · Talents mondiaux 446 · RP seulement 40.
- Postes TEER 4–5 par province : **Québec 9 606**, Ontario 5 860, C.-B. 3 888, N.-B. 1 663, N.-É. 993, Alberta 863, autres < 400.
- Top CNP TEER 4–5 : 85101 (14 829), 94142 (2 182), 85100 (1 572), 85103 (1 307), 95106 (705), **85121 (526)**, 95107 (495), 84120 (359), 65211 (287), 75110 (264), 65310 (199), **65201 (194)**, **75119 (106)**, **94140 (104)**, 94141 (99), 75101 (66), **44101 (40)**.

### ⚠️ Limites à afficher / à gérer dans le code
1. **Retard** : le trimestre le plus récent date de 6 à 9 mois (T2 2026 pas encore publié au 13 oct. 2026).
2. **Noms de personnes exclus** → les employeurs de **caregivers** (familles) sont quasi absents (44101 = 40 postes seulement). La recherche d'employeur est **presque inutile pour les aides familiaux** : il faut le dire dans l'interface.
3. **Le volet « Primary Agriculture » mélange PTAS/SAWP et volet agricole** : le fichier ne dit pas lequel. Un employeur agricole présent dans la liste peut ne recruter **que** des Mexicains/Caribéens via le PTAS. → Afficher : « Cet employeur a eu des EIMT agricoles ; cela ne veut pas dire qu'il recrute en Afrique. »
4. Encodage : certaines adresses ont des apostrophes cassées (`St. John�s`) → normaliser.
5. Une EIMT positive = des **postes**, pas des travailleurs arrivés (postes annulés inclus).
6. Pas de code SCIAN (NAICS) dans le fichier → les exemptions RMR par secteur (voir §3) ne peuvent être qu'**estimées** à partir du CNP.

---

## 3. Refus de traiter les EIMT bas salaire (source 3)

- URL : https://www.canada.ca/fr/emploi-developpement-social/services/travailleurs-etrangers/refus.html (EN : `/en/employment-social-development/services/foreign-workers/refusal.html`)
- **Taux mis à jour le 9 octobre 2026**, valables pour les demandes du **9 oct. 2026 au 7 janv. 2027**. **Prochaine MAJ : 8 janvier 2027.**
- Règle : refus si **salaire < seuil provincial** ET **lieu de travail dans une RMR avec chômage ≥ 6 %**. Hors RMR (ou agglomération de recensement seulement) → **non visé**. ✅ conforme au brief.
- **30 RMR gelées** : St. John's, Halifax, Moncton, Fredericton, Montréal, Ottawa-Gatineau, Kingston, Belleville-Quinte West, Peterborough, Oshawa, Toronto, Hamilton, St. Catharines-Niagara, Kitchener-Cambridge-Waterloo, Brantford, Guelph, London, Windsor, Barrie, Grand Sudbury, Regina, Saskatoon, Lethbridge, Calgary, Red Deer, Edmonton, Kelowna, Abbotsford-Mission, Vancouver, Nanaimo.
- **11 RMR non gelées** : Saint John, Saguenay, Québec, Sherbrooke, Trois-Rivières, Drummondville, Thunder Bay, Winnipeg, Kamloops, Chilliwack, Victoria.
- **Exemptions (important — le brief les sous-estimait)** :
  - agriculture primaire ;
  - SCIAN **23** (construction), **311** (fabrication d'aliments — inclut usines de poisson/viande), **622** (hôpitaux), **623** (soins infirmiers et en établissement) ;
  - **aides familiaux à domicile** CNP 31301, 32101, **44100, 44101** dans un ménage privé ;
  - postes en appui à la RP seulement ; postes courts (≤ 120 jours, sur demande).
  → Conséquence : 94141, 94142, 95106, 95107 (transformation alimentaire) et 75110 (construction) **ne sont probablement pas bloqués** même dans une RMR gelée.
- **Aides familiaux résidants (live-in)** : refus de traitement distinct pour les postes SCIAN 814, CNP 31301/32101/44100/44101 annoncés « live-in », sauf besoins médicaux élevés (note médicale) ou circonstances exceptionnelles. ✅ conforme au brief.
- Seuils haut/bas salaire (pour savoir si une offre est « bas salaire ») : https://www.canada.ca/en/employment-social-development/services/foreign-workers/median-wage.html — en vigueur **depuis le 17 juillet 2026** (ex. : ON 36,92 $, QC 36,00 $, AB 37,50 $, C.-B. 38,40 $, N.-B. 31,73 $, N.-É. 31,96 $, MB 31,33 $, SK 34,62 $, T.-N.-L. 33,60 $, Î.-P.-É. 31,20 $). Page modifiée le 7 oct. 2026.
- Plafond bas salaire : 10 % (20 % pour SCIAN 23, 311, 622, 623 et certains aides familiaux).
- **À confirmer sur page EDSC** (vu seulement dans une note au comité CIMM du 23 mars 2026 et la presse) : depuis le 1er avril 2026, affichage de **8 semaines** (au lieu de 4) pour le bas salaire, **recrutement de jeunes** obligatoire, et plafond temporaire à **15 %** pour employeurs ruraux hors RMR dans les provinces participantes, jusqu'au 31 mars 2027.

### Frais (règle anti-arnaque n°1) — ✅ confirmé
Page « Exigences – postes à bas salaire » (modifiée le 22 sept. 2026) : https://www.canada.ca/en/employment-social-development/services/foreign-workers/median-wage/low/requirements.html
- Frais d'EIMT : **1 000 $ par poste**, qui **ne peuvent être ni payés par le travailleur ni récupérés auprès de lui**.
- L'employeur (et toute personne qui recrute pour lui) **ne peut facturer aucuns frais de recrutement** au travailleur, directement ou indirectement.
- Bas salaire : l'employeur paie le **transport aller-retour** depuis le pays d'origine, non récupérable.
- Les frais de **permis de travail / visa** restent, eux, à la charge du travailleur → l'appli ne doit pas signaler ces frais-là comme arnaque (nuance importante pour éviter les faux positifs).

---

## 4. Job Bank (sources 4a, 4b)

### 4a. Recherche « candidats étrangers » — ⛔ pas de scraping
- Page : https://www.jobbank.gc.ca/findajob/foreign-candidates
- Recherche des offres ouvertes aux candidats internationaux : `https://www.jobbank.gc.ca/jobsearch/jobsearch?fglo=1&page=1&sort=M` (7 988 offres le 13 oct. 2026). Le paramètre **`fglo=1`** = filtre « ouvert aux candidats étrangers ».
- Flux RSS existant : `/jobsearch/feed/jobSearchRSSfeed?fage=2&fglo=1&sort=D&rows=100`
- `robots.txt` : `User-agent: * / Crawl-delay: 5` (n'interdit rien).
- **MAIS les conditions d'utilisation** (https://www.jobbank.gc.ca/termsofuseseeker, modifiées le 24 sept. 2026) interdisent explicitement « tout script, robot, araignée, robot d'indexation, extracteur d'écran, programme de requêtes automatisé, **intelligence artificielle** ou autre dispositif automatisé » pour accéder aux services.
  → **Décision : pas de `fetch-jobbank.ts`. Radar en « mode liens »** (URL pré-filtrées ouvertes par l'utilisateur dans son navigateur).
  → Transparence : pendant cette vérification j'ai chargé 3 pages Job Bank (robots.txt, page candidats étrangers, une page de résultats). Je n'y accèderai plus de façon automatisée.
- Paramètres de filtre CNP/province : **non documentés** et non confirmés (seuls `fglo`, `page`, `sort`, `searchstring` sont visibles). → Il faudra que **tu** les relèves à la main dans ton navigateur (filtrer par CNP + province, copier l'URL) pour construire les liens profonds en Phase 5.

### 4b. Données ouvertes Job Bank — ✅ mais limité
- https://open.canada.ca/data/fr/dataset/ea639e28-c0fc-48bf-b5dd-b8899bd43072 — CSV mensuels (dernier : sept. 2026), **UTF-16**, tabulations.
- Colonnes vérifiées : titre, CNP 2016 et **CNP 2021**, date, nb de postes, province, ville, **salaire min/max**, SCIAN, etc.
- **Absents** : nom de l'employeur, indicateur « candidats étrangers », URL/ID de l'offre.
- → Inutilisable pour le radar. **Utile pour la règle « salaire irréaliste »** (médiane des salaires affichés par CNP × province). Alternative officielle : les données « Salaires » de Job Bank sur le portail ouvert (ID du jeu non encore confirmé, MAJ annuelle ~nov.) — à vérifier en Phase 2.

---

## 5. IRCC — voies d'immigration (source 5)

| Voie | Page officielle | Modifiée le | Statut vérifié |
|---|---|---|---|
| Mobilité francophone C16 | `canada.ca/.../exemption-codes/canadian-interests-significant-benefit-mobilite-francophone-r205-exemption-code-c16.html` | 23 juin 2026 | ✅ Hors Québec (télétravail pour employeur québécois exclu). TEER 0–5, **sauf agriculture primaire TEER 4–5** (définition R315.2(4)). **NCLC 5 en expression orale et compréhension orale**. Preuve : TEF/TCF, ou attestation d'études en français ; l'agent peut exiger un test. Offre via le Portail des employeurs. Langue de travail : pas forcément le français. Aucun changement 2025–2026 mentionné. |
| Pilotes aides familiaux (HCWP) | Instructions ministérielles MI86/87/88/91 : `canada.ca/.../ministerial-instructions/other-goals/mi86-87-88.html` | 18 févr. 2026 | ✅ En vigueur du **31 mars 2026** au **30 mars 2030** (sauf abrogation) : **IRCC n'accepte aucune nouvelle demande**. Les dossiers déjà reçus continuent d'être traités. Note : 2030 = fin des instructions, **pas une date de réouverture garantie**. |
| PTAS / SAWP | `https://www.canada.ca/en/employment-social-development/services/foreign-workers/agricultural/seasonal-agricultural.html` | 3 juin 2026 | ✅ **Mexique + 11 pays des Caraïbes** : Anguilla, Antigua-et-Barbuda, Barbade, Dominique, Grenade, Jamaïque, Montserrat, Saint-Kitts-et-Nevis, Sainte-Lucie, Saint-Vincent-et-les-Grenadines, Trinité-et-Tobago. **Aucun pays africain.** |
| Volet agricole | `https://www.canada.ca/en/employment-social-development/services/foreign-workers/agricultural.html` | 16 sept. 2026 | ✅ Travailleur « **de n'importe quel pays** ». Production sur la liste nationale des produits. |
| FCIP / RCIP | `https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/rural-franco-pilots.html` | 31 août 2026 | ✅ 18 communautés (liste ci-dessous). RP : offre d'un **employeur désigné**, **1 an (1 560 h) d'expérience liée sur 3 ans**, diplôme (ou équivalence), fonds d'établissement, **test de langue dans les 4 compétences** : **CLB/NCLC 4 pour TEER 4–5**, 5 pour TEER 2–3, 6 pour TEER 0–1 (FCIP : en français). Aucun statut « pause / quota atteint » publié par IRCC. |

### Communautés FCIP / RCIP (liens officiels depuis la page IRCC)
RCIP : Pictou County NS · North Bay ON · **Sudbury ON (RCIP+FCIP)** · **Timmins ON (RCIP+FCIP)** · Sault Ste. Marie ON · Thunder Bay ON · Steinbach MB · Altona/Rhineland MB · Brandon MB · Moose Jaw SK · Claresholm AB · West Kootenay BC · North Okanagan Shuswap BC · Peace Liard BC.
FCIP : Péninsule acadienne NB · Superior East ON · St-Pierre-Jolys MB · Kelowna BC.
(URL de chaque site dans la page IRCC ; à recopier dans `data/manual/communities.json`.)

**Exemple vérifié — Sudbury** (https://investsudbury.ca/why-sudbury/newcomers/rcipfcip/) : liste d'employeurs désignés en **HTML** par secteur, quelques mentions « Not hiring », métiers prioritaires 2026 incluant **44101**, **33102** ; en FCIP aussi **75110** et **85100**. **Aucune licence de réutilisation affichée** (© Greater Sudbury Economic Development). Les 17 autres sites ont des formats différents (HTML, PDF).

### Représentants autorisés (source 7)
- Registre CICC : **https://register.college-ic.ca/** (colonne « Entitled to Practise », statut, classe L1–L5). robots.txt n'interdit pas la recherche, mais on reste en **lien profond** comme prévu.
- Page IRCC « Votre représentant est-il autorisé ? » : `canada.ca/.../immigration-citizenship-representative/choose/authorized.html`
- ⚠️ Correction pour la règle anti-arnaque : sont aussi autorisés les **avocats** (barreau provincial), les **notaires du Québec** et les **parajuristes de l'Ontario**. La règle doit dire « agent sans numéro CICC **ni membre d'un barreau / Chambre des notaires** », sinon faux positifs.

---

## 6. CNP 2021 (source 6)

- Structure officielle (CSV) : https://www.statcan.gc.ca/fr/sujets/norme/cnp/2021/indexV1/cnp-2021-v1.0-structure-classification.csv (EN : `.../noc-2021-v1.0-classification-structure.csv`). Licence ouverte de Statistique Canada. **Le TEER = 2e chiffre du code.**
- **Liste officielle « agriculture primaire »** (page EDSC volet agricole, 16 sept. 2026) : **80020, 80021, 82030, 82031, 84120, 85100, 85101, 85103** — *et* le travail doit être effectué sur une ferme, pépinière ou serre.
  → **85102 (aquaculture) n'est PAS de l'agriculture primaire** : il passe par le volet bas salaire et reste admissible à C16.

---

## 7. Proposition de tableau §2 validé

| Voie | Règle clé (vérifiée) | Source / date | Effet dans l'appli |
|---|---|---|---|
| **EIMT bas salaire** | Refus si salaire < seuil provincial (17 juil. 2026) ET RMR ≥ 6 % (liste 9 oct. 2026 → 7 janv. 2027). Hors RMR non visé. **Exemptés** : agriculture primaire, construction (SCIAN 23), fabrication d'aliments (311), hôpitaux (622), soins en établissement (623), aides familiaux 44100/44101 en ménage privé. | EDSC refus.html, 9 oct. 2026 | `bloquée` seulement si RMR gelée **et** aucune exemption probable ; sinon `possible`. Mentionner l'exemption « estimée d'après le métier ». |
| **EIMT volet agricole** | Travailleurs de **tout pays** ; CNP de la liste agriculture primaire. | EDSC agricole.html, 16 sept. 2026 | `possible` pour farm worker africain. |
| **PTAS / SAWP** | Mexique + 11 pays caribéens seulement. | EDSC agricole-saisonnier, 3 juin 2026 | `bloquée` pour tout pays africain + **signal d'arnaque** si une offre « SAWP » vise un Africain. |
| **Mobilité francophone C16** | Hors Québec ; TEER 0–5 sauf agri. primaire TEER 4–5 (84120, 85100, 85101, 85103) ; **NCLC 5 oral (expression + compréhension)**. Sans EIMT. | IRCC C16, 23 juin 2026 | `probable` si NCLC ≥ 5 oral + hors QC + métier admissible ; `bloquée` si agri. primaire TEER 4–5 ou Québec ; `inconnue` si niveau de français non renseigné. |
| **Pilotes aides familiaux** | **Fermés** aux nouvelles demandes du 31 mars 2026 au 30 mars 2030. | IRCC MI86–91, 18 févr. 2026 | `bloquée` + message « pas de voie RP directe caregiver » → rediriger vers C16 / EIMT. |
| **Caregiver résidant (live-in)** | Refus de traitement EIMT sauf besoins médicaux élevés / cas exceptionnels. | EDSC refus.html | Signal si l'offre impose de loger chez l'employeur. |
| **FCIP / RCIP** | Offre d'employeur **désigné** ; 1 an d'expérience ; langue 4 compétences : **NCLC/CLB 4 pour TEER 4–5** ; diplôme ; fonds. 18 communautés. | IRCC, 31 août 2026 + sites communautaires | `possible` si employeur désigné ET métier prioritaire de la communauté ; sinon `inconnue`. |
| **Québec** | Règles propres ; C16 non applicable. | — | Hors MVP (voir question 3). |
| **Frais** | 1 000 $ EIMT + frais de recrutement + transport (bas salaire) : **jamais à la charge du travailleur**. Permis de travail/visa : à la charge du travailleur. | EDSC exigences bas salaire, 22 sept. 2026 | Règle anti-arnaque n°1 (avec la nuance permis/visa). |

## 8. Proposition de liste CNP validée (CNP 2021)

| Groupe | Code | Titre officiel FR | TEER | Agri. primaire ? |
|---|---|---|---|---|
| Agricole | 85100 | Manœuvres aux soins du bétail | 5 | ✅ |
| | 85101 | Manœuvres à la récolte | 5 | ✅ |
| | 85103 | Manœuvres de pépinières et de serres | 5 | ✅ |
| | 84120 | Ouvriers spécialisés dans l'élevage et opérateurs de machineries agricoles | 4 | ✅ |
| | 85102 | Manœuvres de l'aquaculture et de la mariculture | 5 | ❌ (bas salaire, C16 possible) |
| Soins à domicile | 44100 | Gardiens d'enfants en milieu familial | 4 | ❌ |
| | 44101 | Aides de maintien à domicile, aides familiaux et personnel assimilé | 4 | ❌ |
| Manœuvres / transformation | 75110 | Aides de soutien des métiers et manœuvres en construction | 5 | ❌ |
| | 75101 | Manutentionnaires | 5 | ❌ |
| | 94141 | Bouchers industriels, préparateurs de volaille… | **4** | ❌ |
| | 94142 | Ouvriers d'usines de transformation du poisson et fruits de mer | **4** | ❌ |
| | 95106 | Manœuvres – transformation des aliments et boissons | 5 | ❌ |
| | 95107 | Manœuvres – transformation du poisson et fruits de mer | 5 | ❌ |
| | 95109 | Autres manœuvres des services de transformation… | 5 | ❌ |
| Nettoyage | 65310 | Préposés à l'entretien ménager et au nettoyage – travaux légers | 5 | ❌ |
| **Ajouts proposés** (fréquents dans les EIMT T1 2026 ou prioritaires FCIP/RCIP) | 85121 | Manœuvres en aménagement paysager et entretien des terrains (526 postes) | 5 | ❌ |
| | 94140 | Opérateurs de machines – transformation des aliments et boissons (104) | 4 | ❌ |
| | 65201 | Serveurs au comptoir, aides de cuisine… (194) | 5 | ❌ |
| | 75119 | Autres manœuvres et aides de soutien de métiers (106) | 5 | ❌ |
| | 33102 | Aides-infirmiers, préposés aux bénéficiaires (prioritaire RCIP/FCIP santé) | 3 | ❌ |

---

## 9. Questions qui t'attendent (décisions)

1. **Job Bank** : je propose le **mode liens uniquement** (pas de scraping, pas de lecture automatisée du flux RSS non plus, car les conditions interdisent tout « programme de requêtes automatisé »). D'accord ?
2. **Listes d'employeurs désignés FCIP/RCIP** : aucune licence de réutilisation n'est indiquée sur les sites communautaires. Option proposée : **fichier curé à la main** (`data/manual/designated-employers.csv`) avec URL source + date de relevé pour chaque ligne, sans scraper automatique, et un lien vers la page d'origine. Ou préfères-tu d'abord écrire aux communautés pour demander l'autorisation ?
3. **Québec** : 9 606 des postes TEER 4–5 approuvés au T1 2026 sont au Québec (la 1re province). Le garder en « phase ultérieure » comme prévu, ou remonter un module minimal dans le MVP ?
4. **Exemptions RMR par secteur** : le fichier EIMT n'a pas de code SCIAN. J'estime l'exemption à partir du CNP (ex. 94142 → transformation alimentaire → exempté) avec le libellé « probablement exempté ». Ça te convient ?

---

## 10. Décisions validées par Jessica (13 oct. 2026)

1. **Job Bank : mode liens uniquement.** Ni scraping ni lecture automatique du flux RSS. Le radar générera des URL pré-filtrées ouvertes par l'utilisateur.
2. **Employeurs désignés FCIP/RCIP : fichier curé à la main** (`data/manual/designated-employers.csv`), avec l'URL source et la date de relevé pour chaque ligne. Aucun scraper automatique.
3. **Québec : module reporté** à une phase ultérieure. Le moteur affiche déjà une mention « règles provinciales en plus, module à venir ».
4. **Exemptions au gel des RMR : déduites du métier** (champ `probableNaics` de `data/noc.json`), toujours avec la mention « probablement exempté, à confirmer avec l'employeur ».

## 11. Compléments vérifiés pendant la Phase 1

- **PICRF (FCIP) : NCLC 5 en français dans les 4 compétences, quel que soit le TEER** (instructions IRCC « Application process and who can apply », FCIP). Le tableau §7 indiquait seulement la règle RCIP (CLB 4 pour TEER 4–5) : `rules.json` distingue maintenant les deux.
- **URL françaises officielles** relevées via le bouton « Français » de chaque page canada.ca. Elles sont toutes enregistrées dans `data/rules.json` (`urlFr`).
- La page IRCC « Se protéger contre la fraude » (modifiée le 23 févr. 2026) est générale. Elle ne cite ni les moyens de paiement ni les adresses officielles. Les explications du vérificateur sur ces points restent du bon sens et sont formulées prudemment, sans citer de règle officielle inexistante.
- Les alias de villes des RMR (`rules.json` → `lmiaLowWage.cmas[].aliases`) ont été **saisis à la main** pour les grandes municipalités. Ils seront remplacés en Phase 2 par la correspondance officielle de Statistique Canada (subdivision de recensement → RMR). En attendant, une ville inconnue donne le statut « inconnue », jamais « hors RMR ».

## 12. Sources ajoutées en Phase 2 (pipeline de données)

| Source | URL | Format | Licence | Accès automatisé |
|---|---|---|---|---|
| Statistique Canada — tableau 98-10-0002 (toutes les municipalités / SDR, Recensement 2021) | https://www150.statcan.gc.ca/n1/tbl/csv/98100002-eng.zip | CSV zippé | Licence ouverte de Statistique Canada | ✅ `/n1/tbl/` autorisé, `Crawl-delay: 2` (on attend 3 s) |
| Statistique Canada — tableau 98-10-0003 (RMR / AR et leurs municipalités) | https://www150.statcan.gc.ca/n1/tbl/csv/98100003-eng.zip | CSV zippé | idem | ✅ |
| EDSC — Salaires Job Bank (bas / médian / haut par CNP et province) | https://open.canada.ca/data/fr/dataset/adad580f-76b0-4502-bd05-20c125de9116 | CSV annuel (dernier : 2025, publié le 19 nov. 2025) | Gouvernement ouvert | ✅ (API CKAN, `Crawl-delay: 20`) |
| Greater Sudbury — employeurs désignés et métiers prioritaires RCIP/FCIP 2026 | https://investsudbury.ca/why-sudbury/newcomers/rcipfcip/ | HTML | Aucune licence affichée (données factuelles) | Transcription **ponctuelle** le 13 oct. 2026, relue à la main ; pas de scraper récurrent |

- Le **fichier des attributs géographiques 2021** (92-151-X), plus complet, est derrière une protection anti-robots : il n'est pas utilisé, et cette protection n'est pas contournée.
- La correspondance se fait **par nom de municipalité**, pas par code postal : les fichiers de conversion des codes postaux ne sont pas gratuits. Les quartiers et anciennes villes (Scarborough, Dartmouth…) passent par les alias saisis à la main dans `rules.json`.
- `fetch-cma-rates.ts`, prévu dans le brief, n'existe pas. Les taux et la liste des RMR gelées sont **saisis à la main** dans `rules.json` (décision de la Phase 0), puis contrôlés par `npm run check:rules`.
