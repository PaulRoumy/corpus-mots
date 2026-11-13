---
title: 'Story 2.6, partie 3 : Sections, Module et Thèmes d''une Image'
type: 'feature'
created: '2026-11-13'
status: 'done'
baseline_commit: 'c416af4a953f45f02f0f8bdb5ec970d5aee6f10a'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/realisation/epic-2-context.md'
  - '{project-root}/docs/realisation/spec-2-6-2-modifier-la-carte-d-identite.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Une Image n'a encore ni Sections, ni Module, ni Thèmes : la Carte d'identité les affiche « — ». Le propriétaire ne peut donc pas classer ses Images (FR-14), et la suppression d'un Thème porté par une Image n'est pas refusée (FR-5, AD-15).

**Approach:** `vocabulaire` enregistre les Sections (PS, MS, GS, cochées librement), un Module facultatif et des Thèmes pour chaque Image, par un nouveau `PUT /images/{id}/classement` qui remplace ces trois valeurs d'un coup. Il implémente `UtilisationThemes` et observe `ModuleSupprime`. Le panneau du propriétaire les rend modifiables, avec un enregistrement à chaque changement ; les autres enseignants les voient en lecture.

Décisions :
- Sections : puces Material à cocher, avec le Repère de Section (forme, couleur, libellé). Chaque puce cochée ou décochée est enregistrée aussitôt.
- Thèmes : le Champ à étiquettes existant (`commun/champ-themes`), sans limite. « Créer le thème « … » » crée le Thème, puis l'enregistre sur l'Image. Renommer et supprimer un Thème ne sont pas proposés dans le panneau (ils le restent depuis l'En-tête et le dialogue de Thème du Mot).
- Module (décision de Paul) : pour tout type d'Image, Module de n'importe quel Album. Le propriétaire cherche d'abord un Album (recherche existante), puis choisit dans la liste « Aucun module » suivie des Modules de cet Album ; le choix est enregistré aussitôt. Le Module s'affiche « Module 1 · *Roule galette* », en lecture comme pour le propriétaire. Pour une image d'album sans Module, la recherche part de l'Album d'origine. Le Module ne dépend pas du type ni de l'Album d'origine : les changer ne le retire pas.
- Pas de pré-remplissage depuis la Préparation dans cette partie (décision de Paul) : reporté avec la story 2.4, partie 2.
- La spec garde son périmètre entier (environ 2 600 tokens, accepté par Paul).
- Suppression d'un Thème porté par au moins une Image, de n'importe quel enseignant : `409 theme.utilise` (code et message existants).
- Suppression d'un Module : les Images qui le portaient n'ont plus de Module, dans la même transaction.
- Concurrence : un Thème ou un Module ne peut pas être affecté à une Image pendant sa suppression. `referentiels` verrouille la ligne avant de vérifier puis de supprimer ; `vocabulaire` relit Thèmes et Module en verrou partagé avant d'écrire (reprend l'entrée de `deferred-work.md` sur `UtilisationThemes`).

## Boundaries & Constraints

**Always:**
- `PUT /images/{id}/classement` (`sections`, `moduleId`, `themeIds`) renvoie la Carte d'identité à jour, avec `sections` (ordre PS, MS, GS), `module` (`id`, `nom`, `albumId`, `titreAlbum`) et `themes` (`id`, `nom`, triés par nom).
  - Image non consultable ou inexistante : `404 ressource.introuvable`.
  - Image consultable dont l'enseignant n'est pas propriétaire, administrateur compris : `403 image.reservee_au_proprietaire`.
  - Thème inconnu : `400 image.theme_introuvable`. Module inconnu : `400 image.module_introuvable`.
  - Doublons de Sections ou de Thèmes ignorés.
- Vérification de propriété dans `vocabulaire.service.Images`. L'`etat` de l'Image ne change pas (AD-3). `@Version` de l'Image est incrémentée.
- `referentiels` ne lit jamais les tables de `vocabulaire` ; `vocabulaire` ne référence Thème et Module que par UUID, sans clé étrangère (AD-1). Observateur `@Observes` synchrone, `MANDATORY` (AD-15).
- Migrations : une par objet, `V<AAAAMMJJHHMM>__vocabulaire_<objet>.sql` (AD-22), avec un index sur `theme_id` et sur `module_id`.
- Front : en échec, la valeur choisie reste, le champ est signalé et un Bandeau d'erreur apparaît dans le panneau (même mécanique que la partie 2, file d'enregistrement comprise). Chaque nouveau `code` est traduit dans `MESSAGES_PAR_CODE`.
- Paquet initial sous 600 kB.

**Never:**
- Pas de modification du Sens ni de la catégorie (partie 4).
- Pas de changement de `PUT /images/{id}/description` ni de `UtilisationThemes` pour `preparations`.
- Aucun appel HTTP écrit à la main ; ne pas modifier `front/src/app/api/`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Classer | `sections` [ms, gs], Thèmes « animaux », « forêt », Module 1 | 200 ; Carte avec ces valeurs | N/A |
| Tout retirer | `sections` [], `themeIds` [], `moduleId` null | 200 ; « — » partout | N/A |
| Thème inconnu | `themeIds` contient un UUID inexistant | Rien ne change | 400 `image.theme_introuvable` |
| Module inconnu | `moduleId` inexistant | Rien ne change | 400 `image.module_introuvable` |
| Section invalide | `sections` ["cp"] | Rien ne change | 400 `requete.invalide` |
| Collègue, admin | Non-propriétaire, Image consultable | Rien ne change | 403 |
| Non consultable | Image privée d'un collègue, sans lien | Rien | 404 |
| Supprimer un Thème utilisé | « animaux » porté par une Image de Zoé ; Paul, créateur, supprime | Thème gardé | 409 `theme.utilise` |
| Supprimer un Thème libre | Thème porté par aucune Image | 204 | N/A |
| Supprimer un Module | Module 1 porté par deux Images | 204 ; les deux Images sans Module | N/A |
| Échec à l'enregistrement | 500 au clic sur la puce GS | Puce gardée cochée, Sections signalées, Bandeau | Bandeau dans le panneau |
| Non-propriétaire, front | Panneau sur l'Image d'un collègue | Sections (Repères), Module, Thèmes en lecture | N/A |

</frozen-after-approval>

## Code Map

- `back/src/main/java/fr/corpusmots/vocabulaire/service/Images.java` -- `modifierDescription` : modèle (consultable sinon 404, propriétaire sinon 403, `carteIdentite(image, enseignantId)`) ; ajouter `classer`. `carteIdentite` privée : ajouter sections, module et Thèmes (lus par `ReferentielsService.modules`, nouvelle `themes(ids)`).
- `back/src/main/java/fr/corpusmots/vocabulaire/persistance/Image.java` -- `decrire` comme modèle ; ajouter les Sections (`@ElementCollection`, table `image_section`, `SectionConverter`), les Thèmes (`image_theme`) et `module_id`.
- `back/src/main/resources/db/migration/V202611121000__vocabulaire_image.sql` -- forme de la table `image` ; ne pas la modifier.
- `back/src/main/java/fr/corpusmots/referentiels/service/ReferentielsService.java` -- `supprimerTheme` (l.366, boucle sur `UtilisationThemes`) et `supprimerModule` (l.265) : verrouiller la ligne (`PESSIMISTIC_WRITE`) avant la vérification ; ajouter des lectures en verrou partagé (`PESSIMISTIC_READ`) `themesVerrouilles(ids)` et `moduleVerrouille(id)`. Modèle de verrou : `AlbumRepository.verrouiller`.
- `back/src/main/java/fr/corpusmots/preparations/service/ModulesDesPreparations.java` -- modèle de l'observateur `ModuleSupprime` (bulk update `MANDATORY`).
- `back/src/main/java/fr/corpusmots/referentiels/service/UtilisationThemes.java` -- à implémenter dans `vocabulaire.service`.
- `back/src/main/java/fr/corpusmots/vocabulaire/api/ImagesResource.java`, `CarteIdentiteImageDto.java`, `DescriptionImageDto.java` -- ajouter le `PUT`, `ClassementImageDto`, et les nouveaux champs de la Carte (noms de DTO uniques, AD-16).
- `back/src/test/java/fr/corpusmots/vocabulaire/api/DescriptionImageResourceTest.java`, `ImagesDeTest.java` -- modèles de tests et fixtures ; tests de suppression de Thème et de Module dans `referentiels`.
- `front/src/app/commun/carte-identite/carte-identite.ts` -- `Module`, `Thèmes` (l.269, l.370) et `Sections` (gabarit `debutChamps`, l.416) en « — » à remplacer ; file d'enregistrement et erreurs de la partie 2 à réutiliser.
- `front/src/app/commun/champ-themes/champ-themes.ts` -- Champ à étiquettes (`themes`, `choisis`, `choisisChange`, `creer`, `erreur`) ; `preparations/preparation.ts` l.1341 `creerTheme`, modèle.
- `front/src/app/preparations/recherche-albums.ts` -- recherche d'Album déjà utilisée par le champ Album d'origine du panneau, à réutiliser pour le Module ; Modules lus par `listerModulesDeLAlbum` (client généré).
- `front/src/app/commun/repere-section/` -- `Section`, `SECTIONS`, `LIBELLES_SECTION`, Repère de Section.
- `front/src/app/commun/erreurs/message-erreur.ts` -- `MESSAGES_PAR_CODE`.

## Tasks & Acceptance

**Execution:**
- [x] `back/src/main/resources/db/migration/` -- `image_section`, `image_theme`, `image.module_id` (une migration par objet, index).
- [x] `back/.../referentiels/` -- verrous de suppression et lectures en verrou partagé.
- [x] `back/.../vocabulaire/` -- `Images.classer`, Carte enrichie, `UtilisationThemes`, observateur `ModuleSupprime`, `PUT /images/{id}/classement`.
- [x] `back/src/test/...` -- une ligne de test par ligne back de la matrice.
- [x] `front/openapi/` -- régénérer et versionner.
- [x] `front/src/app/commun/carte-identite/` (+ spec) -- Sections, Module, Thèmes en lecture et pour le propriétaire.
- [x] `front/src/app/commun/erreurs/message-erreur.ts` (+ spec) -- `image.theme_introuvable`, `image.module_introuvable`.

**Acceptance Criteria:**
- Given le propriétaire qui coche MS, when la requête réussit, then la puce reste cochée et `GET /images/{id}` renvoie `ms`.
- Given le propriétaire qui crée le Thème « automne » dans le panneau, when la création réussit, then « automne » est enregistré sur l'Image et proposé à toute l'école.

## Implementation Notes

- Back : `PUT /images/{id}/classement` (`classerImage`, corps `ClassementImageDto`) → `Images.classer(UUID, ClasserImageCommande)` : même contrôle que `modifierDescription` (`imageDuProprietaire`, 404 puis 403), Thèmes relus par `ReferentielsService.themesVerrouilles` et Module par `moduleVerrouille` (`FOR SHARE`, `MANDATORY`), puis `Image.classer` (`@ElementCollection` `image_section` avec `SectionConverter`, `image_theme`, colonne `module_id`). `supprimerTheme` et `supprimerModule` verrouillent la ligne (`FOR UPDATE`) avant la vérification. `ThemesDesImages` implémente `UtilisationThemes` ; `ModulesDesImages` observe `ModuleSupprime` (update en masse qui incrémente la version : une écriture concurrente lue avant la suppression échoue au lieu de remettre l'ancien Module). Section inconnue ou listes absentes : `400 requete.invalide`. La Carte renvoie `sections`, `module` (`CarteIdentiteModuleDto`) et `themes` (`CarteIdentiteThemeDto`, triés par nom, collation française). Une annotation `@Schema` ne pouvant pas porter l'énumération des éléments d'une liste, le schéma `SectionImageDto` (classe jamais instanciée) la décrit.
- Migrations `V202611131000__vocabulaire_image_section`, `V202611131010__vocabulaire_image_theme` (index `theme_id`), `V202611131020__vocabulaire_image_module` (index partiel `module_id`) ; `ON DELETE CASCADE` vers `image`.
- Tests back : `ClassementImageResourceTest` (matrice, dont suppressions de Thème et de Module, tests de concurrence dans les deux ordres : un classement attend une suppression en cours puis reçoit 400 ; une suppression par l'API attend une affectation en cours puis répond `409 theme.utilise` ou retire le Module). Placés dans `vocabulaire` plutôt que `referentiels`, pour leurs fixtures d'Images.
- Front : puces Material (`mat-chip-listbox` multiple, forme et libellé de Section, bordure de sa couleur) ; Module : « Album du module » (recherche d'Album, départ sur l'Album du Module ou l'Album d'origine) puis « Module de cet album » (« Aucun module » et les Modules) ; Thèmes : `app-champ-themes` sans menu de gestion. Les Thèmes de l'école sont lus à la première entrée dans le Champ, les Modules au choix d'un Album ou à la première entrée dans la zone du Module : aucune requête de plus à l'ouverture du panneau. Même file d'enregistrement que la description (`Modification`), `champEnErreur` devenu signal (« Non enregistré » sous les Sections et les Thèmes). `ChampThemes.listeOuverte()` : Échap ferme sa liste, pas le panneau. Recherche d'Album factorisée (`RechercheAlbums`) pour l'Album d'origine et l'Album du Module.
- Vérification : `./mvnw verify` au vert (ArchUnit compris), front 522 tests, paquet initial 597,57 kB.

## Spec Change Log

## Review Triage Log

Revue 1 (Blind Hunter BH, Edge Case Hunter EC, Verification Gap VG).

| # | Constat | Verdict | Preuve | Suite |
|---|---------|---------|--------|-------|
| 1 | VG-1, BH-4 : verrou de `supprimerTheme` et `supprimerModule` non testé (ordre classement puis suppression) | medium | `pendantSuppression` supprime en SQL brut, sans passer par le service | patch (test) |
| 2 | BH-1, EC-6 : `retirerModule` n'incrémente pas `version` | low | Une écriture concurrente chargée avant la suppression réécrit l'ancien `module_id` (mise à jour de toute la ligne) | patch |
| 3 | BH-2, BH-10 : « Réessayer » après l'échec de la liste des Modules ne relit rien | medium | `relancer` ne fait qu'effacer le message quand `albumModule` vaut un Album | patch |
| 4 | VG-2, BH-10 : Échap dans la liste ouverte des Thèmes non testé | medium | Aucun test n'atteint `listeOuverte()` | patch (test) |
| 5 | VG-3 : tri des Thèmes par collation française non testé | low | « animaux », « forêt » ont le même ordre en collation et en points de code | patch (test) |
| 6 | BH-8, EC-7 : Javadoc « version incrémentée » | low | Classement identique : Hibernate n'écrit rien | patch |
| 7 | BH-9 : `PUT /description` garde le classement ; `[null]` refusé, non testés | low | Branches sans test | patch (test) |
| 8 | VG, autres : `Thread.sleep(500)` dans les tests de concurrence | low | Un test lent peut passer sans atteindre le verrou ; il échoue bien quand le verrou manque dans le cas normal | rejeté |
| 9 | BH-3 : liste des Modules vide après un changement d'Album | low | Le Module enregistré reste affiché juste au-dessus ; rien n'est envoyé sans choix | rejeté |
| 10 | BH-5 : `image.theme_introuvable` ne dit pas quel Thème | low | Thème supprimé entre son choix et l'envoi, rare ; l'étiquette reste visible et se retire | rejeté |
| 11 | BH-6, EC-2 : aucune limite sur `themeIds` | low | Seul un client modifié à la main enverrait des milliers d'identifiants ; enseignants authentifiés | rejeté |
| 12 | BH-7, EC-3 : Module masqué si son Album est introuvable | false | Aucun Album ne se supprime aujourd'hui (fusion en Epic 6) | rejeté |
| 13 | BH-9, BH-10, autres tests (Module d'un autre Album, Section décochée, étiquette retirée, échec de `listerThemes`) | low | Mêmes chemins que les tests existants | rejeté |
| 14 | BH-11 : ordre PS, MS, GS tiré de l'ordre de l'énumération | low | `Section` déclare déjà ps, ms, gs, l'ordre du domaine | rejeté |
| 15 | BH-12 : spec et contrat absents du diff | false | Exclus volontairement du diff relu ; contrat vérifié par `./mvnw verify` | rejeté |
| 16 | EC-1 : deux `classer` simultanés sur la même Image → 500 | low | File d'enregistrement du front ; seul cas : deux onglets, comme la ligne 10 de la partie 2 | rejeté |
| 17 | EC-4 : Thème créé avant la lecture des Thèmes de l'école | low | Exige l'échec de la lecture puis celui de l'enregistrement ; sinon la Carte renvoyée porte le Thème | rejeté |
| 18 | EC-5 : lecture des Thèmes en vol écrase le Thème créé | false | `themesProposes` ajoute les Thèmes de la Carte renvoyée, qui contient le Thème créé | rejeté |

## Verification

**Commands:**
- `cd back && ./mvnw -q verify` (JAVA_HOME JDK 25, DOCKER_HOST Podman) -- expected: tous les tests passent, ArchUnit compris, `front/openapi/` à jour.
- `cd front && npm test -- --watch=false && npm run build` -- expected: tests et `verifier-jetons` au vert, paquet initial sous 600 kB.
