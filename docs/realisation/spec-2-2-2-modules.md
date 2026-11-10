---
title: 'Story 2.2, partie 2 : Modules'
type: 'feature'
created: '2026-11-10'
status: 'done'
baseline_commit: 'ed58d0bea33f62c6ce8c0189fb33121c9b5437cb'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/realisation/epic-2-context.md'
  - '{project-root}/docs/realisation/spec-2-2-en-tete-de-preparation-modifiable.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Les Modules d'un Album ne se créent pas encore : les listes de l'En-tête et du Dialogue « Nouvelle préparation » ne proposent que des Modules insérés à la main. Personne ne peut non plus renommer ni supprimer un Module (FR-5, story 2.2).

**Approach:** `referentiels` crée, renomme et supprime les Modules, en gardant leur créateur. « Nouveau module » est ajouté en fin d'Album depuis l'En-tête et depuis le Dialogue. Renommer et supprimer se font depuis le menu du Module dans l'En-tête, réservé au créateur et à l'administrateur. La suppression émet l'événement synchrone `ModuleSupprime`, que `preparations` observe pour retirer le Module de ses Préparations dans la même transaction (AD-15).

Partie 2 de la story 2.2, découpée par Paul : les Thèmes (partie 3) et « Corriger l'album » (partie 4) restent dans `deferred-work.md`.

Décision de Paul : deux Modules d'un même Album ne portent pas le même nom. La comparaison ignore la casse, les accents et les espaces superflus (`TitresAlbums.normaliser`), à la création comme au renommage : `409 module.deja_existant`.

## Boundaries & Constraints

**Always:**
- Un Module créé est visible de tous aussitôt, ajouté après le dernier Module de l'Album (deux créations simultanées ne prennent pas la même place).
- Nom du Module nettoyé comme un titre d'Album (`TitresAlbums.nettoyer`), de 1 à 200 caractères, sinon `400 module.nom_invalide`.
- Renommer ou supprimer : créateur du Module ou rôle `admin`, sinon `403 module.reserve_au_createur`. Un Module sans créateur (inséré avant cette partie) n'est géré que par l'administrateur. Les autres enseignants ne voient pas le menu.
- Supprimer passe par le Dialogue de confirmation existant. Les Préparations qui avaient ce Module n'en ont plus, chez tous les enseignants.
- Chaque nouveau `code` d'erreur est traduit dans `MESSAGES_PAR_CODE`.

**Never:**
- Pas de renommage ni de suppression depuis le Dialogue « Nouvelle préparation » (pas de dialogue sur un dialogue).
- Pas de réordonnancement des Modules ; pas de Thèmes ; pas de « Corriger l'album ».
- `referentiels` ne modifie jamais une table de `preparations` : seul l'observateur de `preparations` le fait.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Créer | `POST /api/albums/{id}/modules {nom}` | 201 `ModuleDto` avec `createurId` = enseignant courant, `ordre` = dernier + 1 | — |
| Album inconnu | `POST` sur un Album inexistant | 404 `ressource.introuvable` | — |
| Nom invalide | nom vide, blanc ou de plus de 200 caractères (création ou renommage) | 400 `module.nom_invalide`, rien n'est modifié | — |
| Renommer | `PUT /api/modules/{id}/nom {nom}` par le créateur ou un administrateur | 200 `ModuleDto` renommé | — |
| Supprimer | `DELETE /api/modules/{id}` par le créateur ou un administrateur | 204 ; les Préparations qui l'avaient n'ont plus de Module | — |
| Nom déjà pris | nom d'un autre Module du même Album, à la casse ou aux accents près (création ou renommage ; renommer un Module en son propre nom est accepté) | 409 `module.deja_existant`, rien n'est modifié | — |
| Pas le créateur | renommer ou supprimer par un autre enseignant | 403 `module.reserve_au_createur`, rien n'est modifié | — |
| Module inconnu | renommer ou supprimer un `id` inexistant | 404 `ressource.introuvable` | — |

</frozen-after-approval>

## Code Map

- `back/src/main/java/fr/corpusmots/referentiels/service/ReferentielsService.java` -- `creerAlbum` est le modèle (nettoyage, codes, `enseignantCourant`) ; `modulesDeLAlbum` porte le 404 d'Album ; `vue(Module)` à compléter.
- `back/src/main/java/fr/corpusmots/referentiels/persistance/{Module,ModuleRepository,AlbumRepository}.java` -- `Module` sans fabrique ni mutateur, sans créateur ; `ModuleRepository.deLAlbum` ordonne par `ordre`.
- `back/src/main/resources/db/migration/V202611091000__referentiels_album.sql` -- publiée : `module (album_id FK, nom, ordre, UNIQUE(album_id, ordre))`. Ne pas la modifier.
- `back/src/main/java/fr/corpusmots/referentiels/api/{AlbumsResource,ModuleDto}.java` -- modèle de Resource (corps nul → `requete.invalide`, `@ResponseStatus(201)`).
- `back/src/main/java/fr/corpusmots/commun/service/EnseignantCourant.java`, `comptes/api/EnseignantDuJeton.java` -- seule implémentation ; le rôle se lit par `SecurityIdentity.hasRole("admin")` (`ComptesService.ROLE_ADMINISTRATEUR`, cf. `MonCompteResource`).
- `back/src/main/java/fr/corpusmots/preparations/{service/PreparationsService,persistance/PreparationRepository}.java` -- colonne `module_id` ; aucun observateur existant dans le back.
- `back/src/test/java/fr/corpusmots/referentiels/api/{AlbumsResourceTest,ReferentielsDeTest}.java`, `preparations/api/PreparationsResourceTest.java` -- `@TestSecurity(user = …, roles = "admin")` pour l'administrateur (cf. `ComptesResourceTest`).
- `front/src/app/preparations/preparation.ts` -- `mat-select` Module (l. 139-151), `choisirModule`, `enregistrer` (file d'un envoi), `chargerListes`, trois Bandeaux d'erreur ; pas de `MatMenuModule`. Spec en `HttpTestingController` (`ouvrir`, `choisir`, `reglage`).
- `front/src/app/preparations/nouvelle-preparation-dialogue.ts` -- `mat-select` Module (l. 287-297), `chargerModules` gardé par `dernierChargementModules`, erreurs par source (`ErreurAffichee`), option sentinelle `OPTION_CREER_ALBUM` et volet en ligne : modèle de « Nouveau module ».
- `front/src/app/administration/comptes/comptes.ts:225-253` -- modèle de menu d'actions (`matMenuTriggerFor`, `aria-label`).
- `front/src/app/commun/dialogue-confirmation/dialogue-confirmation.ts` -- `DialogueConfirmation.confirmer({titre, phrase, libelleConfirmer})` → `Promise<boolean>`.
- `front/src/app/commun/compte-courant.ts` -- `compte()?.id`, `administrateur()`.
- `front/src/app/commun/erreurs/message-erreur.ts` -- `acces.refuse` parle de l'administrateur seul : d'où un code propre aux Modules.

## Tasks & Acceptance

**Execution:**
- [x] `back/src/main/resources/db/migration/V202611101000__referentiels_module_createur.sql` -- `createur_id uuid NULL` sur `module` (sans clé étrangère, AD-22).
- [x] `back/src/main/java/fr/corpusmots/commun/service/EnseignantCourant.java` + `comptes/api/EnseignantDuJeton.java` -- `boolean administrateur()`, lu dans le jeton.
- [x] `back/src/main/java/fr/corpusmots/referentiels/persistance/{Module,ModuleRepository,AlbumRepository}.java` -- fabrique `Module.nouveau`, `renommer`, `createurId` ; dernier `ordre` de l'Album ; verrou de l'Album (`PESSIMISTIC_WRITE`) avant de calculer la place.
- [x] `back/src/main/java/fr/corpusmots/referentiels/service/{ReferentielsService,ModuleVue,ModuleSupprime,NouveauModuleCommande}.java` -- `creerModule`, `renommerModule`, `supprimerModule` (404, puis 403, puis `Event<ModuleSupprime>.fire` synchrone, puis suppression) ; `ModuleVue.createurId`.
- [x] `back/src/main/java/fr/corpusmots/referentiels/api/{AlbumsResource,ModulesResource,ModuleDto,NomModuleDto}.java` -- `POST /albums/{id}/modules` (`creerModule`), `PUT /modules/{id}/nom` (`renommerModule`), `DELETE /modules/{id}` (`supprimerModule`) ; `createurId` facultatif dans `ModuleDto`.
- [x] `back/src/main/java/fr/corpusmots/preparations/service/ModulesDesPreparations.java` + `PreparationRepository` -- `@Observes ModuleSupprime` : `module_id` mis à `null` pour toutes les Préparations de ce Module, dans la transaction de l'émetteur.
- [x] `back/src/test/java/fr/corpusmots/referentiels/api/ModulesResourceTest.java` + `preparations/api/PreparationsResourceTest.java` -- une ligne de test par ligne de la matrice (créateur, administrateur, autre enseignant, Module sans créateur), « rien n'est modifié » relu en base, et Préparations de deux enseignants sans Module après suppression.
- [x] `front/openapi/` -- régénérer par `./mvnw package -DskipTests` et versionner.
- [x] `front/src/app/preparations/preparation.ts` + `.scss` -- dans le `mat-select` Module, toujours affiché, une dernière option « Nouveau module » ouvre un champ en ligne (« Nom du nouveau module », Entrée ou « Ajouter » crée, Échap ou « Annuler » referme) ; le Module créé est ajouté à la liste et choisi, donc enregistré. À côté du Module choisi, un bouton menu « Actions du module » (créateur ou administrateur) : « Renommer » (même champ en ligne, prérempli) et « Supprimer » (Dialogue de confirmation, puis rechargement de la Préparation et des Modules). Après `preparation.module_invalide`, recharger les Modules et retirer le Module disparu (report de la partie 1).
- [x] `front/src/app/preparations/nouvelle-preparation-dialogue.ts` + `.scss` -- même option « Nouveau module » et champ en ligne, Module créé choisi ; erreur de création dans le champ en ligne.
- [x] `front/src/app/commun/erreurs/message-erreur.ts` + spec -- `module.nom_invalide` « Le nom du module doit compter de 1 à 200 caractères. », `module.reserve_au_createur` « Seuls le créateur du module et l'administrateur peuvent le modifier. », `module.deja_existant` « Un module de ce nom existe déjà pour cet album. ».
- [x] `front/src/app/preparations/{preparation,nouvelle-preparation-dialogue}.spec.ts` -- créer (Entrée, Échap), menu visible seulement pour le créateur et l'administrateur, renommer, supprimer confirmé ou annulé, échecs affichés, rechargement après `module_invalide`.

**Acceptance Criteria:**
- Given l'En-tête ou le Dialogue, when l'enseignant choisit « Nouveau module » et saisit un nom, then le Module apparaît en fin de liste, choisi, et un collègue le voit en ouvrant la liste.
- Given un Module créé par un collègue, when l'enseignant ouvre l'En-tête, then le menu « Actions du module » n'est pas affiché.
- Given le clavier seul, then « Nouveau module », le champ en ligne et le menu sont atteignables, avec des étiquettes lues par un lecteur d'écran.

## Implementation Notes

- Ordre des refus : création 404 (Album) puis 400 puis 409 ; renommage 404, puis 403 (avant le nom : un autre enseignant reçoit 403 même avec un nom vide), puis 400, puis 409 ; suppression 404 puis 403.
- Nom unique : comparé par `TitresAlbums.normaliser`, qui retire aussi l'article initial (« Les saisons » = « saisons »). L'Album est verrouillé (`AlbumRepository.verrouiller`, `PESSIMISTIC_WRITE`) à la création comme au renommage, pour la place en fin d'Album et l'unicité du nom ; pas de contrainte d'unicité en base.
- `ModulesDesPreparations` porte `@Transactional(MANDATORY)` : il échoue s'il est appelé hors de la transaction de l'émetteur. Le retrait passe par un `update` en masse sur `preparation.module_id`.
- Front : champ en ligne partagé `preparations/champ-nom-module.ts` (+ `.scss`), utilisé par l'En-tête et le Dialogue. Échap y appelle `stopPropagation` pour ne pas fermer le Dialogue. Erreur affichée sous le champ (`role="alert"`, reliée par `aria-describedby`).
- En-tête : la liste Module s'affiche dès que les listes sont chargées (même sans Module), sinon repli en lecture seule comme en partie 1. Le menu « Actions du module » (bouton icône, pictogramme `actions` ajouté à `icones.ts`) porte sur le Module choisi. Après suppression, `relire` relit la Préparation et les listes sans toucher au Thème ni au Temps passé affichés. Un 404 à la suppression (déjà supprimé) relit sans erreur ; un 403 n'est pas renvoyé par « Réessayer ».
- Après `preparation.module_invalide`, les Modules sont relus ; si le Module choisi n'y est plus, il est retiré du choix et « Réessayer » envoie `null`.
- Dialogue : « Créer » est désactivé tant que le champ « Nom du nouveau module » est ouvert, comme pendant le volet « Créer l'album ».

## Spec Change Log

## Review Triage Log

Revue 1 (Blind Hunter BH, Edge Case Hunter EC, Verification Gap VG).

| # | Constat | Verdict | Preuve | Suite |
|---|---------|---------|--------|-------|
| 1 | VG-1, BH-11a : le verrou de l'Album dans `creerModule` n'est exercé par aucun test | medium | Constat vérifié par la couche VG ; retirer `verrouiller` ne fait échouer aucun test | patch |
| 2 | VG-2 : suppression répondue 404 ou 403, et relecture en échec, non testées dans l'En-tête | medium | Constat vérifié par la couche VG | patch |
| 3 | VG-3 : Album changé pendant la création d'un Module dans le Dialogue, garde non testée | low | Constat vérifié par la couche VG ; un test suffit | patch |
| 4 | BH-8 : le message d'échec du champ en ligne reste affiché pendant la saisie d'un nouveau nom | low | Cas courant après un `409 module.deja_existant` ; correction directe dans `ChampNomModule` | patch |
| 5 | EC-3, EC claim 2, BH-1 : un réglage simultané à la suppression peut garder l'identifiant d'un Module supprimé | low | Fenêtre de quelques millisecondes ; la lecture l'ignore et l'enregistrement suivant reçoit `module_invalide`, désormais traité ; il faudrait un verrou partagé entre modules | rejeté |
| 6 | EC-1 : Module supprimé entre la lecture et le renommage, 500 au lieu de 404 | low | Course improbable ; il faudrait relire le Module sous verrou | rejeté |
| 7 | EC-2 : deux suppressions simultanées, la seconde en 500 | low | « Réessayer » reçoit alors 404, traité comme « déjà supprimé » | rejeté |
| 8 | EC-4 : `chargerListes` en échec dans `retirerModuleDisparu`, le Module disparu reste choisi | low | Deux échecs successifs ; le Bandeau des listes s'affiche avec « Réessayer » | rejeté |
| 9 | EC-5 : renommage répondu 404, le champ reste ouvert sur un Module disparu | low | Course improbable ; le message s'affiche et « Annuler » referme | rejeté |
| 10 | EC-6 : relecture des listes en échec après suppression, le Module supprimé reste proposé | low | Bandeau des listes affiché ; le choisir donne `module_invalide`, traité | rejeté |
| 11 | EC claim 1 : l'article initial est ignoré, au-delà de la casse et des accents | false | La décision de Paul nomme `TitresAlbums.normaliser`, qui retire l'article ; signalé au point de contrôle | rejeté |
| 12 | BH-2 : l'observateur contourne `Usages.changerContextePreparation` | false | `vocabulaire` observera `ModuleSupprime` lui-même en story 2.6 (contexte de l'epic) ; `Usages` n'existe pas encore | rejeté |
| 13 | BH-3 : la page Données personnelles ne mentionne ni les Albums ni les Modules créés, ni le lien au créateur | medium | `donnees-personnelles.ts` ne cite que les Préparations ; `album.createur_id` (story 2.1) était déjà absent | report |
| 14 | BH-4 : sort des Modules d'un créateur désactivé non documenté | low | Ils passent à l'administrateur, comme prévu pour un Module sans créateur gérable ; l'Enseignant est anonymisé, jamais effacé | rejeté |
| 15 | BH-5 : il faut choisir un Module sur sa Préparation pour le gérer | low | Choix de la spec (« à côté du Module choisi ») ; le changer reviendrait à modifier la spec | rejeté |
| 16 | BH-6 : « Annuler » le Dialogue laisse le Module créé | false | Voulu : un Module est visible de tous aussitôt (intention) | rejeté |
| 17 | BH-7 : `disableClose` remis à `false` sans condition | low | « Créer » est désactivé pendant le champ en ligne ; aucun chevauchement atteignable montré | rejeté |
| 18 | BH-9 : pas d'index sur `preparation.module_id` | low | Volume d'une école ; à reprendre avec les filtres par Module | rejeté |
| 19 | BH-10 : la borne de 200 caractères écrite en trois endroits | low | Convention existante (partie 1, ligne 20) | rejeté |
| 20 | BH-11b,c : pas de test du retour arrière de l'observateur ni de l'ouverture du menu au clavier | low | `@Transactional(MANDATORY)` et le menu Material couvrent ces cas ; tests de plus sans comportement nouveau | rejeté |
| 21 | BH-12 : erreurs absentes du contrat OpenAPI | low | Convention du back (2.1, ligne 13) | rejeté |
| 22 | BH-13 : `relire` garde un ancien Bandeau d'enregistrement et recharge les Thèmes | low | Sans effet faux pour l'enseignant | rejeté |
| 23 | BH-14 : renommer en le même nom appelle l'API | low | Réponse identique, sans effet | rejeté |

## Design Notes

- Admin : `EnseignantCourant.administrateur()` plutôt qu'un booléen passé par la Resource, pour que le service décide seul (comme `id()`). Le front calcule le menu par `createurId === compte.id || administrateur`, le back revérifie.
- Place en fin d'Album : verrouiller la ligne `album` puis `max(ordre) + 1` ; un trou laissé par une suppression est sans effet (tri par `ordre`).
- `ModuleSupprime(moduleId, albumId)` est un `record` de `referentiels.service` ; `vocabulaire` l'observera en story 2.6.

## Verification

**Commands:**
- `cd back && ./mvnw verify` -- expected : vert, ArchUnit compris ; `front/openapi/` réécrit.
- `cd front && npm test -- --watch=false && npm run build` -- expected : vert, `verifier-jetons` compris, paquet initial sous 600 kB.

**Manual checks (if no CLI):**
- Avec `compose.dev.yaml`, `quarkus:dev` et `npm start` : créer un Module depuis l'En-tête, le voir depuis un autre compte, le renommer puis le supprimer, et vérifier que la Préparation n'a plus de Module.
