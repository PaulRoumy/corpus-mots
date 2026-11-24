---
title: 'Story 3.3, partie 1 : verser une Image ou un lot, côté back'
type: 'feature'
created: '2026-11-24'
status: 'done'
baseline_commit: '2d3cc4abec3838a9b3ca6a7137978302f6bd5689'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/realisation/epic-3-context.md'
  - '{project-root}/docs/architecture/architecture-corpus-mots-2026-10-29/ARCHITECTURE-SPINE.md'
  - '{project-root}/docs/realisation/spec-3-2-1-filtres-de-la-banque.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Rien ne permet encore de verser une Image (FR-19). L'état `versee` existe dans le schéma, et `VisibiliteImages` le lit, mais aucune méthode ne l'écrit. La règle de versabilité d'AD-4 et ses codes stables ne sont écrits nulle part, si bien que le front n'a aucun moyen de savoir pourquoi une Image n'est pas versable.

**Approach:**
- `vocabulaire.service` reçoit une seule méthode de versement, avec un `Acteur` explicite (AD-3) et le contrôle de versabilité d'AD-4.
- Deux routes du propriétaire l'utilisent : une pour une Image, une pour un lot.
- Les vues d'Image exposent la versabilité, pour que le front montre la raison d'un refus avant même d'essayer.
- Une migration ajoute `retrait_admin_motif` dès maintenant ; la modération (Epic 5) l'écrira.

Décisions :
- **Acteur :** un type scellé `Acteur`, avec `Proprietaire(id)` et `Administrateur(id, motif)`, dans `vocabulaire.service`. Le versement n'accepte que `Proprietaire`. Le type `Administrateur` est créé ici pour fixer la forme d'AD-3, mais aucune méthode ne l'utilise encore.
- **Versabilité (AD-4) :** une seule fonction de `vocabulaire.service`, qui renvoie « versable » ou le motif de refus. Les motifs sont examinés dans cet ordre, et le premier qui s'applique l'emporte :
  1. `retrait_admin_motif` renseigné : `image.versement.retrait_admin` ;
  2. type `image_album` : `.image_album` ;
  3. type `inconnu` : `.type_inconnu` ;
  4. `image_libre` sans source, ou avec une source vide après rognage : `.source_manquante` ;
  5. `image_libre` dont la licence est absente ou hors des quatre licences partageables (`arasaac_cc_by_nc_sa`, `sclera_cc_by_nc`, `mulberry_cc_by_sa`, `cc0_domaine_public`) : `.licence_non_versable`.

  Une `photo_personnelle` est toujours versable, hors retrait admin.
- **Verser une Image :** `POST /api/images/{id}/versement`, sans corps. La route répond 200 avec la Carte d'identité à jour.
  - Image absente ou invisible pour l'enseignant (`abandonnee`, `supprimee`, privée d'un collègue) : `404 image.indisponible`.
  - Image versée d'un collègue : `403 image.reservee_au_proprietaire`, y compris pour un administrateur.
  - Image non versable : `400` avec le code du motif.
  - Image déjà versée : 200, sans aucun changement (idempotent).
  - Le versement prend `SELECT … FOR UPDATE` sur la ligne `image` (AD-17) et passe `etat` de `privee` à `versee`.
  - Aucune Notification n'est créée : AD-3 n'en prévoit pas pour `privee → versee`.
- **Verser un lot :** `POST /api/images/versements`, corps `{ imageIds: [...] }`, de 1 à 500 identifiants, chacun présent une seule fois. La route renvoie `{ versees: [id…], refusees: [{ imageId, code }] }`.
  - Chaque Image suit la règle d'une Image seule : une refusée ne bloque pas les autres, et sa raison est rendue (`image.indisponible`, `image.reservee_au_proprietaire` ou un motif de versabilité).
  - Tout se passe dans une seule transaction. Les verrous sont pris dans l'ordre des identifiants, pour éviter les interblocages.
  - Une liste vide, trop longue ou avec un doublon donne `400 requete.invalide`.
- **Retrait admin :** une nouvelle migration `V<AAAAMMJJHHMM>__vocabulaire_image_retrait_admin.sql` ajoute `retrait_admin_motif text NULL`, limité aux valeurs d'AD-3 (`licence_non_conforme`, `image_album`, `image_inadaptee`, `autre`), et `retrait_admin_texte text NULL`. Toute modification de la Carte d'identité par le propriétaire vide ces deux colonnes : description, classement, changement ou création de Sens.
- **Versabilité exposée :** `CarteIdentiteImageDto`, `ImageBanqueDto` et l'Image des Mots de Préparation gagnent `versabilite`. Elle vaut `null` si le lecteur n'est pas le propriétaire ou si l'Image est déjà versée, `"versable"` sinon, ou le code du motif de refus. Les valeurs forment une énumération dans le contrat.

## Boundaries & Constraints

**Always:**
- `etat` ne change que par la méthode de versement de `vocabulaire.service` (AD-3). La versabilité n'est calculée que par la fonction unique, que la route et les vues appellent.
- Tests dédiés (AD-4) :
  - un test par motif de refus, sur les deux routes ;
  - la photo personnelle ;
  - les quatre licences partageables ;
  - le 403 et le 404 ;
  - l'idempotence ;
  - le lot mixte ;
  - le retrait admin vidé par chaque modification de la Carte.
- Une règle ArchUnit garantit que seule la classe du versement écrit `etat`, sinon le test existant le plus proche est étendu.
- Contrat : lancer `./mvnw package -DskipTests`, puis versionner `front/openapi/`.
- Les formes de Mot des tests sont propres à leur classe de test (leçon de la story 3.1).

**Never:**
- Pas de retrait (`versee → privee`) ni de suppression : ce sont les stories 3.5 et 3.6.
- Pas d'écran : la Carte d'identité et la sélection en lot sont les parties 2 et 3.
- Pas d'exposition de `retrait_admin_motif` dans les DTO dans cette partie, au-delà du code de versabilité.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Photo personnelle | Ma photo, privée | 200, `etat = versee`, `versabilite = null` | N/A |
| Image libre conforme | Source « Wikimedia », licence `cc0_domaine_public` | 200, versée | N/A |
| Image d'album | Mon image d'album | `400 image.versement.image_album` | N/A |
| Type inconnu | Type `inconnu` | `400 image.versement.type_inconnu` | N/A |
| Source manquante | Image libre, source « » ou nulle | `400 image.versement.source_manquante` | N/A |
| Licence non partageable | Image libre sourcée, licence `pixabay`, `autre_inconnue` ou absente | `400 image.versement.licence_non_versable` | N/A |
| Retrait admin | `retrait_admin_motif = image_inadaptee`, photo | `400 image.versement.retrait_admin` | N/A |
| Carte modifiée après retrait | Même Image, description modifiée | Motif vidé, versement accepté | N/A |
| Déjà versée | Mon Image versée | 200, rien ne change | N/A |
| Image d'un collègue | Image versée de Zoé, Claire verse | `403 image.reservee_au_proprietaire` | N/A |
| Image invisible | Image privée de Zoé, ou abandonnée | `404 image.indisponible` | N/A |
| Lot mixte | Ma photo, mon image d'album, l'Image de Zoé | `versees = [photo]`, `refusees` avec `.image_album` et `image.reservee_au_proprietaire` | N/A |
| Lot invalide | `[]`, 501 identifiants ou un doublon | `400 requete.invalide` | N/A |
| Versabilité lue | Carte de mon image libre sans source | `versabilite = image.versement.source_manquante` ; pour un collègue `null` | N/A |

</frozen-after-approval>

## Code Map

- `back/src/main/java/fr/corpusmots/vocabulaire/service/Images.java` -- `carteIdentite`, `modifierDescription`, `classer`, `changerSens`, `creerSens` (vidage du retrait admin), `banque`, contrôle propriétaire (`image.reservee_au_proprietaire`, l.~300).
- `back/src/main/java/fr/corpusmots/vocabulaire/service/VisibiliteImages.java` -- visibilité (404).
- `back/src/main/java/fr/corpusmots/vocabulaire/service/TypeImage.java`, `Licence.java`, `EtatImage.java` -- énumérations d'AD-4.
- `back/src/main/java/fr/corpusmots/vocabulaire/api/ImagesResource.java` -- nouvelles routes, DTO.
- `back/src/main/resources/db/migration/V202611121000__vocabulaire_image.sql` -- schéma de `image` (contraintes, `version`).
- Vue de l'Image des Mots de Préparation : `ImageVue` / DTO de `preparations` qui la reprend.
- `back/src/test/java/fr/corpusmots/architecture/` -- règles ArchUnit.

## Tasks & Acceptance

**Execution:**
- [x] Migration du retrait admin.
- [x] `Acteur`, versabilité, versement d'une Image et d'un lot dans `vocabulaire.service`.
- [x] Routes, DTO avec `versabilite`, documentation OpenAPI.
- [x] Vidage du retrait admin à chaque modification de la Carte.
- [x] Tests `@QuarkusTest`, un par ligne de la matrice ; tests unitaires de la versabilité ; ArchUnit.
- [x] Contrat régénéré.

**Acceptance Criteria:**
- Given une de mes Images versable, when je la verse, then elle passe à `versee` par la seule méthode de versement, avec un `Acteur` propriétaire.
- Given une Image non versable, when je la verse, then l'API renvoie le code stable de son motif.
- Given l'Image d'un collègue, when je tente de la verser, then l'API répond `403`.

## Implementation Notes

- Migration `V202611241000__vocabulaire_image_retrait_admin.sql` : deux colonnes et trois contraintes (motif parmi les quatre valeurs d'AD-3 ; texte non vide pour `autre` ; pas de texte sans motif).
- `Versabilite` (énumération, valeur = code stable) porte la fonction unique `Versabilite.de(type, licence, source, retraitAdmin)` ; `Licence.partageable()` (paquetage) liste les quatre licences. `Images.versabilite(Image)` et `Images.vue` la lisent depuis les valeurs en base.
- `Acteur` (interface scellée, `Proprietaire(id)`, `Administrateur(id, MotifRetraitAdmin, texte)`, texte obligatoire et non vide pour `autre`) et `MotifRetraitAdmin` dans `vocabulaire.service`.
- `Versements` : `verser(imageId, Acteur.Proprietaire)` (verrou `FOR UPDATE` de l'Image) et `verserLot(imageIds, Acteur.Proprietaire)` passent par la seule méthode privée `verserSousVerrou`, qui renvoie une issue (versée, déjà versée, refusée) sans lever d'exception : `proposable` (sinon 404 `image.indisponible`), propriétaire (sinon 403), déjà versée = sans effet, puis versabilité (400 avec le code du motif). Le lot est validé une seule fois, dans le service (`400 requete.invalide` : absent, vide, plus de 500, nul, doublon ; un identifiant mal formé est refusé en 400 par le mapper JSON) ; il verrouille toutes les Images en une requête native `select i.* … where i.id in (:ids) order by i.id for update` (liste liée par `setParameterList`), puis applique la règle Image par Image.
- Réponse du lot, dans l'ordre de la demande : `versees` (transitions de cet appel), `dejaVersees` (inchangées), `refusees` (`imageId`, `code`, `licence`). `licence` vaut la licence de l'Image pour `image.versement.licence_non_versable` (null : « licence à préciser » ; valeur : « licence non partageable ») et null pour tout autre code.
- Règle ArchUnit `seulVocabulaireServiceChangeLEtatDUneImage` : seul `vocabulaire.service` appelle `Image.changerEtat`, et le champ `etat` n'est écrit que dans l'entité (les stories 3.5 et 3.6 pourront ajouter leurs transitions).
- `ImageVue` gagne `versabilite`, donnée seulement au propriétaire d'une Image `privee` (donc `null` aussi pour `abandonnee` ou `supprimee`, invisibles du propriétaire). Exposée par `CarteIdentiteImageDto`, `ImageBanqueDto` (colonne `i.retrait_admin_motif is not null` ajoutée en fin de `pageBanque`) et `PreparationImageDto` ; pas par `DetectionImageDto` ni `MesMotsImageDto`.
- Retrait admin vidé seulement par une modification effective de la Carte, par le helper unique `Images.carteEnregistree(image, modifiee)` : description dont une valeur change, classement qui change, nouveau Sens, Sens créé différent du Sens actuel. Une modification identique (même description, même classement, même Sens, libellé qui retombe sur le Sens actuel) le laisse en place.
- `ErreursMappers` : `OptimisticLockException` et `StaleStateException` (écriture concurrente, `@Version`) répondent `409 ressource.modifiee_entre_temps`, traduit dans `MESSAGES_PAR_CODE`. Un échec optimiste levé seulement à la validation de la transaction (sans `flush` préalable) resterait une erreur 500 ; les écritures concernées appellent `flush` dans le service.
- DTO : `VersementLotImagesDto` (entrée), `ResultatVersementLotDto`, `RefusVersementImageDto` (code et licence en énumération dans le contrat).
- Non fait ici (parties 2 et 3) : traduction front des codes `image.versement.*` dans `MESSAGES_PAR_CODE`.
- Vérification locale : ArchUnit, `VersabiliteTest`, `ActeurTest` verts ; specs front de `commun/erreurs` vertes ; contrat régénéré. Les `@QuarkusTest` (`VersementImagesResourceTest`, `ChoixImagePreparationResourceTest`, et les classes existantes touchées par le changement des vues) n'ont pas tourné en local (pipe Docker absent) : à confirmer par la CI.

Vérification à la clôture : front 894 tests, paquet initial 599,78 kB ; ArchUnit, `VersabiliteTest`, `ActeurTest`, `VisibiliteImagesTest` et `FiltresBanqueTest` verts ; les `@QuarkusTest` (`VersementImagesResourceTest`, `ChoixImagePreparationResourceTest`, migration) n'ont pas tourné en local et restent à confirmer par la CI.

## Spec Change Log

## Review Triage Log

Revue 1 (Blind Hunter BH, Edge Case Hunter EC, Verification Gap VG).

| # | Constat | Verdict | Preuve | Suite |
|---|---------|---------|--------|-------|
| 1 | BH-1, VG-1 : une modification sans changement lève le retrait admin | high | AD-3 : bloqué « jusqu'à ce que le propriétaire modifie » | patch (vidage seulement sur changement réel, point d'entrée unique ; BH-14) |
| 2 | BH-2, EC-1, EC-2 : contraintes du texte de retrait absentes | medium | Migration non publiée, non modifiable ensuite | patch |
| 3 | BH-3, EC-3 : `Acteur.Administrateur` sans texte | low | `autre` exige un texte (AD-3) | patch |
| 4 | BH-6 : lot sans distinction des déjà versées | low | Compte affiché faux | patch (`dejaVersees`) |
| 5 | BH-5 : « licence à préciser » et « licence non partageable » sous un seul code | medium | La story affiche deux raisons ; le lot ne rend que le code | patch (`licence` dans le refus) |
| 6 | BH-7 : 500 verrous un par un, ordre par `toString` | low | Un seul `select … for update order by id` | patch |
| 7 | BH-13 : validation du lot en double | low | Messages différents | patch |
| 8 | EC-5 : modification concurrente → 500 | medium | `OptimisticLockException` non traduite | patch (409) |
| 9 | BH-9 : règle ArchUnit liée à `Versements` seul | low | Retrait et suppression la casseraient | patch (formulée d'après AD-3) |
| 10 | VG-2, VG-3, VG-4, BH-12 : tests manquants (Carte retirée, lot de 500, `[null]`, non-UUID, `supprimee`, Préparation) | medium | Régressions silencieuses | patch (tests) |
| 11 | BH-4 : motif et texte du retrait invisibles pour le propriétaire | low | Affichage du retrait : modération (Epic 6) | defer |
| 12 | BH-10 : page Données personnelles muette sur le texte de retrait | low | Rien ne l'écrit avant l'Epic 6 | defer |
| 13 | BH-8 : licence analysée avec `orElseThrow` dans les listes | low | La contrainte `image_licence_valide` garantit les valeurs | rejeté |
| 14 | EC-4 : exception non métier dans un lot → 500 pour tout le lot | low | Cas d'erreur interne ; tout ou rien est acceptable | rejeté |
| 15 | BH-11 : codes `image.versement.*` non traduits dans le front | — | Partie 2 | rejeté |
| 16 | BH-15 : contrat et spec absents du diff | — | Exclus volontairement du diff de revue | rejeté |

## Verification

**Commands:**
- `cd back && ./mvnw verify` -- expected: tests verts, ArchUnit compris ; sinon la CI.
- `cd front && npm test -- --watch=false && npm run build` -- expected: client régénéré, rien de cassé.
