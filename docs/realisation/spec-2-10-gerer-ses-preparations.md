---
title: 'Story 2.10 : Gérer ses Préparations'
type: 'feature'
created: '2026-11-20'
status: 'done'
baseline_commit: 'fa8dbb3f9db3540708b74718f55834158b82ef9c'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/realisation/epic-2-context.md'
  - '{project-root}/docs/realisation/spec-2-9-reprendre-les-mots-deja-illustres.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** L'enseignant ne peut ni renommer, ni dupliquer, ni supprimer ses Préparations. Reprendre un Album pour une autre Section ou une autre année oblige à tout refaire (FR-11).

**Approach:** Le menu de chaque Carte de Préparation de l'accueil propose trois actions :
- « Renommer » enregistre un nom propre à la Préparation ; sans nom, le titre de l'Album s'affiche.
- « Dupliquer » crée, pour la Section choisie, une Préparation avec les mêmes Mots, Sens retenus et liens. Les liens sont copiés en `reutilisee` et aucune Image n'est copiée (AD-14).
- « Supprimer », après confirmation, supprime la Préparation et libère ses usages par `Usages.libererPreparation` dans la même transaction. Il émet l'événement synchrone `PreparationSupprimee` (AD-15) et ne supprime aucune Image.

Décisions :
- Nom : colonne `nom` facultative, de 1 à 100 caractères après nettoyage (espaces aux bords et doublés retirés). Un nom vide l'efface, et le titre de l'Album s'affiche de nouveau. Les Cartes, l'En-tête de Préparation et le titre de la page affichent `nom ?? titre de l'Album`.
- Renommer : un Dialogue « Renommer la préparation » s'ouvre, prérempli. « Enregistrer » ou Entrée valide, Échap annule. La Carte se met à jour, le focus revient au bouton du menu, et l'annonce dit « Préparation renommée. ».
- Dupliquer : le Dialogue « Dupliquer la préparation » propose PS, MS et GS, avec la Section suivante présélectionnée (GS reste GS). La même Section est permise (« une autre année »).
- Contenu de la copie : même Album et même nom. Elle garde aussi :
  - le Module et le Thème par défaut ;
  - pour chaque Mot, son ordre, son Thème et son Sens retenu, avec la nouvelle Section ;
  - pour chaque lien, la même Image, recopiée en `reutilisee` avec la nouvelle Section. C'est la décision A de Paul : même une Image retirée ou devenue invisible est copiée telle quelle, et s'affiche grisée comme dans l'original.

  Le « Temps passé » et les Mots écartés de l'Encart ne sont pas copiés.
- Après la copie (décision A de Paul) : l'enseignant reste sur l'accueil. La nouvelle Carte apparaît en tête, le focus va sur son lien, et l'annonce dit « Préparation dupliquée pour la GS. ».
- Supprimer : le Dialogue de confirmation existant demande « Supprimer la préparation « Roule galette » ? Ses mots quittent la préparation ; les images restent dans la banque. ». Il propose « Supprimer » et « Annuler ». Après la suppression, la Carte disparaît et le focus passe à la Carte suivante, sinon à la précédente, sinon à « Nouvelle préparation ». L'annonce dit « Préparation supprimée. ». Il n'y a pas de Bandeau « Annuler ».
- Échec réseau : un Bandeau d'erreur propose « Réessayer ». Un refus métier affiche son message traduit.

## Boundaries & Constraints

**Always:**
- Routes, sur une Préparation de l'enseignant courant ; pour celle d'un collègue, `404 ressource.introuvable` et rien d'écrit (FR-22) :
  - `PUT /preparations/{id}/nom { nom }` renvoie la Carte. Plus de 100 caractères donne `400 requete.invalide`.
  - `POST /preparations/{id}/duplication { section }` renvoie `201` avec la Carte créée. Une Section absente ou hors liste donne `400 requete.invalide`.
  - `DELETE /preparations/{id}` renvoie `204`.
- La duplication tient en une transaction, avec la Préparation source verrouillée. `Usages` copie les `sens_retenu` et les `lien_image` par une nouvelle méthode, par exemple `copierPreparation(source, cible, correspondance des Mots, Album, Section)`. Aucune ligne `image` n'est créée.
- La suppression tient en une transaction, avec la Préparation verrouillée. L'ordre est le suivant :
  1. `Usages.libererPreparation(id)` supprime tous ses `sens_retenu` et ses `lien_image`.
  2. `PreparationSupprimee(id, proprietaireId)` est émis par un `Event.fire` synchrone, déclaré dans `preparations.service`. Cette story n'a aucun observateur ; il viendra avec l'Epic 4.
  3. La Préparation est supprimée, et la cascade emporte `preparation_mot` et `mot_ecarte`.
  Aucune Image, aucun Mot et aucun Sens ne sont supprimés.
- `sens_retenu` et `lien_image` ne changent que par `Usages` (AD-14) ; aucun `REQUIRES_NEW`, aucun `@ObservesAsync` (AD-17).
- La page Données personnelles (`front/src/app/compte/donnees-personnelles.ts`) dit que l'enseignant peut supprimer une Préparation, et que ses Mots et usages partent avec elle, mais pas ses Images. `deploiement/README.md` et `RESTAURATION.md` sont relus.
- Menus et dialogues : Material, au clavier, avec des noms accessibles (« Actions de la préparation « Roule galette » GS »). Les styles passent par les jetons.

**Never:**
- Aucune Image copiée ou supprimée. Pas de migration publiée modifiée : le nom vient par une nouvelle migration.
- Aucun appel HTTP écrit à la main ; ne pas modifier `front/src/app/api/`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Renommer | « Galette des MS » | Nom enregistré, Carte et En-tête l'affichent | N/A |
| Effacer le nom | « » ou espaces | Nom nul, titre de l'Album affiché | N/A |
| Nom trop long | 101 caractères | Rien | 400 `requete.invalide` |
| Dupliquer | 3 Mots dont 2 illustrés, vers la GS | Nouvelle Préparation GS : 3 Mots, mêmes Sens, 2 liens `reutilisee` (Section GS), aucune `image` de plus | N/A |
| Dupliquer, Image retirée | Lien vers une Image retirée | Lien copié | N/A |
| Dupliquer, même Section | MS vers MS | Copie créée | N/A |
| Dupliquer, Section invalide | « cp » ou absente | Rien | 400 `requete.invalide` |
| Supprimer | Préparation avec Mots, liens, écartés | Préparation, `preparation_mot`, `sens_retenu`, `lien_image`, `mot_ecarte` supprimés ; Images, Mots et Sens intacts ; `PreparationSupprimee` observé une fois | N/A |
| Préparation d'un collègue | Les trois routes | Rien | 404 `ressource.introuvable` |
| Front, Renommer | Menu, « Renommer », saisie, Entrée | Carte mise à jour, focus au menu, annonce | N/A |
| Front, Dupliquer | Menu, « Dupliquer », GS, Entrée | Nouvelle Carte en tête, focus sur elle, annonce « … pour la GS. » | N/A |
| Front, Supprimer | Menu, « Supprimer », confirmation | Carte retirée, focus à la suivante, annonce | N/A |
| Front, Supprimer annulé | « Annuler » dans la confirmation | Aucune requête, focus au menu | N/A |
| Front, dernière Carte supprimée | Une seule Préparation | État vide, focus à « Nouvelle préparation » | N/A |
| Front, échec réseau | Une des trois actions | Bandeau « Réessayer », rien de changé | N/A |

</frozen-after-approval>

## Code Map

- `back/src/main/resources/db/migration/` -- `V<AAAAMMJJHHMM>__preparations_nom.sql` : `ALTER TABLE preparation ADD COLUMN nom text` avec un CHECK de longueur.
- `back/src/main/java/fr/corpusmots/preparations/persistance/Preparation.java`, `PreparationMotRepository`, `MotEcarteRepository` -- entité, copie des lignes, cascades.
- `back/src/main/java/fr/corpusmots/preparations/service/PreparationsService.java` -- `verrouillee`, `mienne`, `retirerMot` (modèle de libération), `CartePreparationVue` et `PreparationVue` (nom) ; renommer, dupliquer, supprimer.
- `back/src/main/java/fr/corpusmots/preparations/service/` -- nouvel événement `PreparationSupprimee` (record), sur le modèle de `referentiels.service.ModuleSupprime`.
- `back/src/main/java/fr/corpusmots/vocabulaire/service/Usages.java` -- `libererPreparationMot` (l.330) : modèle de `libererPreparation` et de `copierPreparation`. `SensRetenuRepository` et `LienImageRepository`.
- `back/src/main/java/fr/corpusmots/preparations/api/` -- `PreparationsResource`, `CartePreparationDto` et `PreparationDto` (champ `nom`), nouveaux DTO aux noms uniques (AD-16).
- `back/src/test/java/fr/corpusmots/preparations/api/` -- fixtures de `ReprisesPreparationResourceTest` ; un observateur de test de `PreparationSupprimee`.
- `front/src/app/preparations/preparations.ts` -- Cartes de l'accueil : menu, dialogues, focus, annonces.
- `front/src/app/commun/dialogue-confirmation/` -- confirmation de suppression.
- `front/src/app/preparations/preparation.ts` -- En-tête et titre de la page : `nom ?? titreAlbum`.
- `front/src/app/compte/donnees-personnelles.ts` -- texte sur la suppression d'une Préparation.

## Tasks & Acceptance

**Execution:**
- [x] `back/...` + migration -- nom, duplication, suppression, `Usages.copierPreparation` et `libererPreparation`, `PreparationSupprimee`.
- [x] `back/src/test/...` -- une ligne de test par ligne back de la matrice, dont « rien n'est écrit » après chaque refus.
- [x] `front/openapi/` -- régénérer et versionner.
- [x] `front/src/app/preparations/` (+ specs) -- menu de Carte, trois dialogues, nom affiché ; une ligne de test par ligne front de la matrice.
- [x] `front/src/app/compte/donnees-personnelles.ts` (+ spec si elle vérifie le texte), relecture de `deploiement/README.md` et `RESTAURATION.md`.

**Acceptance Criteria:**
- Given une Préparation MS de 9 Mots illustrés, when l'enseignant la duplique pour la GS, then une Préparation GS a les mêmes Mots, Sens et Images (liens `reutilisee`), et le nombre d'Images de la banque n'a pas changé.
- Given une Préparation supprimée, when un autre enseignant ou lui ouvre la Banque, then toutes les Images qu'elle utilisait existent encore.

## Implementation Notes

- Back : migration `V202611201200__preparations_nom.sql` (colonne `nom`, CHECK 1 à 100). `PreparationsService.renommer` (verrou, nettoyage des espaces `[sp{Z}FEFF]` comme `s` en JavaScript, vide → `null`, plus de 100 → `400 preparation.nom_trop_long`, traduit dans le front), `dupliquer` (source verrouillée, `Preparation.copie` : Album, nom, Module, Thème par défaut, sans Temps passé ; lignes `preparation_mot` copiées avec ordre et Thème ; `Usages.copierPreparation(CopierPreparationCommande)` copie `sens_retenu` et `lien_image` en `reutilisee`, Album et Section de la copie, sans revérifier l'Image), `supprimer` (verrou, `Usages.libererPreparation`, `Event<PreparationSupprimee>.fire` synchrone, suppression, cascade SQL). `CartePreparationVue` et `PreparationVue` portent `nom`. Routes `PUT /{id}/nom` (`NomPreparationDto`, renvoie la Carte), `POST /{id}/duplication` (`DuplicationPreparationDto`, `201`, Section absente ou inconnue : `400 requete.invalide` dans la ressource), `DELETE /{id}` (`204`). Tests : `GestionPreparationsResourceTest` (9) et l'observateur de test `ObservateurPreparationSupprimee` (vérifie aussi l'ordre : usages déjà libérés, Préparation encore présente).
- Front : Carte en `li` (lien + bouton de menu hors du lien, `data-lien` / `data-actions` pour placer le focus), menu Material « Renommer / Dupliquer / Supprimer ». Dialogues `gerer-preparation-dialogues.ts` (requête dans le dialogue, Bandeau dans le dialogue, « Réessayer » seulement pour un échec passager ; `restoreFocus: false`, la page place le focus). Nom inchangé : aucune requête. Suppression par `DialogueConfirmation`, échec affiché dans un Bandeau de la page. `nom-preparation.ts` partagé avec l'En-tête et le titre de la page. Paquet initial inchangé (598,89 kB).
- Documentation : page Données personnelles complétée ; `deploiement/README.md` et `RESTAURATION.md` relus, inchangés (les Préparations suivent la sauvegarde complète de la base, aucun parcours d'exploitation modifié).

## Spec Change Log

## Review Triage Log

Revue 1 (Blind Hunter BH, Edge Case Hunter EC, Verification Gap VG).

| # | Constat | Verdict | Preuve | Suite |
|---|---------|---------|--------|-------|
| 1 | BH-1, EC-1, EC-2, VG-2 : nettoyage du nom différent entre front et back (espaces insécables) | medium | Nom fait d'U+00A0 enregistré non nul et affiché vide | patch |
| 2 | BH-2 : nom trop long traduit « La demande est incomplète » | low | Code générique `requete.invalide` | patch (`preparation.nom_trop_long`) |
| 3 | BH-3, EC-3, EC-4 : `maxlength` sur la saisie brute, comparaison « inchangé » au titre brut | low | Nom collé coupé silencieusement | patch |
| 4 | BH-8, EC-5, EC-6 : 404 (Préparation supprimée ailleurs) laisse la Carte ou bloque le dialogue | medium | Carte périmée jusqu'au rechargement | patch |
| 5 | BH-9, EC-7, EC-8 : bandeau d'échec jamais effacé ; focus perdu si la Carte a disparu | low | Correction directe | patch |
| 6 | BH-6 : `copierPreparation` ne vérifie pas l'invariant « un Mot de Préparation a un Sens retenu » | low | Méthode publique entre modules | patch |
| 7 | BH-7, BH-12, VG-1, BH-10, BH-11 : rollback sur échec d'observateur (AD-15), duplication sans Module ni Mots, `enseignant_id` copié, titre après « Corriger l'album », refus et rejeu des dialogues non testés | medium | Aucune régression ne serait détectée | patch |
| 8 | BH-4 : liens de ses propres Images copiés en `reutilisee` | low | Même chose qu'aujourd'hui quand on reprend sa propre Image dans la détection ; l'Epic 3 devra filtrer par propriétaire | defer |
| 9 | BH-5 : `sens_retenu` copiés avec un `cree_le` récent | low | La copie est bien l'usage le plus récent | rejeté |
| 10 | EC-9 : deux Cartes identiques après une duplication dans la même Section | low | Choix explicite (« une autre année ») ; ordre récent d'abord | rejeté |
| 11 | BH-13 : Données personnelles sans le nom libre ni la rétention des sauvegardes | false | Le nom fait partie de « vos Préparations » ; la page dit déjà « jusqu'à 14 jours dans les sauvegardes » | rejeté |

## Verification

**Commands:**
- `cd back && ./mvnw -q verify` (JAVA_HOME JDK 25, DOCKER_HOST `npipe:////./pipe/docker_engine`) -- expected: tous les tests passent, ArchUnit compris, `front/openapi/` à jour.
- `cd front && npm test -- --watch=false && npm run build` -- expected: tests et `verifier-jetons` au vert, paquet initial sous 600 kB.
