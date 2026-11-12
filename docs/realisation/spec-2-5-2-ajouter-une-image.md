---
title: 'Story 2.5, partie 2 : « + › Ajouter une image »'
type: 'feature'
created: '2026-11-12'
status: 'done'
baseline_commit: '304ea75d002fa0b692014a4c4b5de3ecfd20280d'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/realisation/epic-2-context.md'
  - '{project-root}/docs/realisation/spec-2-5-televerser-depuis-la-carte.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** On ne peut téléverser une Image que depuis une Carte « à illustrer ». Le Bouton « + » ne propose pas encore « Ajouter une image » (story 2.5, FR-13).

**Approach:** Le Bouton « + » gagne le choix « Ajouter une image ». Il ouvre le dialogue « Téléverser une image » de la partie 1, dans un mode sans Préparation :
- l'enseignant saisit aussi le Mot, normalisé comme en story 2.3 ;
- pour une image d'album, il choisit l'Album d'origine.

Le back crée le Mot s'il n'existe pas et enregistre l'Image (`privee`) dans Mes mots, sans aucun lien vers une Préparation.

Décisions :
- Le Sens de l'Image est celui que l'enseignant a retenu le plus récemment pour ce Mot dans ses Préparations, sinon le Sens « à compléter » (même règle que `Usages.retenirSens`). Le choix d'un Sens arrive avec la story 2.8.
- Seule une `image_album` reçoit un Album d'origine : le champ Album n'apparaît que pour ce type. Sans Album, le refus est « Album d'origine requis » (`image.album_requis`).
- « l' » tapé seul est gardé comme un Mot, comme en story 2.3 : aucune règle de normalisation propre à ce parcours (choix de Paul, à l'implémentation).
- L'Album se cherche parmi les Albums existants seulement (autocomplete par titre, comme dans « Nouvelle préparation »), sans « Créer l'album » (choix de Paul).
- Pas de détection pendant la frappe du Mot (story 2.7), pas de recherche ARASAAC dans ce dialogue (story 2.4, partie 2, bloquée par Q-2).
- Après l'enregistrement, le dialogue se ferme et l'annonce polie « Image enregistrée dans Mes mots pour « citrouille ». » est faite. Aucun écran ne montre encore Mes mots : la Banque arrive avec l'Epic 3.

## Boundaries & Constraints

**Always:**
- Mêmes règles que la partie 1 pour le fichier, la réduction, les licences selon le type, `aCompleter` et les codes d'erreur.
  - La réduction se fait dans la ressource, avant la transaction.
  - L'Image est créée par `Images` seul, à l'état `privee`, avec l'enseignant courant comme propriétaire.
- Le Mot est normalisé par `Lexique.normaliser`, puis obtenu ou créé par `Lexique.obtenirOuCreerMot`. Une saisie vide, ou de plus de 100 caractères une fois normalisée, donne `400 image.mot_invalide` et rien n'est enregistré.
- L'Album d'une `image_album` doit exister (`referentiels.service`) ; sinon `400 image.album_introuvable`.
- Le dialogue est chargé à la demande, comme celui de « Nouvelle préparation » : le paquet initial ne grossit pas (budget de 600 kB, 3,6 kB de marge).
- Chaque nouveau `code` d'erreur est traduit dans `MESSAGES_PAR_CODE`.

**Never:**
- Aucune ligne dans `lien_image`, `sens_retenu` ou `preparation_mot`.
- Aucun appel HTTP écrit à la main ; ne pas modifier `front/src/app/api/`.
- Pas de création d'Album depuis ce dialogue.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Mot nouveau | « Les Citrouilles », PNG, `image_libre`, licence CC0 | 201 ; Mot « Citrouilles » créé ; Image `privee` sur le Sens « à compléter » ; aucun lien | N/A |
| Mot déjà retenu | « citrouille », Sens « légume » retenu dans une Préparation de l'enseignant | Image sur le Sens « légume » | N/A |
| Sens retenu par un collègue | Seule Zoé a retenu « personnage » pour « citrouille » | Image de Claire sur « à compléter », jamais sur le Sens de Zoé | N/A |
| Image d'album | `image_album` avec `albumId` existant, JPEG 3000 × 2000 | ≤ 400 × 400, licence `usage_pedagogique_album`, `album_id` posé | N/A |
| Album manquant | `image_album` sans `albumId` | Rien n'est enregistré | 400 `image.album_requis` |
| Album inconnu | `albumId` qui n'existe pas | Rien n'est enregistré | 400 `image.album_introuvable` |
| Mot invalide | Mot vide (espaces seuls compris), ou 101 caractères une fois normalisé | Rien n'est enregistré, aucun Mot créé | 400 `image.mot_invalide` |
| Fichier refusé | 21 Mo, ou fichier qui n'est pas une image | Rien n'est enregistré | 413 / 415 comme en partie 1 |
| Fichier servi | L'Image vient d'être enregistrée | Le propriétaire la lit par `/images/{id}/fichier` ; un collègue reçoit 404 | N/A |

</frozen-after-approval>

## Code Map

- `back/src/main/java/fr/corpusmots/vocabulaire/api/ImagesResource.java` -- déjà `GET /images/{id}/fichier` ; y ajouter le `POST /images` multipart.
- `back/src/main/java/fr/corpusmots/preparations/api/PreparationsResource.java` (`televerserImage`) et `TeleversementImageMotPreparationDto` -- modèle à suivre : contrôle de taille avant `readAllBytes`, puis `ReductionImages.reduire` avant le service, et parsing de `TypeImage`/`Licence` (`deValeur`).
- `back/src/main/java/fr/corpusmots/vocabulaire/service/Images.java` -- `televerser(TeleverserImageCommande)` crée l'Image (licence selon le type, `album_requis`, textes de 500 caractères au plus) ; à réutiliser, pas à dupliquer.
- `back/src/main/java/fr/corpusmots/vocabulaire/service/Usages.java` (`retenirSens`) et `SensRetenuRepository.dernierRetenu(enseignant, motId)` -- règle du Sens par défaut (dernier retenu, sinon « à compléter » obtenu par `Lexique.obtenirOuCreerSens(motId, LIBELLE_A_COMPLETER, null)`) ; la factoriser plutôt que la recopier.
- `back/src/main/java/fr/corpusmots/vocabulaire/service/Lexique.java` -- `normaliser` (l.53), `LONGUEUR_MAX_FORME`, `obtenirOuCreerMot` (l.81).
- `back/src/main/java/fr/corpusmots/referentiels/service/ReferentielsService.java` -- `album(UUID)` renvoie un `Optional<AlbumVue>` (l.418) ; `vocabulaire` → `referentiels` est permis (AD-1).
- `back/src/test/java/fr/corpusmots/preparations/api/ImagesMotsPreparationResourceTest.java`, `vocabulaire/api/ImagesDeTest.java`, `vocabulaire/service/FichiersDeTest.java` -- fixtures et modèle de tests à réutiliser.
- `front/src/app/coquille/coquille.ts` -- menu `menuAjouter` (l.104) ; commentaire l.94 à mettre à jour ; `ouvrirNouvellePreparation` passe par le service `preparations/nouvelle-preparation.ts`, qui fait un `import()` dynamique : c'est le modèle à suivre.
- `front/src/app/preparations/televerser-image-dialogue.ts` -- dialogue de la partie 1 (données `{preparationId, mot, titreAlbum}`) ; le généraliser à un second mode sans le dupliquer.
- `front/src/app/preparations/nouvelle-preparation-dialogue.ts` -- recherche d'Album par `rechercherAlbums` en autocomplete, à partir de 2 caractères (l.240-280, l.490-560).

## Tasks & Acceptance

**Execution:**
- [x] `back/src/main/java/fr/corpusmots/vocabulaire/` :
  - `POST /images` (`ajouterImage`), en multipart : `fichier`, `mot`, `typeImage`, `source`, `licence`, `auteur`, `albumId` ;
  - DTO de réponse au nom unique (par exemple `MesMotsImageDto` : champs obligatoires d'AD-16, plus `typeImage`, `aCompleter`, `motId`, `forme`, Sens) ;
  - service `Images.ajouterDansMesMots` (Mot, Sens par défaut, Album, puis `televerser`), avec les nouveaux codes `image.mot_invalide` et `image.album_introuvable`.
- [x] `back/src/test/java/fr/corpusmots/vocabulaire/api/` -- une ligne de test par ligne de la matrice ; vérifier aussi qu'aucun `lien_image` ni `sens_retenu` n'est créé.
- [x] `front/openapi/` -- régénérer et versionner.
- [x] `front/src/app/preparations/televerser-image-dialogue.ts` (+ spec) -- mode « Mes mots » :
  - champ Mot (obligatoire, 100 caractères au plus), en tête ;
  - champ Album (recherche) seulement pour `image_album`, « Album d'origine requis » si vide ;
  - « Enregistrer » appelle `ajouterImage` ;
  - le mode Carte reste inchangé.
- [x] `front/src/app/preparations/ajouter-image.ts` (+ spec) -- service à la demande sur le modèle de `nouvelle-preparation.ts` : ouvre le dialogue, puis fait l'annonce polie.
- [x] `front/src/app/coquille/coquille.ts` (+ spec) -- choix « Ajouter une image » (icône `image`) après « Nouvelle préparation » ; focus rendu au Bouton « + ».
- [x] `front/src/app/commun/erreurs/message-erreur.ts` + spec -- messages pour `image.mot_invalide` et `image.album_introuvable`.

**Acceptance Criteria:**
- Given le Bouton « + », when l'enseignant choisit « Ajouter une image », saisit « citrouille » et enregistre une image libre, then le dialogue se ferme, l'annonce est faite et le focus revient au Bouton « + ».
- Given le type « image d'album » sans Album choisi, when l'enseignant enregistre, then « Album d'origine requis » s'affiche et aucune requête ne part.
- Given le build de production, then le paquet initial reste sous 600 kB, et le dialogue est dans un fragment chargé à la demande.

## Implementation Notes

- Back : `POST /images` (`ImagesResource.ajouter`) lit et réduit le fichier hors transaction, comme `televerserImage`, puis appelle `Images.ajouterDansMesMots(AjouterImageCommande)` qui renvoie `ImageMesMotsVue` (exposée par `MesMotsImageDto`, Sens dans `MesMotsSensDto`). La règle du Sens par défaut est factorisée dans `Usages.sensParDefaut(motId)`, reprise par `retenirSens`. Ordre des contrôles : type, Mot, Album (requis puis existant), puis création du Mot ; tout refus annule la transaction. L'`albumId` envoyé pour un autre type qu'`image_album` est ignoré ; un `albumId` mal formé donne `400 requete.invalide`.
- Mot invalide : même règle qu'en story 2.3 (forme normalisée vide ou de plus de 100 caractères) ; un article seul, comme « l' », est accepté comme Mot (décision de Paul).
- Front : `DonneesTeleverserImage` (mode Carte) inchangée ; le mode « Mes mots » s'ouvre par `ouvrirDialogueAjouterImage`. Mot vide et image d'album sans Album sont signalés sous le champ (`mat-error`), focus sur le premier champ fautif, sans requête. Les réglages de recherche d'Album sont déplacés dans `recherche-albums.ts` (sans dépendance), pour que le dialogue n'importe pas celui de « Nouvelle préparation ». L'annonce passe par `LiveAnnouncer` (polie) dans le service `AjouterImage`.
- Build : paquet initial 596,95 kB (marge 3,05 kB) ; le dialogue est dans un fragment chargé à la demande.

- Revue 1 : test d'un refus survenu après la création du Mot (rien n'est enregistré) ; la recherche d'Album relance le même texte après un échec et efface son Bandeau au succès ; le champ Mot autorise 104 caractères bruts, comme la saisie rapide (`longueurs-mot.ts`) ; Javadoc et imports remis en forme.

## Spec Change Log

## Review Triage Log

Revue 1 (Blind Hunter BH, Edge Case Hunter EC, Verification Gap VG).

| # | Constat | Verdict | Preuve | Suite |
|---|---------|---------|--------|-------|
| 1 | VG-1 : aucun test d'un refus survenu après la création du Mot (source de 501 caractères, licence imposée choisie), alors que « rien n'est enregistré » est promis | medium | Constat pré-vérifié ; tous les refus testés surviennent avant `obtenirOuCreerMot` | patch |
| 2 | VG-2, BH-4, EC-5, EC-6 : après un échec de la recherche d'Album, le Bandeau reste affiché malgré les suggestions suivantes, retaper le même texte ne relance rien, et ce chemin n'a aucun test | low | `distinctUntilChanged` bloque le même texte ; `erreur` n'est jamais effacé au succès ; le commentaire promet « une nouvelle frappe relance » | patch |
| 3 | BH-3, EC-4 : le champ Mot limite la saisie brute à 100 caractères, alors que le back compte après retrait de l'article | low | La saisie rapide (story 2.3) autorise `LONGUEUR_MAX_MOT + 'une '.length` ; correction directe | patch |
| 4 | BH-13 : ligne de Javadoc trop longue dans `Images.ajouterDansMesMots` ; imports de `ImagesResource` dans le désordre | low | Lecture du diff ; correction directe | patch |
| 5 | BH-1, EC-3 : la réduction tourne avant les contrôles bon marché du Mot et de l'Album | low | Le front valide déjà Mot et Album avant l'envoi ; seul le cas d'une requête forgée paie le décodage | rejeté |
| 6 | BH-2, EC-1, EC-2 : un `albumId` mal formé ou une licence inconnue sont refusés même quand ils sont « ignorés » | low | Le front n'envoie jamais ces champs dans ces cas ; même verdict qu'en partie 1 (ligne 21) | rejeté |
| 7 | BH-5 : après `image.album_introuvable`, l'Album supprimé reste choisi | false | Un Album n'est jamais supprimé (seule la fusion de l'Epic 6 le fait disparaître) | rejeté |
| 8 | BH-6 : `NOMBRE_SUGGESTIONS` en double ; réexport depuis `nouvelle-preparation-dialogue.ts` | low | Aucun effet sur le paquet ni sur le comportement | rejeté |
| 9 | BH-7 : pas d'en-tête `Location` sur le 201 ; un test répond 200 | low | Aucun consommateur de `Location` ; le client ne lit pas le statut | rejeté |
| 10 | BH-8 : pas de test pour la photo personnelle, l'appel sans compte, ou deux ajouts simultanés du même Mot | false | Licence imposée testée en partie 1 sur le code partagé ; authentification couverte ailleurs ; `obtenirOuCreerMot` est idempotent par `ON CONFLICT DO NOTHING` | rejeté |
| 11 | BH-9 : un Sens « à compléter » est créé sur un Mot qui a déjà de vrais Sens | false | Règle choisie dans l'intention (même règle que `retenirSens`, story 2.3) ; le choix d'un Sens arrive avec la story 2.8 | rejeté |
| 12 | BH-10 : spec et contrat absents du diff | false | Exclus du fichier de revue par la procédure | rejeté |
| 13 | BH-11 : la page Données personnelles ne parle pas de Mes mots | false | Elle dit déjà « les Images que vous ajoutez » ; aucune nouvelle donnée conservée | rejeté |
| 14 | BH-12 : conversions `as` à l'ouverture du dialogue ; `AjouterImage` rangé dans `preparations/` ; contrôles créés aussi en mode Carte | low | Aucun défaut observable | rejeté |
| 15 | EC-7 : un échec du chargement à la demande du dialogue n'est pas signalé | low | Même patron que « Nouvelle préparation » ; cas d'une coupure réseau au premier clic | rejeté |

## Verification

**Commands:**
- `cd back && ./mvnw -q verify` (JAVA_HOME JDK 25, DOCKER_HOST Podman) -- expected: tous les tests passent, ArchUnit compris, et `front/openapi/` est à jour.
- `cd front && npm test -- --watch=false && npm run build` -- expected: tests et `verifier-jetons` au vert, paquet initial sous 600 kB.
