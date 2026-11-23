---
title: 'Story 3.1, partie 1 : la grille de la Banque, ouverte sur Mes mots'
type: 'feature'
created: '2026-11-23'
status: 'done'
baseline_commit: 'c37ddc409bdc4e5d34070cf52edd153bb254c027'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/realisation/epic-3-context.md'
  - '{project-root}/docs/architecture/architecture-corpus-mots-2026-10-29/ARCHITECTURE-SPINE.md'
  - '{project-root}/docs/ux-designs/ux-corpus-mots-2026-10-28/.working/key-banque.html'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** La rubrique Banque n'est qu'un état vide (`front/src/app/banque/banque.ts`), et aucune route ne liste les Images. L'enseignant ne peut donc ni retrouver ses Images ni voir celles que l'école a versées (FR-18). Il faut une Banque unique qui sépare toujours son travail de celui des collègues.

**Approach:** Une route paginée `GET /api/images` filtrée par provenance, dont la règle de visibilité est décidée par `VisibiliteImages` (AD-2). Une page Banque chargée à la demande affiche une grille d'Images regroupée par Mot et par Sens, avec une Puce de filtre de provenance, Mes mots par défaut. La partie 2 ajoutera l'ouverture de la Carte d'identité au clic sur une vignette.

Décisions :
- **Route :** `GET /api/images?provenance=mes-mots|banque|tout&page=&taille=`, réponse `{ elements, total }` (spine, « Listes »).
  - `provenance` vaut `mes-mots` par défaut.
  - `taille` vaut 100 par défaut, et 100 au plus.
  - `page` commence à 0.
  - Une provenance inconnue ou une `taille` hors bornes donne `400 requete.invalide`.
- **Provenances**, pour l'enseignant connecté E :
  - `mes-mots` : les Images dont E est propriétaire, d'état `privee` ou `versee`.
  - `banque` : les Images `versee`, quel que soit le propriétaire.
  - `tout` : l'union des deux.
  - Aucune Image `privee` d'un collègue n'apparaît jamais, et les états `abandonnee` et `supprimee` n'apparaissent pas.
  - Un lien vers une Image ne la fait pas apparaître : la règle est celle de `proposable`, restreinte au propriétaire pour `mes-mots`.
- **Visibilité :** le critère de provenance est écrit dans `vocabulaire.service.VisibiliteImages`, sous une forme utilisable par la requête paginée (condition et paramètres). Il ne doit être écrit nulle part ailleurs (AD-2). Pour la performance, le filtrage et la pagination se font en base.
- **Élément renvoyé**, nommé `ImageBanqueDto` (AD-16) : `id`, `proprietaireId`, `versee` (booléen), `typeImage`, `sections`, et le Mot et le Sens (`motId`, `forme`, `sensId`, libellé du Sens, catégorie grammaticale).
  - Ordre : forme du Mot (ordre alphabétique français, sans tenir compte de la casse ni des accents), puis Sens, puis date de création (plus récente d'abord), puis `id`.
  - Cet ordre garde les Images d'un même Mot et d'un même Sens contiguës d'une page à l'autre.
- **Page Banque** (`/banque`, chargée à la demande par `loadComponent`, hors du paquet initial) :
  - **En-tête :** « Banque » et le nombre total d'Images de la provenance.
  - **Provenance :** une Puce de filtre en choix unique « Mes mots / Banque de l'école / Tout ». Elle est reflétée dans l'URL (`?provenance=mes-mots|banque|tout`) ; une valeur absente ou inconnue vaut `mes-mots`.
  - **Grille :** regroupée par Mot et par Sens, selon la maquette `key-banque.html`. Chaque groupe a un en-tête « forme (libellé du Sens) catégorie · n images », où n compte les Images chargées du groupe. Suivent les vignettes.
  - **Vignette :**
    - la miniature est chargée par `image-securisee` (`taille=miniature`) ;
    - dessous, les Repères de Section et le Badge de type d'image ;
    - le Badge d'état « versée » quand c'est le cas ;
    - le propriétaire, résolu par `Annuaire` (AD-20), affiché « vous » pour l'enseignant connecté. Un propriétaire absent de l'annuaire est affiché « ancien compte ».
  - **Chargement :** les 100 premières Images d'abord, puis un bouton « Afficher plus » sous la grille, tant que des Images restent à charger. La page suivante est ajoutée à la suite.
  - **Pendant le chargement :** des vignettes squelettes, ou une rangée de squelettes pour « Afficher plus ».
  - **En échec :** un Bandeau d'erreur avec « Réessayer ».
  - **Changement de provenance :** la liste repart de la première page. Une réponse arrivée pour une provenance quittée depuis n'écrit rien.
  - **Mes mots vide :** l'État vide « Aucune image dans Mes mots. » propose « Ajouter une image », qui ouvre `AjouterImage`. La Banque est rechargée si une Image est enregistrée.
  - **Banque de l'école ou Tout vides :** l'État vide « Aucune image. », sans action.
- Ne sont pas couverts ici : les autres filtres (Section, Thème…, story 3.2), la sélection, et la Carte d'identité (partie 2). La vignette n'est pas encore cliquable.

## Boundaries & Constraints

**Always:**
- Le filtrage des Images ne vit que dans `VisibiliteImages` (AD-2), et un test d'intégration vérifie, pour les trois provenances, qu'une Image `privee` d'un collègue n'apparaît jamais.
- Test de performance (`@QuarkusTest`) : avec 500 Images en base, la première page de la Banque répond en moins de 2 s (NFR-4) ; la requête est paginée en base, sans N+1.
- Contrat : `./mvnw package -DskipTests`, puis versionner `front/openapi/` ; le front passe par le client généré (AD-7).
- Paquet initial sous 600 kB : la Banque est chargée à la demande.
- Textes en français, au vouvoiement ; jetons de DESIGN.md ; aucune ressource tierce.
- Le module `vocabulaire` n'appelle aucun autre module pour cette route ; les noms des propriétaires sont résolus par le front (AD-20).

**Never:**
- Aucune migration de schéma, sauf un index nécessaire à la performance (migration nouvelle `V<AAAAMMJJHHMM>__vocabulaire_<objet>.sql`).
- Pas de filtrage de visibilité côté front ni dans un Repository hors du critère de `VisibiliteImages`.
- Pas de taille de page au-delà de 100.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Ouverture | `/banque` | Provenance Mes mots sélectionnée ; Images de l'enseignant, versées ou non, « versée » sur les versées | N/A |
| Banque de l'école | Puce « Banque de l'école » | Images versées de tous, propriétaire affiché ; URL `?provenance=banque` | N/A |
| Tout | Puce « Tout » | Mes Images + versées des collègues | N/A |
| Image privée d'un collègue | Image `privee` d'un collègue, liée ou non dans une de mes Préparations | Absente des trois provenances | N/A |
| Abandonnée ou supprimée | Image `abandonnee` ou `supprimee` (y compris la mienne) | Absente | N/A |
| Plus de 100 Images | 230 Images | 100 affichées, « Afficher plus » → 200, puis → 230, bouton masqué | Échec d'« Afficher plus » : Bandeau d'erreur, Images déjà chargées conservées |
| Groupe à cheval | Images d'un même Sens sur deux pages | Un seul groupe après « Afficher plus » | N/A |
| Changement rapide | Mes mots puis Tout avant la réponse | Seule la liste de Tout s'affiche | N/A |
| Mes mots vide | Aucune Image | « Aucune image dans Mes mots. » + « Ajouter une image » ; après ajout, la Banque se recharge | N/A |
| Paramètre invalide | `provenance=autre` ou `taille=101` | `400 requete.invalide` | Front : jamais envoyé ; `?provenance=` inconnue dans l'URL vaut Mes mots |
| Propriétaire inconnu de l'annuaire | `proprietaireId` absent | « ancien compte » | N/A |
| Performance | 500 Images en base | Première page < 2 s | N/A |

</frozen-after-approval>

## Code Map

- `back/src/main/java/fr/corpusmots/vocabulaire/service/VisibiliteImages.java` -- critère de provenance.
- `back/src/main/java/fr/corpusmots/vocabulaire/service/Images.java`, `persistance/ImageRepository.java` -- requête paginée (jointure Mot, Sens ; sections, type).
- `back/src/main/java/fr/corpusmots/vocabulaire/api/ImagesResource.java` -- `GET /images` (`listerImagesBanque`), `ImageBanqueDto`, réponse paginée (voir les listes paginées existantes pour la forme `{ elements, total }`).
- `front/src/app/app.routes.ts` -- `banque` en `loadComponent`.
- `front/src/app/banque/banque.ts` (+ spec) -- page ; composants partagés : `commun/image-securisee`, `commun/badge-type-image`, `commun/repere-section`, `commun/etat-vide`, `commun/squelette`, `commun/bandeau-erreur`, `commun/annuaire.ts`, `preparations/ajouter-image.ts`.
- Maquette : `docs/ux-designs/ux-corpus-mots-2026-10-28/.working/key-banque.html` (partie gauche, sans les filtres de la story 3.2).

## Tasks & Acceptance

**Execution:**
- [ ] Back : critère de provenance dans `VisibiliteImages`, requête paginée, route, DTO, tests (`@QuarkusTest` provenances et confidentialité, paramètres invalides, ordre, performance 500 Images).
- [ ] Contrat : `front/openapi/` régénéré et versionné.
- [ ] Front : route en `loadComponent`, page Banque (puce de provenance liée à l'URL, grille groupée, vignettes, « Afficher plus », squelettes, erreur, États vides, ajout), spec.

**Acceptance Criteria:**
- Given un enseignant et un collègue ayant chacun des Images privées et versées, when l'enseignant ouvre chaque provenance, then il voit exactement les Images de la matrice, avec leur propriétaire, et jamais une Image privée du collègue.
- Given 500 Images, when la Banque se charge, then la première page arrive en moins de 2 s avec des miniatures, et « Afficher plus » charge la suite.

## Implementation Notes

Vérification à la clôture : front 839 tests, paquet initial 598,99 kB (Banque chargée à part), ArchUnit vert ; les `@QuarkusTest` (dont `BanqueImagesResourceTest`) n'ont pas tourné en local (pipe Docker de la machine Podman absent) et restent à confirmer par la CI.

## Spec Change Log

## Review Triage Log

Revue 1 (Blind Hunter BH, Edge Case Hunter EC, Verification Gap VG).

| # | Constat | Verdict | Preuve | Suite |
|---|---------|---------|--------|-------|
| 1 | EC-2, EC-8, BH-13 : échec de la première page puis Bandeau fermé, page vide sans « Réessayer » | medium | Plus aucune action sauf recharger la page | patch |
| 2 | EC-4 : « vous » remplacé par le nom tant que le compte n'est pas chargé | low | Propriété mal dite un instant | patch |
| 3 | EC-3, BH-14 : tout ajout remet la Banque à la page 0, même en Banque de l'école | low | Pages chargées perdues sans raison | patch |
| 4 | EC-5, BH-6 : total et page lus par deux requêtes | low | En-tête inférieur au nombre de vignettes | patch (au moins le nombre chargé) |
| 5 | BH-12, EC-7 : focus perdu sur « Afficher plus », rien d'annoncé ; squelettes de forme carte | medium | Clavier renvoyé au `body` | patch |
| 6 | VG-1, VG-2 : compteur d'ajouts réel, doublon entre pages, page courte non testés | medium | Régressions silencieuses | patch (tests) |
| 7 | BH-1, BH-2 : `pageBanque` accepte une condition SQL de n'importe quel appelant ; noms de paramètres réservés | medium | AD-2 tenu par la seule javadoc | patch (ArchUnit, garde) |
| 8 | BH-3, EC-6 : ordre dépendant de la collation de l'hôte | low | Ordre différent d'un hôte à l'autre | patch (`COLLATE "C"` sur la clé sans accents) |
| 9 | BH-8, BH-9 : bornes absentes du contrat ; `page=abc` non testé | low | Probable 404 au lieu de 400 | patch |
| 10 | EC-1, BH-5 : pagination par décalage, une Image disparue entre deux pages fait sauter la suivante | low | Rare : suppression ou retrait pendant la lecture | defer |
| 11 | BH-4 : aucun index sur `etat` ; pages tardives non mesurées | low | 500 Images < 2 s mesuré sur la première page | defer |
| 12 | BH-11 : 100 miniatures demandées d'un coup, sans chargement à l'entrée dans l'écran | low | NFR-4 mesuré sur la liste ; à mesurer en vrai | defer |
| 13 | BH-7 : champs `etat`, `aRemplacer`, `reutilisable` en plus | — | Exigés par AD-16 pour toute représentation d'une Image | rejeté |
| 14 | BH-10 : liste vide si l'enseignant ou la provenance manquent | low | Route authentifiée ; provenance par défaut | rejeté |
| 15 | BH-15 : `AjouterImage` sous `preparations/` | low | Déplacement sans effet produit | rejeté |
| 16 | BH-16 : groupes par Sens, Mot répété | — | Conforme à la maquette `key-banque.html` | rejeté |
| 17 | BH-17 : pas de test unitaire liant le critère SQL à `proposable` | low | Couvert par le test d'intégration des provenances | rejeté |

## Verification

**Commands:**
- `cd back && ./mvnw verify` -- expected: tests verts, ArchUnit compris, `front/openapi/openapi.json` à jour.
- `cd front && npm test -- --watch=false && npm run build` -- expected: tests verts, paquet initial sous 600 kB.
