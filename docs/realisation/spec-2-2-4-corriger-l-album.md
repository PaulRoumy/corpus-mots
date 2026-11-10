---
title: "Story 2.2, partie 4 : Corriger l'album"
type: 'feature'
created: '2026-11-10'
status: 'done'
baseline_commit: '1ee737342cf7eef6902fff5f29b156038abbd9b9'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/realisation/epic-2-context.md'
  - '{project-root}/docs/realisation/spec-2-2-2-modules.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Un Album mal saisi (faute dans le titre, auteur erroné) ne peut plus être corrigé : toute l'école voit l'erreur dans la recherche et dans ses Préparations (FR-4, story 2.2).

**Approach:** `referentiels` corrige le titre, l'auteur et l'éditeur d'un Album, réservé à son créateur et à l'administrateur. Dans l'En-tête de Préparation, un menu de l'Album propose « Corriger l'album » à ces seuls enseignants ; la correction se voit partout, puisque les Préparations lisent l'Album par `referentiels`.

Dernière partie de la story 2.2, découpée par Paul.

## Boundaries & Constraints

**Always:**
- Mêmes règles qu'à la création (`creerAlbum`) : titre et auteur de 1 à 200 caractères, éditeur facultatif de 200 au plus, nettoyés (`TitresAlbums.nettoyer`), `titre_recherche` recalculé ; mêmes codes `album.titre_invalide`, `album.auteur_invalide`, `album.editeur_invalide`, et `409 album.deja_existant` si un autre Album a même titre et même auteur normalisés.
- Créateur de l'Album ou rôle `admin`, sinon `403 album.reserve_au_createur` ; le menu est caché aux autres enseignants.
- Chaque nouveau `code` d'erreur est traduit dans `MESSAGES_PAR_CODE`.

**Never:**
- Pas de fusion d'Albums (Epic 6), ni de suppression d'Album.
- Pas de correction depuis le Dialogue « Nouvelle préparation ».

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Corriger | `PUT /api/albums/{id} {titre, auteur, editeur}` par le créateur ou un administrateur | 200 `AlbumDto` corrigé ; la recherche et les Préparations de tous montrent le nouveau titre | — |
| Lire | `GET /api/albums/{id}` | 200 `AlbumDto` avec `createurId` | — |
| Champ invalide | titre ou auteur vide, champ de plus de 200 caractères | 400 code du champ, rien n'est modifié | — |
| Doublon | même titre et même auteur normalisés qu'un autre Album (garder les siens est accepté) | 409 `album.deja_existant`, rien n'est modifié | — |
| Pas le créateur | autre enseignant | 403 `album.reserve_au_createur`, rien n'est modifié | — |
| Album inconnu | `id` inexistant (lire ou corriger) | 404 `ressource.introuvable` | — |

</frozen-after-approval>

## Code Map

- `back/src/main/java/fr/corpusmots/referentiels/service/ReferentielsService.java` -- `creerAlbum` (validations, doublon par `memeTitre` + auteur normalisé) à factoriser avec `corrigerAlbum` ; `moduleGerable` (partie 2) : modèle du 404 puis 403 avec `enseignantCourant.administrateur()`.
- `back/src/main/java/fr/corpusmots/referentiels/persistance/{Album,AlbumRepository,AlbumTrouve}.java` -- `Album` a déjà `createurId`, sans mutateur ; `AlbumTrouve` et ses requêtes natives (`album(Object[])`) n'ont pas le créateur.
- `back/src/main/java/fr/corpusmots/referentiels/api/{AlbumsResource,AlbumDto,NouvelAlbumDto}.java`, `service/{AlbumVue,NouvelAlbumCommande}.java` -- Resource et records à étendre.
- `back/src/test/java/fr/corpusmots/referentiels/api/{AlbumsResourceTest,ReferentielsDeTest}.java` -- modèle des tests ; `ModulesResourceTest` pour créateur, administrateur (`roles = "admin"`), autre enseignant.
- `front/src/app/preparations/preparation.ts` -- titre `entete__titre`, `Title`, chargement des listes (`chargerListes`, garde `dernierChargement`), menu « Actions du module » (`moduleGerable`, `CompteCourant`) : modèle du menu de l'Album.
- `front/src/app/preparations/nouvelle-preparation-dialogue.ts` -- volet « Créer l'album » : champs titre, auteur, éditeur et messages, à reprendre dans le dialogue de correction.

## Tasks & Acceptance

**Execution:**
- [x] `back/.../referentiels/persistance/{Album,AlbumRepository,AlbumTrouve}.java` -- `Album.corriger(titre, titreRecherche, auteur, editeur)` ; `createurId` dans `AlbumTrouve` et ses requêtes.
- [x] `back/.../referentiels/service/{ReferentielsService,AlbumVue,CorrectionAlbumCommande}.java` -- `lireAlbum(id)` (404) et `corrigerAlbum(id, commande)` : 404, 403, puis validations et doublon (en excluant l'Album lui-même) partagées avec `creerAlbum` ; `AlbumVue.createurId`.
- [x] `back/.../referentiels/api/{AlbumsResource,AlbumDto,CorrectionAlbumDto}.java` -- `GET /albums/{id}` (`lireAlbum`), `PUT /albums/{id}` (`corrigerAlbum`, corps nul → `requete.invalide`) ; `createurId` facultatif dans `AlbumDto`.
- [x] `back/src/test/java/fr/corpusmots/referentiels/api/AlbumsResourceTest.java` -- une ligne de test par ligne de la matrice, « rien n'est modifié » relu en base, et titre corrigé relu par `GET /api/preparations/{id}` d'un autre enseignant.
- [x] `front/openapi/` -- régénérer par `./mvnw package -DskipTests` et versionner.
- [x] `front/src/app/preparations/corriger-album-dialogue.ts` (+ `.scss`, spec) -- dialogue Material « Corriger l'album » : Titre, Auteur, Éditeur (facultatif) préremplis ; « Enregistrer » envoie `corrigerAlbum` et ferme avec l'Album renvoyé ; « Annuler » ferme sans rien envoyer ; un échec garde le dialogue ouvert avec le message (champ concerné pour les codes de champ, Bandeau d'erreur sinon) ; fermeture bloquée pendant l'envoi.
- [x] `front/src/app/preparations/preparation.ts` + spec -- charger l'Album (`lireAlbum`) avec les listes ; à côté du titre, bouton menu « Actions de l'album » (créateur ou administrateur) avec « Corriger l'album » ; après correction, titre de l'En-tête et de l'onglet mis à jour sans recharger la page.
- [x] `front/src/app/commun/erreurs/message-erreur.ts` + spec -- `album.reserve_au_createur` « Seuls le créateur de l'album et l'administrateur peuvent le corriger. ».

**Acceptance Criteria:**
- Given le créateur d'un Album, when il corrige le titre depuis l'En-tête, then l'En-tête et l'onglet montrent le nouveau titre, et un collègue le voit dans sa recherche et sa Préparation.
- Given un Album créé par un collègue, then le menu « Actions de l'album » n'est pas affiché.
- Given le clavier seul, then le menu et le dialogue sont utilisables, focus rendu au bouton du menu à la fermeture.

## Implementation Notes

- Ordre des refus de `corrigerAlbum` : 404, puis 403 (avant les champs : un autre enseignant reçoit 403 même avec un titre vide), puis 400, puis 409. Validations et doublon factorisés avec `creerAlbum` (`champsAlbum`, `verifierAlbumUnique`, qui exclut l'Album corrigé). Pas de verrou ni de contrainte d'unicité : deux écritures simultanées peuvent produire un doublon, comme à la création (fusion en Epic 6).
- `createurId` ajouté à `AlbumTrouve`, `AlbumVue` et `AlbumDto` (obligatoire dans le contrat, `album.createur_id` étant `NOT NULL`, à la demande de la revue) : la recherche et les titres proches le renvoient aussi.
- Test « Préparation d'un autre enseignant » : `@TestSecurity` ne donne qu'une identité par test ; c'est l'administrateur qui corrige l'Album d'une collègue, puis relit par `GET /api/preparations/{id}` sa propre Préparation, créée avant la correction, qui montre le nouveau titre.
- Front : l'Album est lu dans le `Promise.all` de `chargerListes` (échec : Bandeau des listes). Le dialogue `CorrigerAlbumDialogue` est importé statiquement par la page (déjà chargée à la demande) ; la borne de 200 caractères y est redéclarée pour ne pas embarquer le Dialogue « Nouvelle préparation ». Focus initial sur le Titre (`autoFocus` par sélecteur), rendu au bouton « Actions de l'album » (`restoreFocus`). Un code de champ pose une erreur sur le `FormControl` (`mat-error`), effacée à la frappe ; un doublon, un 403 ou un 404 s'affiche dans le Bandeau, dont « Réessayer » efface seulement le message.

## Spec Change Log

## Review Triage Log

Revue 1 (Blind Hunter BH, Edge Case Hunter EC, Verification Gap VG).

| # | Constat | Verdict | Preuve | Suite |
|---|---------|---------|--------|-------|
| 1 | VG-1 : l'abandon d'une réponse d'Album périmée n'est vérifié par aucun test (menu sur le mauvais Album) | medium | Constat vérifié par la couche VG ; le test existant ne connecte aucun compte | patch |
| 2 | BH-1 : le `409 album.deja_existant` montre le conseil de la création (« liste des albums au titre proche »), absent du dialogue | medium | Message de `MESSAGES_PAR_CODE` repris tel quel dans le dialogue de correction | patch |
| 3 | BH-2 : `createurId` facultatif dans `AlbumDto` alors que la colonne est `NOT NULL` | low | Correction directe du schéma | patch |
| 4 | VG-2 : correction confirmée après un changement de Préparation, garde non testée | low | Il faut naviguer avec un dialogue modal ouvert ; le constat 1 couvre le même mécanisme | rejeté |
| 5 | EC-1, BH-4 : l'échec de lecture de l'Album masque aussi les Modules et les Thèmes | low | Un Album ne disparaît pas avant l'Epic 6 ; « Réessayer » relit les trois | rejeté |
| 6 | EC-2 : une erreur de champ du serveur reste sous un champ après un second échec sur un autre | low | Deux refus de champ successifs, le front vérifiant déjà les champs vides | rejeté |
| 7 | EC-3, BH-5 : deux corrections simultanées, la dernière gagne | low | Un créateur et l'administrateur au même instant ; il faudrait une version optimiste | rejeté |
| 8 | EC-4 : un enregistrement de l'En-tête en vol remet l'ancien titre | low | Le dialogue modal empêche de quitter un champ pendant la correction | rejeté |
| 9 | BH-3 : après un 403 ou un 404 dans le dialogue, la page n'est pas relue | low | Cas d'un rôle retiré en cours de session | rejeté |
| 10 | BH-6 : le critère « un collègue le voit » est vérifié par l'administrateur sur sa propre Préparation, en SQL direct | low | La lecture passe par `referentiels` pour tous ; `@TestSecurity` n'a qu'une identité par test | rejeté |
| 11 | BH-7, BH-8c : clavier peu testé ; Entrée ne valide pas le dialogue | low | Champs, boutons et menu Material atteignables au clavier ; « Enregistrer » au Tab | rejeté |
| 12 | BH-8a,b : « Enregistrer » actif sans changement ou après une erreur de champ | low | Renvoi sans effet ou refusé de nouveau | rejeté |
| 13 | BH-9 : « Réessayer » sans effet sur un refus définitif | low | Même convention que les parties 2 et 3 | rejeté |
| 14 | BH-10 : branche `id == null` inutile ; `titreRecherche` confié à l'appelant | low | Sans effet pour l'enseignant | rejeté |
| 15 | BH-11 : erreurs absentes du contrat OpenAPI | low | Convention du back (2.1, ligne 13) | rejeté |
| 16 | BH-12 : `createurId` des résultats de recherche non testé ; format du titre d'onglet écrit deux fois | low | Sans dérive aujourd'hui | rejeté |

## Verification

**Commands:**
- `cd back && ./mvnw verify` -- expected : vert, ArchUnit compris ; `front/openapi/` réécrit.
- `cd front && npm test -- --watch=false && npm run build` -- expected : vert, `verifier-jetons` compris, paquet initial sous 600 kB.

**Manual checks (if no CLI):**
- Avec `compose.dev.yaml`, `quarkus:dev` et `npm start` : corriger le titre d'un Album depuis l'En-tête, puis vérifier la recherche et la Préparation d'un autre compte.
