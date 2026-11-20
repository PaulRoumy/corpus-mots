---
title: 'Story 2.8, partie 1 : Sens modifiable dans le Panneau de choix d''Image'
type: 'feature'
created: '2026-11-20'
status: 'done'
baseline_commit: 'd0dde9e07c29c5235c95c2b1a7535b0c0e24c88c'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/realisation/epic-2-context.md'
  - '{project-root}/docs/realisation/spec-2-7-3-panneau-de-choix-d-image.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Dans le Panneau de choix d'Image, le Sens du Mot est en lecture : l'enseignant ne peut ni limiter les Images au Sens voulu, ni changer le Sens retenu sans choisir une Image (FR-10). « étalé (cuisine) » et « étalé (chute) » doivent pourtant garder chacun leurs Images.

**Approach:** Le Sens devient un champ du Panneau de choix d'Image, listant les Sens visibles du Mot (AD-2). Choisir un Sens enregistre aussitôt le Sens retenu par `Usages` ; l'Image liée qui n'est pas de ce Sens est déliée et le Mot redevient « à illustrer » (AD-5) ; la liste se limite aux Images de ce Sens, et le panneau reste ouvert.

Décisions :
- Changement aussitôt (décision de Paul, option A) : le Sens retenu est enregistré dès le choix dans le champ ; la Carte est mise à jour (« à illustrer » si l'Image a été déliée) et l'annonce dit « Sens de « étalé » : chute. » (avec « Image retirée. » si elle a été déliée).
- Liste à l'ouverture (décision de Paul, option A) : le champ s'ouvre sur le Sens retenu et la liste se limite à ses Images. Si le Sens retenu est « à compléter », le champ propose en plus « Tous les sens », choisi d'emblée : la liste montre alors les Images de tous les Sens et choisir une Image fixe son Sens (story 2.7, partie 3). « Tous les sens » n'est pas un Sens et ne s'enregistre pas.
- Sens proposés : les Sens visibles du Mot (ceux d'une Image `proposable` ou retenus par l'enseignant), plus le Sens retenu ; chacun « libellé (catégorie) », « à compléter » en dernier et mis en avant comme dans la Carte d'identité. Un seul Sens possible : texte en lecture, pas de champ.
- Choisir le Sens déjà retenu ne fait rien. Pendant l'enregistrement, le champ est désactivé ; en échec, le champ revient au Sens précédent et le message s'affiche dans le panneau.
- Une Image de la liste filtrée a toujours le Sens retenu : la choisir lie ou remplace sans changer de Sens.

## Boundaries & Constraints

**Always:**
- `PUT /preparations/{id}/mots/{motPreparationId}/sens`, corps `{ sensId }`, `200` avec le `MotPreparationDto` (Sens et Image éventuelle). Une transaction : Préparation verrouillée, puis `Usages` change le Sens retenu (ligne `sens_retenu` existante, `SensRetenu.changerSens`) et supprime le lien si l'Image liée n'est pas de ce Sens. Même Sens : `200` sans écriture. Refus : Préparation ou Mot de Préparation d'un autre `404 ressource.introuvable` ; Sens d'un autre Mot, inconnu ou non visible de l'enseignant `400 preparation.sens_invalide` ; corps ou champ manquant `400 requete.invalide`. Tout refus annule tout.
- `GET …/propositions?sensId=` facultatif : Images limitées à ce Sens, filtrées et classées par `vocabulaire.service` ; la liste des Sens visibles reste complète. Sans `sensId` : comportement actuel (tous les Sens).
- La visibilité des Sens se décide dans `vocabulaire.service` (même règle que la détection) ; `sens_retenu` et `lien_image` ne changent que par `Usages` (AD-14). L'Image déliée n'est ni supprimée ni modifiée.
- Champ Sens accessible : `mat-select` nommé « Sens », état « à compléter » jamais signalé par la couleur seule ; le focus reste sur le champ après l'enregistrement.
- Paquet initial sous 600 kB (le panneau reste chargé à la demande).

**Never:**
- Pas de Création de Sens ni de Sélecteur de catégorie (partie 2) ; pas de Sens dans le Panneau de détection (partie 3).
- Aucun Sens créé ni modifié (AD-19) ; aucune migration.
- Aucun appel HTTP écrit à la main ; ne pas modifier `front/src/app/api/`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Changer, Image de l'ancien Sens | « étalé » retenu « cuisine », lié à X (cuisine) ; choix « chute » | Sens retenu « chute », lien vers X supprimé, X intacte, Mot « à illustrer » | N/A |
| Changer, sans Image | Mot « à illustrer », Sens « à compléter » ; choix « fruit » | Sens retenu « fruit », aucun lien | N/A |
| Même Sens | Choix du Sens retenu | `200`, aucune écriture | N/A |
| Sens non visible | Sens d'un collègue (Image privée de Zoé, jamais retenu par Paul) | Rien ne change | 400 `preparation.sens_invalide` |
| Sens d'un autre Mot | Sens de « côté » pour « côte » | Rien ne change | 400 `preparation.sens_invalide` |
| Préparation d'un collègue | `id` de Zoé | Rien | 404 |
| Propositions filtrées | « avocat », Images « fruit » A et « métier » B ; `sensId` fruit | A seule ; Sens « fruit » et « métier » listés | N/A |
| Front, ouverture | Sens retenu « fruit » | Champ sur « fruit », Images « fruit » seules | N/A |
| Front, « à compléter » | Sens retenu « à compléter », Images « fruit » et « métier » | Champ sur « Tous les sens », toutes les Images | N/A |
| Front, changer | Choix « métier » | `PUT …/sens`, Carte mise à jour, liste relue pour « métier », panneau ouvert | N/A |
| Front, un seul Sens | Mot à un seul Sens visible | Sens en lecture, pas de champ | N/A |
| Front, échec | `PUT …/sens` en erreur | Champ revenu au Sens précédent, message dans le panneau | Pas de Bandeau |

</frozen-after-approval>

## Code Map

- `back/src/main/java/fr/corpusmots/vocabulaire/service/Usages.java` -- `remplacerImage` (l.178, `retenu.changerSens` l.195), `sensRetenu`, `liens.supprimerDe` : ajouter le changement de Sens retenu (vérifie Sens du Mot et visible, délie si l'Image liée n'est pas de ce Sens).
- `back/src/main/java/fr/corpusmots/vocabulaire/service/DetectionMots.java` -- `propositions` (l.111) et calcul commun (l.125) : filtre facultatif par Sens des Images montrées, Sens visibles inchangés ; la règle des Sens visibles (Images `proposable` + Sens retenus) est à réutiliser pour la validation.
- `back/src/main/java/fr/corpusmots/vocabulaire/persistance/SensRetenu.java` l.70 -- `changerSens`, `SensRetenuRepository.de`.
- `back/src/main/java/fr/corpusmots/preparations/service/PreparationsService.java` -- `propositions` (l.363), `remplacerImage`, `deLaPreparation` : modèles ; ajouter `changerSens(id, motPreparationId, sensId)`.
- `back/src/main/java/fr/corpusmots/preparations/api/PreparationsResource.java` -- `propositions` (l.195) : paramètre `sensId` ; route `PUT …/sens` et DTO de corps (nom unique, AD-16 ; `SensImageDto` existe déjà côté `vocabulaire`).
- `back/src/test/java/fr/corpusmots/preparations/api/ChoixImagePreparationResourceTest.java` -- fixtures (Sens « fruit »/« métier », liens, Zoé) et assertions « rien n'est écrit ».
- `front/src/app/preparations/panneau-choix-image.ts` -- `libelleSens` (l.222), `plusieursSens` (l.212), lecture des propositions, `choisi` : champ Sens, « Tous les sens », relecture filtrée, émission du Mot mis à jour.
- `front/src/app/preparations/preparation.ts` -- `appliquerChoixImage`, `annoncer` : appliquer le Mot renvoyé par le changement de Sens sans fermer le panneau.
- `front/src/app/commun/carte-identite/carte-identite.ts` -- champ Sens de la story 2.6.4 (libellé « libellé · catégorie », « à compléter » mis en avant) : modèle de rendu.

## Tasks & Acceptance

**Execution:**
- [x] `back/.../vocabulaire/service/` -- changement de Sens retenu, filtre par Sens des propositions.
- [x] `back/.../preparations/` -- route `PUT …/sens`, paramètre `sensId`, DTO.
- [x] `back/src/test/...` -- une ligne de test par ligne back de la matrice, dont « rien n'est écrit » après chaque refus.
- [x] `front/openapi/` -- régénérer et versionner.
- [x] `front/src/app/preparations/` (+ specs) -- champ Sens du panneau, « Tous les sens », changement aussitôt, Carte mise à jour ; une ligne de test par ligne front de la matrice.

**Acceptance Criteria:**
- Given un Sens changé qui délie l'Image, when l'enseignant choisit ensuite une Image de la liste, then elle est liée avec ce Sens et le panneau se ferme.
- Given « Tous les sens » choisi, when l'enseignant choisit une Image d'un Sens, then le Sens retenu devient celui de l'Image (comportement de la partie 3 de la story 2.7).

## Implementation Notes

- Back : `DetectionMots.sensVisibles(images proposables, Sens retenus)` porte la règle unique des Sens visibles, utilisée par le calcul commun et par `sensVisible(motId, sensId)` (vérifie aussi que le Sens est de ce Mot). `propositions(motId, albumId, section, sensId)` filtre les Images montrées ; Sens visibles et Albums restent complets. `Usages.changerSens(ChangerSensCommande)` : même Sens → rien n'est écrit ; sinon Sens du même Mot et visible (`400 preparation.sens_invalide`), `SensRetenu.changerSens`, puis `liens.supprimerDe` si l'Image liée n'est pas de ce Sens. `PreparationsService.changerSens` (Préparation verrouillée). Route `PUT …/sens` (`changerSensMotPreparation`, corps `ChoixSensMotPreparationDto`) ; paramètre `sensId` de `proposerImagesMotPreparation`. Tests : `SensPreparationResourceTest` (« rien n'est écrit » vérifié par `xmin` de la ligne `sens_retenu`).
- Front : `PanneauChoixImage` porte un `mat-select` « Sens » (`FormControl`, désactivé pendant l'envoi), valeur `TOUS_LES_SENS` pour « Tous les sens » ; Sens visibles gardés pendant une relecture pour que le champ ne disparaisse pas ; « à compléter » reconnu par son libellé (`SensPreparationDto` n'a pas d'`aCompleter`). Changement : `sensChange` émis, liste relue avec `sensId`, focus rendu au `MatSelect`. Échec : valeur précédente, message `role="alert"` ; `preparation.sens_invalide` relit aussi la liste. `Preparation.appliquerChangementSens` met la Carte à jour sans fermer le panneau et annonce « Sens de « forme » : libellé. » (+ « Image retirée. »). Paquet initial inchangé : 598,73 kB.

## Spec Change Log

## Review Triage Log

Revue 1 (Blind Hunter BH, Edge Case Hunter EC, Verification Gap VG).

| # | Constat | Verdict | Preuve | Suite |
|---|---------|---------|--------|-------|
| 1 | BH-2, BH-3, EC-6 : champ Sens actif pendant l'envoi d'un choix d'Image ; liste cliquable sans état occupé pendant l'enregistrement du Sens | low | Clic ignoré sans retour, relecture lancée au milieu d'un choix ; correction directe | patch |
| 2 | EC-1 : réponse du changement de Sens ignorée après passage à un autre Mot | medium | Le serveur a délié l'Image mais l'ancienne Carte garde son Sens et son Image | patch |
| 3 | BH-1 : message « Ce sens n'appartient pas à ce mot. » pour un Sens devenu invisible | low | Texte trompeur dans le panneau ; correction directe | patch |
| 4 | VG-2, BH-6 : relecture après `preparation.sens_invalide` sur `PUT …/sens` non testée | medium | Retirer la branche ne ferait échouer aucun test | patch (test, groupé avec 3) |
| 5 | VG-1, EC-2, EC-7 : branche « filtre seul » (« Tous les sens » ↔ Sens retenu) jamais exécutée | medium | Les tests passent tous par le retour anticipé ; restreindre la liste au Sens choisi est voulu (aucune écriture) | patch (test) |
| 6 | BH-9 : annonce sans catégorie | low | Deux Sens de même libellé annoncés pareil ; correction directe | patch |
| 7 | BH-4 : Sens retenu par un collègue seulement non testé | medium | Frontière AD-2 de la règle des Sens visibles sans test | patch (test) |
| 8 | BH-5, EC-3, VG-o : `sensId` des propositions non validé | low | Lecture seule, seules des Images proposables sortent ; liste vide sans fuite | rejeté |
| 9 | BH-7 : « à compléter » reconnu par son libellé | low | Libellé fixe du back (`LIBELLE_A_COMPLETER`), non modifiable par les enseignants (AD-19) ; un drapeau demanderait un champ de plus dans le contrat | rejeté |
| 10 | BH-8 : règle des Sens visibles dans `DetectionMots` | false | La règle AGENTS vise le filtrage des Images, qui reste `VisibiliteImages.proposable` ; une seule règle de Sens, partagée par lecture et écriture | rejeté |
| 11 | BH-10 : repli de `sensProposes` non trié | low | Branche inaccessible : le Sens retenu est toujours visible | rejeté |
| 12 | BH-11 : Mot de Préparation sans Sens retenu → 500 | false | Invariant tenu par `ajouterMot`, `reutiliserImage` et `retablirMot`, qui retiennent toujours un Sens | rejeté |
| 13 | BH-12 : diff sans `front/openapi/` ni documents | false | Exclusion voulue | rejeté |
| 14 | EC-4 : `sensId` mal formé → 404 par défaut | low | Même comportement que les identifiants de chemin existants | rejeté |
| 15 | EC-5 : filtre absent des Sens proposés après relecture | low | Exige un Sens devenu invisible pendant que le panneau est ouvert ; la ligne 3 couvre le refus | rejeté |

## Verification

**Commands:**
- `cd back && ./mvnw -q verify` (JAVA_HOME JDK 25, DOCKER_HOST `npipe:////./pipe/docker_engine`) -- expected: tous les tests passent, ArchUnit compris, `front/openapi/` à jour.
- `cd front && npm test -- --watch=false && npm run build` -- expected: tests et `verifier-jetons` au vert, paquet initial sous 600 kB.
