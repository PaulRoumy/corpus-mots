---
title: 'Corrections de la revue de mi-epic de l''Epic 2 (points 1 à 4)'
type: 'bugfix'
created: '2026-11-13'
status: 'done'
baseline_commit: '8a087618065f4d553c36876c50446b1a01f72b38'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/realisation/epic-2-context.md'
  - '{project-root}/docs/realisation/spec-2-5-2-ajouter-une-image.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** La revue de mi-epic (action 11 de la rétrospective de l'Epic 1) a trouvé quatre ruptures entre les stories 2.3 et 2.5 :
1. Mes mots normalise le Mot deux fois : « le l'ours » donne « ours », alors qu'une Préparation donne « l'ours ».
2. « Annuler » un retrait échoue tout entier si l'Image du Mot n'est plus proposable ou a changé de Sens, et le front propose « Réessayer » sans fin.
3. La lecture multipart (type, licence, taille, lecture, réduction) est recopiée dans deux ressources.
4. L'Album d'origine suit deux règles selon le chemin, et son existence n'est vérifiée que dans Mes mots.

**Approach:** Corriger chaque point à sa source dans `vocabulaire.service` : une seule normalisation, un lien d'Image facultatif au rétablissement, un point d'entrée unique pour préparer un fichier téléversé, une règle d'Album unique dans `Images.televerser`.

Décisions de Paul :
- Album d'origine : seule une `image_album` en a un, quel que soit le chemin. Depuis une Carte, un autre type ne reçoit plus l'Album de la Préparation. La spec 2.5.1 (l.160) est corrigée par cette décision.
- Origine d'un lien rétabli : il reste `reutilisee`. L'exception est inscrite dans AD-14 (ARCHITECTURE-SPINE), et le contrat ne change pas.
- La spec garde les quatre points (environ 2 300 tokens, accepté).

## Boundaries & Constraints

**Always:**
- Mes mots passe la saisie brute à `Lexique.obtenirOuCreerMot`, comme `PreparationsService.ajouterMot`. `Lexique.normaliser` ne sert qu'au contrôle de longueur.
- Un rétablissement remet toujours le Mot, son Sens, sa place et son Thème. L'Image n'est reliée que si elle est encore proposable et du Sens retenu. Sinon, le Mot revient « à illustrer », sans erreur, et l'annonce polie devient « « ours » rétabli, sans son image, qui n'est plus disponible. ».
- Pas d'exception levée puis attrapée dans la transaction : un `@Transactional` traversé par une `RuntimeException` marque la transaction en annulation. Il faut un chemin sans exception dans `Usages`.
- Front : « Réessayer » n'apparaît après un échec de rétablissement que pour une erreur réseau ou une erreur 5xx.
- La préparation du fichier (type, licence, taille, lecture, réduction) se fait hors transaction, par une seule méthode de `vocabulaire.service` qui ne dépend d'aucun type RESTEasy. Les deux ressources l'appellent. Codes et statuts inchangés : 400 `requete.invalide`, 413, 415.
- `Images.televerser` vérifie l'existence de tout `albumId` non nul par `referentiels` : 400 `image.album_introuvable`.
- Le contrat OpenAPI ne change pas.

**Never:**
- Ni nouvelle migration, ni modification de migration.
- Ne pas toucher `front/src/app/api/`. Aucun appel HTTP écrit à la main.
- Ne pas traiter les autres constats de la revue (verrous, ArchUnit, dossier de téléversement…).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Double article, Mes mots | « le l'ours » | Mot « l'ours », le même qu'en Préparation | N/A |
| Double article, Préparation | « le l'ours » | Mot « l'ours » (inchangé) | N/A |
| Rétablir, Image valide | Image propre, même Sens | Mot rétabli et Image reliée | N/A |
| Rétablir, Image plus proposable | Image privée d'un collègue (ou absente) | 201, Mot rétabli sans Image ; aucun `lien_image` | N/A |
| Rétablir, autre Sens | Image d'un autre Sens du Mot | 201, Mot rétabli sans Image | N/A |
| Rétablir, Mot revenu | Mot déjà présent | Rien n'est ajouté | 409 inchangé, pas de « Réessayer » |
| Rétablir, réseau coupé | Erreur réseau ou 5xx | Bandeau d'erreur | « Réessayer » proposé |
| Image libre, Carte | `image_libre` téléversée depuis une Carte | `album_id` vide | N/A |
| Image d'album, Carte | `image_album` depuis une Carte | `album_id` = Album de la Préparation | N/A |
| Album inconnu | `image_album` avec un `albumId` qui n'existe pas | Rien n'est enregistré | 400 `image.album_introuvable` |
| Fichier refusé, deux chemins | 21 Mo, non-image, type ou licence inconnus | Mêmes refus qu'avant | 413 / 415 / 400 |

</frozen-after-approval>

## Code Map

- `back/src/main/java/fr/corpusmots/vocabulaire/service/Images.java` -- `ajouterDansMesMots` l.86 (`obtenirOuCreerMot(forme)` à remplacer par la saisie brute) ; `televerser` l.111 (règle d'Album, contrôle d'existence à y déplacer depuis `ajouterDansMesMots` l.76-84) ; Javadocs l.53-62 et l.100-108 à aligner.
- `back/src/main/java/fr/corpusmots/vocabulaire/service/Lexique.java` -- `normaliser` l.53 (un seul article retiré) ; `obtenirOuCreerMot` l.81 normalise lui-même. Ne pas modifier.
- `back/src/main/java/fr/corpusmots/vocabulaire/service/Usages.java` -- `lierImage` l.99 : extraire les contrôles proposable et même Sens dans un chemin sans exception (par exemple `lierImageSiPossible` → `Optional<ImageVue>`, verrou `images.verrouillee` gardé) ; `libererPreparationMot` l.150.
- `back/src/main/java/fr/corpusmots/preparations/service/PreparationsService.java` -- `retablirMot` l.240-267 (Javadoc l.228-239 : retirer les 404 et 400 d'Image) ; `televerserImage` l.288 passe `preparation.albumId()` pour tout type : laisser `Images.televerser` ignorer l'Album d'un autre type que `image_album` (règle unique au même endroit).
- `back/src/main/java/fr/corpusmots/vocabulaire/service/ReductionImages.java` -- `verifierTaille`, `reduire` : y ajouter (ou dans une classe voisine) la préparation unique d'un fichier téléversé : chemin + taille + type + licence en texte → type, licence et `ImageReduiteVue`.
- `back/src/main/java/fr/corpusmots/vocabulaire/api/ImagesResource.java` l.75-98 et `preparations/api/PreparationsResource.java` l.156-178 -- code dupliqué à remplacer par l'appel unique. `albumId(...)` reste dans `ImagesResource`.
- `back/src/test/java/fr/corpusmots/preparations/api/ImagesMotsPreparationResourceTest.java` -- `retablirAvecLImagePriveeDUnCollegueEstRefuse` l.318 et `retablirAvecUneImageDUnAutreSensEstRefuse` l.348 deviennent « rétabli sans Image » ; `retablir(...)` l.405 est le helper.
- `back/src/test/java/fr/corpusmots/vocabulaire/api/MesMotsImagesResourceTest.java`, `preparations/api/MotsPreparationResourceTest.java`, `vocabulaire/service/LexiqueTest.java` -- cas « le l'ours ».
- `front/src/app/preparations/preparation.ts` l.865-905 (`retablirMot`, `reessayable` l.894) ; spec `preparation.spec.ts` l.1878-2040.
- `front/src/app/commun/erreurs/message-erreur.ts` -- `codeErreur` ; un prédicat « erreur réseau ou 5xx » peut y vivre.

## Tasks & Acceptance

**Execution:**
- [x] `back/.../vocabulaire/service/Images.java` -- saisie brute vers `obtenirOuCreerMot` ; dans `televerser`, Album gardé seulement pour `image_album`, ignoré sinon, et existence vérifiée ; Javadocs.
- [x] `back/.../vocabulaire/service/Usages.java` -- lien facultatif sans exception, origine `reutilisee`.
- [x] `back/.../preparations/service/PreparationsService.java` -- `retablirMot` sur le lien facultatif ; Javadocs de `retablirMot` et `televerserImage`.
- [x] `back/.../vocabulaire/service/ReductionImages.java` (+ record de résultat) -- préparation unique d'un fichier téléversé ; test dans `ReductionImagesTest`.
- [x] `back/.../vocabulaire/api/ImagesResource.java`, `back/.../preparations/api/PreparationsResource.java` -- appeler la préparation unique.
- [x] Tests back -- une ligne par ligne de la matrice ; adapter les deux tests de refus.
- [x] `front/src/app/preparations/preparation.ts` (+ spec) -- « Réessayer » réservé au réseau et aux 5xx ; annonce « sans son image ».
- [x] `front/openapi/` -- régénérer ; aucun diff attendu.
- [x] `docs/architecture/architecture-corpus-mots-2026-10-29/ARCHITECTURE-SPINE.md` -- AD-14 : un Mot rétabli après un retrait annulé est relié en `reutilisee`, même si son Image avait été créée pour cette Préparation.

**Acceptance Criteria:**
- Given une Image retirée devenue privée chez un collègue, when l'enseignant choisit « Annuler », then le Mot revient à sa place, « à illustrer », et l'annonce le dit.
- Given les deux ressources de téléversement, when on cherche `readAllBytes` ou `Licence.deValeur` dans `*/api/`, then aucune occurrence ne reste.

## Implementation Notes

- Mes mots : `Images.ajouterDansMesMots` passe la saisie brute à `obtenirOuCreerMot` ; `normaliser` ne sert plus qu'au contrôle de longueur. Les contrôles d'Album sont retirés de `ajouterDansMesMots` : `Images.televerser` tient seul la règle (`albumDOrigine`) — `album_requis` puis `album_introuvable` pour une `image_album`, `null` pour tout autre type. Un refus d'Album survient donc après la création du Mot, annulée avec la transaction (test existant « refus après la création du Mot »).
- Rétablissement : `Usages.lierImageSiPossible` → `Optional<ImageVue>`, mêmes verrou et contrôles que `lierImage` (code commun extrait : `imageProposable`, `sensRetenu`, `lier`), sans exception pour une Image absente, non proposable ou d'un autre Sens. Le 409 `mot_deja_illustre` reste levé (impossible sur une ligne neuve). `PreparationsService.retablirMot` l'appelle avec `reutilisee`.
- Fichier : `ReductionImages.preparerTeleversement(Path, long, String typeImage, String licence)` → `FichierTeleverseVue(typeImage, licence, fichier)` ; ordre inchangé (type, licence, 413 sur la taille annoncée, lecture, réduction). Dans `ImagesResource`, `albumId` est désormais lu avant le type (deux `400 requete.invalide`, seul le `detail` peut différer).
- Front : prédicat `erreurPassagere` (statut 0 ou ≥ 500) dans `message-erreur.ts` ; annonce « sans son image » quand le Mot retiré avait une Image et que le rétabli n'en a pas.
- AD-14 : `lierImageSiPossible` ajouté à la liste des opérations d'`Usages`, et l'exception `reutilisee` du rétablissement inscrite.

## Spec Change Log

## Review Triage Log

Revue 1 (Blind Hunter BH, Edge Case Hunter EC, Verification Gap VG : aucun manque de test).

| # | Constat | Verdict | Preuve | Suite |
|---|---------|---------|--------|-------|
| 1 | BH-1 : la spec 2.5 (l.159) garde l'ancienne règle d'Album d'origine | low | Ligne inchangée dans `spec-2-5-televerser-depuis-la-carte.md` ; un lecteur y trouverait la règle remplacée | patch : renvoi ajouté sur cette ligne |
| 2 | BH-2 : « vérifie l'existence de tout `albumId` non nul » contredit le code, qui ignore l'Album d'un autre type | false | L'Album d'un autre type n'est jamais enregistré (`albumDOrigine` → `null`) : un identifiant inconnu n'a aucun effet ; la décision de Paul prévaut sur cette ligne | rejeté |
| 3 | BH-3 : `image.album_introuvable` depuis une Carte affiche « Choisissez-en un autre » | false | Un Album n'est jamais supprimé avant la fusion de l'Epic 6 (spec 2.5.2, ligne 7 du tri) : cas inaccessible | rejeté |
| 4 | BH-4 : pas de test pour l'image d'album depuis une Carte ni pour les refus de fichier dans les deux chemins | false | `ImagesMotsPreparationResourceTest` l.183-189 vérifie `album_id` = Album de la Préparation ; `unFichierTropLourdEstRefuse`, `unFichierQuiNEstPasUneImageEstRefuse` et `MesMotsImagesResourceTest.unFichierTropLourdOuQuiNEstPasUneImageEstRefuse` passent | rejeté |
| 5 | BH-5 : l'annonce « qui n'est plus disponible » est inexacte si l'Image a seulement changé de Sens | low | Texte fixé par l'intention ; le Sens d'une Image ne change qu'avec la story 2.6 | rejeté |
| 6 | BH-6 : contrôle d'Album après la création du Mot et du Sens | low | Annulé avec la transaction, testé ; le front vérifie l'Album avant l'envoi | rejeté |
| 7 | BH-7 : `ReductionImages` emprunte `Images.CODE_REQUETE_INVALIDE` | low | Même paquetage ; aucun appelant ne divergerait | rejeté |
| 8 | BH-8 : ordre des contrôles et fichier illisible non testés dans `preparerTeleversement` | low | Ordre et comportement repris tels quels des deux ressources ; `FileUpload` fournit toujours un fichier | rejeté |
| 9 | BH-9 : AD-14 ne dit pas que `lierImageSiPossible` prend le même verrou | low | La phrase ne nommait que `lierImage` ; correction directe | patch : AD-14 nomme les deux |
| 10 | BH-10 : journaux de revue vides en `in-review` | false | Remplis par ce tri | rejeté |
| 11 | BH-11 : `@APIResponse` ne listent pas les nouveaux refus | false | Aucun endpoint du back ne documente ses 4xx (aucun `responseCode = "4…"`) : convention du projet | rejeté |
| 12 | BH-12 : pas de test de composant pour le statut 0, ni pour l'annonce d'un Mot sans Image | false | `preparation.spec.ts` l.2030-2038 couvre l'erreur réseau et « Réessayer » ; l'annonce simple est vérifiée par le test existant du rétablissement | rejeté |
| 13 | EC-1 : un 500 déterministe garde « Réessayer » | low | Réessai manuel, sans boucle automatique ; un 500 signale une panne, pas un refus métier | rejeté |
| 14 | EC-2 : 408 et 429 ne proposent pas « Réessayer » | low | Ni Caddy ni Quarkus ne renvoient 408 ou 429 dans ce déploiement | rejeté |

## Verification

**Commands:**
- `cd back && ./mvnw -q verify` (JAVA_HOME JDK 25, DOCKER_HOST Podman) -- expected: tous les tests passent, ArchUnit compris, `front/openapi/` à jour.
- `cd front && npm test -- --watch=false && npm run build` -- expected: tests au vert, paquet initial sous 600 kB.
