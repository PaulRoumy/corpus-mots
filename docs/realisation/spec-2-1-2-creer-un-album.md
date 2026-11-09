---
title: 'Story 2.1, partie 2 : Créer un Album depuis le Dialogue « Nouvelle préparation »'
type: 'feature'
created: '2026-11-09'
status: 'done'
baseline_commit: '4291c0474a832ad2a6976bafbcef591c0c76392a'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/realisation/epic-2-context.md'
  - '{project-root}/docs/realisation/spec-2-1-creer-une-preparation-pour-un-album.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Aucun Album ne peut être créé dans l'application. Un enseignant dont l'Album est introuvable ne peut donc pas commencer sa Préparation (FR-4, UX-DR-24).

**Approach:** Ajouter à `referentiels` la création d'Album et la liste des titres proches. Dans le Dialogue « Nouvelle préparation », la dernière suggestion devient « Créer l'album « … » ». Elle déplie sur place un volet (titre, auteur, éditeur facultatif) qui signale les titres proches avant la création. L'Album créé est aussitôt choisi.

Décision de Paul (découpage de la story 2.1) : un Album de même titre et de même auteur, une fois normalisés, est refusé par `409 album.deja_existant`. Les titres seulement proches restent un avertissement.

Décision de Paul (revue de la partie 1, report dans `deferred-work.md`) : les erreurs du dialogue sont reprises ici. Chaque source a sa propre erreur et son propre « Réessayer » : recherche, Modules, Thèmes, création de Préparation et création d'Album. Un réessai ne s'applique que si l'Album choisi ou le texte cherché n'a pas changé entre-temps. Les chemins d'échec ont leurs tests.

## Boundaries & Constraints

**Always:**
- Normalisation par `TitresAlbums.normaliser`, pour le titre comme pour l'auteur, des deux côtés de chaque comparaison. Le titre enregistré est le texte saisi, espaces réduites et rognées.
- `createurId` vient de `commun.service.EnseignantCourant`. L'Album est visible de toute l'école dès sa création.
- Pas de dialogue sur un dialogue : le volet « Créer l'album » se déplie dans le Dialogue « Nouvelle préparation ». À l'ouverture du volet, le focus va au champ Titre ; à la fermeture, il revient au champ Album.
- Chaque nouveau `code` d'erreur est traduit dans `MESSAGES_PAR_CODE`.

**Never:**
- Pas de correction d'Album (story 2.2, « Corriger l'album »), ni de fusion (Epic 6).
- Ne pas modifier les migrations publiées. Le doublon exact se vérifie dans le service, sans nouvelle colonne.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Titres proches | `GET /api/albums/titres-proches?titre=La Roule Galette` alors que « Roule galette » existe | « Roule galette » est renvoyé (même titre normalisé, ou similarité trigramme ≥ 0,4), 5 au plus, du plus proche au moins proche | titre normalisé de moins de 2 caractères : `[]` |
| Créer | `POST /api/albums {titre: " La  Moufle ", auteur, editeur?}` | 201 `AlbumDto` (titre « La Moufle », `nombreModules` 0), ligne avec `createur_id` de l'enseignant courant | — |
| Champs invalides | titre ou auteur vide, ou de plus de 200 caractères ; éditeur de plus de 200 caractères | 400 `album.titre_invalide` / `album.auteur_invalide` / `album.editeur_invalide`, rien n'est créé | éditeur vide ou blanc enregistré `null` |
| Doublon exact | « LA MOUFLE » / « jan brett » alors que « La Moufle » / « Jan Brett » existe | 409 `album.deja_existant`, rien n'est créé | — |
| Même titre, autre auteur | « La Moufle » / « Florence Desnouveaux » | 201, le premier Album était signalé dans les titres proches | — |

</frozen-after-approval>

## Code Map

- `back/src/main/java/fr/corpusmots/referentiels/service/ReferentielsService.java` -- y ajouter `titresProches(titre)` et `creerAlbum(NouvelAlbumCommande)`. Reprendre le modèle `@Transactional` par méthode et `vue(AlbumTrouve)`.
- `back/src/main/java/fr/corpusmots/referentiels/service/TitresAlbums.java` -- `normaliser`, à réutiliser tel quel pour le titre et l'auteur.
- `back/src/main/java/fr/corpusmots/referentiels/persistance/AlbumRepository.java` -- `COLONNES` / `AlbumTrouve` pour lire avec `nombreModules`, et `SEUIL_SIMILARITE` (0,3) pour la recherche. Ajouter `proches(texte, limite)` (seuil 0,4) et `memeTitre(texte)` (égalité sur `titre_recherche`).
- `back/src/main/java/fr/corpusmots/referentiels/persistance/Album.java` -- n'a qu'un constructeur protégé. Ajouter une fabrique `nouveau(id, titre, titreRecherche, auteur, editeur, createurId)`. L'id est tiré par `select uuidv7()`, comme dans `PreparationRepository.nouvelIdentifiant`.
- `back/src/main/java/fr/corpusmots/referentiels/api/AlbumsResource.java` -- ajouter `POST /albums` et `GET /albums/titres-proches`. Le modèle de POST est `PreparationsResource.creer` : corps nul → `requete.invalide`, `@ResponseStatus(201)`, `@APIResponse`.
- `back/src/main/java/fr/corpusmots/commun/api/ErreursMappers.java` -- `ErreurMetier(409, …)` passe déjà tel quel ; rien à changer.
- `back/src/test/java/fr/corpusmots/referentiels/api/AlbumsResourceTest.java`, `ReferentielsDeTest.java` -- données et style de test à étendre.
- `front/src/app/preparations/nouvelle-preparation-dialogue.ts`, `.scss`, `.spec.ts` -- le dialogue de la partie 1 : `MatAutocomplete`, `rechercheAlbum`, `suggestions`, `aucunAlbum`, `choisirAlbum`, `quitterAlbum`, `erreur`, `montrerErreur`. Le volet s'y ajoute.
- `front/src/app/commun/erreurs/message-erreur.ts`, `message-erreur.spec.ts` -- nouveaux codes.
- `docs/ux-designs/ux-corpus-mots-2026-10-28/.working/key-accueil.html:312-345` -- maquette : dernière option « Créer l'album « Roule gal » » en `primary`, avec pictogramme `plus` et séparateur.

## Tasks & Acceptance

**Execution:**
- [x] `back/src/main/java/fr/corpusmots/referentiels/service/NouvelAlbumCommande.java` -- record `(titre, auteur, editeur)`.
- [x] `back/src/main/java/fr/corpusmots/referentiels/persistance/{Album,AlbumRepository}.java` -- fabrique `Album.nouveau`, `nouvelIdentifiant`, `proches`, `memeTitre`.
- [x] `back/src/main/java/fr/corpusmots/referentiels/service/ReferentielsService.java` -- `titresProches` ; `creerAlbum` : valider (200 caractères au plus après nettoyage), refuser le doublon (même `titre_recherche` et même auteur normalisé), enregistrer, rendre `AlbumVue`. Codes en constantes `CODE_…`.
- [x] `back/src/main/java/fr/corpusmots/referentiels/api/{AlbumsResource,NouvelAlbumDto}.java` -- les deux endpoints (`creerAlbum`, `listerTitresProches`) et le Dto du corps.
- [x] `back/src/test/java/fr/corpusmots/referentiels/api/AlbumsResourceTest.java` -- une ligne de test par ligne de la matrice, y compris « rien n'est créé » sur les refus et le `createur_id`.
- [x] `front/openapi/` -- régénérer par `./mvnw package -DskipTests` et versionner.
- [x] `front/src/app/preparations/nouvelle-preparation-dialogue.ts` + `.scss` -- dernière option de l'autocomplete « Créer l'album « texte » » (pictogramme `plus`, couleur `primary`, séparateur), proposée dès que le texte a 2 caractères, après les suggestions ou après « Aucun album trouvé ». La choisir masque le champ Album et déplie le volet « Créer l'album » : Titre (prérempli avec le texte), Auteur, Éditeur (facultatif). Les titres proches sont chargés à l'ouverture, puis après chaque modification du titre (avec un délai de frappe). Ils sont listés sous « Albums au titre proche » avec « Choisir cet album » pour chacun ; choisir un Album replie le volet et le sélectionne. Boutons « Annuler » (replie sans rien créer) et « Créer l'album » (désactivé tant que titre ou auteur sont vides, ou pendant l'envoi). Une fois l'Album créé, le volet se replie et l'Album est choisi : le champ affiche son titre et les Modules sont chargés. Sur un 409, le message traduit s'affiche et les titres proches sont rechargés. « Créer » (la Préparation) reste désactivé tant que le volet est ouvert.
- [x] `front/src/app/preparations/nouvelle-preparation-dialogue.ts` -- erreurs par source. Remplacer le signal `erreur` unique par une erreur pour chaque source : recherche, Modules, Thèmes, création de Préparation, création d'Album (celle-ci affichée dans le volet). Un succès n'efface que l'erreur de sa propre source. Un « Réessayer » de recherche ne s'applique que si le texte courant est encore celui de l'échec. Un « Réessayer » de Modules ne s'applique que si le même Album est encore choisi ; sinon, l'erreur est simplement effacée. Changer d'Album efface l'erreur des Modules.
- [x] `front/src/app/preparations/nouvelle-preparation-dialogue.spec.ts` -- chemins d'échec : la recherche, les Modules et les Thèmes échouent, chacun affiche son message traduit, et son « Réessayer » renvoie la même requête. Une recherche réussie n'efface pas l'erreur des Thèmes. Un réessai des Modules après un changement d'Album ne charge rien.
- [x] `front/src/app/commun/erreurs/message-erreur.ts` + spec -- `album.titre_invalide` « Saisissez un titre de 1 à 200 caractères. », `album.auteur_invalide` « Saisissez un auteur de 1 à 200 caractères. », `album.editeur_invalide` « Saisissez un éditeur de 200 caractères au plus. », `album.deja_existant` « Cet album existe déjà. Choisissez-le dans la liste des albums au titre proche. ».
- [x] `front/src/app/preparations/nouvelle-preparation-dialogue.spec.ts` -- l'option « Créer l'album », le volet prérempli, les titres proches et leur choix, la création qui choisit l'Album, le 409, « Annuler », le focus.

**Acceptance Criteria:**
- Given un titre introuvable, when l'enseignant choisit « Créer l'album « La Moufle » », then le volet s'ouvre dans le dialogue, avec le Titre prérempli « La Moufle » et le focus dans le Titre.
- Given un Album « Roule galette », when l'enseignant ouvre le volet avec « La roule galette », then « Roule galette » apparaît sous « Albums au titre proche », et « Choisir cet album » le sélectionne sans rien créer.
- Given titre et auteur saisis, when « Créer l'album », then l'Album est choisi dans le champ Album et la Préparation peut être créée avec lui.
- Given le volet ouvert, when « Annuler », then rien n'est créé, le volet se replie et le focus revient au champ Album.

## Implementation Notes

- `TitresAlbums.nettoyer` (espaces réduites et rognées) s'ajoute à côté de `normaliser`, qui l'appelle désormais sans changer de comportement : elle produit le titre, l'auteur et l'éditeur enregistrés.
- Les titres proches ont leur propre erreur, affichée dans le volet avec « Réessayer » (sixième source, en plus des cinq de l'Intent).
- Quitter l'Album en retapant garde l'erreur des Modules ; son « Réessayer » l'efface alors sans rien charger. Choisir un autre Album l'efface aussitôt.
- Pendant la création de l'Album, le dialogue ne se ferme ni par Échap ni par « Annuler », comme pendant la création de la Préparation.
- Jeton `--cm-epaisseur-separateur` (1 px) pour le séparateur de l'option « Créer l'album ». Paquet initial : 593 kB.

## Spec Change Log

## Review Triage Log

Revue 1 (Blind Hunter BH, Edge Case Hunter EC, Verification Gap VG).

| # | Constat | Verdict | Preuve | Suite |
|---|---------|---------|--------|-------|
| 1 | BH-1 : le 409 n'est pas documenté dans le contrat OpenAPI | low | Même convention que le reste du back (partie 1, ligne 13) | rejeté |
| 2 | BH-2 : `openapi.yaml` absent du diff | false | Exclu volontairement du fichier de revue, il figure bien dans l'arbre et sera versionné | rejeté |
| 3 | BH-3 : `similarity()` n'utilise pas l'index trigramme | low | Déjà jugé en partie 1 (ligne 12) : quelques centaines d'Albums | rejeté |
| 4 | BH-4, EC-7 : l'auteur perd son article initial (« La Fontaine » = « Fontaine »), d'où un faux 409 | low | Vrai, mais il faut le même titre normalisé et deux auteurs qui ne diffèrent que par l'article. La règle « `normaliser` pour l'auteur » figure dans le bloc gelé | rejeté (cas très improbable ; à revoir si Paul change la règle) |
| 5 | BH-5, EC-3 : « Réessayer » d'un 409 renvoie la même requête et échoue de nouveau | low | `reessayer: () => creerAlbum()` quel que soit le code ; c'est le chemin normal d'un doublon | patch |
| 6 | BH-6 : pas de test d'autorisation pour `POST /albums` | low | `default-roles-allowed=**` et `FiltreCompteActif` s'appliquent à tout `/api`, et sont déjà testés dans `comptes` | rejeté |
| 7 | BH-7 : Échap ferme tout le dialogue quand le volet est ouvert | low | Comportement standard d'un dialogue ; il faudrait une branche clavier en plus | rejeté |
| 8 | BH-8 : `maxlength` du front porte sur le texte brut, le back compte après nettoyage | low | Seul un texte de 200 caractères collé avec des espaces en trop est touché | rejeté |
| 9 | BH-9 : « 200 », « 0,4 », « 5 » écrits en dur dans les messages | low | Convention existante, sans dérive aujourd'hui | rejeté |
| 10 | BH-10 : `nouvelIdentifiant` dupliqué dans deux Repositories | low | Deux copies d'une ligne ; un utilitaire commun relève d'une autre story | rejeté |
| 11 | BH-11 : tests du back manquants (accents dans les titres proches, `nettoyer`) | low | `normaliser`, qui appelle `nettoyer`, est couvert par `TitresAlbumsTest` | rejeté |
| 12 | BH-13 : le message 409 reste affiché après une correction du titre ou de l'auteur | low | Rien n'efface `erreurAlbum` quand les champs changent | patch |
| 13 | BH-14 : lacunes de la spec | false | Les Implementation Notes consignent la sixième source et `nettoyer` | rejeté |
| 14 | EC-1, EC-2 : « Choisir cet album » pendant la création de l'Album, puis l'Album créé remplace le choix | low | « Choisir cet album » reste actif pendant `creationAlbumEnCours` | patch |
| 15 | EC-4 : un titre périmé recharge les titres proches après fermeture puis réouverture en moins de 250 ms | low | Improbable ; il faudrait une garde en plus | rejeté |
| 16 | EC-5 : les champs restent modifiables pendant la création | low | L'Album créé correspond à ce qui a été envoyé, puis le volet se replie | rejeté |
| 17 | EC-6 : `titre` de longueur illimitée sur `/titres-proches` | low | URL bornée par le serveur HTTP ; utilisateurs authentifiés seulement | rejeté |
| 18 | VG-1 : l'échec des titres proches n'est pas testé | medium | Constat vérifié par la couche VG | patch |
| 19 | VG-2 : échec autre que 409 de la création d'Album et son « Réessayer » non testés | medium | Constat vérifié par la couche VG | patch |
| 20 | VG-3 : verrou de fermeture pendant la création d'Album non testé | medium | Constat vérifié par la couche VG | patch |
| 21 | VG-4 : seuil 0,4 et ordre des titres proches non fixés par les tests | medium | Constat vérifié par la couche VG ; disposition proposée : report | report |
| 22 | VG autre : un commentaire de spec attribue à `voletOuvert()` ce que teste `!complet()` | low | Commentaire trompeur ; correction directe | patch |

## Design Notes

- Doublon exact sans colonne : `memeTitre(titre_recherche)` ramène les quelques Albums de même titre normalisé, et l'auteur est comparé en Java par `TitresAlbums.normaliser`. Deux créations simultanées du même Album peuvent encore passer toutes les deux. C'est accepté : la fusion de l'Epic 6 corrigera ce cas.
- Titres proches : `titre_recherche = :q OR similarity(titre_recherche, :q) >= 0.4`, triés par `similarity` décroissante puis par titre, 5 au plus.

## Verification

**Commands:**
- `cd back && ./mvnw verify` -- expected : vert, ArchUnit compris ; `front/openapi/` réécrit.
- `cd front && npm test -- --watch=false && npm run build` -- expected : vert, `verifier-jetons` compris, paquet initial sous 600 kB.

**Manual checks (if no CLI):**
- Avec `compose.dev.yaml`, `quarkus:dev` et `npm start` : créer un Album depuis le dialogue, essayer de le recréer (409), puis créer une Préparation avec lui.
