---
title: 'Story 2.7, partie 3 : Panneau de choix d''Image'
type: 'feature'
created: '2026-11-19'
status: 'done'
baseline_commit: '7b79ff2070cc552ef94d79df0c9d0238305daeb2'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/realisation/epic-2-context.md'
  - '{project-root}/docs/realisation/spec-2-7-2-retenir-une-image-dans-la-detection.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Une fois un Mot ajouté, l'enseignant ne peut ni lui choisir une Image existante (Carte « à illustrer »), ni changer celle qu'il a : il ne lui reste qu'à retirer le Mot et le retaper (FR-9, UX-DR-28, UX-DR-29).

**Approach:** Clic ou Entrée sur la vignette d'une Carte de Mot ouvre à droite le Panneau de choix d'Image (400 px, grille visible) : Mot en cursive et Sens, Image actuelle, Repère de qualité, Images `proposable` du Mot classées comme la détection, « Ajouter une image ». Choisir une Image la lie au Mot (ou remplace l'actuelle) par `Usages.remplacerImage` avec l'origine `reutilisee`, puis ferme le panneau ; Échap ferme sans rien changer.

Décisions :
- Clic (décision de Paul, option A) : la vignette d'une Carte illustrée ouvre désormais le Panneau de choix, et non plus la Carte d'identité. En tête du panneau, l'Image actuelle avec un bouton « Carte d'identité », qui ouvre à sa place le Panneau Carte d'identité de la story 2.6 (même emplacement). Une Carte « à illustrer » ouvre le panneau par sa vignette « + », devenue un bouton « Choisir une image pour « forme » ».
- Images proposées (décision de Paul, option A) : toutes les Images `proposable` du Mot, quel que soit leur Sens, classées comme la détection (Section de la Préparation, liées ailleurs, les miennes, les plus récentes). Choisir une Image d'un autre Sens change le Sens retenu du Mot dans cette Préparation (invariant : Sens de l'Image = Sens retenu). Le Sens est affiché en lecture ; le modifier est l'affaire de la story 2.8.
- Vignettes au même rendu que le Panneau de détection (Repères de Section, Badge de type, album d'origine, propriétaire, Marque « déjà utilisée », Sens) ; l'Image actuelle, si elle figure dans la liste, porte « actuelle » et la choisir ferme sans rien changer. Aucune Image : « Aucune image pour ce mot. » et « Ajouter une image ».
- « Ajouter une image » ouvre le Dialogue « Téléverser une image » de la story 2.5 pour ce Mot ; l'Image téléversée remplace l'actuelle (origine `nouvelle`) et le panneau se ferme. Les suggestions ARASAAC ne figurent pas dans ce panneau (lien d'un pictogramme : story 2.4, partie 2).
- L'Image remplacée n'est ni supprimée ni modifiée : seulement déliée de ce Mot.
- Après un choix : panneau fermé, Carte mise à jour (vignette, badge, plus « à illustrer »), focus rendu à la vignette de la Carte, annonce « Image de « farine » changée. ». Échec : message dans le panneau, qui reste ouvert ; Image indisponible : « Cette image n'est plus disponible. » et la liste est relue.

## Boundaries & Constraints

**Always:**
- `GET /preparations/{id}/mots/{motPreparationId}/propositions` : Images proposées pour ce Mot, au format de `DetectionMotDto` ; classement et visibilité calculés par `vocabulaire.service` (extraire de `DetectionMots` un calcul pour un Mot donné, sans dupliquer le classement).
- `PUT /preparations/{id}/mots/{motPreparationId}/image`, corps `{ imageId }`, `200` avec le `MotPreparationDto`. Une transaction : Préparation verrouillée, puis `Usages.remplacerImage` (Image verrouillée `FOR UPDATE`, `proposable`, Sens du même Mot ; Sens retenu changé si besoin ; ancien lien supprimé, nouveau lien `reutilisee`). Même Image que l'actuelle : `200` sans écriture. Refus : Préparation ou Mot de Préparation d'un autre `404 ressource.introuvable` ; Image absente ou non proposable `404 image.indisponible` ; Image d'un autre Mot `400 preparation.sens_invalide` ; corps ou champ manquant `400 requete.invalide`. Tout refus annule tout.
- Téléversement depuis le panneau : champ multipart `remplacer` (booléen) sur `POST /preparations/{id}/mots/{motPreparationId}/image` ; vrai, l'Image créée remplace l'Image liée au lieu du refus `409 preparation.mot_deja_illustre`, qui reste la règle sans ce champ.
- `sens_retenu` et `lien_image` ne changent que par `Usages` (AD-14) ; aucun filtre d'Image hors de `VisibiliteImages`.
- Panneau : `role="dialog"` non modal ou région nommée comme le Panneau Carte d'identité, focus pris à l'ouverture et rendu à la vignette à la fermeture ; Images en `listbox`/`option` (↑ ↓, Entrée, clic), nom accessible comme dans la détection ; Échap ferme. Un seul panneau latéral ouvert à la fois.
- Paquet initial sous 600 kB : le panneau est chargé à la demande (`@defer` ou import dynamique).

**Never:**
- Pas de modification de Sens ni de « Nouveau sens » (story 2.8) ; pas d'ARASAAC dans le panneau.
- Aucune copie d'Image ; aucune migration.
- Aucun appel HTTP écrit à la main ; ne pas modifier `front/src/app/api/`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Propositions | « farine », Images A (GS, Paul), B (MS, Zoé versée), C (MS, Paul) ; Préparation MS | C, B, A ; mêmes champs que la détection | N/A |
| Tous les Sens | « avocat » : Images des Sens « fruit » et « métier » | Les deux, chacune avec son Sens | N/A |
| Remplacer | Mot illustré par X ; choix de Y (même Sens) | Lien vers Y `reutilisee`, plus de lien vers X ; X intacte | N/A |
| Illustrer | Mot « à illustrer » ; choix de Y | Lien vers Y `reutilisee` | N/A |
| Autre Sens | Sens retenu « fruit » ; Y du Sens « métier » | Sens retenu « métier », lien vers Y | N/A |
| Même Image | Choix de l'Image actuelle | `200`, aucune écriture | N/A |
| Image privée d'un collègue | `imageId` privée de Zoé | Rien ne change | 404 `image.indisponible` |
| Image d'un autre Mot | Image de « côté » pour « côte » | Rien ne change | 400 `preparation.sens_invalide` |
| Préparation d'un collègue | `id` de Zoé | Rien | 404 |
| Téléverser en remplaçant | Mot illustré, `remplacer=true` | Nouvelle Image liée `nouvelle`, ancien lien supprimé | N/A |
| Téléverser sans `remplacer` | Mot illustré | Rien enregistré | 409 `preparation.mot_deja_illustre` |
| Front, ouverture | Clic ou Entrée sur la vignette | Panneau ouvert, focus dedans, grille visible | N/A |
| Front, choix | ↓ puis Entrée, ou clic | Remplacement, panneau fermé, Carte mise à jour, focus sur la vignette | N/A |
| Front, Échap | Panneau ouvert | Fermé sans requête, focus sur la vignette | N/A |
| Front, Carte d'identité | « Carte d'identité » dans le panneau | Panneau Carte d'identité ouvert à sa place | N/A |
| Front, indisponible | 404 `image.indisponible` | Message dans le panneau, liste relue, panneau ouvert | Pas de Bandeau |

</frozen-after-approval>

## Code Map

- `back/src/main/java/fr/corpusmots/vocabulaire/service/DetectionMots.java` l.88-160 -- `detecter` : extraire le calcul par Mot (Sens, Images `proposable`, classement, Albums, « déjà utilisée ») pour l'appeler aussi avec un seul `motId` ; `MotDetecteVue` en sortie.
- `back/src/main/java/fr/corpusmots/vocabulaire/service/Usages.java` -- `lierImage` (l.112), `imageProposable`, `sensRetenu`, `lier`, `retenirSens`, `libererPreparationMot` (l.215) : ajouter `remplacerImage(RemplacerImageCommande)` ; changer le Sens retenu d'un Mot de Préparation (ligne `sens_retenu` mise à jour ou remplacée par `SensRetenuRepository`) ; supprimer l'ancien lien (`LienImageRepository.supprimerDe`).
- `back/src/main/java/fr/corpusmots/preparations/service/PreparationsService.java` -- `reutiliserImage` (l.292), `retirerMot` (`deLaPreparation`), `televerserImage` (après l.330) : modèles ; ajouter `propositions(id, motPreparationId)` (sans verrou) et `remplacerImage(id, motPreparationId, imageId)` ; `CODE_IMAGE_INDISPONIBLE` existe.
- `back/src/main/java/fr/corpusmots/preparations/api/PreparationsResource.java` -- `detecter` (l.84) pour `DetectionMotDto.de`, `televerserImage` (l.153) et `TeleversementImageMotPreparationDto` (champ `remplacer`) ; nouveau DTO de corps (nom unique, AD-16).
- `back/src/test/java/fr/corpusmots/preparations/api/ReutilisationImagePreparationResourceTest.java`, `DetectionPreparationResourceTest.java` -- fixtures et assertions « rien n'est écrit ».
- `front/src/app/preparations/carte-mot.ts` -- vignette (bouton, `ouvrirCarteIdentite`) : émettre `choisirImage` à sa place ; vignette « + » des Cartes « à illustrer » devenue bouton.
- `front/src/app/preparations/panneau-detection.ts` -- rendu et nom accessible des vignettes, `nomOption` : extraire un composant partagé (par ex. `vignette-proposition.ts`) utilisé par les deux panneaux.
- `front/src/app/preparations/preparation.ts` -- `carteOuverte`, `disposition--panneau`, `pageInerte`, `ouvrirCarteIdentite`/fermeture (l.1122-1160), `ouvrirTeleverser` : un seul panneau latéral (choix ou Carte d'identité) ; mise à jour de la Carte après choix.
- `front/src/app/preparations/televerser-image-dialogue.ts` -- dialogue de la story 2.5 : option « remplacer ».
- `front/src/app/commun/carte-identite/` -- modèle de panneau latéral (focus, Échap, fermeture).

## Tasks & Acceptance

**Execution:**
- [x] `back/.../vocabulaire/service/` -- calcul des propositions pour un Mot, `remplacerImage`, changement de Sens retenu.
- [x] `back/.../preparations/` -- routes `propositions` et `PUT …/image`, champ `remplacer` du téléversement, DTO.
- [x] `back/src/test/...` -- une ligne de test par ligne back de la matrice, dont « rien n'est écrit » après chaque refus.
- [x] `front/openapi/` -- régénérer et versionner.
- [x] `front/src/app/preparations/` (+ specs) -- vignette partagée, Panneau de choix chargé à la demande, ouverture depuis la Carte, choix, Échap, Carte d'identité, « Ajouter une image » ; une ligne de test par ligne front de la matrice.

**Acceptance Criteria:**
- Given le Panneau Carte d'identité ouvert, when l'enseignant ouvre le Panneau de choix d'une autre Carte, then un seul panneau est affiché.
- Given « Ajouter une image » dans le panneau d'un Mot illustré, when un fichier est téléversé, then la Carte montre la nouvelle Image et le panneau est fermé.

## Implementation Notes

- Back : `DetectionMots.detectes(...)` porte le calcul commun (Sens, Images `proposable`, classement, Albums, « déjà utilisée ») ; `detecter` l'appelle pour les Mots de la saisie, `propositions(motId, albumId, section)` pour un seul Mot, gardé même sans Image. `Usages.remplacerImage(RemplacerImageCommande)` : Image actuelle choisie → rien n'est écrit ; sinon Image verrouillée et `proposable` (`404 image.indisponible`), Sens d'un autre Mot (`400 preparation.sens_invalide`), Sens retenu changé en place (`SensRetenu.changerSens`), ancien lien supprimé (`LienImageRepository.supprimerDe`), nouveau lien avec l'origine de la commande. `PreparationsService.propositions` (sans verrou) et `remplacerImage` (Préparation verrouillée) ; `televerserImage` passe par `remplacerImage` (origine `nouvelle`) quand `TeleverserImageMotCommande.remplacer`. Routes `GET …/propositions` (`proposerImagesMotPreparation`, `DetectionMotDto`) et `PUT …/image` (`choisirImageMotPreparation`, corps `ChoixImageMotPreparationDto`) ; champ multipart `remplacer`. Tests : `ChoixImagePreparationResourceTest`.
- Front : `VignetteProposition` (`vignette-proposition.ts`, sélecteur d'attribut posé sur l'option) et `nomProposition`/`libelleProprietaire` partagés par le Panneau de détection et le Panneau de choix ; les styles de la vignette y ont déménagé. `PanneauChoixImage` : `aside` nommé comme la Carte d'identité, liste `listbox` focalisée une fois chargée (↑ ↓ Début Fin, Entrée, clic), « actuelle », message `role="alert"` dans le panneau, liste relue après `image.indisponible` ou `preparation.sens_invalide`, réponse ignorée si le panneau est passé à un autre Mot ; échec du chargement du code : panneau refermé, `MESSAGE_RESEAU` annoncé. `Preparation` crée le panneau par import dynamique dans un `ViewContainerRef` (pas de `@defer` : son exécution ajoutait environ 6 kB au paquet initial, 604,7 kB ; 598,7 kB ainsi) ; `choixOuvert` et `carteOuverte` s'excluent. La vignette d'une Carte (miniature : « Changer l'image de « forme » » ; « + » : « Choisir une image pour « forme » ») émet `choisirImage`. Dialogue de téléversement : option `remplacer`.

## Spec Change Log

## Review Triage Log

Revue 1 (Blind Hunter BH, Edge Case Hunter EC, Verification Gap VG).

| # | Constat | Verdict | Preuve | Suite |
|---|---------|---------|--------|-------|
| 1 | VG-o1, EC-5, EC-8, BH-1, BH-2 : le panneau traite `image.sens_different` (jamais envoyé) et non `preparation.sens_invalide` | medium | `Usages.remplacerImage` lève `400 preparation.sens_invalide` pour une Image passée à un autre Mot ; message générique, liste non relue, contraire à la spec | patch |
| 2 | EC-1, EC-2 : échec du chargement dynamique du panneau gardé en cache, colonne vide, page inerte | medium | Promesse rejetée mémorisée, `choixOuvert` reste posé ; arrive après un redéploiement | patch |
| 3 | EC-3, EC-4 : réponse d'un choix arrivée après le passage à un autre Mot | low | Même instance du panneau ; correction directe (garde sur l'identifiant) | patch |
| 4 | BH-3 : deuxième changement d'Image du même Mot non annoncé | low | Même chaîne dans `annonce`, région `aria-live` inchangée ; correction directe | patch |
| 5 | BH-5, VG-2 : réouverture du même Mot par `querySelector`, test supprimé | low | Contourne `focus()` du composant ; test d'origine remplacé sans équivalent | patch |
| 6 | VG-1, BH-9 : page inerte sous 600 px avec le seul Panneau de choix non testée | medium | Les assertions `inert` passent par la Carte d'identité ; régression silencieuse possible | patch (test) |
| 7 | BH-11 : commentaires périmés (`CarteMot`, Javadoc de `televerserImage`) | low | Correction directe | patch |
| 8 | BH-4 : pas de « Réessayer » après l'échec de lecture des propositions | low | Fermer puis rouvrir suffit ; ajouter un bouton dépasse la correction directe | rejeté |
| 9 | BH-6 : raccourci « même Image » sans contrôle | false | `lien_image.image_id` a une clé étrangère et une Image n'est jamais effacée (pierre tombale) ; choisir l'actuelle n'écrit rien et le front ferme sans requête | rejeté |
| 10 | BH-7 : suppression JPQL en masse après lecture de l'entité lien | low | Entité non modifiée, jamais réécrite ; aucun effet observé, tests verts | rejeté |
| 11 | BH-8 : tests back supplémentaires (autre Sens sur Mot « à illustrer », `remplacer` sans Image, `sens` des propositions, états de l'Epic 3) | low | Chemins couverts par les tests des cas voisins ; états `abandonnee` en Epic 3 | rejeté |
| 12 | BH-9 : tests front supplémentaires (annulation du dialogue, alternative après autre Sens, course du chargement, spec de `VignetteProposition`) | low | Comportements couverts indirectement par les specs existantes | rejeté |
| 13 | BH-10 : documents de suivi et écarts UX non tenus | low | `deferred-work.md` et `sprint-status.yaml` mis à jour à la clôture ; clic sur la vignette décidé par Paul ; Sens modifiable (2.8) et ARASAAC (2.4, partie 2) déjà prévus | rejeté |
| 14 | BH-11 : constantes de codes dupliquées entre `Usages` et `PreparationsService` | low | Convention existante : chaque service déclare ses codes | rejeté |
| 15 | EC-6 : `remplacer` autre que `true` lu comme faux | false | Seul le client généré l'envoie, en booléen | rejeté |
| 16 | EC-7 : échec de miniature plus remis à zéro à chaque résultat | low | Même Image, même miniature en échec ; cosmétique | rejeté |
| 17 | VG-o2 : branche `dejaOuverte` de `ouvrirCarteIdentite` devenue inaccessible | low | Sans effet pour l'utilisateur | rejeté |

## Verification

**Commands:**
- `cd back && ./mvnw -q verify` (JAVA_HOME JDK 25, DOCKER_HOST `npipe:////./pipe/docker_engine`) -- expected: tous les tests passent, ArchUnit compris, `front/openapi/` à jour.
- `cd front && npm test -- --watch=false && npm run build` -- expected: tests et `verifier-jetons` au vert, paquet initial sous 600 kB.
