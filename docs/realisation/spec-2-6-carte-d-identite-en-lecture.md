---
title: 'Story 2.6, partie 1 : Panneau Carte d''identité en lecture'
type: 'feature'
created: '2026-11-13'
status: 'done'
baseline_commit: '6a982d6835bfac6e2948b3545b4462a0bae6f087'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/realisation/epic-2-context.md'
  - '{project-root}/docs/realisation/spec-2-5-televerser-depuis-la-carte.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Une Image liée à un Mot ne montre que sa vignette. L'enseignant ne peut voir ni son Sens, ni son type, ni sa source, sa licence, son auteur, son album d'origine ou son propriétaire (FR-14, story 2.6).

**Approach:** Un clic sur la vignette d'une Carte de Mot illustrée ouvre le Panneau Carte d'identité, à droite, sur 400 px, sans masquer la grille. Le panneau est en lecture seule pour tous dans cette partie. Il est rempli par un nouveau `GET /images/{id}` de `vocabulaire`, qui applique `consultable` (AD-2).

Partie 1 de la story 2.6, découpée par Paul en quatre parties. Les trois autres sont reportées dans `deferred-work.md` :
- partie 2 : modifier type, source, licence et auteur ;
- partie 3 : Sections, Module et Thèmes ;
- partie 4 : Sens et catégorie.

Décisions :
- Le panneau suit la vue en lecture seule de la maquette (`key-banque.html` › `.cid` + `dl.ro`) :
  - en tête : titre « Carte d'identité », bouton « Fermer », grande vignette, Badge de type d'image ;
  - « basse résolution » pour une image d'album, « lecture seule » pour un non-propriétaire ;
  - puis les douze champs dans l'ordre du Glossaire : Mot (cursive), Sens, catégorie grammaticale, Sections, album d'origine (titre, puis auteur), Module, Thèmes, type, source, licence, auteur, propriétaire ;
  - un champ vide affiche « — » ; Sections, Module et Thèmes affichent « — » jusqu'à la partie 3 ;
  - aucune action en pied de panneau : Verser, Supprimer, etc. arrivent plus tard.
- Propriétaire : nom affiché lu dans l'`Annuaire` du front, suivi de « (vous) » pour l'enseignant courant. Un nom introuvable affiche « un ancien membre de l'équipe ».
- Un Sens « à compléter » est mis en avant (couleur et libellé « à compléter », jamais la couleur seule).
- La grande taille du fichier (`taille=grande`) sert la vignette du panneau.

## Boundaries & Constraints

**Always:**
- `GET /images/{id}` renvoie la Carte d'identité si l'Image est `consultable` (`VisibiliteImages`, avec `LienImageRepository.existe`, comme `FichiersImages.lire`), sinon `404 ressource.introuvable`. Le rôle `admin` n'élargit rien.
- Le DTO porte les champs obligatoires d'AD-16 (`id`, `proprietaireId`, `etat`, `aRemplacer`, `reutilisable`), plus `typeImage`, `aCompleter`, le Mot, le Sens (libellé, catégorie, « à compléter »), l'album d'origine (id, titre, auteur, ou `null`), `licence`, `source`, `auteur`. Son nom est unique dans le back.
- Un `@Transactional` en lecture seule dans `vocabulaire.service`. L'Album est lu par `referentiels.service` (AD-1).
- Panneau : `aside` nommé « Carte d'identité ».
  - Échap et « Fermer » le ferment, et le focus revient à la vignette.
  - À l'ouverture, le focus va au panneau.
  - Un seul panneau à la fois : cliquer une autre vignette le remplace.
  - En dessous de 600 px de large, il couvre l'écran.
- La vignette d'une Carte illustrée devient un bouton nommé « Carte d'identité de « citrouille » ».
- Chargement : squelette. Échec : message traduit et « Réessayer » dans le panneau.
- Libellés des 8 licences et des 4 types tirés d'une seule source dans le front, partagée avec le dialogue de téléversement.

**Never:**
- Aucune modification d'Image, aucun champ éditable, aucune nouvelle table.
- Aucun appel HTTP écrit à la main ; ne pas modifier `front/src/app/api/`.
- Pas de filtrage de visibilité hors de `VisibiliteImages`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Propriétaire | Image `privee` de Claire, lue par Claire | 200, tous les champs ; `reutilisable` vrai | N/A |
| Image d'album | `image_album`, Album « Roule galette » | `albumOrigine` = titre et auteur ; panneau « basse résolution » | N/A |
| Sens à compléter | Image sur le Sens « à compléter » | `sens.aCompleter` vrai ; champ mis en avant | N/A |
| Collègue sans lien | Image `privee` de Zoé, lue par Claire | Rien n'est révélé | 404 `ressource.introuvable` |
| Collègue avec lien | Claire a lié l'Image de Zoé (alors proposable), devenue privée | 200 ; panneau « lecture seule », propriétaire « Zoé » | N/A |
| Administrateur | Admin sans lien, Image `privee` d'un collègue | Rien n'est révélé | 404 |
| Inexistante | UUID inconnu | Rien | 404 |
| Échec réseau | Lecture en erreur | Message et « Réessayer » dans le panneau | Bandeau dans le panneau |
| Clavier | Échap dans le panneau | Fermé, focus sur la vignette | N/A |

</frozen-after-approval>

## Code Map

- `back/src/main/java/fr/corpusmots/vocabulaire/api/ImagesResource.java` -- y ajouter `GET /images/{id}` (`carteIdentiteImage`) ; `fichier(...)` montre le 404 attendu.
- `back/src/main/java/fr/corpusmots/vocabulaire/service/FichiersImages.java` l.37 -- modèle du contrôle `consultable` + `liens.existe(image.id(), enseignantId)`.
- `back/src/main/java/fr/corpusmots/vocabulaire/service/Images.java` -- `vue(...)` (AD-16, `aRemplacer` reste `null`, voir `deferred-work.md`) ; y ajouter `carteIdentite(UUID)` → nouveau record `CarteIdentiteImageVue`.
- `back/src/main/java/fr/corpusmots/vocabulaire/service/Lexique.java` -- `mots(...)` l.113 ; ajouter une lecture d'un Sens par id si besoin (`SensRepository`). `Usages.LIBELLE_A_COMPLETER` définit le Sens « à compléter ».
- `back/src/main/java/fr/corpusmots/referentiels/service/ReferentielsService.java` -- `album(UUID)` → `Optional<AlbumVue>` (titre, auteur).
- `back/src/main/java/fr/corpusmots/vocabulaire/api/MesMotsImageDto.java` -- modèle de DTO (noms uniques, `de(...)`).
- `back/src/test/java/fr/corpusmots/vocabulaire/api/ImagesResourceTest.java`, `ImagesDeTest.java`, `vocabulaire/service/FichiersDeTest.java` -- fixtures (Images, liens, enseignants) à réutiliser.
- `front/src/app/preparations/carte-mot.ts` -- vignette l.56-71 à rendre cliquable (nouvel `output` `ouvrirCarteIdentite`) ; focus à rendre au retour.
- `front/src/app/preparations/preparation.ts` (l.493 `app-carte-mot`) + `preparation.scss` -- hôte du panneau, mise en page grille + panneau.
- `front/src/app/commun/image-securisee/`, `commun/badge-type-image/`, `commun/annuaire.ts`, `commun/compte-courant.ts`, `commun/squelette/`, `commun/bandeau-erreur/` -- à réutiliser.
- `front/src/app/preparations/televerser-image-dialogue.ts` l.54-80 -- `LICENCES_CHOISIES`, `LICENCES_IMPOSEES` : à déplacer dans un module partagé avec les 8 libellés (dont ARASAAC).
- `docs/ux-designs/ux-corpus-mots-2026-10-28/.working/key-banque.html` l.191-215 et 417-440 -- styles `.cid` et `dl.ro` à transposer en jetons (`verifier-jetons`).

## Tasks & Acceptance

**Execution:**
- [x] `back/.../vocabulaire/service/` -- `Images.carteIdentite` et `CarteIdentiteImageVue`.
- [x] `back/.../vocabulaire/api/` -- `GET /images/{id}` et son DTO.
- [x] `back/src/test/.../vocabulaire/api/` -- une ligne de test par ligne back de la matrice.
- [x] `front/openapi/` -- régénérer et versionner.
- [x] `front/src/app/commun/libelles-images.ts` (nom libre) -- libellés des licences et des types, repris par le dialogue de téléversement.
- [x] `front/src/app/commun/carte-identite/` (+ spec) -- composant Panneau Carte d'identité.
- [x] `front/src/app/preparations/carte-mot.ts`, `preparation.ts` (+ specs, scss) -- ouverture, fermeture, focus, mise en page.

**Acceptance Criteria:**
- Given une Carte illustrée, when l'enseignant clique sa vignette, then le panneau s'ouvre à droite sur 400 px et la grille reste visible et utilisable.
- Given le build de production, then le paquet initial reste sous 600 kB.

## Implementation Notes

- Back : `GET /images/{id}` (`carteIdentiteImage`) → `Images.carteIdentite` (`consultable` avec lien, comme `FichiersImages.lire`) → `CarteIdentiteImageVue`, exposée par `CarteIdentiteImageDto` (Sens dans `CarteIdentiteSensDto`, Album dans `CarteIdentiteAlbumDto`). Album d'origine lu pour une `image_album` seulement. Nouvelle lecture `Lexique.sens(UUID)`.
- Front : `commun/libelles-images.ts` réunit types et 8 licences (Badge de type et dialogue de téléversement s'en servent) ; `commun/carte-identite/` porte le panneau. Repère « à compléter » aussi pour une image libre sans source ou licence (renvoyé à la 2.6 par la spec 2.5). « Réessayer » seulement pour une erreur passagère ; une 404 affiche le message seul.
- Mise en page : grille page + panneau de 400 px collé en haut de la zone de contenu (`--cm-hauteur-zone-contenu`, barre supérieure comptée à 80 px par jeton), défilement interne ; sous 600 px (`Breakpoints.XSmall`), panneau fixe plein écran et page `inert`. Retirer le Mot affiché ou changer de Préparation ferme le panneau.
- Vignette de la Carte : bouton « Carte d'identité de « citrouille » », décrit par l'alternative « citrouille, légume » (`aria-describedby`).
- Vérification : back 475 tests (dont 10 pour `GET /images/{id}`), front 494 tests, paquet initial 597,29 kB.

## Spec Change Log

## Review Triage Log

Revue 1 (Blind Hunter BH, Edge Case Hunter EC, Verification Gap VG).

| # | Constat | Verdict | Preuve | Suite |
|---|---------|---------|--------|-------|
| 1 | EC-1, BH-1 : `albumOrigine` rempli pour un autre type qu'`image_album` portant encore un `album_id` | low | `Images.carteIdentite` lit l'Album sans regarder le type ; des Images de la story 2.5.1 (Carte, tout type) en portent un | patch |
| 2 | EC-3 : un clic sur la vignette déjà ouverte ne rend pas le focus au panneau | low | `imageId` inchangé : l'effet du panneau ne repart pas | patch |
| 3 | EC-4, BH-6, VG-1 : sous 600 px, le panneau plein écran laisse Tab atteindre la page cachée ; aucun test du mode plein écran | medium | Ni `inert`, ni piège de focus ; aucun test ne simule `BreakpointObserver` dans `preparation.spec.ts` | patch |
| 4 | EC-8 : le nom du bouton de la vignette remplace l'alternative, le Sens n'est plus annoncé | low | `aria-label` du bouton prime sur `alt` ; avant, « citrouille, légume » était annoncé | patch (aria-describedby) |
| 5 | BH-11 : `max-height: 100dvh` du panneau collé ignore la barre supérieure de la coquille | medium | `coquille.scss` : barre fixe, seul le contenu défile ; le bas d'un panneau long n'est visible qu'en fin de page | patch |
| 6 | BH-8 : 404 du panneau non testé | low | Seule l'erreur réseau est testée ; test direct | patch |
| 7 | VG-3 : réponse tardive de la Carte précédente non testée | medium | Garde `derniereLecture` sans test qui fasse se croiser deux lectures | patch |
| 8 | VG-2 : ouvrir une autre Préparation ferme le panneau, non testé | low | `carteOuverte.set(null)` dans `charger()` sans test | patch |
| 9 | EC-2 : Image liée `abandonnee` ou `supprimee` montrée sans avertissement | low | Ces états n'existent qu'avec l'Epic 3 ; `aRemplacer` déjà dans `deferred-work.md` | rejeté |
| 10 | EC-5 : licence absente des libellés | false | `LIBELLES_LICENCE` est un `Record<Licence, string>` du type généré : une valeur nouvelle casse la compilation | rejeté |
| 11 | EC-6, EC-9, BH-7 : Annuaire en échec → « — » ; collègue arrivé après le chargement → « un ancien membre » | low | Les Images d'un collègue ne deviennent visibles qu'une fois versées (Epic 3) ; aujourd'hui le propriétaire est presque toujours l'enseignant | rejeté |
| 12 | EC-7 : auteur d'Album vide | false | L'auteur est obligatoire à la création et à la correction d'un Album | rejeté |
| 13 | BH-2 : `imageId` figé si l'Image du Mot change, panneau ouvert | false | Aucune action ne change l'Image d'un Mot illustré avant la story 2.7 ; le retrait ferme le panneau | rejeté |
| 14 | BH-3 : Carte lisible hors de la Préparation qui lie l'Image | low | Même règle que `FichiersImages.lire`, choisie par l'intention (`consultable`, lien compris) | rejeté |
| 15 | BH-4 : bords de `consultable` (versée, abandonnée) non testés en API | low | États inaccessibles avant l'Epic 3 ; prédicats couverts par `VisibiliteImagesTest` | rejeté |
| 16 | BH-5 : 404 absent du contrat OpenAPI | false | Aucun endpoint du back ne déclare ses 4xx : convention du projet | rejeté |
| 17 | BH-9 : Sens « à compléter » reconnu par son libellé | low | Une seule comparaison, sur la constante qui crée ce Sens | rejeté |
| 18 | BH-10 : requête de lien inutile pour le propriétaire | low | Une lecture indexée de plus par ouverture | rejeté |
| 19 | BH-12 : journaux de la spec vides | false | Remplis à la fin de la revue | rejeté |
| 20 | BH-13 : `epic-2-context.md` modifié ; `LicenceChoisie` écrit à la main | false | Contexte mis à jour volontairement en étape 1 ; `LicenceChoisie` reste tiré du type généré `Licence` (`Exclude`), toute dérive casse la compilation | rejeté |

## Verification

**Commands:**
- `cd back && ./mvnw -q verify` (JAVA_HOME JDK 25, DOCKER_HOST Podman) -- expected: tous les tests passent, ArchUnit compris, `front/openapi/` à jour.
- `cd front && npm test -- --watch=false && npm run build` -- expected: tests et `verifier-jetons` au vert, paquet initial sous 600 kB.
