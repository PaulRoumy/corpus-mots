---
title: 'Story 2.6, partie 4 : Sens et catégorie grammaticale dans la Carte d''identité'
type: 'feature'
created: '2026-11-13'
status: 'done'
baseline_commit: '3e47b42b5c4a1e293af70a8e1c6ee8a4cba6d278'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/realisation/epic-2-context.md'
  - '{project-root}/docs/realisation/spec-2-6-3-sections-module-et-themes.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Le propriétaire ne peut pas changer le Sens de son Image dans la Carte d'identité, notamment pour remplacer un Sens « à compléter » (FR-14). Rien n'empêche non plus de le changer quand l'Image est liée, ce qui casserait l'invariant d'AD-5 (Sens de l'Image = Sens retenu).

**Approach:** `vocabulaire` permet au seul propriétaire de remplacer le Sens de son Image par un autre Sens du même Mot, parmi ceux qui lui sont visibles (AD-2), par un nouveau `PUT /images/{id}/sens`. Le changement est refusé dès que l'Image a un lien, chez quiconque, propriétaire compris (AD-5). La catégorie grammaticale appartient au Sens : elle suit le Sens choisi et reste en lecture.

Décisions :
- Mot et Sens ne sont pas modifiables par les enseignants (AD-19) : on choisit un autre Sens, on ne renomme pas celui-ci. La catégorie n'est donc pas un champ modifiable. Le Sélecteur de catégorie et la Création de Sens arrivent avec la story 2.8.
- Sens proposés : ceux du Mot de l'Image visibles du propriétaire, c'est-à-dire qui portent une Image qui lui est `proposable` ou qu'il a retenus dans l'une de ses Préparations, plus le Sens actuel de l'Image. Chacun s'affiche « libellé · catégorie » (« à compléter » sans catégorie).
- Le Sens choisi est enregistré aussitôt, par la file d'enregistrement de la partie 2.
- Un Sens « à compléter » reste mis en avant (couleur, icône crayon, libellé), y compris dans le champ du propriétaire.
- Image déjà liée (décision de Paul) : dans le panneau du propriétaire, le Sens reste en lecture, et une ligne sous le champ explique d'emblée : « Cette image est utilisée dans une préparation : son sens ne peut plus changer. Pour un autre sens, ajoutez une nouvelle image. » L'API refuse toujours en `409` ; le Bandeau ne sert qu'au lien créé entre l'ouverture du panneau et le choix.

## Boundaries & Constraints

**Always:**
- `PUT /images/{id}/sens` (`sensId`) renvoie la Carte d'identité à jour.
  - Image non consultable ou inexistante : `404 ressource.introuvable`.
  - Non-propriétaire, administrateur compris : `403 image.reservee_au_proprietaire`.
  - Sens d'un autre Mot, inexistant ou non visible du propriétaire : `400 image.sens_invalide`.
  - Image liée dans au moins une Préparation, de n'importe quel enseignant : `409 image.sens_non_modifiable`.
  - Même Sens que l'actuel : 200, rien ne change.
- `GET /images/{id}/sens` renvoie au propriétaire les Sens proposés (`id`, `libelle`, `categorie`, `aCompleter`), le Sens actuel compris ; `404`/`403` comme ci-dessus.
- La Carte d'identité porte `sensModifiable` : vrai seulement pour le propriétaire d'une Image sans aucun lien.
- L'Image est verrouillée (`ImageRepository.verrouillee`, comme `Usages.lierImage`) avant de vérifier l'absence de lien puis d'écrire : aucun lien ne peut être créé entre-temps (AD-17). L'`etat` ne change pas (AD-3).
- La visibilité des Images se décide uniquement par `VisibiliteImages.proposable` ; aucun filtre d'Image ailleurs (AD-2).
- Nouveaux `code` traduits dans `MESSAGES_PAR_CODE`. `image.sens_non_modifiable` : « Cette image est déjà utilisée dans une préparation : son sens ne peut plus changer. Pour un autre sens, ajoutez une nouvelle image. »
- Paquet initial sous 600 kB.

**Never:**
- Pas de création de Sens, ni de modification d'un Mot, d'un libellé ou d'une catégorie.
- Pas de migration.
- Aucun changement des autres champs de la Carte, de `Usages` ni des liens.
- Aucun appel HTTP écrit à la main ; ne pas modifier `front/src/app/api/`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Compléter le Sens | Image de Mes mots sans lien, Sens « à compléter » ; `sensId` = « animal » (nom), retenu par Paul dans une Préparation | 200 ; Sens « animal », catégorie « nom », `aCompleter` faux | N/A |
| Même Sens | `sensId` = Sens actuel | 200, rien ne change | N/A |
| Image liée par le propriétaire | Image liée dans une Préparation de Paul | Rien ne change | 409 `image.sens_non_modifiable` |
| Image liée par un collègue | Image de Paul liée par Zoé | Rien ne change | 409 `image.sens_non_modifiable` |
| Sens d'un autre Mot | `sensId` d'un Sens de « galette » pour une Image de « loup » | Rien ne change | 400 `image.sens_invalide` |
| Sens non visible | Sens retenu seulement par Zoé, sans Image proposable pour Paul | Rien ne change ; absent de `GET …/sens` | 400 `image.sens_invalide` |
| Collègue, admin | Non-propriétaire | Rien ne change | 403 |
| Non consultable | Image privée d'un collègue, sans lien | Rien | 404 |
| Liste des Sens | Mot « loup » : « à compléter », « animal » (retenu par Paul), « méchant » (retenu par Zoé seule) | `GET …/sens` : « à compléter », « animal » | N/A |
| Front, Image sans lien | Panneau du propriétaire | Champ Sens (liste), catégorie en lecture | N/A |
| Front, Image liée | Panneau du propriétaire, `sensModifiable` faux | Sens en lecture, ligne d'explication, aucune requête vers `GET …/sens` | N/A |
| Front, refus 409 | Lien créé entre l'ouverture et le choix | Sens précédent remis, champ signalé, Bandeau avec le message | Bandeau dans le panneau |

</frozen-after-approval>

## Code Map

- `back/src/main/java/fr/corpusmots/vocabulaire/service/Images.java` -- `imageDuProprietaire` (404 puis 403), `classer` et `carteIdentite(image, enseignantId)` : modèles ; ajouter `changerSens`, `sensProposes` et `sensModifiable` dans la Carte.
- `back/src/main/java/fr/corpusmots/vocabulaire/persistance/ImageRepository.java` -- `verrouillee(id)` (`FOR UPDATE`) ; ajouter la lecture des Images d'un ensemble de Sens, à filtrer par `VisibiliteImages.proposable`.
- `back/src/main/java/fr/corpusmots/vocabulaire/persistance/LienImageRepository.java` -- `existe(imageId, enseignantId)` ; ajouter « au moins un lien, tout enseignant ».
- `back/src/main/java/fr/corpusmots/vocabulaire/persistance/SensRetenuRepository.java` -- Sens retenus par un enseignant (`dernierRetenu` comme modèle) ; ajouter les Sens d'un Mot retenus par l'enseignant.
- `back/src/main/java/fr/corpusmots/vocabulaire/persistance/Image.java` -- ajouter le changement de `sensId` (seulement par `Images`).
- `back/src/main/java/fr/corpusmots/vocabulaire/service/Lexique.java` -- `sensDuMot(motId, sensId)`, `vue(Sens)`, `SensVue` ; `Usages.LIBELLE_A_COMPLETER`.
- `back/src/main/java/fr/corpusmots/vocabulaire/service/Usages.java` l.99 -- `lierImage` : verrou de l'Image puis vérification du Sens, l'ordre à respecter.
- `back/src/main/java/fr/corpusmots/vocabulaire/api/ImagesResource.java`, `CarteIdentiteImageDto.java`, `CarteIdentiteSensDto.java` -- ajouter les deux routes, `SensImageDto` (entrée), le DTO de Sens proposé (nom unique, AD-16) et `sensModifiable`.
- `back/src/test/java/fr/corpusmots/vocabulaire/api/ClassementImageResourceTest.java`, `ImagesDeTest.java` -- modèles de tests et fixtures (Image, lien, Sens retenu).
- `front/src/app/commun/carte-identite/carte-identite.ts` -- gabarit `debutChamps` (Sens, catégorie, mise en avant « à compléter ») partagé avec la vue en lecture ; file `enregistrer(champ)` et erreurs des parties 2 et 3 ; chargement au premier focus comme `chargerThemes`.
- `front/src/app/commun/erreurs/message-erreur.ts` -- `MESSAGES_PAR_CODE`.

## Tasks & Acceptance

**Execution:**
- [x] `back/.../vocabulaire/` -- `Images.changerSens`, `Images.sensProposes`, `sensModifiable`, repositories, routes et DTO.
- [x] `back/src/test/...` -- une ligne de test par ligne back de la matrice.
- [x] `front/openapi/` -- régénérer et versionner.
- [x] `front/src/app/commun/carte-identite/` (+ spec) -- champ Sens du propriétaire, catégorie qui suit le Sens, refus.
- [x] `front/src/app/commun/erreurs/message-erreur.ts` (+ spec) -- `image.sens_invalide`, `image.sens_non_modifiable`.

**Acceptance Criteria:**
- Given le propriétaire d'une Image sans lien au Sens « à compléter », when il choisit « animal », then la catégorie affichée devient « nom » et la mise en avant « à compléter » disparaît.
- Given un enseignant qui n'est pas propriétaire, when il ouvre la Carte, then Sens et catégorie restent en lecture, sans requête vers `GET …/sens`.

## Implementation Notes

- Back : `GET /images/{id}/sens` (`listerSensImage`, liste de `SensProposeImageDto`) → `Images.sensProposes` ; `PUT /images/{id}/sens` (`changerSensImage`, corps `SensImageDto`) → `Images.changerSens`. Ordre des contrôles : Image lue sous verrou (`ImageRepository.verrouillee`) puis 404 / 403 (`imageDuProprietaire` avec verrou), même Sens → 200 sans écriture, lien quelconque (`LienImageRepository.existePourImage`) → `409 image.sens_non_modifiable`, Sens hors des Sens visibles → `400 image.sens_invalide`, puis `Image.changerSens`. `sensId` absent : `400 requete.invalide`. Sens visibles (`sensVisibles`) : Sens du Mot (`Lexique.sensDe`) qui portent une Image filtrée par `VisibiliteImages.proposable` (`ImageRepository.deSens`), ou retenus par l'enseignant (`Usages.sensRetenusDuMot`), plus le Sens actuel ; triés « à compléter » d'abord, puis par libellé (collation française). La Carte porte `sensModifiable` (propriétaire et aucun lien). Aucune migration.
- Tests back : `SensImageResourceTest` (matrice, dont la concurrence : un lien créé sous le verrou de l'Image fait attendre puis refuser le changement en 409). Fixtures `ImagesDeTest.sensRetenu`, `effacerSensRetenus`, `sensId`.
- Front : propriétaire d'une Image sans lien : champ « Sens » (`mat-select`, options « libellé · catégorie », déclencheur qui met en avant « à compléter »), Sens lus à la première entrée dans le champ (Bandeau propre en échec, « Réessayer »), enregistrement dans la file existante (champ `sens`). `409 image.sens_non_modifiable` : Sens précédent remis, champ signalé, Bandeau. Image liée : Sens en lecture et `MESSAGE_SENS_FIGE` dessous, aucune lecture. Catégorie toujours en lecture, celle du Sens enregistré.
- Vérification : `./mvnw verify` au vert (ArchUnit compris, contrat régénéré), front 532 tests, `verifier-jetons` au vert, paquet initial 597,82 kB.

## Spec Change Log

## Review Triage Log

Revue 1 (Blind Hunter BH, Edge Case Hunter EC, Verification Gap VG).

| # | Constat | Verdict | Preuve | Suite |
|---|---------|---------|--------|-------|
| 1 | BH-1, EC-2, EC-7 : après un `409`, la liste des Sens reste active | medium | `sensModifiable` reste vrai dans la Carte locale : chaque nouveau choix échoue de nouveau, sans la ligne d'explication | patch |
| 2 | EC-1, BH-2 : liste des Sens jamais relue ; `400 image.sens_invalide` laisse le Sens refusé choisi | medium | Après un changement, l'ancien Sens (visible seulement comme Sens actuel) reste proposé et son choix est refusé | patch |
| 3 | BH-3 : `focusin` du bloc Sens relit la liste au focus du Bandeau | low | Le Bandeau est dans le bloc ; correction directe | patch |
| 4 | VG-1, BH-10 : « à compléter » d'abord, non testé | low | La collation française place déjà « à compléter » avant « animal » et « méchant » | patch (test) |
| 5 | BH-7 : `sensVisibles` charge toutes les Images des Sens du Mot | maybe-false | Peu d'Images par Mot aujourd'hui ; à mesurer quand la Banque partagée grossira (Epic 3) | defer |
| 6 | EC-3 : rechoisir le Sens enregistré après une erreur laisse le Bandeau | low | Avec la ligne 2, le Sens enregistré est remis après un `400` ; cas résiduel après une erreur réseau, rare | rejeté |
| 7 | BH-4 : deux `dl` autour du champ Sens ; ligne d'explication sans `aria-describedby` | low | Même découpage que les champs des parties 2 et 3 ; la ligne suit le champ dans l'ordre de lecture | rejeté |
| 8 | BH-5 : message du `409` écrit deux fois, avec des mots différents | low | Les deux textes viennent de la spec (décision et contrainte) | rejeté |
| 9 | BH-6 : le test « même Sens » n'atteint pas la branche d'égalité | low | `mat-select` n'émet rien pour la même option ; la branche est couverte côté back | rejeté |
| 10 | BH-8 : deux lectures des liens dans `changerSens` | low | Une requête d'existence de plus, sous verrou déjà pris | rejeté |
| 11 | BH-9, EC-6 : test de concurrence fondé sur `Thread.sleep(500)` ; course inverse avec `lierImage` | low | Échoue bien sans verrou dans le cas normal ; `lierImage` vérifie le Sens après son propre verrou (story 2.4) | rejeté |
| 12 | BH-11 : `sensModifiable` d'un non-propriétaire, Images `abandonnee`, Sens d'un autre Mot, non testés côté back | low | Mêmes chemins que les tests existants ; l'état `abandonnee` n'existe qu'avec l'Epic 3 | rejeté |
| 13 | BH-12 : erreurs absentes d'OpenAPI | false | Convention du projet : seules les réponses 200 sont déclarées, les `code` sont documentés en Javadoc (AD-7) | rejeté |
| 14 | BH-13 : spec et contrat absents du diff | false | Exclus volontairement ; contrat vérifié par `./mvnw verify` | rejeté |
| 15 | EC-4 : flèches sur la liste fermée, un `PUT` par Sens traversé | low | Comportement Material déjà accepté pour Type et Module ; la file sérialise, chaque état est valide | rejeté |
| 16 | EC-5 : un non-propriétaire prend un verrou `FOR UPDATE` avant le `403` | low | Verrou relâché aussitôt avec la transaction refusée | rejeté |

## Verification

**Commands:**
- `cd back && ./mvnw -q verify` (JAVA_HOME JDK 25, DOCKER_HOST Podman) -- expected: tous les tests passent, ArchUnit compris, `front/openapi/` à jour.
- `cd front && npm test -- --watch=false && npm run build` -- expected: tests et `verifier-jetons` au vert, paquet initial sous 600 kB.
