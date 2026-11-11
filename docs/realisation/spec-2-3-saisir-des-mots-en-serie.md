---
title: 'Story 2.3, partie 1 : Saisir des Mots en série'
type: 'feature'
created: '2026-11-11'
status: 'done'
baseline_commit: 'f0c807049a9b28f356546d10128c86cf1de4193c'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/realisation/epic-2-context.md'
  - '{project-root}/docs/realisation/spec-2-2-2-modules.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Une Préparation n'a encore aucun Mot : l'enseignant ne peut pas dresser la liste du vocabulaire de l'album (FR-6, story 2.3).

**Approach:** Poser le module `vocabulaire` (Lexique, Mots, Sens, registre `sens_retenu` par `Usages`, AD-10, AD-14, AD-19) et `preparation_mot` dans `preparations`. Sous l'En-tête, un Champ de saisie rapide ajoute chaque Mot tapé suivi d'Entrée ; une Carte « à illustrer » apparaît en fin de Grille et le compteur de l'En-tête suit.

Décision de Paul : la story 2.3 est découpée. Le retrait d'un Mot avec « Annuler » (partie 2) et le Thème de chaque Mot (partie 3) sont dans `deferred-work.md`.

Décision de Paul : un Mot déjà présent dans la Préparation n'est pas ajouté une seconde fois (`409 preparation.mot_deja_present`) ; le champ garde la saisie et affiche « Ce mot est déjà dans la préparation. ».

## Boundaries & Constraints

**Always:**
- `Lexique.normaliser` est la seule normalisation : espaces réduites et rognées, `’` → `'`, article initial `le|la|les|un|une|des` suivi d'une espace, ou `l'`, retiré ; un article seul (« des ») est gardé. `forme` = première forme saisie normalisée ; `forme_cle` = minuscules NFC avec accents, unique ; `forme_recherche` = `unaccent(forme_cle)`, index `pg_trgm`.
- `obtenirOuCreerMot` et `obtenirOuCreerSens` sont idempotentes (`INSERT … ON CONFLICT DO NOTHING` puis relecture), sans erreur de doublon, même en parallèle.
- Sens retenu par `Usages.retenirSens` : le Sens que l'enseignant a retenu le plus récemment pour ce Mot dans ses Préparations ; sinon un Sens « à compléter » (catégorie absente), obtenu ou créé. Jamais le Sens d'un collègue (AD-2).
- Seul le propriétaire ajoute ou lit les Mots de sa Préparation (`404 ressource.introuvable` sinon). Mot, Sens retenu et ligne de Préparation sont écrits dans une même transaction ouverte par `preparations`.
- Chaque nouveau `code` d'erreur est traduit dans `MESSAGES_PAR_CODE`.

**Never:**
- Pas de détection pendant la frappe (2.7), de suggestions ARASAAC (2.4), de « Téléverser » (2.5), de choix du Sens (2.8), de retrait d'un Mot (partie 2), de Thème par Mot (partie 3), de `lien_image` ni d'Image.
- `vocabulaire` n'appelle jamais `preparations` ; aucune clé étrangère entre modules.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Ajouter | `POST /api/preparations/{id}/mots {saisie: " La  citrouille "}` | 201 Mot de Préparation : `forme` « citrouille », Sens « à compléter », dernier `ordre` + 1 ; `nombreMots` de la Préparation + 1 | — |
| Mot existant | « Citrouille » déjà créé par un collègue (avec son Sens) | même `motId`, Sens « à compléter » pour moi (pas celui du collègue), aucune erreur | — |
| Sens déjà retenu | le Mot figure dans une autre de mes Préparations avec le Sens S | Sens S retenu | — |
| Lexique | « côte » / « côté » ; « l’arbre » ; « Lapin » / « lapin » ; « des » | deux Mots ; « arbre » ; même Mot ; « des » | — |
| Doublon | Mot déjà dans la Préparation, à la casse ou à l'article près | 409 `preparation.mot_deja_present`, rien n'est ajouté | — |
| Saisie invalide | vide, blanche, ou plus de 100 caractères une fois normalisée | 400 `preparation.mot_invalide`, rien n'est ajouté | — |
| Préparation d'un collègue | `POST` ou `GET /api/preparations/{id}/mots` | 404 `ressource.introuvable` | — |
| Lister | `GET /api/preparations/{id}/mots` | Mots dans l'ordre de saisie, avec `forme`, Sens et `illustre: false` | — |

</frozen-after-approval>

## Code Map

- `back/src/main/java/fr/corpusmots/vocabulaire/{api,service,persistance}/package-info.java` -- module vide à remplir ; graphe ArchUnit : `preparations` → `vocabulaire` → `referentiels` (`architecture/ReglesArchitecture.java:60-70`), records `…Vue`/`…Commande` aux frontières.
- `back/src/main/resources/db/migration/V202610301200__commun_extensions.sql` -- `unaccent` et `pg_trgm` déjà installées.
- `back/src/main/java/fr/corpusmots/referentiels/service/TitresAlbums.java` -- modèle de normalisation (espaces, apostrophes, article) ; ne pas le réutiliser pour les Mots (AD-10 : fonction propre au Lexique, accents gardés dans `forme_cle`).
- `back/src/main/java/fr/corpusmots/preparations/service/PreparationsService.java` -- `mienne(id)` (404), `vue()` ; `nombreMots`/`nombreIllustres` codés à `0, 0` (l. 113 et 171) : compter les Mots, `nombreIllustres` reste 0 avant la story 2.4.
- `back/src/main/java/fr/corpusmots/preparations/api/PreparationsResource.java` + `PreparationsResourceTest`, `ReferentielsDeTest`, `EnseignantsDeTest` -- modèle de Resource et de tests.
- `front/src/app/preparations/preparation.ts` -- page de la Préparation (En-tête seul aujourd'hui), compteur `libelleMots`/`libelleIllustres`, chargement gardé par `dernierChargement`, Bandeaux d'erreur.
- `front/src/styles/_jetons.scss` -- `--cm-etat-a-illustrer-{fond,texte,bordure}`, `--cm-largeur-carte-min`, `--cm-typo-word-cursive`, `--cm-police-cursive`.
- `docs/ux-designs/ux-corpus-mots-2026-10-28/DESIGN.md:355,360-362`, `.working/key-preparation.html:345-357` -- Champ de saisie rapide (« Ajouter un mot », aide « Entrée pour ajouter »), Grille auto-fill, Carte « à illustrer » (bordure tirets, vignette vide « + », Mot en cursive, badge crayon « à illustrer »).

## Tasks & Acceptance

**Execution:**
- [x] `back/src/main/resources/db/migration/V202611111000__vocabulaire_mot_sens.sql` -- `mot` (`forme`, `forme_cle` unique, `forme_recherche` + index GIN trigrammes), `sens` (`mot_id` FK, `libelle`, `libelle_cle`, `categorie` NULL, unique `(mot_id, libelle_cle)`), `sens_retenu` (`preparation_id`, `preparation_mot_id` unique, `sens_id` FK, `enseignant_id`, `album_id`, `section`, `cree_le`).
- [x] `back/src/main/resources/db/migration/V202611111010__preparations_preparation_mot.sql` -- `preparation_mot` (`preparation_id` FK, `mot_id` sans FK, `ordre`, `cree_le`, uniques `(preparation_id, ordre)` et `(preparation_id, mot_id)`).
- [x] `back/src/main/java/fr/corpusmots/vocabulaire/service/{Lexique,Usages,MotVue,SensVue,RetenirSensCommande}.java` + `persistance/` -- `Lexique.normaliser`, `obtenirOuCreerMot`, `obtenirOuCreerSens`, `sensRetenus(preparationMotIds)` ; `Usages.retenirSens` ; transactions rejointes (`@Transactional`).
- [x] `back/src/main/java/fr/corpusmots/preparations/{persistance,service,api}/` -- entité et Repository `PreparationMot` ; `PreparationsService.ajouterMot(id, saisie)` (404, 400, Mot, 409 si déjà présent, ligne en fin, `retenirSens`) et `motsDe(id)` ; `POST` et `GET /preparations/{id}/mots` (`ajouterMotPreparation`, `listerMotsPreparation`), corps nul → `requete.invalide` ; `nombreMots` réel.
- [x] `back/src/test/java/fr/corpusmots/vocabulaire/service/LexiqueTest.java` -- jeu partagé d'AD-10 (normalisation pure) et idempotence en parallèle (`@QuarkusTest`, deux appels simultanés, un seul Mot).
- [x] `back/src/test/java/fr/corpusmots/preparations/api/MotsPreparationResourceTest.java` -- une ligne de test par ligne de la matrice, « rien n'est ajouté » relu en base ; compteur de `GET /preparations/{id}` et des Cartes.
- [x] `front/openapi/` -- régénérer et versionner.
- [x] `front/src/app/preparations/{saisie-rapide,carte-mot}.ts` (+ `.scss`, specs) et `preparation.ts` -- sous l'En-tête : Champ de saisie rapide (focus dès l'affichage si la Préparation n'a aucun Mot) ; Entrée envoie la saisie non vide, vide aussitôt le champ et garde le focus ; envois un à un dans l'ordre de frappe ; Grille des Mots chargée avec la Préparation, Carte « à illustrer » ajoutée en fin sans prendre le focus ; compteur mis à jour. Sur 409, message sous le champ et saisie remise dans le champ s'il est vide ; autre échec : Bandeau d'erreur nommant le Mot, « Réessayer » le renvoie.
- [x] `front/src/app/commun/erreurs/message-erreur.ts` + spec -- `preparation.mot_deja_present` « Ce mot est déjà dans la préparation. », `preparation.mot_invalide` « Saisissez un mot de 1 à 100 caractères. ».
- [x] `docs/realisation/deferred-work.md` -- marquer « brancher `Usages.changerContextePreparation` sur le changement de Module » sans objet (voir Design Notes).

**Acceptance Criteria:**
- Given une Préparation sans Mot, when elle s'affiche, then le Champ de saisie rapide a le focus et affiche « Entrée pour ajouter ».
- Given « la citrouille » puis Entrée, then une Carte « citrouille » « à illustrer » apparaît en fin de Grille, le champ est vide et garde le focus, et l'En-tête affiche « 1 mot, 0 déjà illustré ».
- Given trois Mots tapés vite à la suite, then les trois Cartes apparaissent dans l'ordre de frappe, et le même ordre est relu après rechargement.

## Implementation Notes

- Ordre des refus de `POST /preparations/{id}/mots` : 404 (Préparation verrouillée par `SELECT … FOR UPDATE`, pour la place en fin et le doublon), puis 400 (saisie normalisée vide ou de plus de 100 caractères, `saisie` absente comprise), puis Mot obtenu ou créé, puis 409. Corps nul : `requete.invalide`.
- `Lexique.normaliser` est statique (fonction pure, comme `TitresAlbums`) ; l'article est reconnu sans tenir compte de la casse (« LES enfants » → « enfants ») et la forme est mise en NFC. Clé du libellé d'un Sens : espaces réduites, apostrophe unifiée, minuscules NFC (sans retrait d'article). `forme_recherche` est calculée par `unaccent(:cle)` dans l'`INSERT`.
- `Usages.retenirSens` lit l'enseignant par `EnseignantCourant` (jamais en paramètre) ; `RetenirSensCommande` porte Préparation, Mot de Préparation, Mot, Album et Section. Le Sens « à compléter » d'un Mot est une seule ligne `sens` (unique par libellé), partagée par tous ceux qui n'ont retenu aucun autre Sens.
- `sensRetenus(preparationMotIds)` et `mots(ids)` sont dans `Lexique`, lus par `PreparationsService.motsDe`.
- `preparation_mot.preparation_id` est en `ON DELETE CASCADE` (même module) : les tests qui effacent `preparation` restent valables, et la suppression d'une Préparation (2.10) libérera ses usages avant.
- Accueil : `nombreAIllustrer` = `nombreMots` tant qu'aucun Mot n'a d'Image (2.4).
- Front : la saisie et la Grille s'affichent une fois les Mots chargés (squelette avant, Bandeau `erreur-mots` en échec) ; le compteur de l'En-tête suit la Grille chargée. File d'envoi dans `Preparation` (un envoi à la fois) ; les Mots en échec (hors 409) s'accumulent dans un seul Bandeau qui les nomme, « Réessayer » les remet en file. Dernier Mot ajouté annoncé dans une région `aria-live` polie. `libelleIllustres` s'accorde avec le nombre de Mots quand il n'y a aucun Mot illustré, pour « 1 mot, 0 déjà illustré » (critère d'acceptation) sans changer « 0 mots, 0 déjà illustrés ».
- Page Données personnelles : « vos Préparations et leurs Mots ; un Mot tapé rejoint le lexique de l'école, sans nom d'auteur, et y reste après la suppression du compte ».

## Spec Change Log

## Review Triage Log

Revue 1 (Blind Hunter BH, Edge Case Hunter EC, Verification Gap VG).

| # | Constat | Verdict | Preuve | Suite |
|---|---------|---------|--------|-------|
| 1 | VG-1 : la règle « le plus récent » de `dernierRetenu` n'est testée qu'avec un seul Sens | medium | Constat vérifié par la couche VG | patch |
| 2 | VG-2 : `nombreMots` de la réponse de `reglages` jamais testé avec des Mots | medium | Constat vérifié par la couche VG | patch |
| 3 | VG autre, EC-5, BH-1 : `maxlength` sur la saisie brute bloque un Mot de 98 à 100 caractères tapé avec son article | low | Correction directe de la limite du champ | patch |
| 4 | BH-3, EC claim : sur 409 pendant la frappe du Mot suivant, le message ne nomme pas le Mot refusé, qui est perdu | medium | Cas courant en saisie rapide ; nommer le Mot suffit | patch |
| 5 | BH-4 : la page Données personnelles se contredit (Mots gardés, données effacées) | medium | Section « Combien de temps » non reprise | patch |
| 6 | BH-6 : le commentaire de la migration `preparation_mot` décrit au présent une libération qui n'existe pas | low | Migration pas encore publiée ; correction directe | patch |
| 7 | BH-13 : `viderLeLexique` laisse des `preparation_mot` qui pointent vers des Mots effacés | low | Risque de 500 selon l'ordre des tests ; correction directe | patch |
| 8 | BH-5 : `sens_retenu` orphelins à la suppression d'une Préparation (cascade sur `preparation_mot` seulement) | medium | `libererPreparation` n'existe pas avant la story 2.10 ; aucune suppression de Préparation dans l'application | report |
| 9 | BH-7 : `sens_retenu.album_id` copié, à réécrire lors d'une fusion d'Albums | low | Epic 6 ; à prévoir avec `AlbumsFusionnes` | report |
| 10 | VG-3, BH-11 : verrou des ajouts simultanés sur une Préparation non testé | low | Deux onglets en même temps ; le front sérialise dans un onglet ; test à verrous de plus | rejeté |
| 11 | BH-2, EC-2 : 400 et 404 d'un ajout partent dans le Bandeau avec « Réessayer » | low | Saisie vide jamais envoyée, Préparation non supprimable avant 2.10 | rejeté |
| 12 | BH-8 : entrées de `deferred-work.md` en `source_spec: none` | false | Format prescrit par le découpage à l'étape de cadrage, avant la spec | rejeté |
| 13 | BH-9 : pas de contrôle en base de la longueur de `forme`, des catégories ni de `ordre > 0` | low | Règles portées par le service, seul écrivain | rejeté |
| 14 | BH-10 : index de `dernierRetenu` sans `mot_id` | low | Volume d'un enseignant ; à revoir avec la détection (2.7) | rejeté |
| 15 | BH-12 : le test de concurrence du Lexique repose sur une attente de 500 ms | low | Le test passe avec la contrainte présente ; le rendre déterministe demande `pg_locks` | rejeté |
| 16 | BH-14 : `aria-describedby` posé à la main sur le `matInput` | low | Aucun `mat-hint` ni `mat-error` aujourd'hui | rejeté |
| 17 | BH-15 : normalisation et contrôle de longueur faits deux fois | low | Même fonction, sans divergence | rejeté |
| 18 | EC-1 : réponse perdue après enregistrement, « Réessayer » reçoit 409 | low | Cas réseau rare ; recharger la page rétablit la Grille | rejeté |
| 19 | EC-3, EC-4 : changement de Préparation pendant la file d'envoi | low | La file se vide en quelques millisecondes | rejeté |
| 20 | EC-6 : saisie décomposée (NFD) plus longue que sa forme NFC | low | Cas rare ; corrigé en partie par la limite élargie (ligne 3) | rejeté |
| 21 | EC-7 : plusieurs échecs de causes différentes dans un seul Bandeau | low | Le dernier message s'applique le plus souvent à tous (réseau) | rejeté |
| 22 | EC-8 : apostrophes autres que `’` non unifiées | low | AD-10 ne cite que `’` ; l'étendre change la règle d'architecture | rejeté |

## Design Notes

- `sens_retenu` n'a pas de colonne Module (AD-14) : un changement de Module ne touche aucun usage. `changerContextePreparation` (Album, Section) n'a pas d'appelant avant la duplication (story 2.10) et n'est pas écrit ici ; l'entrée de `deferred-work.md` issue de la partie 1 de la story 2.2 devient sans objet.
- Le Mot affiché est `mot.forme`, première forme saisie dans l'école : seul le Sens est propre à l'enseignant.

## Verification

**Commands:**
- `cd back && ./mvnw verify` -- expected : vert, ArchUnit compris ; `front/openapi/` réécrit.
- `cd front && npm test -- --watch=false && npm run build` -- expected : vert, `verifier-jetons` compris, paquet initial sous 600 kB.

**Manual checks (if no CLI):**
- Avec `compose.dev.yaml`, `quarkus:dev` et `npm start` : taper une dizaine de Mots à la suite au clavier, recharger, vérifier l'ordre et le compteur.
