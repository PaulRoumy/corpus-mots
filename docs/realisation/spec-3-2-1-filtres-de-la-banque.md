---
title: 'Story 3.2, partie 1 : filtres de la Banque côté back'
type: 'feature'
created: '2026-11-23'
status: 'done'
baseline_commit: '3003c861f2765c3cfef0d24f5d2f5f2e8b450f46'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/realisation/epic-3-context.md'
  - '{project-root}/docs/realisation/spec-3-1-1-grille-de-la-banque.md'
  - '{project-root}/docs/architecture/architecture-corpus-mots-2026-10-29/ARCHITECTURE-SPINE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** La route `GET /api/images` de la story 3.1 ne filtre que par provenance. Pour trouver par exemple « tous les verbes “automne” de GS », l'enseignant doit pouvoir combiner des filtres (FR-15). Le filtre propriétaire, lui, ne doit nommer aucun collègue qui n'a rien versé.

**Approach:** Des paramètres de filtre facultatifs sur `GET /api/images`, combinés en ET avec la provenance et nommés comme les champs. Ajouter aussi une route qui liste les propriétaires proposables. La partie 2 construira la barre de filtres et le Champ de recherche côté front.

Décisions :
- **Paramètres**, chacun facultatif et à une seule valeur :
  - `mot` : texte libre ;
  - `sensId` ;
  - `section` : `ps`, `ms` ou `gs` ;
  - `albumId` : Album d'origine de l'Image ;
  - `moduleId` ;
  - `themeId` ;
  - `categorie` : catégorie grammaticale du Sens ;
  - `typeImage` ;
  - `proprietaireId`.

  Ils se combinent en ET entre eux et avec la provenance. Un paramètre absent ou vide ne filtre pas.
- **`mot`** suit la même tolérance que la détection (FR-8, UX-DR-4) : casse, accents et article initial (« la Citrouille » trouve « citrouille »). La saisie passe par `Lexique.normaliser`, puis est comparée à `mot.forme_recherche`, comme le fait la détection. La correspondance porte sur le Mot exact, sans recherche par préfixe. Une saisie vide après normalisation, ou réduite à un article seul, ne filtre pas.
- **`section` sous Mes mots** : le filtre retient l'Image si elle coche cette Section, ou si l'enseignant l'utilise dans une de ses Préparations de cette Section, c'est-à-dire s'il a un `lien_image` de cette Section vers elle. Sous Banque de l'école et sous Tout, seule la Section cochée compte.
- **Confidentialité :** les filtres ne font que restreindre ce que la provenance montre. Ils n'élargissent jamais ce que `VisibiliteImages` autorise (AD-2). Un Mot présent seulement dans Mes mots d'un collègue ne donne donc aucune Image.
- **Propriétaires :** une nouvelle route `GET /api/images/proprietaires` renvoie la liste des identifiants proposables, sans noms, que le front résout par l'annuaire (AD-20) :
  - l'enseignant connecté, toujours ;
  - les enseignants qui ont au moins une Image `versee`.

  La règle « a versé » est écrite dans `VisibiliteImages`, à côté du critère de provenance.
- **Valeurs invalides :** un identifiant non UUID, une Section, une catégorie ou un type inconnus donnent `400 requete.invalide`. Un identifiant bien formé mais inconnu donne simplement une liste vide.
- **Ordre, pagination et forme de la réponse :** inchangés par rapport à la partie 1 de la story 3.1.

## Boundaries & Constraints

**Always:**
- Le filtrage de visibilité reste dans `VisibiliteImages`. Les filtres s'ajoutent à la requête paginée de `ImageRepository` par des conditions paramétrées, construites par `Images`, sans jamais de texte saisi collé dans le SQL. La règle ArchUnit de la story 3.1 reste vraie.
- La performance reste sous 2 s pour 500 Images, filtres compris. Si un index est nécessaire, il est ajouté par une nouvelle migration `V<AAAAMMJJHHMM>__vocabulaire_<objet>.sql`.
- Contrat : lancer `./mvnw package -DskipTests`, puis versionner `front/openapi/`, avec les paramètres documentés (énumérations comprises).
- Le module `vocabulaire` n'appelle aucun autre module : Albums, Modules et Thèmes sont filtrés par leur identifiant seul.

**Never:**
- Pas de filtre à valeurs multiples, ni de OU entre filtres.
- Pas de changement côté front dans cette partie, hormis le client régénéré.
- Ne pas exposer les noms des enseignants ni une liste de tous les enseignants depuis `vocabulaire`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Combinaison | `mot=automne&section=gs&categorie=verbe` | Seules les Images du Mot « automne », de Sens verbe, cochées GS (ou, sous Mes mots, utilisées en GS) | N/A |
| Tolérance | `mot=la Citrouille` | Images du Mot « citrouille » | N/A |
| Article seul | `mot=la` | Aucun filtre sur le Mot | N/A |
| Mot d'un collègue seul | Mot dont la seule Image est `privee` d'un collègue, provenance Tout | Liste vide, total 0 | N/A |
| Section par usage | Mes mots, `section=gs`, Image sans GS mais liée par moi dans une Préparation GS | Image retenue | N/A |
| Section par usage, autre provenance | Même Image, provenance Banque de l'école (Image versée) | Non retenue au titre de l'usage | N/A |
| Usage d'un collègue | Mes mots, `section=gs`, mon Image liée en GS par un collègue seulement | Non retenue au titre de l'usage | N/A |
| Propriétaire | `proprietaireId=<collègue>`, provenance Tout | Seules ses Images versées | N/A |
| Liste des propriétaires | Moi, collègue A qui a versé, collègue B qui n'a rien versé | `[moi, A]` | N/A |
| Valeur invalide | `section=cp`, `albumId=abc`, `typeImage=dessin` | `400 requete.invalide` | N/A |
| Identifiant inconnu | `themeId=<uuid inconnu>` | Liste vide | N/A |

</frozen-after-approval>

## Code Map

- `back/src/main/java/fr/corpusmots/vocabulaire/api/ImagesResource.java` -- `listerBanque` (paramètres), nouvelle route `proprietaires`.
- `back/src/main/java/fr/corpusmots/vocabulaire/service/Images.java` -- `banque(...)` : commande de filtres, conditions paramétrées.
- `back/src/main/java/fr/corpusmots/vocabulaire/service/VisibiliteImages.java` -- critère de provenance existant, règle « a versé ».
- `back/src/main/java/fr/corpusmots/vocabulaire/persistance/ImageRepository.java` -- `pageBanque`, `nombreBanque` (noms de paramètres réservés), tables `image_section`, `image_theme`, `image.module_id`, `image.album_id`, `lien_image (image_id, enseignant_id, section)`.
- `back/src/main/java/fr/corpusmots/vocabulaire/service/Lexique.java`, `DetectionMots.java` -- normalisation et comparaison à `forme_recherche`.
- `back/src/test/java/fr/corpusmots/vocabulaire/api/BanqueImagesResourceTest.java` -- formes propres à ce test (voir le correctif de la story 3.1).

## Tasks & Acceptance

**Execution:**
- [x] Back : paramètres, filtres, règle Section par usage, route des propriétaires, documentation OpenAPI.
- [x] Tests `@QuarkusTest` : une ligne de test par ligne de la matrice, et la performance avec filtres.
- [x] Contrat : `front/openapi/` régénéré.

**Acceptance Criteria:**
- Given des Images variées, when l'enseignant combine des filtres, then seules les Images qui les satisfont tous, et que la provenance montre, sont renvoyées.
- Given le filtre propriétaire, when sa liste est demandée, then elle ne contient que l'enseignant et les collègues qui ont versé au moins une Image.

## Implementation Notes

- Filtres portés par `FiltresBanqueCommande` ; conditions écrites par `Images.conditionFiltres`, uniquement sur `image i` et par sous-requêtes `exists` (paramètres `filtre…`, distincts des `visibilite…`), ajoutées en ET au critère de `VisibiliteImages.critereBanque`. `nombreBanque` reste sans jointure.
- Mot : `Lexique.cleDeRecherche` (vide pour une saisie vide ou un article seul), comparée à `mot.forme_recherche` par `unaccent`, comme `MotRepository.parFormeRecherche`.
- Album : Album d'origine d'une image d'album seulement (`type_image = image_album`), comme la Carte d'identité.
- Propriétaires : `VisibiliteImages.critereAyantVerse` + `ImageRepository.proprietairesBanque` (ajouté à la règle ArchUnit) ; enseignant connecté en tête, puis les autres par identifiant. Réponse : tableau d'UUID.
- Identifiants : forme canonique exigée (`UUID.fromString` accepte « 1-2-3-4-5 »). Effet de bord : le même contrôle s'applique désormais à `albumId` de `POST /images` (ajout dans Mes mots, champ multipart), dont le message passe de « Identifiant d'album mal formé » à « Identifiant mal formé : album » (code `requete.invalide` inchangé).
- Un filtre répété (`section=gs&section=ms`) et un `mot` de plus de `Lexique.LONGUEUR_MAX_FORME` caractères (après rognage, `maxLength` déclaré au contrat) répondent `400 requete.invalide`. Une saisie qui se réduit à un article après retrait d'un premier article (« les la ») ne filtre pas. Le bloc des filtres est entouré de parenthèses avant d'être ajouté en ET au critère de visibilité. Aucun index ajouté : sous-requêtes servies par les clés primaires de `image_section`, `image_theme`, `sens` et l'index `lien_image_image`.
- Vérification locale : ArchUnit, `FiltresBanqueTest` et `VisibiliteImagesTest` verts ; front 861 tests, paquet initial 599,04 kB. Les `@QuarkusTest` (`BanqueImagesResourceTest`) n'ont pas tourné en local (pipe Docker absent) : à confirmer par la CI.

Vérification à la clôture : front 861 tests, paquet initial 599,04 kB, ArchUnit, `FiltresBanqueTest` et `VisibiliteImagesTest` verts ; les `@QuarkusTest` de `BanqueImagesResourceTest` n'ont pas tourné en local (pipe Docker absent) et restent à confirmer par la CI.

## Spec Change Log

## Review Triage Log

Revue 1 (Blind Hunter BH, Edge Case Hunter EC, Verification Gap VG).

| # | Constat | Verdict | Preuve | Suite |
|---|---------|---------|--------|-------|
| 1 | EC-1, EC-7, BH-6 : filtre répété, première valeur gardée en silence | medium | La spec n'autorise qu'une valeur | patch (400) |
| 2 | BH-2 : `mot` sans longueur maximale | low | Texte arbitraire jusqu'à `unaccent` | patch |
| 3 | EC-5 : deux articles (« les la ») cherchent le Mot « la » | low | Contraire à la règle « article seul ne filtre pas » | patch |
| 4 | BH-3 : bloc de filtres non parenthésé | medium | Un futur `or` élargirait AD-2 | patch |
| 5 | VG-1 : ordre de la liste des propriétaires non testé | low | L'enseignant du test a déjà le plus petit identifiant | patch (test) |
| 6 | BH-4 : performance non mesurée pour Section sous Mes mots et pour `/proprietaires` | medium | Chemins les plus coûteux, sans index | patch (test) |
| 7 | BH-10, BH-11, EC-6, BH-8 : javadoc incomplète, ligne trop longue, `albumId` de la description resserré sans note | low | Documentation | patch |
| 8 | BH-1 : un Mot qui est un article (« un ») est introuvable | low | Décision gelée de la spec (article seul ne filtre pas) | rejeté |
| 9 | EC-3 : Sens « à compléter » introuvable par catégorie | low | Pas de catégorie à filtrer ; hors périmètre | rejeté |
| 10 | EC-4, BH-5 : collègue désactivé encore listé | low | Le front affiche « ancien compte » (story 3.1) | rejeté |
| 11 | EC-2, BH-7 : valeurs d'énumération sensibles à la casse | low | Le front n'envoie que les valeurs du contrat | rejeté |
| 12 | BH-9 : `/proprietaires` sans enseignant | low | Route authentifiée | rejeté |
| 13 | BH-12 : contrat absent du diff de revue | — | Exclu volontairement du diff ; régénéré et versionné | rejeté |

## Verification

**Commands:**
- `cd back && ./mvnw verify` -- expected: tests verts, ArchUnit compris ; sinon la CI.
- `cd front && npm test -- --watch=false && npm run build` -- expected: client régénéré, rien de cassé.
