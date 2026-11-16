---
title: 'Story 2.7, partie 1 : Panneau de détection pendant la frappe'
type: 'feature'
created: '2026-11-16'
status: 'done'
baseline_commit: 'ba860d4b0d35d12bb9e7e76280c9aa818c671807'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/realisation/epic-2-context.md'
  - '{project-root}/docs/realisation/spec-2-4-suggestions-arasaac.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Pendant la saisie rapide, l'enseignant ne sait pas qu'un Mot existe déjà, ni quelles Images l'illustrent : il risque de refaire ce qui existe (FR-8, FR-9).

**Approach:** Dès 2 caractères, un Panneau de détection s'affiche sous le Champ de saisie rapide, sans validation. Pour un Mot existant et visible (AD-2), il montre le Mot en cursive, ses Sens, ses Albums et ses Images `proposable`, classées par `vocabulaire.service`. Sinon il présente le Mot comme nouveau, avec les suggestions ARASAAC de la story 2.4. Les Images ne sont pas encore cliquables (partie 2) ; Entrée ajoute toujours le Mot, comme aujourd'hui.

Décisions :
- Découpage de la story 2.7 en trois parties, choisi par Paul : partie 1 détection en lecture, partie 2 retenir une Image dans la détection, partie 3 Panneau de choix d'Image (`deferred-work.md`).
- Recherche (décision de Paul) : égalité tolérante. Seuls les Mots dont `forme_recherche` égale la saisie normalisée par `Lexique.normaliser` puis sans casse ni accents. « cote » donne « côte » et « côté » ; « far » ne donne pas « farine » et présente un Mot nouveau.
- Mot visible (AD-2) : il porte une Image `proposable` à l'enseignant, ou il figure dans l'une de ses Préparations. Sinon, y compris s'il n'existe que dans Mes mots d'un collègue, il est présenté comme nouveau.
- En-tête : « farine — existe déjà · 2 images, dans 1 album » (accords au singulier et au pluriel ; « aucune image » si besoin). Plusieurs Mots (« côte », « côté ») : un bloc par Mot.
- Sens : ligne « Sens : animal (nom), méchant » listant les Sens visibles du Mot (ceux des Images `proposable` et ceux retenus par l'enseignant), sauf s'il n'y a que « à compléter ».
- Albums : ligne « Albums : … » (titres), les albums d'origine des Images `proposable` et les Albums des Préparations de l'enseignant où figure le Mot, jamais ceux des Préparations d'un collègue.
- Vignette d'Image (maquette `key-preparation.html` › `.detect .choice`) : miniature (`image-securisee`, `?taille=miniature`), Repères de Section, Badge de type, album d'origine s'il y en a un, propriétaire (« vous » ou son nom dans l'Annuaire), Marque « déjà utilisée », libellé du Sens si le Mot en a plusieurs. La première est mise en avant (`primary-container` + anneau 2 px `primary`). Ligne « Images de votre section en premier. » quand des Images sont montrées.
- Classement, calculé par `vocabulaire.service` : Images qui cochent la Section de la Préparation d'abord ; à Section égale, celles déjà liées à leur Sens dans un autre Album que celui de la Préparation (lien de n'importe quel enseignant) ; puis celles de l'enseignant avant celles des collègues ; enfin les plus récentes.
- Marque « déjà utilisée » : Image que l'enseignant a déjà liée dans l'une de ses Préparations.
- Mot déjà présent dans cette Préparation : l'en-tête dit « — déjà dans la préparation » (Entrée le refuse toujours avec le message actuel).
- Requête après une pause de frappe ; une réponse dépassée par une frappe plus récente est ignorée ; le panneau disparaît quand le champ est vidé ou après l'ajout du Mot.

## Boundaries & Constraints

**Always:**
- `GET /preparations/{id}/detection?saisie=…` dans `preparations` (Préparation de l'enseignant, sinon `404`), qui transmet Section et Album à un service de `vocabulaire` ; `vocabulaire` décide de la visibilité (seulement `VisibiliteImages.proposable`) et du classement. Saisie de moins de 2 caractères après normalisation, ou plus longue que `LONGUEUR_MAX_FORME` : `400 requete.invalide`.
- Rien n'est écrit pendant la détection : ni Mot, ni Sens, ni Sens retenu (AD-19). `obtenirOuCreer…` n'est jamais appelée.
- Moins d'une seconde sur un jeu de 5 000 Images (NFR-3, NFR-6), mesuré par un test du back. Pas de migration si l'index `pg_trgm` existant suffit à l'égalité ; sinon une migration `vocabulaire` dédiée (AD-22).
- Panneau annoncé par `aria-live="polite"`, sans jamais prendre le focus du champ (UX-DR-26). Le Mot en police cursive.
- Mot nouveau ou sans Image : composant `suggestions-arasaac` existant, avec le Repère de qualité.
- Paquet initial sous 600 kB.

**Never:**
- Pas de choix d'Image, de lien, de « Autre image » ni de « Nouveau sens » (parties 2 et 3, story 2.8).
- Aucun filtre d'Image hors de `VisibiliteImages` ; aucun classement calculé dans le front.
- Aucun appel HTTP écrit à la main ; ne pas modifier `front/src/app/api/`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Mot existant | « Farine », Image de Paul cochée MS, Préparation MS | Mot « farine », 1 Image, « déjà utilisée » si Paul l'a liée | N/A |
| Accents et article | « la cote » ; Mots « côte » et « côté » visibles | Deux Mots | N/A |
| Collègue seulement | « loup » : seule Image privée de Zoé, aucune Préparation de Paul | Présenté comme nouveau | N/A |
| Mot de mes Préparations | « four » dans une Préparation de Paul, sans Image | « existe déjà · aucune image » + suggestions ARASAAC | N/A |
| Classement | Image A (GS, Paul), B (MS, Zoé versée), C (MS, Paul) ; Préparation MS | C, B, A | N/A |
| Liée ailleurs | Deux Images MS de Paul, l'une liée à ce Sens dans un autre Album | Celle-ci d'abord | N/A |
| Albums montrés | Image d'album de Paul (album X) ; « farine » aussi dans une Préparation de Zoé (album Y) | Albums : X seulement | N/A |
| Rien écrit | Détection d'un Mot inconnu | Aucune ligne `mot`, `sens`, `sens_retenu` créée | N/A |
| Saisie trop courte | « a » | Rien | 400 `requete.invalide` |
| Préparation d'un collègue | `id` d'une Préparation de Zoé | Rien | 404 |
| Performance | 5 000 Images en base | Réponse < 1 s | N/A |
| Front, frappe rapide | « fa », puis « far », réponse « fa » arrivée en dernier | Seul le résultat de « far » s'affiche | N/A |
| Front, échec | Erreur réseau sur la détection | Message court sous le champ, la saisie continue ; Entrée ajoute toujours | Message discret, pas de Bandeau bloquant |

</frozen-after-approval>

## Code Map

- `back/src/main/java/fr/corpusmots/preparations/service/PreparationsService.java` -- `verrouillee`/lecture d'une Préparation de l'enseignant (404 pour un collègue), `section()`, `albumId()` ; ajouter la détection (lecture seule, sans verrou).
- `back/src/main/java/fr/corpusmots/preparations/api/` -- ressource des Préparations : ajouter `GET /preparations/{id}/detection` et ses DTO (noms uniques, AD-16).
- `back/src/main/java/fr/corpusmots/vocabulaire/service/` -- nouveau service de détection : `Lexique.normaliser`, `VisibiliteImages.proposable`, `Usages.LIBELLE_A_COMPLETER` ; référentiels lus par `ReferentielsService.albums`.
- `back/src/main/java/fr/corpusmots/vocabulaire/persistance/MotRepository.java` -- `forme_recherche = unaccent(forme_cle)` ; ajouter la recherche par égalité sur `forme_recherche`. `SensRepository`, `SensRetenuRepository`, `ImageRepository`, `LienImageRepository` (`album_id`, `enseignant_id`) pour Sens, Images, Albums et liens.
- `back/src/main/resources/db/migration/V202611111000__vocabulaire_mot_sens.sql` -- index `mot_forme_recherche_trigrammes` (GIN `gin_trgm_ops`) ; ne pas modifier.
- `back/src/main/java/fr/corpusmots/referentiels/persistance/AlbumRepository.java` -- modèle d'une requête `unaccent` / `pg_trgm`.
- `back/src/test/java/fr/corpusmots/vocabulaire/api/ImagesDeTest.java`, `SensImageResourceTest.java` -- fixtures (Images, liens, Sens retenus, sections) et modèles de tests.
- `front/src/app/preparations/saisie-rapide.ts` -- champ actuel (Entrée ajoute, vide, garde le focus) ; y brancher la détection ou un composant frère.
- `front/src/app/preparations/preparation.ts` l.500 -- hôte de `app-saisie-rapide` ; Préparation (id, Section).
- `front/src/app/preparations/suggestions-arasaac.ts` -- suggestions ARASAAC (`mot`), à réutiliser.
- `front/src/app/commun/` -- `repere-section`, `badge-type-image`, `image-securisee`, `annuaire.ts` (`enseignant(id)`), `compte-courant.ts`.
- `docs/ux-designs/ux-corpus-mots-2026-10-28/.working/key-preparation.html` -- `.detect`, `.choice`, `.used` : rendu attendu.

## Tasks & Acceptance

**Execution:**
- [x] `back/.../vocabulaire/` -- service de détection (recherche, visibilité, Sens, Albums, classement, « déjà utilisée »), repositories.
- [x] `back/.../preparations/` -- route `GET /preparations/{id}/detection` et DTO.
- [x] `back/src/test/...` -- une ligne de test par ligne back de la matrice, dont le test de 5 000 Images.
- [x] `front/openapi/` -- régénérer et versionner.
- [x] `front/src/app/preparations/` (+ spec) -- Panneau de détection sous le champ, `aria-live`, réponses dépassées ignorées.

**Acceptance Criteria:**
- Given le champ de saisie rapide, when l'enseignant tape « fa » puis « farine », then le panneau s'affiche sans qu'il valide et le focus reste dans le champ.
- Given un résultat affiché, when l'enseignant appuie sur Entrée, then le Mot est ajouté comme aujourd'hui et le panneau disparaît.

## Implementation Notes

- Back : `vocabulaire.service.DetectionMots.detecter(saisie, albumId, section)` (lecture seule, `@Transactional` rejoint) : `MotRepository.parFormeRecherche` compare `forme_recherche` à `unaccent(Lexique.cle(forme))`, calculé comme à l'insertion ; pas de migration (l'index `gin_trgm_ops` accepte l'égalité, et le test de 5 000 Images passe). Images lues avec leurs Sections en une requête (`ImageRepository.deSensAvecSections`), filtrées par `VisibiliteImages.proposable` ; Sens retenus de l'enseignant par `SensRetenuRepository.deMots` ; « liée ailleurs » et « déjà utilisée » par deux requêtes groupées de `LienImageRepository`. Dernier critère de classement à date égale : identifiant décroissant (uuidv7). Sens visibles par libellé, « à compléter » en dernier ; Albums par titre. `PreparationsService.detecter` (sans verrou) vérifie la Préparation (404) avant la saisie (400) et calcule `dejaDansLaPreparation` sur ses propres tables. DTO `Detection*Dto` dans `preparations.api`.
- Front : `PanneauDetection` (`preparations/panneau-detection.ts`) sous `app-saisie-rapide`, qui émet chaque valeur par `saisieModifiee` ; pause de 250 ms (`DELAI_DETECTION_MS`), numéro de frappe pour ignorer les réponses dépassées, `400 requete.invalide` (« l'a ») masque le panneau sans message. En-tête « existe déjà · n images, dans n albums » (partie albums omise sans Album), « déjà dans la préparation · … » si le Mot y figure, « — nouveau mot » sinon. Propriétaire « vous » ou nom de l'Annuaire, lu seulement à la première Image d'un collègue. Nouveaux jetons `--cm-largeur-vignette-detection`, `--cm-hauteur-photo-detection`, `--cm-taille-image-detection`, `--cm-epaisseur-anneau-proposition` ; icône `historique` pour « déjà utilisée ».
- Exploitation : la page Données personnelles dit qu'un mot tapé dans « Ajouter un mot » peut être envoyé à ARASAAC pendant la frappe ; `deploiement/README.md` cite le Panneau de détection pour l'accès sortant à ARASAAC. Rien n'est stocké : RESTAURATION.md ne change pas.

## Spec Change Log

## Review Triage Log

Revue 1 (Blind Hunter BH, Edge Case Hunter EC, Verification Gap VG).

| # | Constat | Verdict | Preuve | Suite |
|---|---------|---------|--------|-------|
| 1 | BH-4 : tout le panneau est la région `aria-live` | medium | Chaque résultat relit toutes les vignettes pendant la frappe | patch |
| 2 | BH-3 : suggestions ARASAAC demandées pour chaque fragment | medium | Recherche par égalité : presque chaque pause donne « nouveau mot », donc un appel ARASAAC par fragment | patch |
| 3 | BH-7 : icône livre sans Album d'origine | low | Affichée devant le seul propriétaire pour toute image libre ou ARASAAC ; correction directe | patch |
| 4 | EC-2 : `saisieTapee` gardée au rechargement de la Préparation | low | Le champ recréé est vide mais le panneau montre l'ancienne détection ; correction directe | patch |
| 5 | VG-1 : « déjà utilisée » jamais testé avec un lien d'un collègue seul | medium | Retirer le filtre `enseignantId` de `lieesPar` ne ferait échouer aucun test | patch (test) |
| 6 | VG-2, BH-8 : ordre des Sens et des Albums, critère 2 avant critère 3, non testés | low | Les données suivent l'ordre d'insertion ; le test du lien n'oppose que des Images de Paul | patch (test) |
| 7 | BH-1 : entrées de `deferred-work.md` en `source_spec: none` | false | Format imposé par le découpage, fait avant la spec | rejeté |
| 8 | BH-2 : miniatures rechargées à chaque résultat | low | Avec l'égalité, le même Mot ne revient que pour des variantes de saisie (espace, article) ; cache HTTP `max-age` | rejeté |
| 9 | BH-5 : « Images de votre section en premier. » toujours affiché | low | Décision de la spec : la ligne accompagne toute liste d'Images | rejeté |
| 10 | BH-6 : « à compléter » dans la ligne des Sens et l'alt | low | Décision de la spec : n'est caché que s'il est le seul Sens | rejeté |
| 11 | BH-8 : états `abandonnee`, `supprimee`, `aRemplacer` non testés | false | Ces états n'existent qu'avec l'Epic 3 | rejeté |
| 12 | BH-9, VG : test de performance sur une seule mesure, en CI | low | La requête mesurée prend une fraction de la limite ; le test échoue bien si la recherche devient lente | rejeté |
| 13 | BH-10 : vérification d'enseignant après la recherche, `contient` par Mot, colonnes natives listées | low | Un ou deux Mots par saisie ; aucune erreur observable | rejeté |
| 14 | BH-11 : requête relancée pour une espace finale | low | Une requête de plus, sans effet visible | rejeté |
| 15 | BH-12 : rien ne prépare la liste au clavier de la partie 2 | false | Hors de cette partie ; la partie 2 est notée dans `deferred-work.md` | rejeté |
| 16 | VG-3 : icône de repli d'une miniature en échec non testée | low | Même mécanisme que les autres vignettes de `image-securisee` | rejeté |
| 17 | EC-1 : Sens retenu créé entre deux lectures → 500 | low | Exige un ajout dans un autre onglet pendant la détection ; la frappe suivante relance | rejeté |
| 18 | EC-3 : `albumOrigine` nul pour une image d'album sans Album | false | Aucun Album ne se supprime aujourd'hui (fusion en Epic 6) | rejeté |
| 19 | EC-4 : résultat précédent visible pendant la nouvelle frappe | low | Avec la ligne 1, seul le résumé est annoncé ; il est remplacé au résultat suivant | rejeté |

## Verification

**Commands:**
- `cd back && ./mvnw -q verify` (JAVA_HOME JDK 25, DOCKER_HOST Podman) -- expected: tous les tests passent, ArchUnit compris, `front/openapi/` à jour.
- `cd front && npm test -- --watch=false && npm run build` -- expected: tests et `verifier-jetons` au vert, paquet initial sous 600 kB.
