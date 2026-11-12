---
title: 'Story 2.5, partie 1 : Téléverser une Image depuis la Carte « à illustrer »'
type: 'feature'
created: '2026-11-12'
status: 'done'
baseline_commit: '7d18f8a6a8ab97695bb2e573cf15c99c4ecdf7c6'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/realisation/epic-2-context.md'
  - '{project-root}/docs/realisation/spec-2-4-suggestions-arasaac.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Un Mot « à illustrer » ne peut recevoir aucune image : l'Image n'existe pas encore dans le code (FR-13, story 2.5).

**Approach:** On ajoute « Téléverser » dans la Carte « à illustrer ». L'enseignant choisit un fichier et renseigne le type, la source, la licence et l'auteur ; le Repère de qualité est affiché. Le back réduit le fichier, crée l'Image (`privee`) dans `vocabulaire` et la lie au Mot de la Préparation avec l'origine `nouvelle`. La Carte passe alors sur une colonne, avec la vignette et le Badge de type. Cette partie pose les fondations que les parties suivantes réutiliseront :
- tables `image`, `image_fichier`, `lien_image` ;
- énumérations `TypeImage` et `Licence` ;
- `ReductionImages`, `FichiersImages`, `VisibiliteImages`, `Usages.lierImage`.

Partie 1 de la story 2.5, découpée par Paul. « + › Ajouter une image » est la partie 2 et le Panneau de choix d'Image arrive avec la story 2.7 ; les deux sont reportés dans `deferred-work.md`. Q-1 ne bloque pas : `image_album` est livré, et il sera retiré sans autre changement si Q-1 interdit le stockage (ARCHITECTURE-SPINE, Deferred).

Décisions :
- Depuis une Carte, l'Album d'origine d'une `image_album` est celui de la Préparation, affiché et non modifiable. La règle « Album d'origine requis » est quand même appliquée par le back (code `image.album_requis`).
- Licences selon le type :
  - `photo_personnelle` reçoit `droits_auteur_enseignant` ;
  - `image_album` reçoit `usage_pedagogique_album` ;
  - `image_libre` et `inconnu` se choisissent dans le Sélecteur de licence, qui propose les six licences d'EXPERIENCE.md. Pixabay et « autre / inconnue » y sont marquées « non partageable ». La licence reste facultative.
- Une `image_libre` sans source ou sans licence est enregistrée, et sa représentation porte `aCompleter: true`. L'affichage de « à compléter » vient avec la Carte d'identité (story 2.6).
- Retirer un Mot illustré supprime son `lien_image`, jamais l'Image. « Annuler » le rétablit avec la même Image (origine `reutilisee`, AD-14).
- Formats acceptés : JPEG, PNG et GIF, lus par le JDK seul. WebP et tout autre format donnent `format.non_supporte` (choix de Paul).
- Le formulaire est un dialogue « Téléverser une image », sur le patron du dialogue du Thème du Mot (choix de Paul).

## Boundaries & Constraints

**Always:**
- Vérifications sur le fichier :
  - 20 Mo au plus (`corpusmots.limites.taille-fichier`), contrôlés aussi par le front avant l'envoi ;
  - au-delà : `413 requete.trop_volumineuse` ;
  - fichier illisible ou dans un format non accepté : `415 format.non_supporte` ;
  - dans les deux cas, rien n'est enregistré.
- L'Image prend le Sens retenu du Mot de Préparation (invariant AD-14) et l'enseignant courant comme propriétaire.
- `ReductionImages` est la seule réduction (AD-8) :
  - `image_album` ≤ 400 × 400 px, autres types ≤ 1600 px sur le grand côté, miniature ≤ 256 px ;
  - l'orientation EXIF est appliquée, puis toutes les métadonnées sont supprimées ;
  - les dimensions sont plafonnées avant le décodage (fichier piège).
- Écriture :
  - verrous dans l'ordre : Préparation (`FOR UPDATE`), puis Image dans `lierImage` ;
  - `lierImage` vérifie `proposable` ;
  - `image` porte `@Version` ;
  - aucune écriture de `lien_image` hors `Usages` (AD-14, AD-17).
- Octets servis seulement par `FichiersImages.lire`, derrière `consultable` (sinon 404), avec `Cache-Control: private, max-age=86400` et `ETag` = version. `?taille=miniature` dans la Carte (AD-23).
- Toute représentation d'Image contient `id`, `proprietaireId`, `etat`, `aRemplacer` (toujours `null` ici), `reutilisable` (= `proposable` pour l'enseignant courant), `typeImage` et `aCompleter`. Les DTO ont des noms uniques (AD-16).
- `illustre`, `nombreIllustres` et le nombre « à illustrer » de l'accueil viennent de `lien_image`.
- Chaque nouveau `code` d'erreur est traduit dans `MESSAGES_PAR_CODE`, au vouvoiement. Le front passe `verifier-jetons`.

**Never:**
- Pas de « + › Ajouter une image », de Panneau de choix d'Image, de Carte d'identité, de remplacement ni de déliaison d'une Image, et pas de choix d'un pictogramme ARASAAC.
- Pas de clé étrangère vers `album`, `enseignant` ou `preparation_mot` (AD-1). Aucun fichier sur disque. Aucun jeton dans une URL d'image.
- Le glisser-déposer n'est jamais le seul moyen : il y a toujours un bouton de choix de fichier.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Image libre complète | PNG 2 Mo, `image_libre`, source, licence `cc0_domaine_public`, auteur | 201, Mot illustré, image `privee`, ≤ 1600 px, miniature ≤ 256 px, `aCompleter: false`, lien `nouvelle` | N/A |
| Image libre incomplète | `image_libre` sans licence | 201, `aCompleter: true` | N/A |
| Photo personnelle | JPEG orienté EXIF 6 | Pixels redressés, sans EXIF, licence `droits_auteur_enseignant` | N/A |
| Image d'album | JPEG 3000 × 2000, `image_album` | ≤ 400 × 400, licence `usage_pedagogique_album`, `album_id` = Album de la Préparation | N/A |
| Fichier trop lourd | 21 Mo | Rien n'est enregistré | 413 `requete.trop_volumineuse` |
| Pas une image | PDF ou texte renommé `.png` | Rien n'est enregistré | 415 `format.non_supporte` |
| Image géante | En-tête de 30 000 × 30 000 px | Rejetée avant décodage | 415 `format.non_supporte` |
| Type manquant ou inconnu | `typeImage` absent | Rien n'est enregistré | 400 `requete.invalide` |
| Mot déjà illustré | Lien existant | Rien n'est enregistré | 409 `preparation.mot_deja_illustre` |
| Préparation d'un collègue | Autre propriétaire | Rien n'est enregistré | 404 `ressource.introuvable` |
| Fichier d'un collègue | Image `privee` de Zoé, sans lien chez Claire | Octets non servis | 404 |
| Retirer puis Annuler | Mot illustré | Lien supprimé puis recréé (`reutilisee`), Image intacte | N/A |

</frozen-after-approval>

## Code Map

- `back/src/main/java/fr/corpusmots/preparations/api/PreparationsResource.java` -- endpoints JSON de `/preparations` ; `MotPreparationDto` (le champ `illustre` existe déjà), construit par `de(MotPreparationVue)`.
- `back/src/main/java/fr/corpusmots/preparations/service/PreparationsService.java` :
  - `ajouterMot` (l.171), qui verrouille la Préparation (`verrouillee`) et appelle `usages.retenirSens` ;
  - `retirerMot` (l.200) et le rétablissement ;
  - `motsDe` (l.275) ;
  - `illustre` est codé en dur à `false` (l.360-366), et `nombreIllustres`/`nombreAIllustrer` aussi (l.135, l.351) ;
  - `mienne`, `verrouillee`, `deLaPreparation` répondent 404.
- `back/src/main/java/fr/corpusmots/vocabulaire/service/Usages.java` -- `retenirSens`, `libererPreparationMot` ; leur Javadoc annonce déjà `lien_image`. `SensRetenuRepository.sensDe` donne le Sens retenu.
- `back/src/main/java/fr/corpusmots/vocabulaire/api/ArasaacResource.java` -- patron pour servir un fichier image (`Response`, `Cache-Control`).
- `back/src/main/resources/db/migration/V202611111000__vocabulaire_mot_sens.sql` -- conventions (`uuidv7()`, CHECK de section, FK seulement dans le module).
- `back/src/main/resources/application.properties` -- `corpusmots.limites.taille-fichier=20M`, pas encore lue ; `quarkus.http.limits.max-body-size=100M`. `quarkus-rest-jackson` gère déjà le multipart (`@RestForm`, `FileUpload`). Aucune librairie d'image n'est présente.
- `back/src/main/java/fr/corpusmots/commun/api/ErreursMappers.java` -- 413 et 415 donnent déjà `requete.trop_volumineuse` et `format.non_supporte`.
- `back/src/test/java/fr/corpusmots/architecture/ReglesArchitecture.java` -- `nomsDeDtoUniques`, `aucunAppelHttpSortantEnTransaction`, graphe AD-1.
- `back/src/test/java/fr/corpusmots/preparations/api/MotsPreparationResourceTest.java` -- modèle de test : utilisateurs `CLAIRE`/`ZOE`, `EnseignantsDeTest`, `ReferentielsDeTest`, nettoyage par `delete` natifs (y ajouter `lien_image`, `image_fichier`, `image`).
- `front/src/app/preparations/carte-mot.ts` (+ `.scss`) -- vignette vide (l.47), badge « à illustrer », `<app-suggestions-arasaac>` ; aucune branche « illustrée ». `preparation.ts` : `ouvrirThemeMot` (l.903) est le modèle à suivre pour ouvrir le formulaire et remplacer le Mot ; mettre aussi à jour `preparation.nombreIllustres`.
- `front/src/app/preparations/theme-mot-dialogue.ts` -- patron de dialogue (`ouvrirDialogueThemeMot`, `restoreFocus`, `disableClose` pendant la requête).
- `front/src/app/commun/image-securisee/` -- vignette en blob ; la fonction de chargement doit garder une identité stable.
- `front/src/styles/_jetons.scss` -- `--cm-image-libre|photo|album|inconnu` (clair et sombre) pour le Badge de type.
- `front/src/app/api/request-builder.ts` -- le client généré construit le `FormData` d'un corps `multipart/form-data`.
- `docs/ux-designs/ux-corpus-mots-2026-10-28/DESIGN.md` -- Badge de type (l.189, 272-279 : globe/pleine, appareil photo/double, livre ouvert/tirets, point d'interrogation/pointillés ; 22 px, icône de 14 px), Vignette (l.369), Carte illustrée (l.361), Sélecteur de licence (l.377). EXPERIENCE.md l.69 donne les libellés des licences et l.150 « non partageable ».

## Tasks & Acceptance

**Execution:**
- [x] `back/src/main/resources/db/migration/V202611121000__vocabulaire_image.sql` -- tables :
  - `image` : `id`, `proprietaire_id`, `sens_id` (FK `sens`), `type_media` (`image`), `type_image`, `licence` nullable, `source`, `auteur`, `album_id`, `etat` (`privee`…), `version`, `cree_le`, `modifie_le` ; CHECK sur les énumérations ;
  - `image_fichier` : `image_id` (PK, FK), `octets`, `miniature`, `type_mime`, `largeur`, `hauteur`.
- [x] `back/src/main/resources/db/migration/V202611121010__vocabulaire_lien_image.sql` -- table `lien_image` (colonnes d'AD-14), FK vers `image`, `UNIQUE(preparation_mot_id)`, index sur `image_id`.
- [x] `back/src/main/java/fr/corpusmots/vocabulaire/persistance/` -- entités et repositories `Image`, `ImageFichier`, `LienImage`.
- [x] `back/src/main/java/fr/corpusmots/vocabulaire/service/` :
  - `TypeImage`, `Licence`, `EtatImage` ;
  - `ReductionImages` ;
  - `VisibiliteImages` (`consultable`, `proposable`, `moderable`) ;
  - `Images.televerser(commande)` : création de l'Image et de son fichier ;
  - `FichiersImages.lire(imageId, enseignantId, usage)` ;
  - `Usages.lierImage` ; `libererPreparationMot` supprime aussi le lien ; `imagesLiees(preparationMotIds)` ;
  - vues et commandes en `record`.
- [x] `back/src/main/java/fr/corpusmots/vocabulaire/api/ImagesResource.java` -- `GET /images/{id}/fichier?taille=miniature|grande` (`fichierImage`).
- [x] `back/src/main/java/fr/corpusmots/preparations/` :
  - `POST /preparations/{id}/mots/{motPreparationId}/image` (`televerserImageMotPreparation`), en multipart : `fichier`, `typeImage`, `source`, `licence`, `auteur` ;
  - réponse : le `MotPreparationDto`, qui gagne `image: PreparationImageDto|null` ;
  - `illustre` et les compteurs viennent des liens ;
  - le rétablissement accepte un `imageId` facultatif.
- [x] `back/src/test/java/fr/corpusmots/` :
  - une ligne de test par ligne de la matrice ;
  - tests de `ReductionImages` (tailles, EXIF, image géante) ;
  - tests de `VisibiliteImages` (trois prédicats, `admin` n'élargit rien) ;
  - tests de `ImagesResource` (404 pour un collègue, `ETag`, `Cache-Control`).
- [x] `front/openapi/` -- régénérer et versionner.
- [x] `front/src/app/preparations/televerser-image-dialogue.ts` (+ `.scss`, spec) -- le dialogue :
  - Mot en cursive ;
  - choix de fichier (bouton, glisser-déposer en plus) avec aperçu ;
  - type d'image ; source ; licence (Sélecteur ou valeur imposée) ; Album d'origine (lecture seule) ; auteur ;
  - Repère de qualité ;
  - « Annuler » et « Enregistrer » ;
  - contrôle des 20 Mo avant envoi ; erreurs en Bandeau.
- [x] `front/src/app/commun/badge-type-image/` (+ spec) -- Badge de type (icône + style de bordure + couleur + libellé), avec de nouvelles icônes dans `icones.ts` si besoin.
- [x] `front/src/app/preparations/carte-mot.ts` (+ `.scss`, spec) et `preparation.ts` (+ spec) :
  - bouton texte « Téléverser » sous les suggestions ;
  - Carte illustrée sur une colonne : vignette miniature (alt « Mot, Sens »), Badge de type, Mot en cursive ;
  - compteur mis à jour ;
  - tests `illustre: true`.
- [x] `front/src/app/commun/erreurs/message-erreur.ts` + spec -- `image.album_requis` « Album d'origine requis » et `preparation.mot_deja_illustre`.

**Acceptance Criteria:**
- Given la Carte « citrouille » à illustrer, when l'enseignant téléverse une image libre complète, then la Carte affiche la vignette et le Badge « image libre », et le compteur passe à « 1 déjà illustré », sans recharger la page.
- Given le formulaire, when le type change, then la licence suit les règles de type, Pixabay et « autre / inconnue » portent « non partageable », et le Repère de qualité reste visible.
- Given un fichier de plus de 20 Mo, when il est choisi, then le front le refuse sans envoyer de requête.
- Given les outils de développement, then la vignette est chargée en blob par `/api/images/{id}/fichier?taille=miniature` et aucune URL ne porte de jeton.

## Implementation Notes

- Réduction par le seul JDK (ImageIO, AWT) : JPEG, PNG et GIF acceptés ; en-tête lu avant décodage (12 000 px par côté, 50 Mpx au plus), décodage sous-échantillonné des grandes sources ; orientation EXIF lue à la main (JPEG seulement) ; ré-encodage sans métadonnées (JPEG qualité 0,88, PNG si transparence). Un JPEG CMJN, illisible par ImageIO, est refusé en 415. Le conteneur du back démarre avec `-Djava.awt.headless=true`.
- Album d'origine : celui de la Préparation, enregistré pour tous les types (requis seulement pour `image_album`).
- `ETag` = version de l'Image, identique pour les deux tailles (chaque URL a le sien).
- Le multipart passe par les fichiers temporaires de Quarkus (supprimés en fin de requête) ; rien n'est stocké sur disque.
- Rétablir un Mot illustré relie la même Image (origine `reutilisee`), si elle est encore proposable.
- Front : compteur « déjà illustrés » calculé depuis la Grille ; après un téléversement, le focus va au bouton « Retirer » de la Carte illustrée.

- Revue 1 : réduction déplacée dans la ressource, hors de la transaction (un fichier illisible envoyé pour la Préparation d'un collègue donne donc 415 avant le 404) ; contrôle « déjà illustré » laissé au seul `Usages.lierImage` ; `-Djava.awt.headless=true` aussi dans `argLine` et `jvmArgs` ; tests du Thème d'un Mot illustré, de `image.sens_different` et du GIF ; dans le dialogue, dépôt hors de la zone bloqué, surbrillance stable, « Enregistrement de l'image… » annoncé, `maxlength` de 500.

## Spec Change Log

## Review Triage Log

Revue 1 (Blind Hunter BH, Edge Case Hunter EC, Verification Gap VG ; OR = constat de l'orchestrateur à la lecture du diff).

| # | Constat | Verdict | Preuve | Suite |
|---|---------|---------|--------|-------|
| 1 | VG-1 : aucun test ne change le Thème d'un Mot illustré, alors que `changerTheme` renvoie désormais l'Image | medium | Constat pré-vérifié ; la page remplace le Mot par la réponse | patch |
| 2 | VG-2 : le refus `image.sens_different` de `lierImage` n'a aucun test | medium | Constat pré-vérifié ; seul garde de l'invariant AD-14 au rétablissement | patch |
| 3 | BH-12 (b), EC-5 : un fichier déposé hors de la zone, dans le dialogue, est ouvert par le navigateur et le formulaire est perdu | medium | Aucun `preventDefault` hors de `.televerser__depot` | patch |
| 4 | BH-11 : aucun retour pendant l'envoi d'un fichier qui peut faire 20 Mo, hormis le bouton désactivé | medium | Le dialogue paraît figé, et rien n'est annoncé au lecteur d'écran | patch |
| 5 | BH-2, BH-9 : la réduction tourne dans la transaction (connexion tenue) et la taille est vérifiée à deux endroits | low | `televerserImage` est `@Transactional` et lit la base avant `reduire` ; déplacer la réduction dans la ressource corrige les deux | patch |
| 6 | BH-8 : contrôle « déjà illustré » en double dans `televerserImage` et `lierImage`, code défini deux fois, contrôle du type inatteignable | low | La transaction annule tout de même ; suppression directe | patch |
| 7 | BH-10, EC-4 : Source et Auteur sans `maxlength` dans le front, alors que le back refuse au-delà de 500 caractères avec un message générique | low | Correction directe (`maxlength="500"`) | patch |
| 8 | BH-12 (a) : la surbrillance de la zone de dépôt clignote au passage sur un élément enfant | low | `dragleave` est émis sur les enfants ; correction directe (`relatedTarget`) | patch |
| 9 | BH-7 : `java.awt.headless` n'est posé que dans le `Containerfile` ; les tests et `quarkus:dev` sous macOS démarrent une session AWT | low | `pom.xml` : pas de `-Djava.awt.headless` dans `argLine` ni dans `jvmArgs` | patch |
| 10 | BH-13 (a) : GIF accepté mais jamais testé, transparence de palette comprise | low | Aucun GIF dans `ReductionImagesTest` | patch |
| 11 | OR : dans `icones.ts`, les icônes ajoutées séparent le commentaire « Trois points verticaux » de l'icône `actions` | low | Lecture du diff | patch |
| 12 | BH-1, EC-1, EC-2, EC-10 : « Annuler » échoue en entier si l'Image n'est plus proposable, et « Réessayer » reste proposé | low | Inatteignable dans cette partie : seules existent les Images `privee` de l'enseignant, toujours proposables ; aucune transition d'état avant l'Epic 3 | rejeté |
| 13 | BH-3, EC-6 : aucune borne mémoire ni de simultanéité pour les réductions ; `OutOfMemoryError` donne un 500 | low | Source plafonnée à 50 Mpx et sous-échantillonnée ; volume d'une école faible | rejeté |
| 14 | BH-4 : `max-body-size` de 100 Mo, et le 413 de Quarkus sans `code` | false | 100 Mo par requête d'import (ARCHITECTURE-SPINE) ; `ErreursMappers` traduit 413 en `requete.trop_volumineuse` ; le front refuse avant l'envoi | rejeté |
| 15 | BH-5 : une Image `privee` reste sans lien après un retrait non annulé | false | Décision de l'intention : retirer ne supprime jamais l'Image, qui va dans Mes mots (partie 2) | rejeté |
| 16 | BH-6 : `image.modifie_le` n'est jamais mis à jour | low | Aucune modification d'Image dans cette partie ; les transitions de l'Epic 3 l'écriront | rejeté |
| 17 | BH-14, EC-8 : une Image liée est servie hors de la Préparation qui la lie ; une requête de lien par vignette | false | `consultable` inclut le lien (AD-2) ; « montrée seulement dans la Préparation » vise les listes et propositions, pas l'accès au fichier ; coût d'une requête indexée négligeable | rejeté |
| 18 | BH-15 : alternative « citrouille, à compléter » | low | Conforme à « Mot, Sens » ; dit au lecteur d'écran que le Sens reste à compléter | rejeté |
| 19 | BH-13 (b, c) : tests du rétablissement d'une Image non proposable et des 413/415 dans le dialogue | low | Voir ligne 12 ; la traduction des codes est testée dans `message-erreur.spec.ts` | rejeté |
| 20 | EC-3 : un 409 `mot_deja_illustre` (autre onglet) laisse le dialogue ouvert et la Carte « à illustrer » | low | Exige deux onglets sur le même Mot ; corriger ajoute une branche | rejeté |
| 21 | EC-7 : une licence inconnue envoyée avec une photo personnelle donne 400 | low | Le front n'envoie jamais de licence pour ces types ; requête forgée seulement | rejeté |
| 22 | EC-9 : un JPEG CMJN est refusé (415) | low | Conséquence de la décision de Paul (« lus par le JDK seul ») | rejeté |

## Design Notes

- Le téléversement passe par `preparations` : c'est lui qui possède le Mot de Préparation et ouvre la transaction. Il appelle `vocabulaire.service` (`Images.televerser` puis `Usages.lierImage`) dans cette transaction ; la réduction, coûteuse, se fait avant le verrou.
- Grille : une Carte illustrée occupe une seule colonne et une Carte « à illustrer » trois. L'ordre de saisie est conservé, quitte à laisser des cellules vides en fin de ligne ; on n'utilise pas `grid-auto-flow: dense`, qui réordonnerait les Cartes.
- Format stocké : PNG si la source a de la transparence, sinon JPEG ; même règle pour la miniature. `type_mime` est servi tel quel.

## Verification

**Commands:**
- `cd back && ./mvnw -q verify` (JAVA_HOME JDK 25, DOCKER_HOST Podman) -- expected: tous les tests passent, y compris ArchUnit, et `front/openapi/` est à jour.
- `cd front && npm test -- --watch=false && npm run build` -- expected: tests et `verifier-jetons` au vert, build sous le budget de 600 kB du paquet initial.
