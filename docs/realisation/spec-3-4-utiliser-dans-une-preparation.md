---
title: 'Story 3.4 : « Utiliser dans une préparation » depuis la Banque, et auteur dans l''Encart'
type: 'feature'
created: '2026-11-27'
status: 'done'
baseline_commit: '5964f32e348b956f53d1e3aefd11d91ee44c39d1'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/realisation/epic-3-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problème :** une enseignante trouve dans la Banque une Image versée par une collègue (ou une des siennes). Elle n'a aucun moyen de la mettre dans une de ses Préparations sans passer par la saisie du Mot (FR-21). Par ailleurs, l'Encart « mots déjà illustrés » d'une Préparation n'indique pas l'auteur des Images qu'il propose, contrairement à la détection et au Panneau de choix (critère « avec son auteur » de la story 3.4).

Ce qui existe déjà et ne change pas : la proposition et le classement des Images versées des collègues, le lien `reutilisee` sans copie (AD-5), la Carte d'identité en lecture seule et les refus `403`. Chaque point d'accès en écriture a aussi déjà son test de refus pour un collègue.

**Approche :**
- **Bouton et choix de la Préparation :** dans le Panneau Carte d'identité de la Banque, le bouton « Utiliser dans une préparation » sert à toute Image visible : la mienne ou celle, versée, d'une collègue. Il ouvre un Dialogue qui liste mes Préparations, la plus récente d'abord. J'en choisis une.
- **Le back trouve le Mot :** il le déduit de l'Image (Mot de son Sens), puis traite trois cas.
  - Le Mot est absent de la Préparation : il est ajouté avec le Sens de l'Image retenu, et l'Image est liée (`reutilisee`).
  - Le Mot est présent et « à illustrer » : l'Image est liée, et le Sens retenu devient celui de l'Image.
  - Le Mot est présent et déjà illustré : le back refuse (`409 preparation.mot_deja_illustre`). Le front affiche un Dialogue de confirmation, « Remplacer l'image de « renard » dans « Roule galette » ? ». S'il est confirmé, la requête repart avec `remplacer: true`. L'ancienne Image est seulement déliée, jamais modifiée.
- **Après l'ajout :** l'enseignante reste dans la Banque. Un message dans le Panneau, « Image ajoutée à « Roule galette ». », est suivi du lien « Ouvrir la préparation ».
- **Auteur dans l'Encart :** chaque vignette de l'Encart « mots déjà illustrés » affiche son auteur, « vous » ou le nom de la collègue, comme le Panneau de choix (`Annuaire`).

## Boundaries & Constraints

**Toujours :**
- Nouveau point d'accès `POST /preparations/{id}/utilisations`, corps `{ imageId, remplacer }`, réponse `MotPreparationDto` : `201` si le Mot est ajouté, `200` s'il est lié à un Mot existant. C'est une seule transaction, Préparation verrouillée. Le service se trouve dans `preparations.service`, et il passe par `vocabulaire` (`Usages`, `Lexique`) uniquement via ses services (AD-1).
- La visibilité est décidée par `VisibiliteImages` (proposable), à travers `Usages`. Une Image non proposable donne `404 image.indisponible`. La Préparation d'une collègue donne `404 ressource.introuvable` (AD-2).
- Un Mot écarté de la Préparation (Encart) reste écarté de l'Encart : l'ajout explicite l'emporte, comme `POST /{id}/mots`.
- Les textes sont en français, au vouvoiement. Les nouveaux `code` d'erreur sont traduits dans `MESSAGES_PAR_CODE`. On régénère et versionne `front/openapi/`.

**Jamais :**
- Aucune copie de l'Image, de sa Carte d'identité ou de son Sens (AD-5). Aucune écriture sur l'Image d'une collègue.
- Aucun appel HTTP écrit à la main dans le front (AD-7). Aucune nouvelle dépendance. La Banque reste chargée en différé, et le paquet initial ne dépasse pas 600 kB.

## I/O & Edge-Case Matrix

| Scénario | Entrée / État | Résultat attendu | Erreur |
|---|---|---|---|
| Mot absent | Image versée de Zoé, « renard », ma Préparation sans « renard » | `201` : Mot ajouté, Sens de l'Image retenu, lien `reutilisee`, aucune Image créée | — |
| Mot à illustrer | « renard » présent, sans Image, autre Sens retenu | `200` : lié, Sens retenu = Sens de l'Image | — |
| Mot illustré, sans `remplacer` | « renard » a déjà une Image | Rien n'est écrit | `409 preparation.mot_deja_illustre` |
| Mot illustré, `remplacer: true` | idem | `200` : nouvelle Image liée, ancienne déliée et intacte | — |
| Image non proposable | Image privée d'une collègue, ou abandonnée | Rien n'est écrit | `404 image.indisponible` |
| Préparation d'une collègue | `id` d'une Préparation de Zoé | Rien n'est écrit | `404 ressource.introuvable` |
| Corps invalide | `imageId` absent | Rien n'est écrit | `400 requete.invalide` |
| Front, succès | Choix de « Roule galette » | Dialogue fermé ; message et lien « Ouvrir la préparation » dans le Panneau ; annonce aux lecteurs d'écran | — |
| Front, 409 | Mot déjà illustré | Dialogue de confirmation ; « Remplacer » renvoie avec `remplacer: true` ; « Annuler » ne change rien | — |
| Front, aucune Préparation | Liste vide | « Vous n'avez encore aucune préparation. » | — |
| Encart | Image versée de Zoé proposée | Vignette avec « Zoé Martin » (« vous » pour mes Images) | — |

</frozen-after-approval>

## Code Map

- `back/src/main/java/fr/corpusmots/preparations/service/PreparationsService.java` :
  - `reutiliserImage` (l. 450) : modèle pour le Mot absent, à réutiliser ;
  - `remplacerImage` (l. 721) : lie l'Image et change le Sens retenu quand le Mot est « à illustrer » ou quand il faut remplacer ;
  - `verrouillee(id)` ;
  - le Mot de l'Image vient de `usages.sensDImageProposable(imageId)` (`Usages.java` l. 156) puis du Sens dans `lexique`, à lire dans la même transaction.
- `preparations/api/PreparationsResource.java` : nouveau `@POST @Path("/{id}/utilisations")`, `operationId = "utiliserImagePreparation"`, DTO `UtilisationImagePreparationDto { UUID imageId; boolean remplacer }`, sur le modèle de `reutiliser` (l. 226 à 242). Code `preparation.mot_deja_illustre` : constante existante (`Usages.CODE_MOT_DEJA_ILLUSTRE`, ou celle du service).
- `front/src/app/commun/carte-identite/carte-identite.ts` : le bouton « Utiliser dans une préparation » va dans la zone d'actions. Il est visible dans les deux branches (`modifiable()` et lecture seule, l. 708 et 718), seulement dans la Banque : nouvelle entrée `utilisable` (vrai depuis `banque.ts`), pour ne pas l'afficher dans la Préparation. Message et lien `routerLink` vers `/preparations/{id}`. Le composant est gros : mettre la logique dans un composant voisin `commun/carte-identite/utiliser-dans-preparation.ts`, comme `versement-image.ts`.
- Dialogue de choix : un nouveau `commun/carte-identite/dialogue-choix-preparation.ts` (MatDialog) lit `listerMesPreparations` (`taille: 100`) et liste nom et Album. Dialogue de remplacement : `commun/dialogue-confirmation` existant.
- `front/src/app/banque/banque.ts` : passer `utilisable` à la Carte d'identité.
- `front/src/app/preparations/encart-mots-deja-illustres.ts` (`app-vignette-reprise`, l. 91 et 180) : auteur via `Annuaire.nomAffiche` / « vous », comme `vignette-proposition.ts` (`libelleProprietaire`, l. 21 à 34, à réutiliser).
- `front/src/app/commun/erreurs/` : traduire les codes s'ils manquent.
- Tests :
  - nouveau `back/src/test/java/fr/corpusmots/preparations/api/UtilisationImagePreparationResourceTest.java`, une méthode par ligne back de la matrice ;
  - specs front : `utiliser-dans-preparation.spec.ts`, `dialogue-choix-preparation.spec.ts`, `carte-identite.spec.ts` (bouton présent seulement avec `utilisable`), `encart-mots-deja-illustres.spec.ts` (auteur).

## Tasks & Acceptance

**Exécution :**
- [x] Back : DTO, ressource, `PreparationsService.utiliserImage` et tests de la matrice.
- [x] `front/openapi/` : régénérer et versionner.
- [x] Front : bouton, Dialogue de choix, Dialogue de remplacement, message et lien, entrée `utilisable` depuis la Banque, et leurs specs.
- [x] Front : auteur dans l'Encart et sa spec.

**Critères d'acceptation :**
- Étant donné l'Image versée de Zoé ouverte dans la Banque, quand je choisis « Utiliser dans une préparation » puis « Roule galette », alors « renard » apparaît illustré par cette Image à la réouverture de « Roule galette », avec le lien `reutilisee` et toujours une seule Image en base.

## Review Triage Log

Revue 1 (Blind Hunter BH, Edge Case Hunter ECH, Verification Gap VG).

- VG-1 / BH-1 (patch) : aucun test ne couvrait l'Image déjà liée au Mot, renvoyée sans `remplacer` (branche « rien ne change »). Test ajouté.
- VG-2 (patch) : rien ne vérifiait que la Banque active `utilisable`. Test ajouté dans `banque.spec.ts`.
- BH-2 (patch) : aucun chemin réussi n'utilisait l'Image privée de l'enseignante elle-même. Test ajouté.
- ECH-2 / BH-3 (low, patch) : une course sur le Sens de l'Image peut donner `400 image.sens_different`, que la Javadoc ne citait pas. Javadoc complétée ; le front traduit déjà ce code en message propre à la Banque.
- BH-10 (low, patch) : pour un lecteur d'écran, l'auteur de l'Encart était un nom nu. Il est désormais précédé de « Propriétaire : » masqué visuellement, comme dans la vignette de la Banque. Les cas où l'Annuaire est en cours de chargement ou en échec restent sans test : rejeté, faible.
- ECH-1 / BH-5 (low, rejeté) : le Dialogue ne lit que 100 Préparations. Une enseignante en a bien moins.
- ECH-3 (false) : « `lexique.sens` vide → 500 ». Le Sens d'une Image proposable existe toujours, et l'exception signale un invariant rompu.
- ECH-4 (false) : l'Image affichée change pendant la confirmation. Le Dialogue de confirmation est modal, la Banque ne peut pas changer d'Image derrière lui.
- BH-4 (low, rejeté) : verrou et relectures en double en déléguant à `reutiliserImage` / `remplacerImage`. C'est sans effet, et réutiliser ces méthodes garde une seule règle.
- BH-6 (low, rejeté) : pas de « Réessayer » sur une erreur de `UtiliserDansPreparation`. Le geste se refait en deux clics.
- BH-7 / VG-3 (low, rejeté) : `enCours` est partagé entre Images, et le double clic n'est pas testé. Le bouton est désactivé pendant l'envoi, et le back est idempotent pour la même Image.
- BH-8 (low, rejeté) : même message après un remplacement. Le texte voulu par l'intention est « Image ajoutée à « … » ».
- BH-9 (low, rejeté) : une erreur après « Remplacer » n'est pas testée. Elle suit le même chemin que la première requête, qui est testé.
- BH-11 (low, rejeté) : `afterEach` absorbe les lectures de l'Annuaire, qui est mis en cache par son service.
- BH-12 (false) : bouton offert pour une Image non proposable. La Banque ne montre que des Images proposables (test de provenance).

## Spec Change Log

## Verification

**Commandes :**
- `cd back && ./mvnw verify` : tests verts (`@QuarkusTest` en local contre un PostgreSQL de test lancé à la main), `front/openapi/` à jour.
- `cd front && npm test -- --watch=false && npm run build` : tests verts, paquet initial ≤ 600 kB.

Vérification à la clôture : back `./mvnw verify` 835 tests verts, `@QuarkusTest` compris (PostgreSQL de test lancé à la main), `front/openapi/` régénéré ; front 1 075 tests verts ; `npm run build` réussi, paquet initial 599,93 kB.
