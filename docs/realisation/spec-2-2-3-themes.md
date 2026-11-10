---
title: 'Story 2.2, partie 3 : Thèmes'
type: 'feature'
created: '2026-11-10'
status: 'done'
baseline_commit: 'dc0b3c9201eaf4e1402978195b484e039c929f91'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/realisation/epic-2-context.md'
  - '{project-root}/docs/realisation/spec-2-2-2-modules.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** La liste commune des Thèmes ne s'enrichit pas : l'En-tête et le Dialogue « Nouvelle préparation » ne proposent que des Thèmes insérés à la main, et personne ne peut renommer ni supprimer un Thème (FR-5, UX-DR-17).

**Approach:** `referentiels` crée, renomme et supprime les Thèmes, en gardant leur créateur, comme les Modules de la partie 2. Le Thème par défaut devient un Champ à étiquettes (UX-DR-17) dans l'En-tête et dans le Dialogue : la frappe propose les Thèmes existants, « Créer le thème « … » » en crée un pour toute l'école. La suppression d'un Thème utilisé est refusée ; pour le savoir, `referentiels` interroge les implémentations de l'interface `UtilisationThemes` des modules aval (AD-15). La suppression émet l'événement synchrone `ThemeSupprime`, que `preparations` observe pour retirer ce Thème par défaut de ses Préparations dans la même transaction.

Partie 3 de la story 2.2, découpée par Paul ; « Corriger l'album » (partie 4) reste dans `deferred-work.md`.

Décision de Paul : le Thème par défaut reste unique (`theme_defaut_id`, partie 1). Le Champ à étiquettes de l'En-tête et du Dialogue n'en porte qu'une : choisir un autre Thème remplace l'étiquette, et la retirer laisse la Préparation sans Thème par défaut. Le composant prend une limite (1 ici, plusieurs pour la Carte d'identité en story 2.6).

## Boundaries & Constraints

**Always:**
- Mêmes règles que les Modules (partie 2) : nom nettoyé par `TitresAlbums.nettoyer`, 1 à 200 caractères (`400 theme.nom_invalide`) ; nom unique dans l'école, comparé par `TitresAlbums.normaliser` (`409 theme.deja_existant`), à la création comme au renommage ; renommer ou supprimer réservé au créateur et au rôle `admin` (`403 theme.reserve_au_createur`), un Thème sans créateur n'étant géré que par l'administrateur ; menu caché aux autres enseignants ; suppression après le Dialogue de confirmation.
- Un Thème utilisé (selon `UtilisationThemes`) n'est pas supprimé : `409 theme.utilise`, message explicite. Être le Thème par défaut d'une Préparation ne compte pas comme une utilisation (EXPERIENCE : seules les Images bloquent).
- Chaque nouveau `code` d'erreur est traduit dans `MESSAGES_PAR_CODE`.

**Never:**
- Pas de renommage ni de suppression depuis le Dialogue « Nouvelle préparation » (pas de dialogue sur un dialogue) : il ne propose que la création.
- Pas d'implémentation de `UtilisationThemes` dans `vocabulaire` (story 2.6) ; `referentiels` ne lit jamais une table d'un autre module.
- Pas de Carte d'identité ni d'Import (stories 2.6 et Epic 5).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Créer | `POST /api/themes {nom}` | 201 `ThemeDto` avec `createurId` = enseignant courant | — |
| Nom invalide | vide, blanc ou plus de 200 caractères (création ou renommage) | 400 `theme.nom_invalide`, rien n'est modifié | — |
| Nom déjà pris | nom d'un autre Thème, à la casse, aux accents ou à l'article près (renommer un Thème en son propre nom est accepté) | 409 `theme.deja_existant`, rien n'est modifié | — |
| Renommer | `PUT /api/themes/{id}/nom {nom}` par le créateur ou un administrateur | 200 `ThemeDto` renommé | — |
| Supprimer | `DELETE /api/themes/{id}` par le créateur ou un administrateur, Thème non utilisé | 204 ; les Préparations qui l'avaient pour Thème par défaut n'en ont plus | — |
| Thème utilisé | une implémentation de `UtilisationThemes` répond vrai | 409 `theme.utilise`, rien n'est modifié | — |
| Pas le créateur | renommer ou supprimer par un autre enseignant | 403 `theme.reserve_au_createur`, rien n'est modifié | — |
| Thème inconnu | renommer ou supprimer un `id` inexistant | 404 `ressource.introuvable` | — |

</frozen-after-approval>

## Code Map

- `back/src/main/java/fr/corpusmots/referentiels/service/ReferentielsService.java` -- `creerModule`, `renommerModule`, `supprimerModule`, `moduleGerable`, `nomDeModule`, `verifierNomLibre` (partie 2) : modèle à reprendre pour les Thèmes ; `themes()`, `theme(id)`, `vue(Theme)` à compléter.
- `back/src/main/java/fr/corpusmots/referentiels/persistance/{Theme,ThemeRepository}.java` -- `Theme` sans fabrique, mutateur ni créateur ; `parNom()`.
- `back/src/main/resources/db/migration/V202611091000__referentiels_album.sql` -- publiée : `theme (nom, theme_nom_unique UNIQUE(nom))`. Ne pas la modifier.
- `back/src/main/java/fr/corpusmots/referentiels/api/{ThemesResource,ThemeDto,ModulesResource,NomModuleDto}.java` -- Resource à étendre ; modèle de renommage et de suppression.
- `back/src/main/java/fr/corpusmots/referentiels/service/ModuleSupprime.java`, `preparations/service/ModulesDesPreparations.java`, `PreparationRepository.retirerModule` -- modèle de l'événement et de son observateur (`@Transactional(MANDATORY)`).
- `back/src/test/java/fr/corpusmots/referentiels/api/{ModulesResourceTest,ReferentielsDeTest}.java` -- modèle des tests (créateur, administrateur, autre enseignant, sans créateur, concurrence avec `pendantVerrouAlbum`).
- `front/src/app/preparations/preparation.ts` -- `mat-select` Thème (« Aucun thème »), `choisirTheme`, `enregistrer`, menu « Actions du module », `supprimerModule`/`relire`, `retirerModuleDisparu` après `preparation.module_invalide` : modèles pour le Thème.
- `front/src/app/preparations/nouvelle-preparation-dialogue.ts` -- `mat-select` Thème, chargement de `listerThemes` et son erreur par source.
- `front/src/app/preparations/champ-nom-module.ts` -- champ en ligne réutilisable pour le renommage d'un Thème.
- `front/src/app/commun/{dialogue-confirmation,compte-courant}.ts`, `commun/erreurs/message-erreur.ts` -- confirmation, droits du menu, traductions.
- `docs/ux-designs/ux-corpus-mots-2026-10-28/DESIGN.md:376`, `EXPERIENCE.md:149` -- Champ à étiquettes : puces d'entrée M3 `secondary-container`, `{rounded.sm}`, suggestions en menu sous le champ, Entrée ajoute, Retour arrière retire la dernière, menu de l'étiquette.

## Tasks & Acceptance

**Execution:**
- [x] `back/src/main/resources/db/migration/V202611101400__referentiels_theme_createur.sql` -- `createur_id uuid NULL` sur `theme`, sans clé étrangère.
- [x] `back/src/main/java/fr/corpusmots/referentiels/persistance/{Theme,ThemeRepository}.java` -- fabrique, `renommer`, `createurId`, identifiant `uuidv7()`.
- [x] `back/src/main/java/fr/corpusmots/referentiels/service/{ReferentielsService,ThemeVue,ThemeSupprime,UtilisationThemes}.java` -- `creerTheme`, `renommerTheme`, `supprimerTheme` (404, 403, puis `theme.utilise` si une implémentation injectée par `Instance<UtilisationThemes>` répond vrai, puis `ThemeSupprime` synchrone, puis suppression) ; création et renommage sous `pg_advisory_xact_lock` dédié aux Thèmes, pour l'unicité normalisée ; un code commun avec les Modules n'est factorisé que s'il reste lisible.
- [x] `back/src/main/java/fr/corpusmots/referentiels/api/{ThemesResource,ThemeDto}.java` -- `POST /themes` (`creerTheme`), `PUT /themes/{id}/nom` (`renommerTheme`, corps `NomThemeDto`), `DELETE /themes/{id}` (`supprimerTheme`) ; `createurId` facultatif dans `ThemeDto`.
- [x] `back/src/main/java/fr/corpusmots/preparations/service/ThemesDesPreparations.java` + `PreparationRepository` -- `@Observes ThemeSupprime` : `theme_defaut_id` mis à `null` pour toutes les Préparations.
- [x] `back/src/test/java/fr/corpusmots/referentiels/api/ThemesResourceTest.java` + `preparations/api/PreparationsResourceTest.java` -- une ligne de test par ligne de la matrice ; « Thème utilisé » par une implémentation de test de `UtilisationThemes` pilotable ; deux créations simultanées du même nom ; Préparations de deux enseignants sans Thème par défaut après suppression.
- [x] `front/openapi/` -- régénérer par `./mvnw package -DskipTests` et versionner.
- [x] `front/src/app/commun/champ-themes/champ-themes.ts` + `.scss` + spec -- Champ à étiquettes (`MatChipGrid` + `MatAutocomplete`) : entrées `themes` (liste), `choisis` (identifiants), `limite`, `gerable(theme)` ; sorties `choisisChange`, `creer(nom)`, `renommer(theme)`, `supprimer(theme)`. Frappe → Thèmes non choisis dont le nom normalisé contient la saisie ; « Créer le thème « … » » si aucun nom normalisé n'est égal ; Entrée ajoute la proposition mise en avant ; Retour arrière dans un champ vide retire la dernière étiquette ; à la limite atteinte, ajouter remplace la dernière ; menu de l'étiquette (« Renommer », « Supprimer ») seulement si `gerable`.
- [x] `front/src/app/preparations/preparation.ts` + `.scss` -- Thème par défaut en Champ à étiquettes ; créer, renommer (champ en ligne comme le Module) et supprimer (confirmation puis relecture) comme le Module ; après `preparation.theme_introuvable`, relire les Thèmes et retirer le Thème disparu.
- [x] `front/src/app/preparations/nouvelle-preparation-dialogue.ts` -- Thème par défaut en Champ à étiquettes, création seulement, erreur de création sous le champ.
- [x] `front/src/app/commun/erreurs/message-erreur.ts` + spec -- `theme.nom_invalide` « Le nom du thème doit compter de 1 à 200 caractères. », `theme.deja_existant` « Un thème de ce nom existe déjà. », `theme.reserve_au_createur` « Seuls le créateur du thème et l'administrateur peuvent le modifier. », `theme.utilise` « Ce thème est utilisé par des images : réaffectez-les avant de le supprimer. ».
- [x] `front/src/app/preparations/{preparation,nouvelle-preparation-dialogue}.spec.ts` -- créer, choisir au clavier, Retour arrière, menu selon les droits, renommer, supprimer confirmé ou refusé (`theme.utilise`), relecture après `theme_introuvable`.

**Acceptance Criteria:**
- Given le Champ à étiquettes, when l'enseignant tape « cuis », then les Thèmes contenant « cuis » sont proposés ; when il tape un nom inconnu puis choisit « Créer le thème « … » », then le Thème est créé, choisi, enregistré, et un collègue le voit proposé.
- Given une étiquette d'un Thème créé par un collègue, then son menu n'est pas proposé.
- Given le clavier seul, then on ajoute, retire et gère une étiquette sans souris, et chaque élément a une étiquette lue par un lecteur d'écran.

## Implementation Notes

- Ordre des refus, comme les Modules : création 400 puis 409 ; renommage 404, 403 (avant le nom), 400, 409 ; suppression 404, 403, puis `409 theme.utilise` (un autre enseignant reçoit 403 même si le Thème est utilisé).
- Verrou : `ThemeRepository.verrouillerNoms`, `pg_advisory_xact_lock(hashtext('referentiels.themes'))`, pris à la création et au renommage après la validation du nom. Le test de concurrence tient ce verrou (`ReferentielsDeTest.pendantVerrouThemes`) pendant que deux créations partent.
- `UtilisationThemes` est injectée par `Instance<UtilisationThemes>` et parcourue entièrement ; en test, `UtilisationThemesDeTest` (bean `@ApplicationScoped` des sources de test, vide par défaut) la rend pilotable.
- `ThemesDesPreparations` porte `@Transactional(MANDATORY)` et vide `theme_defaut_id` par un `update` en masse.
- Front : `commun/champ-themes/` (MatChipGrid + MatAutocomplete). `normaliserNom` y reproduit `TitresAlbums.normaliser` pour les propositions ; le back reste seul juge de l'unicité. Le menu d'une étiquette gérable est porté par la puce elle-même (`matMenuTriggerFor` sur `mat-chip-row`), ouvert au clic, à Entrée ou à Espace, et annoncé par `aria-description` ; Échap rend le focus à la puce. Retour arrière est écouté en capture sur l'hôte, avant `matChipInput` qui sinon ne ferait que donner le focus à la dernière puce. `matChipInputSeparatorKeyCodes` est vide : Entrée passe par l'autocomplete (`autoActiveFirstOption`).
- Après « Créer le thème « … » », la saisie reste affichée jusqu'à ce que `choisis` change (création réussie) ; en échec, le message s'affiche sous le champ et disparaît à la frappe suivante.
- En-tête : le Champ à étiquettes s'affiche dès que les listes sont chargées, même sans Thème (pour en créer un) ; « Renommer » ouvre `ChampNomModule` (« Nouveau nom du thème ») à la place du champ. `relire(source)` relit la Préparation et les listes après la suppression d'un Module ou d'un Thème et ne reprend que le champ concerné ; Bandeau `erreur-theme` propre aux suppressions de Thème, dont « Réessayer » ne renvoie pas un refus (403, `theme.utilise`).
- Dialogue : Champ à étiquettes sans `gerable` (aucun menu) ; « Créer » et « Annuler » désactivés et `disableClose` pendant la création d'un Thème.
- Jeton ajouté : `--cm-largeur-saisie-etiquette` (largeur minimale de la saisie à côté des puces).

## Spec Change Log

## Review Triage Log

Revue 1 (Blind Hunter BH, Edge Case Hunter EC, Verification Gap VG).

| # | Constat | Verdict | Preuve | Suite |
|---|---------|---------|--------|-------|
| 1 | VG-2, BH-5b : le verrou des noms dans `renommerTheme` n'est exercé par aucun test | medium | Constat vérifié par la couche VG | patch |
| 2 | VG-3 : suppression d'un Thème répondue 404 ou 403, et relecture en échec, non testées | medium | Constat vérifié par la couche VG ; seules les variantes Module existent | patch |
| 3 | VG autre : le test « Supprimer » confirmé ne distingue pas la relecture du Thème de celle du Module | low | Même `moduleId` avant et après ; correction du test seulement | patch |
| 4 | VG-1, BH-5a : le test de créations simultanées peut passer sans le verrou (attente de 500 ms) | low | Le test vérifie bien le verrou présent ; le rendre déterministe demande un point d'arrêt de test dans le service | rejeté |
| 5 | BH-1 : page Données personnelles non mise à jour pour `theme.createur_id` | medium | Déjà reporté (partie 2, ligne 13) ; l'entrée de `deferred-work.md` cite désormais les Thèmes | report (entrée existante) |
| 6 | BH-2 : `createur_id` non traité à la suppression d'un compte | false | Un Enseignant n'est jamais effacé, il est anonymisé (AD-6) : l'UUID reste valide | rejeté |
| 7 | BH-3, EC-3 : un réglage simultané à la suppression peut garder un Thème par défaut supprimé | low | Même course que les Modules (partie 2, ligne 5) ; la lecture l'ignore | rejeté |
| 8 | BH-4, EC-2 : renommage pendant une suppression, 500 au lieu de 404 | low | Course improbable ; il faudrait relire sous verrou | rejeté |
| 9 | EC-1 : deux suppressions simultanées, la seconde en 500 | low | « Réessayer » reçoit ensuite 404, traité comme « déjà supprimé » | rejeté |
| 10 | EC-4 : `UtilisationThemes` interrogée sans verrou face à une affectation simultanée (story 2.6) | maybe-false | Aucune affectation n'existe encore ; à régler quand `vocabulaire` implémentera l'interface | report |
| 11 | BH-6 : clé du verrou écrite dans le service et dans le test | low | Sans dérive aujourd'hui | rejeté |
| 12 | BH-7 : tri local `localeCompare` différent de la collation du back | low | Ordre rétabli au rechargement | rejeté |
| 13 | BH-8 : Entrée sur « Créer le thème « … » » crée un Thème pour toute l'école | false | Comportement voulu par UX-DR-17 et l'intention | rejeté |
| 14 | BH-9 : le champ reste utilisable pendant une création dans l'En-tête | low | Fenêtre courte ; il faudrait un état de plus | rejeté |
| 15 | BH-10 : erreurs absentes du contrat OpenAPI | low | Convention du back (2.1, ligne 13) | rejeté |
| 16 | BH-11 : le message `theme.utilise` cite les Images | low | Texte d'EXPERIENCE.md ; seul `vocabulaire` implémentera l'interface | rejeté |
| 17 | BH-12 : nettoyage du nom côté front différent pour une espace insécable ; `maxlength` compte les espaces de tête | low | Cas rare ; le back fait foi | rejeté |
| 18 | BH-13 : renommage du Thème par `ChampNomModule` | low | Composant neutre dans son comportement ; renommage sans effet pour l'enseignant | rejeté |
| 19 | BH-14 : aides de test copiées dans trois specs | low | Sans dérive aujourd'hui | rejeté |
| 20 | BH-15 : cas de test du back en plus (refus `theme.utilise` sur les Préparations, corps `{}`, créateur administrateur) | low | Comportements couverts par la même logique que les cas testés | rejeté |
| 21 | EC-5 : Retour arrière avec un identifiant choisi absent de la liste | low | Le retirer est le bon résultat (Thème disparu) | rejeté |
| 22 | EC-6 : `limite` à 0 | false | Aucun appelant ne passe une limite inférieure à 1 | rejeté |
| 23 | EC-7 : `maxLength` du schéma compte le nom brut | low | Même convention que les Modules ; le back fait foi | rejeté |

## Design Notes

- `UtilisationThemes` : `boolean utilise(UUID themeId)`, déclarée dans `referentiels.service`, implémentée par les modules aval (`vocabulaire` en 2.6). Aucune implémentation en production pour l'instant : la suppression n'est refusée que dans les tests, par un bean de test.
- Unicité : `theme_nom_unique` ne protège que le nom exact ; la comparaison normalisée se fait sous `pg_advisory_xact_lock` (il n'y a pas d'Album à verrouiller), comme la règle « au moins un administrateur » d'AD-6.

## Verification

**Commands:**
- `cd back && ./mvnw verify` -- expected : vert, ArchUnit compris ; `front/openapi/` réécrit.
- `cd front && npm test -- --watch=false && npm run build` -- expected : vert, `verifier-jetons` compris, paquet initial sous 600 kB.

**Manual checks (if no CLI):**
- Avec `compose.dev.yaml`, `quarkus:dev` et `npm start` : créer un Thème depuis l'En-tête, le voir proposé depuis un autre compte, le renommer, le supprimer, et vérifier que la Préparation n'a plus de Thème par défaut.
