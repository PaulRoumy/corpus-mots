---
title: 'Story 2.1, partie 1 : Créer une Préparation pour un Album existant'
type: 'feature'
created: '2026-11-09'
status: 'done'
baseline_commit: '757d63c350684a2f680dbe311eed6a3bdc1c6c22'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/realisation/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** L'enseignant ne peut encore rien préparer : `referentiels` et `preparations` sont vides, le Bouton « + » est désactivé, et l'accueil Préparations ne montre qu'un État vide sans action (FR-4, FR-6).

**Approach:** Poser en lecture les Albums, Modules et Thèmes de `referentiels`, et dans `preparations` la création, la liste des Préparations de l'enseignant et la lecture d'une Préparation. Côté front : le Dialogue « Nouvelle préparation » ouvert depuis le « + » ou l'accueil, les Cartes de Préparation, et une page Préparation réduite à son En-tête.

Décisions de Paul :
1. La story est découpée en deux. « Créer l'album », les titres proches et le refus du doublon forment la partie 2 (`deferred-work.md`).
2. Modules et Thèmes sont posés dès maintenant : tables, lectures et champs facultatifs. Chaque champ est masqué tant que sa liste est vide. Leur création arrive en 2.2.

## Boundaries & Constraints

**Always:**
- Dépendances (AD-1) : `preparations` n'appelle `referentiels` que par `referentiels.service`, avec des records `…Vue`. Entre modules, on se réfère par UUID, sans clé étrangère. Seule `module.album_id → album.id` est une FK.
- Le propriétaire vient de `commun.service.EnseignantCourant`, injecté dans le service.
- La Préparation d'un collègue répond `404 ressource.introuvable`, comme un id inexistant, et n'apparaît dans aucune liste.
- La Section vaut `ps`, `ms` ou `gs` en base, dans l'API et dans le front. Elle s'affiche par le Repère de Section (forme, couleur et libellé), jamais par la couleur seule.
- Pagination : `?page=&taille=` (taille 100 au plus), réponse `{ elements, total }`.
- Chaque nouveau `code` d'erreur est traduit dans `MESSAGES_PAR_CODE`. Textes au vouvoiement, sans point d'exclamation.

**Never:**
- Pas de création d'Album (partie 2), ni création, renommage ou suppression de Module ou de Thème, ni Champ à étiquettes, ni édition de l'En-tête (2.2). Pas de Mots (2.3), ni de menu de Carte (2.10). Les compteurs valent 0.
- Pas de `quarkus-hibernate-validator` (la validation est écrite à la main, comme dans `comptes`), ni de `PanacheEntity`, ni de `@Transactional` sur une classe.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Recherche d'Album | `GET /api/albums?recherche=la roule gal` | Albums dont le titre normalisé contient le texte ou lui ressemble, du plus proche au moins proche, avec `nombreModules` | moins de 2 caractères : `{elements: [], total: 0}` |
| Modules | `GET /api/albums/{id}/modules` | Modules triés par `ordre` | Album inconnu : 404 `ressource.introuvable` |
| Créer | `POST /api/preparations {albumId, section, moduleId?, themeDefautId?}` | 201 `PreparationDto`, propriétaire tiré du jeton | 400 `preparation.section_invalide` / `preparation.album_introuvable` / `preparation.module_invalide` (Module inconnu ou d'un autre Album) / `preparation.theme_introuvable` |
| Dernière Section | `GET /api/preparations/derniere-section` | `{section}` de ma Préparation la plus récente, sinon `{section: null}` | — |
| Lire une Préparation | `GET /api/preparations/{id}` d'un collègue | 404 `ressource.introuvable` | — |

</frozen-after-approval>

## Code Map

- `back/src/main/java/fr/corpusmots/{referentiels,preparations}/*/package-info.java` -- ce sont les seuls fichiers de ces modules.
- `back/src/main/java/fr/corpusmots/comptes/api/EnseignantsResource.java` et `ComptesResource.java:26-51` -- modèle de Resource : `@Operation(operationId)`, `@ResponseStatus(201)`, `@APIResponse`, `Dto.de(vue)`, corps vérifié non nul. Chemins sans `/api`. Pas d'annotation de rôle (`default-roles-allowed=**`).
- `back/src/main/java/fr/corpusmots/comptes/service/ComptesService.java:122-126` -- `@ApplicationScoped`, `@Transactional` par méthode publique, constantes `CODE_…`, `new ErreurMetier(400, CODE, "détail")`.
- `back/src/main/java/fr/corpusmots/comptes/persistance/Enseignant.java`, `EnseignantRepository.java`, `StatutEnseignantConverter.java` -- modèle d'entité JPA simple : constructeur protégé, fabrique statique, accesseurs `id()`, `cree_le` en `@Generated`. Repository `PanacheRepositoryBase<…, UUID>`. Énumération en snake_case par `@Converter(autoApply=true)`.
- `back/src/main/resources/db/migration/V202610301200__commun_extensions.sql` -- `unaccent` et `pg_trgm` y sont déjà créées. `unaccent()` n'étant pas IMMUTABLE, le titre normalisé est stocké dans une colonne.
- `back/src/main/resources/db/migration/V202611021000__comptes_enseignant.sql` -- style à suivre : commentaire citant l'AD, `uuid PRIMARY KEY DEFAULT uuidv7()`, `cree_le timestamptz NOT NULL DEFAULT now()`, `CHECK` nommé.
- `back/src/test/java/fr/corpusmots/architecture/ReglesArchitecture.java:60-70` -- `GRAPHE` autorise déjà `preparations → referentiels`. Rien à changer.
- `back/src/test/java/fr/corpusmots/comptes/api/EnseignantsResourceTest.java:98-104` -- `@TestSecurity` + `@OidcSecurity(sub)`, inserts natifs dans `QuarkusTransaction.requiringNew()`, `ProblemeDto.MEDIA_TYPE`.
- `front/src/app/coquille/coquille.ts:85-95`, `coquille.spec.ts:189-192,~240` -- « + » désactivé. Le modèle à suivre est le `mat-menu` des Notifications et du Profil.
- `front/src/app/preparations/preparations.ts` -- l'accueil actuel, un simple placeholder. `front/src/app/app.routes.ts` -- `withComponentInputBinding` est actif.
- `front/src/app/commun/` -- `EtatVide` (action en `ng-content`), `Squelette` (`forme='carte'`), `BandeauErreur`, `dialogue-confirmation/` (modèle de `MatDialog.open`), `erreurs/message-erreur.ts:19-38`.
- `front/src/app/administration/comptes/comptes.ts`, `comptes.spec.ts:1-80` -- `inject(Api)`, `api.invoke(fn, {…})`, signals. Specs vitest avec `provideHttpClientTesting`, `MATERIAL_ANIMATIONS` désactivées, `stabiliser()`.
- `front/src/styles/_jetons.scss:89-111,167,191` -- `--cm-section-ps|ms|gs`, largeur de dialogue, `--cm-typo-label-sm`. `scripts/verifier-jetons.mjs` refuse toute valeur en dur.
- `docs/ux-designs/ux-corpus-mots-2026-10-28/.working/key-accueil.html:101-175,228-345` et `key-preparation.html` -- maquettes : Carte, dialogue de 480 px, Repère `.sb`, En-tête.

## Tasks & Acceptance

**Execution:**
- [x] `back/src/main/java/fr/corpusmots/commun/service/Section.java` -- énumération `PS, MS, GS` (`ps|ms|gs`) -- elle sera partagée avec `vocabulaire`, d'où une seule déclaration (AD-16).
- [x] `back/src/main/resources/db/migration/V202611091000__referentiels_album.sql` -- tables `album` (id, titre, titre_recherche, auteur, editeur NULL, createur_id, cree_le, index GIN `gin_trgm_ops` sur titre_recherche), `module` (id, album_id FK, nom, ordre, cree_le, UNIQUE(album_id, ordre)) et `theme` (id, nom UNIQUE, cree_le).
- [x] `back/src/main/resources/db/migration/V202611091010__preparations_preparation.sql` -- table `preparation` (id, proprietaire_id, album_id, section CHECK, module_id NULL, theme_defaut_id NULL, cree_le), index (proprietaire_id, cree_le DESC).
- [x] `back/src/main/java/fr/corpusmots/referentiels/{persistance,service,api}/` -- `Album`, `Module`, `Theme` et leurs Repositories. `TitresAlbums.normaliser` : espaces réduites, `’`→`'`, minuscules, accents retirés (NFD), article initial `le|la|les|un|une|des` + espace ou `l'` retiré. `ReferentielsService` : `rechercherAlbums`, `modulesDeLAlbum`, `themes`, et pour `preparations` `album(UUID)`, `albums(Collection<UUID>)`, `module(UUID)`, `theme(UUID)`. `AlbumsResource`, `ThemesResource`. Dto `AlbumDto`, `PageAlbumsDto`, `ModuleDto`, `ThemeDto`.
- [x] `back/src/main/java/fr/corpusmots/preparations/{persistance,service,api}/` -- `Preparation` et son Repository. `PreparationsService` : `creer`, `mesPreparations`, `lire`, `derniereSection`. `PreparationsResource`. Dto `PreparationDto`, `NouvellePreparationDto`, `CartePreparationDto`, `PageCartesPreparationDto`, `DerniereSectionDto`.
- [x] `back/src/test/java/fr/corpusmots/{referentiels,preparations}/` -- tests unitaires de `TitresAlbums` (« La Roule Galette » → « roule galette », « L’Ogre » → « ogre », « Les » seul conservé). `@QuarkusTest` couvrant chaque ligne de la matrice et l'isolement entre deux enseignants. Une classe partagée `EnseignantsDeTest` pour insérer et nettoyer les enseignants (report A-5).
- [x] `front/openapi/` -- régénérer par `./mvnw package -DskipTests` et versionner.
- [x] `front/src/app/commun/repere-section/repere-section.ts` -- `app-repere-section [section]` : badge de 22 px, forme ● ▲ ■ colorée, libellé.
- [x] `front/src/app/preparations/nouvelle-preparation.ts` -- service `NouvellePreparation.ouvrir()` et dialogue de 480 px. Album : `MatAutocomplete`, recherche temporisée à partir de 2 caractères, « n modules » à droite, message « Aucun album trouvé » sinon. Section : `MatButtonToggle` PS/MS/GS, préremplie par `derniere-section`. Module : `mat-select` facultatif, seulement si l'Album a des Modules. Thème par défaut (facultatif) : `mat-select`, seulement s'il existe des Thèmes. Boutons « Annuler » / « Créer » (« Créer » désactivé tant qu'Album et Section manquent). Erreur affichée dans le dialogue avec « Réessayer ». « Créer » navigue vers `/preparations/:id`.
- [x] `front/src/app/coquille/coquille.ts` -- activer le « + » : son menu n'a qu'une entrée, « Nouvelle préparation ».
- [x] `front/src/app/preparations/preparations.ts` -- Cartes de Préparation (titre de l'Album, Repère, Module, « n mots · n à illustrer », lien), Squelettes, Bandeau d'erreur, État vide avec le bouton plein « Nouvelle préparation ».
- [x] `front/src/app/preparations/preparation.ts` et la route `preparations/:id` -- En-tête : titre de l'Album, Repère, Module, Thème par défaut, « 0 mots, 0 déjà illustrés ». En cas d'erreur, message traduit.
- [x] `front/src/app/commun/erreurs/message-erreur.ts`, `front/src/styles/_jetons.scss`, `front/src/app/commun/icones.ts` -- nouveaux codes, jetons et pictogrammes.
- [x] specs vitest de chaque nouveau composant ; dans `coquille.spec.ts`, le menu « + » remplace le test du bouton désactivé.

**Acceptance Criteria:**
- Given un enseignant sans Préparation, when il ouvre le dialogue, then la Section est vide. Given que sa dernière Préparation est en MS, then MS est présélectionné.
- Given un Album qui a des Modules, when l'enseignant ouvre la liste Module, then les Modules apparaissent dans leur ordre.
- Given un dialogue complet, when il choisit « Créer », then la Préparation s'ouvre et l'En-tête affiche l'Album, le Repère de Section, le Module et « 0 mots, 0 déjà illustrés ».
- Given deux enseignants, when chacun ouvre l'accueil, then il ne voit que ses propres Cartes. L'URL d'une Préparation du collègue affiche une erreur.
- Given le clavier seul, then le « + », le dialogue et les Cartes sont atteignables, et le focus revient au déclencheur à la fermeture du dialogue.

## Implementation Notes

- Paquet initial : le dialogue est dans `preparations/nouvelle-preparation-dialogue.ts`, chargé à la demande par le service `NouvellePreparation` (`nouvelle-preparation.ts`), et la route `preparations` passe en `loadComponent`. Sans cela, le paquet initial passait de moins de 600 kB à 837 kB (avertissement du budget) ; il est à 593 kB.
- `ReferentielsService.modules(Collection<UUID>)` s'ajoute aux lectures prévues : la liste des Cartes lit les noms de Module en une requête, sans N+1.
- `commun.service.Pagination` : page à partir de 0, taille 20 par défaut, `400 requete.invalide` hors de 1 à 100 ou pour une page négative.
- `SectionConverter` (dans `preparations.persistance`) s'applique par `@Convert`, pas en `autoApply` : `vocabulaire` pourra déclarer le sien sans conflit.
- `EnseignantsDeTest` (`back/src/test/.../commun/api/`) sert aux nouveaux tests ; les tests de `comptes` gardent leurs insertions natives. `ReferentielsDeTest` insère Albums, Modules et Thèmes en SQL tant que leur création n'existe pas.
- La couverture des Cartes et de l'En-tête montre le pictogramme `livre` sur `tertiary-container` tant qu'il n'y a pas d'Image.

## Spec Change Log

## Review Triage Log

Revue 1 (Blind Hunter BH, Edge Case Hunter EC, Verification Gap VG).

| # | Constat | Verdict | Preuve | Suite |
|---|---------|---------|--------|-------|
| 1 | EC-1, BH-9 : `range(decalage, decalage + taille - 1)` déborde quand `page*taille` approche `Integer.MAX_VALUE` | low | `Pagination.de` borne `page*taille`, pas `page*taille + taille` ; `page=21474836&taille=100` passe la garde et déborde, d'où une 500 au lieu d'une 400 | patch |
| 2 | EC-2 : une Carte garde `moduleId` sans `nomModule` si le Module manque | low | `mesPreparations` passe `preparation.moduleId()` alors que `vue()` passe `module.id()` ; incohérence directe | patch |
| 3 | EC-3, BH-13 : un Album manquant donne une 500 à toute la page | false | Les Albums ne sont jamais supprimés (V1), et la fusion de l'Epic 6 réécrira les Préparations ; l'échec bruyant sur un état inatteignable est voulu | rejeté |
| 4 | EC-4, BH-6 : l'accueil ignore les Préparations au-delà de 100 | medium | `charger()` lit `page 0, taille 100` et ignore `total` ; le critère dit « chacune est affichée » | patch |
| 5 | EC-5 : deux « Réessayer » de l'accueil en vol, la plus ancienne réponse gagne | low | Les deux réponses portent la même liste ; il faut une garde pour un cas improbable | rejeté |
| 6 | EC-6 : l'échec du chargement du dialogue (`import()`) ne donne aucun retour | low | Seulement après un redéploiement pendant une session ; il faut ajouter un traitement d'erreur et un affichage | rejeté |
| 7 | EC-7, BH-4 : un double clic ouvre deux dialogues empilés | medium | `ouvrir()` attend `import()` avant `MatDialog.open`, sans garde ; un double clic suffit, et il enfreint « pas de dialogue sur un dialogue » | patch |
| 8 | EC-8, BH-3 : Échap ou « Annuler » pendant la création ferme le dialogue, la Préparation est créée sans navigation | low | `mat-dialog-close` reste actif et `disableClose` est faux pendant `envoiEnCours` | patch |
| 9 | EC-9, EC-10, EC-11, BH-1, BH-2, VG autre 1 : erreur unique du dialogue (une recherche réussie efface l'erreur des Thèmes ou des Modules, réessais périmés après changement d'Album ou de texte) | low | Réel, mais il faut d'abord qu'un chargement secondaire échoue ; la correction demande des erreurs par source | rejeté (contexte joint au report de la ligne 15) |
| 10 | BH-5 : aucune explication pour « Créer » désactivé | low | Les indications « Tapez au moins 2 lettres du titre » et les étiquettes existent déjà ; il faudrait de l'interface en plus | rejeté |
| 11 | BH-7 : la 404 propose « Réessayer » sans retour à l'accueil | low | Message générique existant de `ressource.introuvable`, le critère « affiche une erreur » est tenu ; il faudrait une branche de plus | rejeté |
| 12 | BH-8 : `similarity()` n'utilise pas l'index trigramme | low | Vrai, mais il s'agit de quelques centaines d'Albums par école ; la requête est celle des Design Notes | rejeté |
| 13 | BH-10 : réponses d'erreur absentes du contrat OpenAPI | low | Même convention que `ComptesResource` (aucune 4xx documentée) | rejeté |
| 14 | BH-11 : le test dit « accents » sans accent dans les données | low | `AlbumsResourceTest` n'a aucun titre accentué ; correction directe | patch |
| 15 | BH-12 : cas limites du back sans test (UUID mal formé, `l'`, Module manquant) | low | UUID mal formé : mapper existant ; « l' » normalisé reste « l' » et cherche ce qui a été tapé ; Module manquant inatteignable avant la 2.2 | rejeté |
| 16 | BH-14 : titre d'onglet générique sur `/preparations/:id` | low | Le titre de route est statique ; il suffit d'un `Title.setTitle` au chargement | patch |
| 17 | BH-15 : `requete.invalide` écrit en dur | low | Même forme que `ComptesResource:86` ; convention existante | rejeté |
| 18 | VG-1 : la vraie route `preparations/:id` n'est jamais parcourue en test | medium | Constat vérifié par la couche VG | patch |
| 19 | VG-2 : changement de l'`id` et réponse périmée non testés | medium | Constat vérifié par la couche VG | patch |
| 20 | VG-3 : retaper après le choix d'un Album n'est pas testé | medium | Constat vérifié par la couche VG | patch |
| 21 | VG-4 : chemins d'échec du dialogue (recherche, Modules, Thèmes) non testés | medium | Constat vérifié par la couche VG ; disposition proposée : report | report (avec la ligne 9) |
| 22 | VG autre 2 : « 0 module » mais « 0 mots » | low | `libelleModules` teste `> 1`, les autres `=== 1` ; correction directe | patch |

## Design Notes

- Recherche : `titre_recherche LIKE '%' || :q || '%' OR similarity(titre_recherche, :q) >= 0.3`, triée par `similarity` décroissante puis par titre. `:q` passe par `TitresAlbums.normaliser`, la même fonction qui remplit `titre_recherche`. La partie 2 la réutilisera pour les titres proches.
- `TitresAlbums` reste dans `referentiels` : `Lexique` (2.3) appartient à `vocabulaire`, que `referentiels` n'a pas le droit d'appeler.
- `Section` est dans `commun.service` parce que `preparations` et `vocabulaire` l'utilisent tous les deux. Les Dto l'exposent par `@Schema(enumeration = {"ps","ms","gs"})`.

## Verification

**Commands:**
- `cd back && ./mvnw verify` -- expected : tests verts, ArchUnit compris ; `front/openapi/openapi.json` réécrit.
- `cd front && npm test -- --watch=false && npm run build` -- expected : vert, `verifier-jetons` compris.

**Manual checks (if no CLI):**
- Avec `compose.dev.yaml`, `quarkus:dev` et `npm start` : insérer un Album en SQL, créer une Préparation, vérifier l'En-tête, puis l'accueil avec un deuxième compte.
