---
title: 'Story 2.6, partie 2 : modifier type, source, licence et auteur dans la Carte d''identité'
type: 'feature'
created: '2026-11-13'
status: 'done'
baseline_commit: 'af97562a786acd4d38ad29f3f41d5e4c33b61b9d'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/realisation/epic-2-context.md'
  - '{project-root}/docs/realisation/spec-2-6-carte-d-identite-en-lecture.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** La Carte d'identité est en lecture seule pour tous (partie 1). Le propriétaire ne peut ni corriger le type, la source, la licence ou l'auteur de son Image, ni compléter une image libre « à compléter » (FR-14, story 2.6).

**Approach:** Pour le propriétaire, le panneau rend modifiables le type, l'Album d'origine (pour une image d'album seulement), la source, la licence et l'auteur. Chaque champ est enregistré dès que l'enseignant le quitte, par un nouveau `PUT /images/{id}/description` de `vocabulaire` qui remplace ces cinq valeurs d'un coup. Les autres champs restent en lecture (parties 3 et 4).

Décisions :
- Mêmes règles qu'au téléversement, tenues par `Images` :
  - la licence suit le type : imposée pour une photo personnelle et une image d'album, choisie (facultative) parmi les six du Sélecteur pour une image libre ou de type inconnu ;
  - seule une `image_album` a un Album d'origine, requis (`image.album_requis`) et existant (`image.album_introuvable`) ;
  - textes de 500 caractères au plus.
- Passer d'un type à licence imposée à une image libre ou inconnue laisse la licence vide (image libre « à compléter »). Quitter `image_album` efface l'Album d'origine ; l'Image reste en basse résolution.
- Passer en `image_album` réduit aussitôt le fichier à 400 × 400 px au plus, miniature comprise, dans la même transaction. La source est déjà réduite à 1 600 px, d'où un décodage court. Le choix du type « image d'album » n'est enregistré qu'avec un Album : le champ Album apparaît, et quitter le panneau sans Album signale « Album d'origine requis » sans rien envoyer.
- Avant d'enregistrer un passage en image d'album, le Dialogue de confirmation existant demande : « Réduire l'image à 400 × 400 px ? Cette réduction est définitive. » (« Réduire » / « Annuler »). C'est la seule exception à l'enregistrement automatique (décision de Paul). « Annuler » remet le type précédent, sans requête.
- La spec garde son périmètre entier (environ 2 000 tokens, accepté par Paul).
- Le panneau d'un propriétaire suit la vue modifiable de la maquette (`key-banque.html` › section 1 : champs Material). Libellé « basse résolution » et référence de l'Album (titre, auteur) pour une image d'album.
- La modification « s'applique partout » : la réponse met à jour la Carte de Mot (Badge de type) dans la page.

## Boundaries & Constraints

**Always:**
- `PUT /images/{id}/description` (`typeImage`, `licence`, `source`, `auteur`, `albumId`) renvoie la Carte d'identité à jour.
  - Image non consultable ou inexistante : `404 ressource.introuvable`.
  - Image consultable dont l'enseignant n'est pas propriétaire, administrateur compris : `403 image.reservee_au_proprietaire`.
- La vérification de propriété et la réduction se font dans `vocabulaire.service`. L'`etat` de l'Image ne change pas (AD-3). `@Version` de l'Image protège contre deux écritures concurrentes.
- Front :
  - Enregistrement à la sortie de chaque champ, sans bouton. Rien n'est envoyé si la valeur n'a pas changé.
  - En échec, la valeur saisie reste, le champ est signalé et un Bandeau d'erreur apparaît dans le panneau.
  - Chaque nouveau `code` est traduit dans `MESSAGES_PAR_CODE`.
- Sélecteur de licence et recherche d'Album repris du dialogue de téléversement (`libelles-images.ts`, `recherche-albums.ts`), sans les dupliquer.
- Le paquet initial reste sous 600 kB : le panneau reste dans le fragment de la page Préparation.

**Never:**
- Pas de migration, pas de changement de visibilité, pas de modification du Sens, des Sections, du Module ni des Thèmes.
- Aucun appel HTTP écrit à la main ; ne pas modifier `front/src/app/api/`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Compléter une image libre | `image_libre` sans source ; source « pixabay.com », licence CC0 | 200 ; `aCompleter` faux | N/A |
| Passer en image d'album | `image_libre` 1600 px → `image_album` + Album existant | 200 ; fichier et miniature ≤ 400 px ; licence `usage_pedagogique_album` ; `albumOrigine` posé | N/A |
| Album manquant | `image_album` sans `albumId` | Rien ne change | 400 `image.album_requis` |
| Album inconnu | `albumId` inexistant | Rien ne change | 400 `image.album_introuvable` |
| Quitter image d'album | `image_album` → `image_libre` | 200 ; `albumOrigine` null, licence vide, `aCompleter` vrai ; fichier inchangé | N/A |
| Photo personnelle | → `photo_personnelle`, licence CC0 envoyée | Licence `droits_auteur_enseignant` | N/A |
| Licence non choisissable | `image_libre` + `usage_pedagogique_album` | Rien ne change | 400 `requete.invalide` |
| Texte trop long | Source de 501 caractères | Rien ne change | 400 `requete.invalide` |
| Collègue avec lien | Claire lit l'Image de Zoé qu'elle a liée | Rien ne change | 403 `image.reservee_au_proprietaire` |
| Administrateur | Admin non propriétaire, Image consultable | Rien ne change | 403 |
| Non consultable | Image privée d'un collègue, sans lien | Rien | 404 |
| Échec à l'enregistrement | 500 ou réseau à la sortie du champ Source | Valeur gardée, champ signalé, Bandeau | Bandeau dans le panneau |
| Confirmation refusée | Type → image d'album, Album choisi, « Annuler » dans le dialogue | Type précédent rétabli, aucune requête | N/A |
| Non-propriétaire, front | Panneau ouvert sur l'Image d'un collègue | Vue en lecture de la partie 1, aucun champ | N/A |

</frozen-after-approval>

## Code Map

- `back/src/main/java/fr/corpusmots/vocabulaire/service/Images.java` -- `televerser` : `licence(type, demandee)`, `albumDOrigine(type, albumId)`, `texte(...)` à réutiliser pour la modification ; `carteIdentite(UUID)` pour la réponse ; `vue(...)`.
- `back/src/main/java/fr/corpusmots/vocabulaire/persistance/Image.java` -- entité (`@Version`) : ajouter une méthode de modification de la description.
- `back/src/main/java/fr/corpusmots/vocabulaire/persistance/ImageFichierRepository.java` (`octets`, `miniature`), `ImageFichier` -- relire puis remplacer le fichier réduit.
- `back/src/main/java/fr/corpusmots/vocabulaire/service/ReductionImages.java` -- `reduire(octets, TypeImage.IMAGE_ALBUM)`.
- `back/src/main/java/fr/corpusmots/vocabulaire/api/ImagesResource.java` -- `GET /images/{id}` (partie 1) ; ajouter le `PUT`.
- `back/src/main/java/fr/corpusmots/referentiels/service/ReferentielsService.java` l.154 -- modèle d'un 403 « réservé au créateur ».
- `back/src/test/java/fr/corpusmots/vocabulaire/api/CarteIdentiteImageResourceTest.java`, `ImagesDeTest.java` -- fixtures (image avec type, licence, album, lien).
- `front/src/app/commun/carte-identite/carte-identite.ts` (+ scss, spec) -- panneau de la partie 1 ; vue propriétaire à ajouter.
- `front/src/app/commun/libelles-images.ts` -- `LICENCES_CHOISIES`, `LICENCES_IMPOSEES`, `TYPES_IMAGE`.
- `front/src/app/preparations/recherche-albums.ts`, `televerser-image-dialogue.ts` -- recherche d'Album en autocomplete et Sélecteur de licence, modèles à reprendre.
- `front/src/app/commun/dialogue-confirmation/` -- Dialogue de confirmation existant, à réutiliser.
- `front/src/app/preparations/preparation.ts` -- hôte du panneau ; mettre à jour `mots()` avec le `typeImage` renvoyé.
- `front/src/app/commun/erreurs/message-erreur.ts` -- `MESSAGES_PAR_CODE`.

## Tasks & Acceptance

**Execution:**
- [x] `back/.../vocabulaire/` -- `Images.modifierDescription` (propriété, règles, réduction), commande, `PUT /images/{id}/description` et DTO d'entrée.
- [x] `back/src/test/.../vocabulaire/api/` -- une ligne de test par ligne back de la matrice, dont la taille du fichier et de la miniature après passage en image d'album.
- [x] `front/openapi/` -- régénérer et versionner.
- [x] `front/src/app/commun/carte-identite/` (+ spec) -- vue propriétaire, enregistrement à la sortie du champ, erreurs.
- [x] `front/src/app/preparations/preparation.ts` (+ spec) -- Carte de Mot mise à jour.
- [x] `front/src/app/commun/erreurs/message-erreur.ts` (+ spec) -- `image.reservee_au_proprietaire`.

**Acceptance Criteria:**
- Given le propriétaire qui change le type d'une image libre en photo personnelle, when il quitte le champ, then le Badge de type de la Carte de Mot change aussi.
- Given un champ inchangé, when le propriétaire le quitte, then aucune requête ne part.

## Implementation Notes

- Back : `PUT /images/{id}/description` (`modifierDescriptionImage`, corps `DescriptionImageDto`) → `Images.modifierDescription(UUID, ModifierDescriptionImageCommande)` : `consultable` (lien compris) sinon 404, propriétaire sinon `403 image.reservee_au_proprietaire`, puis les règles de `televerser` (`albumDOrigine`, `licence`, `texte`, réutilisées telles quelles). Passage en `image_album` depuis un autre type : `ImageFichierRepository.octets` → `ReductionImages.reduire(…, IMAGE_ALBUM)` → nouveau `ImageFichierRepository.remplacer` (update JPQL, sans charger l'entité), dans la même transaction. `Image.decrire` remplace les cinq valeurs ; `etat` intouché. Type ou licence inconnus : `400 requete.invalide` dès la ressource.
- Front : vue propriétaire du panneau (`modifiable()`), champs Material (Type d'image, Album d'origine pour une image d'album, Source, Licence, Auteur), lectures intercalées dans l'ordre du Glossaire (gabarit `debutChamps` partagé avec la vue en lecture). Saisies enregistrées au `blur`, listes au choix (`selectionChange`, `optionSelected`). Enregistrements mis en file (un seul à la fois), chacun comparé à la dernière Carte renvoyée : rien n'est envoyé sans changement. Échec : contrôle en erreur `enregistrement` (« Non enregistré » sous le champ) et Bandeau dans le panneau, « Réessayer » pour une erreur passagère. La Carte renvoyée passe par l'input `appliquer` (fonction de la page, appelée même si le panneau est fermé entre-temps, revue 1) ; `Preparation.appliquerCarteIdentite` reporte `typeImage` et `aCompleter` sur chaque Mot qui affiche l'Image. Échap ferme d'abord une liste ouverte, pas le panneau.
- Tant que le type « image d'album » attend son Album, aucun autre champ n'est enregistré (« Album d'origine requis » s'affiche) : le choix du type ne part qu'avec un Album.
- Vérification : back 487 tests dont 12 pour le `PUT` (`DescriptionImageResourceTest`), front 507 tests, paquet initial 597,40 kB.

- Revue 1 : Échap enregistre d'abord Source ou Auteur modifiés ; « Annuler » de la confirmation envoie les textes quittés pendant l'attente d'un Album ; erreur de recherche d'Album dans son propre bandeau (« Réessayer » relance la recherche).
- Vérification : back 489 tests (dont 14 pour `PUT /images/{id}/description`), front 513 tests, paquet initial 597,40 kB. L'aperçu du panneau peut rester en pleine résolution après la réduction tant que le cache du navigateur (`max-age=86400`) n'a pas expiré ; les données enregistrées sont justes.

## Spec Change Log

## Review Triage Log

Revue 1 (Blind Hunter BH, Edge Case Hunter EC, Verification Gap VG).

| # | Constat | Verdict | Preuve | Suite |
|---|---------|---------|--------|-------|
| 1 | EC-1 : panneau fermé pendant un enregistrement en vol, la Carte de Mot n'est pas mise à jour (`emit` sur un composant détruit) | medium | `modifiee` est un `output` du panneau, détruit à la fermeture | patch |
| 2 | EC-2 : Échap dans Source ou Auteur ferme sans enregistrer | medium | Pas de `blur` quand le panneau est retiré du DOM ; saisie perdue | patch |
| 3 | EC-4, BH-4 : Source ou Auteur modifiés pendant l'attente d'un Album ne partent jamais après « Annuler » | low | `description()` vaut `null` tant que l'Album manque ; rien n'est renvoyé ensuite | patch |
| 4 | BH-9 : l'erreur de recherche d'Album partage l'état d'erreur d'enregistrement | low | Son « Réessayer » relancerait un enregistrement ; un succès l'efface | patch |
| 5 | BH-11 : file d'enregistrement non testée | low | Aucun test de deux champs quittés avant la première réponse | patch |
| 6 | VG-3, EC-3 : Échap dans l'autocomplete Album non testé ; `stopPropagation` du panneau | low | Seule la liste Type est testée ; le test de la liste Type passe, le doute porte sur l'autocomplete | patch (test) |
| 7 | VG-1, BH-8 : 400 de la ressource (type, licence inconnus, type absent) non testés | medium | Aucun test n'atteint la branche de la ressource | patch |
| 8 | VG-2, BH-8 : image d'album qui change d'Album non testée | medium | Aucun test album → album | patch |
| 9 | BH-1 : licence non partageable ou photo personnelle sur une Image versée | low | L'état `versee` n'existe qu'avec l'Epic 3 | defer |
| 10 | EC-7, EC-9, BH-2 : deux écritures concurrentes, dernier écrivain gagnant ; `OptimisticLockException` en 500 | low | Un seul propriétaire ; deux onglets ouverts sur la même Image, rare | rejeté |
| 11 | EC-5, EC-10 : retour à l'image d'album pendant un enregistrement en vol, sans confirmation | low | L'Image était déjà en 400 px : aucune perte de résolution | rejeté |
| 12 | EC-6 : fichier stocké illisible lors de la réduction | false | Le fichier stocké vient de `ReductionImages` : toujours décodable | rejeté |
| 13 | EC-8 : licence stockée hors du Sélecteur pour une image libre | false | `televerser` et `modifierDescription` n'acceptent que les six licences choisissables pour ce type | rejeté |
| 14 | BH-3 : 404 pendant un enregistrement, « Réessayer » sans fin | false | « Réessayer » n'est proposé que pour une erreur réseau ou 5xx | rejeté |
| 15 | BH-5 : quitter l'image d'album sans confirmation | low | Album et licence se ressaisissent ; la résolution était déjà perdue | rejeté |
| 16 | BH-6 : Image sans fichier → 500 | false | `image` et `image_fichier` sont créés ensemble par `televerser` | rejeté |
| 17 | BH-7 : décodage dans la transaction | false | Décision de l'intention (source déjà réduite à 1 600 px) | rejeté |
| 18 | BH-8 : autres transitions non testées (photo → album, fichier < 400 px, `inconnu`) | low | Même chemin que libre → album, couvert ; `reduire` n'agrandit jamais (`ReductionImagesTest`) | rejeté |
| 19 | BH-10 : « Album d'origine requis » peut clignoter au choix à la souris | low | Non vérifié ; au pire un affichage fugace | rejeté |
| 20 | BH-12 : mise à jour limitée à la page Préparation | false | Seule vue qui montre des Images aujourd'hui | rejeté |
| 21 | BH-13 : `albumId` sans `nullable`, double contrôle du type, titre de la spec | low | Convention des UUID facultatifs du projet ; aucun effet | rejeté |

## Verification

**Commands:**
- `cd back && ./mvnw -q verify` (JAVA_HOME JDK 25, DOCKER_HOST Podman) -- expected: tous les tests passent, ArchUnit compris, `front/openapi/` à jour.
- `cd front && npm test -- --watch=false && npm run build` -- expected: tests et `verifier-jetons` au vert, paquet initial sous 600 kB.
