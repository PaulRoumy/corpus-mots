---
title: 'Story 2.11, partie 3 : Carte « à illustrer » sans doublon'
type: 'feature'
created: '2026-11-26'
status: 'done'
baseline_commit: 'd530e79955cf3a3f79f99d55e68922f84c295757'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/realisation/epic-2-context.md'
  - '{project-root}/docs/realisation/spec-2-11-1-entree-retient-l-image-en-tete.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problème :** la Carte « à illustrer » ne montre que les suggestions ARASAAC. Les Images existantes du Mot n'y apparaissent pas, et choisir un pictogramme crée toujours une nouvelle Image. Pendant la démo du 25 novembre, choisir de nouveau un pictogramme déjà possédé a créé 3 Images privées en double (écart E-1, décision UX D-2).

**Approche :** la carte montre d'abord les Images proposables du Mot, classées comme la détection (FR-9) avec la Marque « déjà utilisée », puis les suggestions ARASAAC, puis « Téléverser ». Une suggestion ARASAAC dont l'enseignante possède déjà l'Image pour ce Mot et son Sens retenu est marquée « déjà utilisée ». La choisir lie cette Image existante (`reutilisee`), sans téléchargement ni création. Pour cela, une colonne `arasaac_id` identifie le pictogramme d'une Image.

## Boundaries & Constraints

**Toujours :**
- `arasaac_id bigint` nullable est ajouté à `image` par une nouvelle migration `V<AAAAMMJJHHMM>__vocabulaire_image_arasaac.sql`. Il est rempli pour les Images existantes à partir de `source` (« … pictogramme n° <id> », licence `arasaac_cc_by_nc_sa`), avec un index `(proprietaire_id, arasaac_id)`. Les migrations publiées ne sont pas touchées (AD-22).
- `arasaac_id` est posé à la création depuis un pictogramme et ne change plus ensuite : il identifie le fichier, que rien ne modifie. `Image.decrire` n'y touche pas.
- « Possédée » veut dire : Image de l'enseignante courante, `proposable` pour elle (`VisibiliteImages`, AD-2), du Mot et du Sens retenu du Mot de Préparation, avec ce `arasaac_id`. Les Images de collègues ne comptent jamais.
- La déduplication est faite par le back, dans `POST …/pictogramme` : on vérifie d'abord le Mot (`verifierMot`). Si une Image possédée existe, on la lie avec l'origine `reutilisee` (chemin de `remplacerImage`) et la réponse est `200`, sans appel ARASAAC. Sinon, le flux actuel (téléchargement hors transaction, création, lien `nouvelle`) répond `201` et pose `arasaac_id`.
- Le Sens retenu ne change pas, et aucun appel ARASAAC n'a lieu dans une transaction (AD-15, AD-17).

**Jamais :**
- Pas de nouvelle route. Les suggestions ARASAAC (`GET /arasaac/suggestions`) ne changent pas.
- Le front ne décide pas seul de lier une Image à la place du pictogramme : c'est le back qui tranche.
- Pas de copie d'Image (AD-5). On ne touche ni au Panneau de détection ni au Panneau de choix, au-delà du nouveau champ partagé.

## I/O & Edge-Case Matrix

| Scénario | Entrée / État | Résultat attendu | Erreur |
|---|---|---|---|
| Images existantes | Carte « à illustrer » de « farine », 2 Images proposables | La carte montre ces 2 vignettes (au plus 3, ordre du back, Marque « déjà utilisée »), puis les suggestions ARASAAC et « Téléverser » | — |
| Clic sur une Image existante | Vignette d'une Image proposable | Lien `reutilisee` (`PUT …/image`), la carte devient illustrée | Image devenue indisponible : message actuel du Panneau de choix et nouvelle lecture |
| Sans Image existante | Mot nouveau | Comportement actuel : suggestions ARASAAC puis « Téléverser » | — |
| Pictogramme déjà possédé | Claire possède l'Image du n° 2349 pour « renard » et son Sens retenu | La suggestion 2349 porte « déjà utilisée ». Son choix lie l'Image existante (`200`, `reutilisee`), sans appel ARASAAC ; le nombre d'Images ne change pas | — |
| Pictogramme possédé par une collègue seulement | Image versée de Zoé, n° 2349 | Pas de marque. Le choix crée l'Image de Claire (`201`, `nouvelle`, `arasaac_id` = 2349) | — |
| Possédé pour un autre Sens | Image de Claire, n° 2349, autre Sens du Mot | Pas de marque. Le choix crée une Image pour le Sens retenu | — |
| Image possédée abandonnée ou supprimée | État non proposable | Pas de marque. Une nouvelle Image est créée | — |
| Migration | Images ARASAAC existantes | `arasaac_id` rempli d'après `source` ; null pour les autres Images | — |
| Mot déjà illustré | `POST …/pictogramme` | `409 preparation.mot_deja_illustre` (actuel), rien n'est écrit | — |

</frozen-after-approval>

## Code Map

- `back/src/main/resources/db/migration/` : nouvelle migration (modèle : `V202611241000__vocabulaire_image_retrait_admin.sql`).
- `back/src/main/java/fr/corpusmots/vocabulaire/persistance/Image.java` : champ `arasaacId`, posé par `Image.nouvelle` (l. 101) ou par une méthode dédiée. `ImageRepository` : requête de l'Image possédée.
- `vocabulaire/service/TeleverserImageCommande.java` et `PictogrammeTelechargeVue` : ajouter `arasaacId` (nullable). `SuggestionsArasaac.telecharger` (l. 90) le fournit. `Images.televerser` (l. 420) le pose.
- `vocabulaire/service/` : ajouter une méthode qui renvoie l'Image possédée (`Optional<UUID>`) pour le pictogramme, le Mot et le Sens retenu d'un Mot de Préparation. Elle doit passer par `VisibiliteImages`, dans `Usages` ou `Images`.
- `preparations/api/PreparationsResource.choisirPictogramme` (l. 317 à 341) : après `verifierMot`, appeler le service. Si une Image possédée existe, appeler `preparations.remplacerImage` (l. 687) et répondre `200`. Sinon, garder le flux actuel. `TeleverserImageMotCommande` porte `arasaacId`.
- `preparations/service/PreparationsService` : méthode pour l'Image possédée (Préparation à soi, Sens retenu de la ligne) ; `televerserImage` transmet `arasaacId`.
- `vocabulaire/service/ImageDetecteeVue`, `DetectionMots.imageDetectee` (l. 287) et `preparations/api/DetectionImageDto` : nouveau champ `idArasaac` (nullable). Le classement ne change pas.
- `front/openapi/` : régénérer.
- `front/src/app/preparations/carte-mot.ts` (l. 152 à 172) : pour une carte « à illustrer », lire `proposerImagesMotPreparation` (comme `panneau-choix-image.ts`, `lire()` l. 630) et afficher au plus 3 Images avec `[appVignetteProposition]` (`vignette-proposition.ts`). Un clic appelle `choisirImageMotPreparation`, avec la gestion de `CODES_IMAGE_INDISPONIBLE` du Panneau de choix (l. 457 à 500), puis émet `illustre`.
- `front/src/app/preparations/suggestions-arasaac.ts` : nouvelle entrée `idsDejaPossedes` (les `idArasaac` des Images proposables de l'enseignante pour le Sens retenu). Marque « déjà utilisée » sur ces suggestions (même rendu que `vignette-proposition.ts` l. 113 à 121). `choisir` reçoit `200` ou `201` de la même façon.
- `front/src/app/preparations/preparation.ts` (l. 728 à 737, `appliquerPictogramme` l. 1897) : annonce « « x » illustré. » inchangée.
- Tests :
  - `PictogrammeMotPreparationResourceTest` (`FausseSource` : vérifier qu'aucun pictogramme n'est demandé quand l'Image est réutilisée) ;
  - un test de migration ou de remplissage ;
  - `carte-mot.spec.ts` (servir la nouvelle requête de propositions avec `serveur.match`) ;
  - `suggestions-arasaac.spec.ts`.

## Tasks & Acceptance

**Exécution :**
- [x] Migration, `Image`, `ImageRepository` : colonne, remplissage, index, champ.
- [x] `vocabulaire.service` : `arasaacId` à la création, Image possédée, `idArasaac` dans la détection.
- [x] `preparations` : déduplication dans `choisirPictogramme` (`200` / `201`).
- [x] Tests back : une ligne de test par ligne back de la matrice.
- [x] `front/openapi/` : régénérer et versionner.
- [x] `carte-mot.ts`, `suggestions-arasaac.ts` et leurs specs : Images existantes, marque, choix ; une ligne de test par ligne front de la matrice.

**Critères d'acceptation :**
- Étant donné la démo du 25 novembre rejouée, quand l'enseignante choisit trois fois le même pictogramme pour le même Mot dans trois Préparations, alors une seule Image existe.

## Implementation Notes

- Migration `V202611261000__vocabulaire_image_arasaac.sql` : `arasaac_id bigint` nullable avec `CHECK (> 0)`, remplissage
  par `substring(source FROM 'pictogramme n° ([0-9]{1,18})$')` pour la seule licence `arasaac_cc_by_nc_sa` (une source
  modifiée après coup, qui ne finit plus par l'identifiant, reste à `null`), index partiel
  `image_proprietaire_arasaac (proprietaire_id, arasaac_id) WHERE arasaac_id IS NOT NULL`.
- `Image.arasaacId` : colonne `updatable = false`, posée par `Image.nouvelle` (nouveau paramètre) ; `decrire` n'y touche
  pas. `PictogrammeTelechargeVue`, `TeleverserImageCommande` et `TeleverserImageMotCommande` portent `arasaacId`.
- Image possédée : `Usages.imagePossedeeDuPictogramme(preparationMotId, arasaacId)` lit le Sens retenu, puis
  `ImageRepository.duPictogramme(enseignant, sens, arasaacId)` (la plus récente d'abord), filtré par
  `VisibiliteImages.proposable`.
- Écart assumé avec la Code Map : au lieu de `remplacerImage`, la ressource appelle, après `verifierMot`,
  `PreparationsService.lierImagePossedeeDuPictogramme`, qui dans une seule transaction (Préparation verrouillée) revérifie
  que le Mot n'est pas illustré (`409`), cherche l'Image possédée et la lie par `Usages.lierImage` (`reutilisee`,
  verrou de l'Image puis `proposable`). Raison : `remplacerImage` remplacerait sans bruit une Image liée entre
  `verifierMot` et l'écriture ; `lierImage` garde le refus `409` sous verrou. Le Sens retenu ne change pas (l'Image est
  trouvée par ce Sens). La ressource renvoie `RestResponse` : `200` (réutilisée) ou `201` (créée).
- Détection : `ImageDetecteeVue.idArasaac` et `DetectionImageDto.idArasaac` (nullable), classement inchangé.
- Front : la Carte « à illustrer » lit `proposerImagesMotPreparation` sans `sensId` (Images de tous les Sens, comme le
  Panneau de choix sans filtre) à chaque fois qu'elle est « à illustrer », montre les 3 premières avec
  `VignetteProposition` posée sur un `<button>`, et calcule `idsDejaPossedes` sur toutes les propositions (pas seulement
  les 3 montrées) : Image de l'enseignant connecté, du Sens retenu, avec `idArasaac`. Le message « Cette image n'est
  plus disponible. » est redéfini dans `carte-mot.ts` (importer `panneau-choix-image.ts`, chargé à la demande,
  l'aurait tiré dans le paquet de la page). `CODES_A_RECHARGER` est exporté par `suggestions-arasaac.ts` et partagé.
- `preparation.spec.ts` : chaque Carte « à illustrer » lit désormais ses Images ; `ouvrir()` retire ces lectures de la
  file (`lecturesDesCartes`), et les quatre tests où une Carte redevient « à illustrer » pendant que le Panneau relit
  avec un `sensId` les retirent avant leur `expectOne` / `expectNone`.
- Vérification locale : `./mvnw verify` contre un PostgreSQL 18.6 lancé à la main (`podman run … -p 5435:5432`,
  `-Dquarkus.datasource.devservices.enabled=false` et l'URL JDBC) : 815 tests verts, `front/openapi/` régénéré.
  Front : 44 fichiers de tests verts, `npm run build` réussi, paquet initial 599,78 kB (inchangé).

## Spec Change Log

- Écart accepté à la revue : la réutilisation d'une Image possédée passe par `PreparationsService.lierImagePossedeeDuPictogramme` et `Usages.lierImage` (409 si le Mot a été illustré entre-temps), au lieu de `remplacerImage`, qui aurait remplacé sans rien dire.

## Review Triage Log

Revue 1 (Blind Hunter BH, Edge Case Hunter ECH, Verification Gap VG).

- BH-1 / ECH-1 (low, rejeté) : deux choix simultanés du même pictogramme (deux onglets) peuvent encore créer deux Images. Il faudrait deux clics dans la même seconde, et la parade (index unique partiel ou nouvelle recherche sous verrou) ajoute de la complexité. Le cas de la démo, des choix successifs, est réglé.
- BH-2 / ECH-2 / VG-3 (low, rejeté) : si l'Image possédée devient indisponible entre sa lecture et son verrou, la réponse est `404 image.indisponible` au lieu de créer l'Image. La fenêtre est minuscule, et rattraper l'erreur dans la transaction (marquée rollback-only en traversant `Usages`) demanderait une restructuration.
- BH-3 (false) : « Mot sans Sens retenu → 500 ». Tout Mot de Préparation a un Sens retenu dès son ajout. `Usages.sensRetenu` est l'aide existante qu'utilisent déjà `lierImage` et `remplacerImage`, et l'exception ne signale qu'un invariant rompu.
- BH-4 (low, patch) : l'`effect` de `CarteMot` suivait tout l'objet `mot`, si bien qu'un nouvel objet pour la même carte (Thème changé) relançait la lecture et effaçait le message. Il suit désormais l'identifiant et l'état « à illustrer » (`computed`). Un test vérifie qu'un nouvel objet Mot ne relance aucune lecture.
- BH-5 (rejeté) : une lecture des propositions par Carte « à illustrer ». C'est voulu par l'intention, qui montre les Images existantes sur chaque carte.
- BH-6 (low, rejeté) : les vignettes et les suggestions ARASAAC ne se bloquent pas entre elles. Un second clic rapide reçoit 409 et la Préparation se recharge avec un bandeau. C'est rare et sans perte de données.
- BH-7 (low, rejeté) : la Marque est calculée par le front sur les propositions, alors que le back décide sur `duPictogramme`. Une Marque absente ne change pas le résultat, puisque le back lie l'Image possédée de toute façon. Le front ne décide pas de la visibilité : les Images qu'il lit sont déjà jugées proposables par `VisibiliteImages`.
- BH-8 (low, rejeté) : assertions back marginales (`idArasaac` nul hors ARASAAC, contrainte CHECK, source à 19 chiffres, état « à illustrer » obtenu par SQL).
- BH-9 (low, patch partiel) : tests front manquants. L'erreur générique au choix et la lecture en échec sont ajoutées (voir VG-2). Les autres cas sont rejetés comme marginaux.
- BH-10 (low, rejeté) : `MigrationImageArasaacTest` est fragile (extraction de l'`UPDATE`, paquetage). Il échouerait bruyamment, sans jamais passer à tort.
- BH-11 (rejeté) : nommage `arasaacId` / `idArasaac`. `idArasaac` est le nom déjà en usage dans le contrat (`SuggestionArasaacDto`, `PictogrammeMotPreparationDto`), et le domaine garde `arasaacId`.
- BH-12 (low, rejeté) : index sans `sens_id`. Il n'y a que quelques lignes par enseignante et par pictogramme.
- BH-13 (low, rejeté) : vérification « Mot déjà illustré » répétée. Chaque transaction doit revérifier sous son verrou.
- BH-14 (rejeté) : documentation. La spec est mise à jour à la clôture. Les réponses d'erreur ne sont documentées sur aucun point d'accès du contrat (convention du projet).
- ECH-3 (low, rejeté) : un Mot illustré dans un autre onglet puis choisi sur la carte est remplacé par `PUT …/image`. C'est rare (deux onglets), et une route de liaison seule ajouterait une surface d'API.
- ECH-4 (low, rejeté) : le message « image indisponible » pourrait s'afficher sur une carte qui a changé pendant la relecture. C'est rare, et la parade est une garde de plus.
- ECH-5 (low, rejeté) : le remplissage pourrait marquer une image téléversée à la main dont la source copie exactement le format ARASAAC. Ce serait de toute façon ce pictogramme.
- VG-1 (patch) : l'ordre « la plus récente d'abord » parmi plusieurs Images possédées n'était fixé par aucun test. `parmiPlusieursImagesPossedeesDuPictogrammeLaPlusRecenteEstLiee` est ajouté.
- VG-2 (patch) : les chemins de repli de la carte (`PUT` en échec 500, lecture des propositions en échec) n'étaient pas testés. Deux tests sont ajoutés dans `carte-mot.spec.ts`.

## Verification

**Commandes :**
- `cd back && ./mvnw verify` : tests verts (les `@QuarkusTest` passent en local contre un PostgreSQL de test lancé à la main, `-Dquarkus.datasource.devservices.enabled=false` avec l'URL JDBC). `front/openapi/` est à jour.
- `cd front && npm test -- --watch=false && npm run build` : tests verts, paquet initial ≤ 600 kB.

Vérification à la clôture : back `./mvnw verify` 816 tests verts, `@QuarkusTest` compris (PostgreSQL de test lancé à la main), `front/openapi/` à jour ; front 1 044 tests verts ; `npm run build` à 599,78 kB.
