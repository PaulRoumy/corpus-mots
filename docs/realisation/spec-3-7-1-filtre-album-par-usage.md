---
title: 'Story 3.7, partie 1 : le filtre Album retient les Images utilisées dans une Préparation de l''Album'
type: 'feature'
created: '2026-11-27'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '{project-root}/docs/realisation/epic-3-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problème :** dans la Banque, le filtre Album ne retient que les images d'album dont c'est l'album d'origine. Un pictogramme ou une photo utilisé dans une Préparation de l'Album n'en sort pas : l'enseignante ne retrouve pas son travail par album. C'est la décision D-4 de la proposition de changement du 2026-11-26 et le premier critère de la story 3.7 (FR-15).

**Approche :** dans `Images.conditionFiltres`, le filtre Album retient l'image d'album dont c'est l'album d'origine **ou** une Image qu'un lien de l'enseignante courante (`lien_image.enseignant_id`) rattache à cet Album (`lien_image.album_id`). Cela vaut quelle que soit la provenance (Mes mots, Banque de l'école…) et quelle que soit l'origine de l'Image. Le lien d'un collègue ne compte jamais. Le filtre ne fait que restreindre ce que la provenance montre déjà (AD-2) : il ne montre jamais une Image privée d'un collègue.

</frozen-after-approval>

## Implementation Notes

- `Images.conditionFiltres` (`back/src/main/java/fr/corpusmots/vocabulaire/service/Images.java`, filtre Album) : on ajoute `or exists (select 1 from lien_image fla where fla.image_id = i.id and fla.enseignant_id = :filtreEnseignant and fla.album_id = :filtreAlbum)`, comme le filtre Section sous Mes mots, mais sans condition de provenance. La Javadoc de la méthode suit.
- La Javadoc de `FiltresBanqueCommande.albumId` et la description du paramètre `albumId` de `ImagesResource` changent. On régénère et versionne `front/openapi/`.
- Tests `BanqueImagesResourceTest`, sur le modèle des tests de Section par usage (`sousMesMotsLaSectionDUneDeMesPreparationsRetientLImage`, `lUsageDUnCollegueNeRetientPasMonImage`) :
  - une Image libre liée dans ma Préparation de l'Album est retenue, sous chaque provenance où elle est visible ;
  - le lien d'un collègue ne retient pas l'Image ;
  - l'image d'album d'origine reste retenue (`chaqueFiltreNeRetientQueSesImages` reste vrai).
- Tests ajoutés (`BanqueImagesResourceTest`, sous `mes-mots`, `banque` et `tout`) :
  - `leFiltreAlbumRetientLesImagesLieesDansUneDeMesPreparationsDeLAlbum` : l'image d'album d'origine et l'Image libre liée sont retenues, une seule fois malgré deux liens ; l'Image liée dans un autre Album et l'Image sans lien ne le sont pas ;
  - `leLienDUnCollegueNeRetientPasLImagePourLAlbum` ;
  - `leFiltreAlbumNeMontreJamaisUnePriveeDunCollegue` : mon lien vers l'Image privée d'un collègue ne la montre jamais ; mon lien vers son Image versée la retient sous Banque de l'école et Tout.
- `front/openapi/` est régénéré (description du paramètre `albumId`).
- Contrairement à la Section, qui ne compte les liens que sous Mes mots (FR-15), l'Album les compte sous toute provenance : c'est voulu par le critère de la story 3.7.
- Aucune migration, aucun texte affiché nouveau, aucun changement front hors contrat.

## Review Triage Log

Revue 1 (Blind Hunter BH).

- BH-1 (medium, defer) : Album + Module écarte les Images retenues par mon lien, qui n'ont souvent pas de Module. Le filtre Module, inchangé, compare `i.module_id`. Consigné dans `deferred-work.md`.
- BH-2 (low, patch) : aucun test ne couvrait l'Image versée d'un collègue liée dans ma Préparation. Ajouté à `leFiltreAlbumNeMontreJamaisUnePriveeDunCollegue`.
- BH-3 (low, patch) : plusieurs liens vers une même Image. Un second lien est ajouté, et le `total` attendu reste 2.
- BH-4 (low, rejeté) : EXPERIENCE.md parle d'« usages visibles selon la règle de Confidentialité ». Le critère de la story et la décision D-4 tranchent : seuls mes liens comptent.
- BH-5 (false) : asymétrie avec la Section. La Javadoc dit « sous toute provenance » pour l'Album et « sous Mes mots » pour la Section, et la note ci-dessus la consigne.
- BH-6 (false) : critères et vérification de la spec, consignés à la clôture (route courte).
- BH-7 (false) : les parties 2 et 3 sont consignées dans `deferred-work.md`, comme le prévoit le découpage du flux bmad-build.
- BH-8 (low, rejeté) : chaîne SQL en ligne et paramètre `filtreEnseignant` posé deux fois, avec la même valeur.
- BH-9 (low, rejeté) : pas d'index `lien_image (enseignant_id, album_id)`. Le `exists` passe par `lien_image_image` pour chaque Image, ce qui reste négligeable aux volumes visés.
- BH-10 (low, patch) : le test AD-2 n'avait pas de témoin positif. Mon Image liée doit revenir seule (ou avec l'Image versée du collègue).

Vérification à la clôture : back `./mvnw verify` 825 tests verts, `@QuarkusTest` compris (PostgreSQL de test lancé à la main), puis `BanqueImagesResourceTest` 67 tests verts après les compléments de la revue ; `npm run build` réussi.
