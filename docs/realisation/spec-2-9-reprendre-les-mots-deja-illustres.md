---
title: 'Story 2.9 : Reprendre les Mots déjà illustrés pour l''Album'
type: 'feature'
created: '2026-11-20'
status: 'done'
baseline_commit: '6ad08d59901f4691534b913aeb6ca1a57fcb01a1'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/realisation/epic-2-context.md'
  - '{project-root}/docs/realisation/spec-2-7-2-retenir-une-image-dans-la-detection.md'
  - '{project-root}/docs/realisation/spec-2-8-3-sens-dans-la-detection.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** À l'ouverture d'une Préparation, l'enseignant doit retaper un à un les Mots que l'équipe ou lui-même ont déjà illustrés pour cet Album (FR-7, UJ-1).

**Approach:** Sous le Champ de saisie rapide, l'Encart « mots déjà illustrés » liste les Mots candidats de l'Album, chacun avec son Image proposée (vignette 56 px). « Tout reprendre » les ajoute tous, « Reprendre » en ajoute un, « Écarter » en retire un de l'Encart (Bandeau « Annuler »). Les Mots sont ajoutés avec leur Image, liée avec l'origine `reutilisee`, et le Sens de cette Image (AD-5).

Décisions :
- Candidats (décision de Paul, option A) : les Sens liés à l'Album d'un Mot sont (1) les Sens de ses Images `proposable` dont l'album d'origine est cet Album, et (2) les Sens que l'enseignant courant a retenus pour ce Mot dans ses autres Préparations de cet Album, quand ce Mot y porte une Image ; jamais les Préparations d'un collègue (AD-2). Un Mot est candidat s'il a au moins une Image `proposable` d'un Sens lié à l'Album. Son Image proposée est la première, selon le classement de la story 2.7 pour la Section de la Préparation, parmi ces Images. Sont exclus : les Mots déjà dans la Préparation et les Mots écartés de cette Préparation. Ordre de l'Encart : forme, ordre alphabétique français.
- Écartés (décision de Paul, option A) : retenus en base pour la Préparation (table du module `preparations`, nouvelle migration). L'Encart est recalculé à chaque ouverture et reste tant qu'il reste des candidats. Un Mot retiré de la Préparation redevient candidat. Écarter ne supprime rien de la banque. Supprimer la Préparation supprime ses écartés.
- Reprendre un Mot : même règle et même route que retenir une Image dans la détection (`POST …/mots/reutilisation`, story 2.7, partie 2).
- « Tout reprendre » : une requête avec les `motId` affichés. Le back recalcule l'Image proposée de chacun, ajoute dans l'ordre de l'Encart ceux qui sont encore candidats et ignore les autres (déjà présent, plus candidat, écarté). Une transaction ; il renvoie les Mots ajoutés. Si certains Mots ont été ignorés, le front affiche « n mots n'ont pas pu être repris. ».
- Encart : titre « 9 mots déjà illustrés pour cet album » (« 1 mot déjà illustré pour cet album »), mis à jour à chaque reprise ou écart, annonce polie à chaque changement. Chaque Mot montre sa vignette, sa forme, le Sens (« chute (nom) ») et deux boutons, « Reprendre « étalé » » et « Écarter « étalé » ». Le Mot repris arrive en fin de Grille, et le compteur de l'En-tête suit. Après une reprise ou un écart, le focus passe au bouton « Reprendre » du Mot suivant, sinon au précédent, sinon au Champ de saisie rapide quand l'Encart disparaît.
- Écarter puis « Annuler » (Bandeau existant, 8 s) : le Mot revient à sa place dans l'Encart.
- Échec réseau : Bandeau d'erreur avec « Réessayer », sur le modèle des retraits de Mot. Les refus métier (`409`, `image.indisponible`, `preparation.sens_invalide`) d'une reprise unitaire affichent leur message et rechargent l'Encart.

## Boundaries & Constraints

**Always:**
- `vocabulaire.service` calcule seul les candidats, leurs Sens liés et le classement (AD-2), à partir de `VisibiliteImages.proposable` et du classement de `DetectionMots`, sans copie. `preparations` lui passe l'Album, la Section, la Préparation courante, les `motId` déjà présents et les `motId` écartés.
- Routes, sous `/preparations/{id}` d'une Préparation de l'enseignant (sinon `404 ressource.introuvable`) :
  - `GET /reprises` : liste `{ motId, forme, sens {id, libelle, categorie}, image }`, où `image` a la forme d'une Image de la détection.
  - `POST /reprises { motIds }` : renvoie les Mots de Préparation ajoutés. Une liste vide ou absente, ou de plus de 200 éléments, donne `400 requete.invalide`.
  - `PUT /ecartes/{motId}` : idempotent, `204`.
  - `DELETE /ecartes/{motId}` : idempotent, `204`.
- `GET /reprises` n'écrit rien. Pour une Préparation sans Album, la liste est vide.
- Encart accessible : région nommée par son titre, boutons nommés avec la forme, état jamais signalé par la couleur seule. Styles par jetons, avec le jeton `encart-mots-deja-illustres` de DESIGN.md.
- Paquet initial sous 600 kB : l'Encart vit dans le chunk de la Préparation, chargé à la demande.

**Never:**
- Ne pas montrer un Album ou un Sens venu des Préparations d'un collègue. Un lien ne rend jamais une Image proposable.
- Aucun filtre de visibilité dans le front ; aucun appel HTTP écrit à la main ; ne pas modifier `front/src/app/api/` ; ne pas modifier une migration publiée.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Image d'album versée d'un collègue | « galette », Image `versee` d'album d'origine Roule galette | Candidat, avec cette Image | N/A |
| Préparation antérieure de l'enseignant | « renard » illustré dans sa Préparation GS du même Album | Candidat, Image proposable du Sens retenu, Section MS d'abord | N/A |
| Préparation d'un collègue | « four » illustré seulement dans la Préparation de Zoé | Non candidat | N/A |
| Image privée d'un collègue | Image `privee` de Zoé, album d'origine cet Album | Non candidat | N/A |
| Autre Sens du Mot | « côte » (mer) lié à l'Album, Image « côte de bœuf » mieux classée | Image « mer » proposée | N/A |
| Déjà présent ou écarté | « galette » dans la Préparation, ou écarté | Absent de la liste | N/A |
| Mot retiré | Mot repris, puis retiré de la Préparation | De nouveau candidat | N/A |
| Tout reprendre | 3 Mots, dont 1 ajouté entre-temps par la saisie | 2 ajoutés, avec origine `reutilisee` et Sens de l'Image | N/A |
| Tout reprendre, liste invalide | `motIds` vide ou de plus de 200 éléments | Rien | 400 `requete.invalide` |
| Préparation d'un collègue | Les quatre routes | Rien | 404 `ressource.introuvable` |
| Écarter, deux fois | `PUT` répété, puis `DELETE` répété | Une seule ligne, puis aucune ; `204` | N/A |
| Front, ouverture | 9 candidats | Encart « 9 mots déjà illustrés pour cet album », vignettes 56 px | N/A |
| Front, aucun candidat | Liste vide | Pas d'Encart | N/A |
| Front, Reprendre | « Reprendre « étalé » » | Mot en fin de Grille, titre à 8, focus au Mot suivant | N/A |
| Front, Écarter puis Annuler | « Écarter », puis « Annuler » | Mot retiré, puis revenu à sa place | N/A |
| Front, dernier Mot | Reprendre ou écarter le dernier | Encart disparu, focus au champ | N/A |
| Front, Tout reprendre partiel | 1 Mot sur 3 ignoré | 2 ajoutés, « 1 mot n'a pas pu être repris. », Encart rechargé | N/A |
| Front, échec réseau | Reprise ou écart | Bandeau « Réessayer », Encart inchangé | N/A |

</frozen-after-approval>

## Code Map

- `back/src/main/java/fr/corpusmots/vocabulaire/service/DetectionMots.java` -- `detectes`, comparateur `classement`, `albumDOrigine`, `sensVisibles` : partager le classement avec le calcul des candidats (nouvelle méthode, par exemple `motsDejaIllustres(albumId, section, preparationId, exclus)`).
- `back/src/main/java/fr/corpusmots/vocabulaire/persistance/` -- `ImageRepository`, `SensRetenuRepository`, `LienImageRepository` (`album_id`, `enseignant_id`, `preparation_mot_id`) : requêtes des Sens liés à l'Album.
- `back/src/main/java/fr/corpusmots/preparations/service/PreparationsService.java` -- `reutiliserImage` (l.335) : modèle de chaque reprise ; « Tout reprendre » et les écartés.
- `back/src/main/java/fr/corpusmots/preparations/api/PreparationsResource.java` -- routes `reprises` et `ecartes` ; DTO aux noms uniques (AD-16).
- `back/src/main/resources/db/migration/` -- `V<AAAAMMJJHHMM>__preparations_mot_ecarte.sql` : `(preparation_id → preparation ON DELETE CASCADE, mot_id uuid sans clé étrangère, PK des deux)`.
- `back/src/test/java/fr/corpusmots/preparations/api/` -- fixtures de `ReutilisationImagePreparationResourceTest` et `SensPreparationResourceTest`.
- `front/src/app/preparations/preparation.ts` -- chargement de la Préparation, `fileAjouts`, `BandeauAnnuler`, focus après retrait : modèles pour l'Encart.
- `front/src/app/preparations/vignette-proposition.ts` -- vignette d'une Image de la détection, à réutiliser en 56 px.
- `front/src/app/preparations/` -- nouveau composant `encart-mots-deja-illustres.ts` (+ spec, scss).

## Tasks & Acceptance

**Execution:**
- [x] `back/.../vocabulaire/` -- calcul des candidats et des Images proposées.
- [x] `back/.../preparations/` + migration -- routes, reprise en lot, écartés.
- [x] `back/src/test/...` -- une ligne de test par ligne back de la matrice, dont « rien n'est écrit » après chaque refus.
- [x] `front/openapi/` -- régénérer et versionner.
- [x] `front/src/app/preparations/` (+ specs) -- Encart et intégration à la page ; une ligne de test par ligne front de la matrice.

**Acceptance Criteria:**
- Given une Préparation nouvellement créée pour Roule galette avec 9 Mots candidats, when elle s'ouvre, then l'Encart « 9 mots déjà illustrés pour cet album » s'affiche sous le champ.
- Given l'Encart, when « Tout reprendre », then les 9 Mots arrivent dans la Grille avec leur Image (`reutilisee`), le compteur de l'En-tête suit et l'Encart disparaît.
- Given un Mot repris, when l'enseignant ouvre son Panneau de choix d'Image, then il peut remplacer l'Image proposée.

## Implementation Notes

- Back : `DetectionMots.motsDejaIllustres(albumId, section, preparationId, exclus)` (nouveau `MotDejaIllustreVue`) ; le comparateur de classement est extrait (`classement(...)`) et partagé avec la détection, comme la construction de l'`ImageDetecteeVue`. Sens liés : `ImageRepository.dAlbumDOrigineAvecSections` (images d'album, filtrées par `VisibiliteImages.proposable`) et `SensRetenuRepository.sensIllustresDansLAlbum` (enseignant courant, même Album, autre Préparation, `exists` d'un `lien_image` du même Mot de Préparation). Migration `V202611201000__preparations_mot_ecarte.sql` (table `mot_ecarte`, PK `(preparation_id, mot_id)`, `ON DELETE CASCADE`), lue et écrite en SQL par `MotEcarteRepository` (pas d'entité). `PreparationsService` : `reprises`, `reprendre` (Préparation verrouillée, candidats recalculés, ordre de l'Encart ; `Usages.lierImageSiPossible`, et si l'Image cesse d'être proposable sous verrou, la ligne ajoutée est libérée et supprimée : le Mot est ignoré sans annuler les autres), `ecarter`, `annulerEcart` ; `retirerMot` efface aussi l'écart du Mot, pour qu'un Mot retiré redevienne candidat même s'il avait été écarté puis saisi. Ressource : `GET/POST /reprises` (`RepriseMotPreparationDto`, `RepriseMotsPreparationDto` ; `POST` répond `200`, liste vide, absente, de plus de 200 ou avec un `null` : `400 requete.invalide`), `PUT/DELETE /ecartes/{motId}` (`204`). Tests : `ReprisesPreparationResourceTest` (14).
- Front : `EncartMotsDejaIllustres` (+ `VignetteReprise`, vignette de 56 px par `ImageSecurisee` plutôt que `VignetteProposition`, conçue comme option de liste de 232 px), statique dans le chunk `preparation` (chargé à la demande). L'Encart lit ses candidats, masque ceux déjà dans la Grille (`motsPresents`), émet `ajoutes` (la page les insère par `ordre`), `annonce` (région `aria-live` de la page, pour ne pas ajouter de région polie) et `focusChamp`. Gestes sans `disabled` (le focus resterait perdu) mais ignorés pendant une requête. Écart non optimiste (l'Encart ne change qu'au succès), « Annuler » le remet à sa place (tri français). Refus métier d'une reprise : Bandeau sans « Réessayer », puis relecture ; échec réseau : Bandeau avec « Réessayer ». Jeton `--cm-taille-vignette-encart`. Paquet initial : 598,89 kB.
- Après revue : « Tout reprendre » envoie par lots de 200 (ordre gardé, ajoutés et ignorés cumulés ; un lot en échec émet les Mots déjà ajoutés) et annonce « n mots repris. » plus le titre relu, aussi en reprise partielle ; « Annuler » un écart respecte `occupe` (sinon Bandeau « Réessayer »), relit l'Encart après le `DELETE` et n'annonce « rendu » que si le Mot est revenu ; ordre du back gardé (plus de tri côté front) ; la page relit l'Encart après un retrait réussi et après son « Annuler » ; « image indisponible » limité à `image.indisponible`, `image.sens_different`, `preparation.sens_invalide` ; identifiant de titre par instance. Back : `ecarter` et `annulerEcart` verrouillent la Préparation, `ecarter` refuse un Mot inconnu (`404 ressource.introuvable`). Tests ajoutés des deux côtés.
- Documentation d'exploitation inchangée : les écartés font partie des Préparations (« vos Préparations et leurs Mots »), supprimés avec elles, et suivent la sauvegarde complète de la base.

## Spec Change Log

## Review Triage Log

Revue 1 (Blind Hunter BH, Edge Case Hunter EC, Verification Gap VG).

| # | Constat | Verdict | Preuve | Suite |
|---|---------|---------|--------|-------|
| 1 | BH-2, EC-1 : « Tout reprendre » au-delà de 200 candidats toujours refusé | medium | `GET` sans limite, `POST` limité à 200 | patch (lots de 200) |
| 2 | BH-3, VG-2 : succès partiel non annoncé ; échecs de « Tout reprendre » non testés | medium | Seul le bandeau d'erreur est affiché | patch |
| 3 | BH-10, EC-3, EC-4, BH-9 : « Annuler » restaure localement sans consulter le back, ignore `occupe`, ordre recalculé dans le front | medium | Mot non candidat réaffiché, concurrence avec les autres gestes | patch (rechargement, ordre du back) |
| 4 | EC-2 : Mot retiré de la Grille absent de l'Encart jusqu'au rechargement | medium | Contredit « un Mot retiré redevient candidat » | patch |
| 5 | VG-6, EC-5 : `ressource.introuvable` traduit en « image plus disponible » | low | Même code pour Préparation ou Mot introuvable | patch |
| 6 | BH-1, VG-5, EC-9, BH-11 : commentaire de `charger` contraire au code, chargement en échec non testé, identifiant de titre fixe | low | Correction directe | patch |
| 7 | EC-7, EC-8, BH-8 : écart sans verrou et pour un Mot inexistant | low | Course avec « Tout reprendre », lignes orphelines | patch |
| 8 | VG-1, VG-3, BH-6, BH-7 : clause « le Mot y porte une Image », marque « déjà utilisée », élément `null` non testés | medium | Retirer la clause ne ferait échouer aucun test | patch |
| 9 | BH-5, VG-4 : branche de l'Image devenue non proposable sous verrou non testée | low | Atteignable seulement par concurrence ; aucun banc de concurrence dans les `@QuarkusTest` | rejeté |
| 10 | BH-4 : coût de `reprendre` sous verrou | low | Au plus 200 Mots, usage d'une école | rejeté |
| 11 | BH-12 : filtre redondant sur l'album d'origine | low | Sans effet | rejeté |
| 12 | EC-6 : Mot en cours d'ajout par la saisie compté comme ignoré | low | Message passager, Encart rechargé ensuite | rejeté |
| 13 | BH-7 : Préparation sans Album non testée | false | `album_id` NOT NULL | rejeté |

## Verification

**Commands:**
- `cd back && ./mvnw -q verify` (JAVA_HOME JDK 25, DOCKER_HOST `npipe:////./pipe/docker_engine`) -- expected: tous les tests passent, ArchUnit compris, `front/openapi/` à jour.
- `cd front && npm test -- --watch=false && npm run build` -- expected: tests et `verifier-jetons` au vert, paquet initial sous 600 kB.
