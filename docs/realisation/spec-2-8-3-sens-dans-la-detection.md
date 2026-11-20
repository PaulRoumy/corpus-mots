---
title: 'Story 2.8, partie 3 : Sens dans le Panneau de détection'
type: 'feature'
created: '2026-11-20'
status: 'done'
baseline_commit: '8ca63aad93289e1f0938b248b8485ef480ef6c88'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/realisation/epic-2-context.md'
  - '{project-root}/docs/realisation/spec-2-8-2-creation-de-sens.md'
  - '{project-root}/docs/realisation/spec-2-7-2-retenir-une-image-dans-la-detection.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Pendant la saisie rapide, l'enseignant voit les Sens d'un Mot existant mais ne peut ni en choisir un, ni en créer un : le Mot est ajouté avec son Sens habituel ou « à compléter », et les Images de tous les Sens sont mêlées (FR-10).

**Approach:** Dans le Panneau de détection, chaque Mot à plusieurs Sens visibles montre ses Sens en puces ; en choisir une limite ses Images à ce Sens, et Entrée ajoute alors le Mot avec ce Sens. « Nouveau sens » déplie la Création de Sens de la partie 2 ; « Créer le sens » ajoute aussitôt le Mot à la Préparation avec le Sens obtenu ou créé par `Lexique.obtenirOuCreerSens`. Rien n'est créé avant ce geste (AD-19).

Décisions :
- Puces (décision de Paul, option A) : pour chaque Mot détecté qui a au moins deux Sens visibles, une rangée de puces à bascule « Tous », puis chaque Sens « libellé (catégorie) », « à compléter » en dernier. Clic, ou Tab depuis le champ puis Espace ou Entrée sur la puce ; après le choix, le focus revient au champ. Un Mot à un seul Sens garde la ligne « Sens : … » actuelle.
- Par défaut (décision de Paul, option A) : « Tous » choisi d'emblée ; Entrée ajoute avec le Sens habituel (dernier retenu, sinon « à compléter ») comme aujourd'hui.
- Sens choisi : seules les Images de ce Sens restent dans la liste et dans la navigation ↑ ↓ (le choix d'Image en cours tombe) ; Entrée sans Image choisie ajoute ce Mot avec ce Sens, « à illustrer ». Avec plusieurs Mots (« côte », « côté »), Entrée ajoute le Mot dont un Sens est choisi ; si aucun Sens n'est choisi, comportement actuel. Le choix de Sens tombe à chaque nouvelle frappe. Retenir une Image ajoute toujours son Mot avec le Sens de l'Image (partie 2 de la story 2.7).
- Filtrer les Images déjà `proposable` par leur Sens est une présentation du résultat, faite dans le front sans nouvelle requête ; la visibilité reste décidée par le back (AD-2).
- « Nouveau sens » (décision de Paul, option A) : un bouton par Mot existant détecté, et un pour un Mot nouveau. La Création de Sens se déplie dans le panneau (catégorie préremplie avec celle du Sens choisi, sinon du premier Sens visible ; vide pour un Mot nouveau). « Créer le sens » ou Entrée dans le formulaire ajoute le Mot avec ce Sens : même file d'ajouts, champ vidé, panneau masqué, focus rendu au champ, annonce « « étalé » ajouté (chute, nom). ». Échap replie sans rien créer et rend le focus au champ. Un libellé déjà connu du Mot réutilise ce Sens (AD-19).
- Refus `409 preparation.mot_deja_present` ou `400` de libellé : message sous le formulaire ou sous le champ, rien d'ajouté, saisie gardée.

## Boundaries & Constraints

**Always:**
- `POST /preparations/{id}/mots` accepte, en plus de `saisie`, soit `sensId` (Sens visible d'un Mot : ce Mot est ajouté avec ce Sens), soit `nouveauSens { libelle, categorie }` avec `motId` facultatif (Mot détecté ; sinon le Mot de `saisie`, obtenu ou créé). Une transaction : Préparation verrouillée, Mot, Sens retenu, Thème par défaut. Refus : Sens inconnu, d'un autre Mot que `motId` ou non visible `400 preparation.sens_invalide` ; libellé `400 sens.libelle_invalide` ; catégorie absente ou hors liste `400 requete.invalide` ; `sensId` et `nouveauSens` ensemble `400 requete.invalide` ; Mot déjà présent `409 preparation.mot_deja_present`. Tout refus annule tout, y compris la création du Mot et du Sens.
- La règle des Sens visibles et celle du libellé sont celles des parties 1 et 2 (`DetectionMots`, `Lexique`), sans copie.
- La détection (`GET …/detection`) n'écrit toujours rien et ne change pas de contrat.
- Puces accessibles : groupe nommé « Sens de « étalé » », `aria-pressed` ; état jamais signalé par la couleur seule ; la région `aria-live` existante n'est pas élargie.
- Composant `CreationSens` de la partie 2 réutilisé tel quel (au besoin par une entrée de configuration), jamais dupliqué.
- Paquet initial sous 600 kB.

**Never:**
- Aucun Mot ni Sens créé pendant la frappe ; rien de modifié dans un Sens existant (AD-19).
- Pas de filtre de visibilité dans le front ; aucun appel HTTP écrit à la main ; ne pas modifier `front/src/app/api/` ; aucune migration.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Ajouter avec un Sens | `saisie` « étalé », `sensId` chute (visible) | Mot « étalé » ajouté, Sens retenu « chute » | N/A |
| Sens d'un autre Mot | `sensId` de « côté » avec `motId` « côte » | Rien | 400 `preparation.sens_invalide` |
| Sens non visible | Sens d'une Image privée de Zoé | Rien | 400 `preparation.sens_invalide` |
| Nouveau Sens, Mot existant | `motId` « étalé », `nouveauSens` « chute », `nom` | Sens créé, Mot ajouté avec lui | N/A |
| Nouveau Sens, Mot nouveau | `saisie` « galette », `nouveauSens` « gâteau », `nom` | Mot et Sens créés, Mot ajouté | N/A |
| Libellé déjà connu | « Chute » alors que « chute (nom) » existe | Sens existant retenu, aucun nouveau | N/A |
| Libellé invalide | « à compléter » | Ni Mot ni Sens créés | 400 `sens.libelle_invalide` |
| Les deux | `sensId` et `nouveauSens` | Rien | 400 `requete.invalide` |
| Mot déjà présent | « étalé » déjà dans la Préparation | Aucun Sens créé | 409 `preparation.mot_deja_present` |
| Front, puce | Clic sur « chute (nom) » | Images « chute » seules, focus au champ | N/A |
| Front, Entrée avec Sens | « chute » choisi, aucune Image choisie | Ajout avec `sensId` chute | N/A |
| Front, Entrée sans Sens | « Tous » | Ajout comme aujourd'hui (saisie seule) | N/A |
| Front, frappe | Sens choisi, puis une frappe | Retour à « Tous » | N/A |
| Front, Nouveau sens | « Nouveau sens », « chute », `nom`, Entrée | Ajout avec `nouveauSens`, champ vidé, focus au champ | N/A |
| Front, Échap | Formulaire ouvert | Replié, aucune requête, focus au champ | N/A |

</frozen-after-approval>

## Code Map

- `back/src/main/java/fr/corpusmots/preparations/service/PreparationsService.java` -- `ajouterMot` (l.193), `reutiliserImage` : modèles ; étendre l'ajout avec `sensId` ou `nouveauSens`.
- `back/src/main/java/fr/corpusmots/preparations/api/NouveauMotPreparationDto.java`, `PreparationsResource.ajouterMot` -- corps de l'ajout ; validation de la catégorie comme `NouveauSensMotPreparationDto` (partie 2).
- `back/src/main/java/fr/corpusmots/vocabulaire/service/Usages.java` -- `retenirSens(RetenirSensCommande)` avec `sensId` imposé (lève si le Sens n'est pas du Mot) ; `DetectionMots.sensVisible(motId, sensId)` (partie 1) ; `Lexique.obtenirOuCreerSensSaisi` (partie 2), `CategorieGrammaticale`.
- `back/src/test/java/fr/corpusmots/preparations/api/` -- tests de l'ajout (`PreparationMotsResourceTest` ou équivalent), `SensPreparationResourceTest` : fixtures et assertions « rien n'est écrit » (lignes `mot`, `sens`, `preparation_mot`, `sens_retenu`).
- `front/src/app/preparations/panneau-detection.ts` -- ligne « Sens : » (l.142, l.180), `options()`, `choix()`, `vignettes(mot)`, état par résultat : puces, filtre, « Nouveau sens », sortie vers la page.
- `front/src/app/preparations/preparation.ts` -- `ajouterMot`, file `fileAjouts` / `envoyerAjout` (éléments saisie ou réutilisation) : nouvel élément avec Sens ; Entrée consulte le Sens choisi du panneau.
- `front/src/app/commun/creation-sens/creation-sens.ts` -- composant de la partie 2 (`envoyer`, `creee`, `desactive`, `categorieInitiale`, `reinitialiser`).

## Tasks & Acceptance

**Execution:**
- [x] `back/.../preparations/` -- ajout avec `sensId` ou `nouveauSens`, validations.
- [x] `back/src/test/...` -- une ligne de test par ligne back de la matrice, dont « rien n'est écrit » après chaque refus.
- [x] `front/openapi/` -- régénérer et versionner.
- [x] `front/src/app/preparations/` (+ specs) -- puces de Sens, filtre, Entrée avec Sens, « Nouveau sens » ; une ligne de test par ligne front de la matrice.

**Acceptance Criteria:**
- Given « chute » choisi pour « étalé », when l'enseignant appuie sur ↓, then seules les Images « chute » sont parcourues.
- Given deux Mots détectés, when la puce d'un Sens de « côté » est choisie puis Entrée, then « côté » est ajouté avec ce Sens.

## Implementation Notes

- Back : `NouveauMotPreparationDto` gagne `motId`, `sensId` et `nouveauSens` (réutilise `NouveauSensMotPreparationDto`, même forme, même module) ; la ressource refuse `sensId` + `nouveauSens` et la catégorie absente ou hors liste (`400 requete.invalide`), puis passe une `AjouterMotCommande`. `PreparationsService.ajouterMot` : Préparation verrouillée ; Mot = `motId` (404 s'il est inconnu) dès qu'un Sens accompagne la saisie, sinon Mot du Sens (`sensId` seul), sinon Mot de la saisie obtenu ou créé ; `sensId` vérifié par `DetectionMots.sensVisible` (qui vérifie aussi qu'il est du Mot) ; doublon (409) vérifié avant toute création de Sens ; `Lexique.obtenirOuCreerSensSaisi` pour `nouveauSens` ; `Usages.retenirSens` avec le Sens imposé. Une seule transaction : un refus annule le Mot et le Sens créés. Tests : 10 dans `SensPreparationResourceTest` (lignes `preparation_mot`, `sens_retenu`, `lien_image`, `image`, `sens`, `mot` comparées après chaque refus).
- Front : `CreationSens` gagne `focusAuRepli` (vrai par défaut) et la sortie `repliee` ; rien d'autre ne change. `PanneauDetection` : `sensChoisi` (un seul, tous Mots confondus), remis à zéro à chaque frappe et à chaque résultat ; `imagesDe(mot)` filtre l'affichage, `options` (↑ ↓) et la mise en avant ; `choixSens()` lu par la page à l'Entrée ; puces `button` à `aria-pressed` avec coche, dans un `role="group"` nommé. Puces et « Nouveau sens » d'un Mot qui propose des Images sont rendus avant la liste (un `ng-template` partagé), car un élément focalisable n'a pas sa place dans un `listbox` ni sous `aria-hidden` ; pour un Mot sans Image ou nouveau, dans son bloc. Un Sens choisi sans Image montre « Aucune image pour ce sens. ». `envoyerNouveauSens` (entrée fournie par la page) ; `focusChamp` (sortie) rend le focus au champ après une puce ou Échap. `Preparation` : la file porte `sens` (et `issue` pour la Création de Sens, résolue ou rejetée avec la réponse) ; succès d'un nouveau Sens : `vider()` puis annonce « « étalé » ajouté (chute, nom). » ; refus d'un nouveau Sens affiché dans le formulaire (jamais de Bandeau) ; refus d'un `sensId` (code) sous le champ. Paquet initial : 598,86 kB (inchangé).
- Après revue : `motId` seul refusé (`400 requete.invalide`) ; issue d'une Création de Sens rejetée si la Préparation n'est pas chargée, au rechargement (file vidée) et pour une réponse d'une Préparation qui n'est plus affichée ; pour un Mot nouveau, la forme affichée par le panneau part comme saisie ; au succès, le champ n'est vidé que s'il n'a pas changé depuis l'envoi ; formulaires ouverts réinitialisés à chaque frappe et à chaque résultat ; annonce polie du Sens choisi (« étalé, chute (nom) : 2 images. », « Aucune image pour ce sens. ») ; `preparation.sens_invalide` d'un Sens choisi : `MESSAGE_SENS_PLUS_PROPOSE` (texte recopié de `MESSAGE_SENS_INDISPONIBLE` : l'importer chargerait le Panneau de choix, chargé à la demande).

## Spec Change Log

## Review Triage Log

Revue 1 (Blind Hunter BH, Edge Case Hunter EC, Verification Gap VG).

| # | Constat | Verdict | Preuve | Suite |
|---|---------|---------|--------|-------|
| 1 | BH-1, BH-2, EC-1 : promesse de la Création de Sens jamais réglée (Préparation nulle, rechargement) ou résolue sans ajout appliqué | medium | Formulaire bloqué en envoi ou replié à tort | patch |
| 2 | BH-3, EC-2, EC-3 : Mot nouveau créé depuis le texte courant du champ, et texte plus récent effacé au succès | medium | Le Sens peut aller à un autre Mot que celui affiché | patch |
| 3 | BH-11, EC-6 : Création de Sens ouverte gardée sur un nouveau résultat | medium | Libellé et catégorie périmés envoyés pour une autre forme | patch |
| 4 | BH-9 : choix d'une puce non annoncé | medium | Aucun retour pour un lecteur d'écran (AA) | patch |
| 5 | BH-6, VG-1, VG-2, VG-4, BH-7 : message de `preparation.sens_invalide` pour un Sens choisi, branches de refus et d'échec non testées, priorité Image sur Sens non testée | medium | Retirer la branche ou inverser la priorité ne ferait échouer aucun test | patch |
| 6 | BH-4, EC-5, VG-3, BH-8 : `motId` seul ignoré ; `motId` inconnu non testé | low | Correction directe et tests | patch |
| 7 | EC-4 : Entrée pendant une Création de Sens du même Mot | low | Second ajout refusé 409 sous le champ ; rare | rejeté |
| 8 | BH-5 : Mot introuvable dans la branche `sensId` seul | false | Clé étrangère `sens.mot_id → mot.id` : un Sens a toujours son Mot | rejeté |
| 9 | BH-8 : autres combinaisons back (`sensId` d'un autre Mot que la saisie sans `motId`, `nouveauSens` sans `motId` sur Mot présent) | low | Comportements documentés, chemins couverts par les tests voisins | rejeté |
| 10 | BH-10 : assertions de focus faibles | low | Sans effet sur le produit | rejeté |
| 11 | BH-12 : double contrôle `sensId` + `nouveauSens`, 500 pour un appelant futur | low | Seule la ressource appelle ce service | rejeté |
| 12 | BH-13 : diff sans contrat ni spec | false | Exclusion voulue | rejeté |

## Verification

**Commands:**
- `cd back && ./mvnw -q verify` (JAVA_HOME JDK 25, DOCKER_HOST `npipe:////./pipe/docker_engine`) -- expected: tous les tests passent, ArchUnit compris, `front/openapi/` à jour.
- `cd front && npm test -- --watch=false && npm run build` -- expected: tests et `verifier-jetons` au vert, paquet initial sous 600 kB.
