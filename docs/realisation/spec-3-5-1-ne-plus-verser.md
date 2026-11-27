---
title: 'Story 3.5, partie 1 : « Ne plus verser » et image retirée de la banque chez les collègues'
type: 'feature'
created: '2026-11-27'
status: 'done'
baseline_commit: 'f6ca67a071f9f06d547f5a5cba8e5f0bb9ef168d'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/realisation/epic-3-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problème :** une Image versée ne peut plus être retirée de la Banque par sa propriétaire, alors que le partage doit rester réversible (FR-19, FR-21). Quand une Image cesse d'être versée, ses collègues qui l'utilisent n'en voient rien : `aRemplacer` vaut toujours `null`.

**Approche :**
- **Transition dans le back :** `Versements.nePlusVerser`, avec l'acteur `Acteur.Proprietaire`, fait passer l'Image de `versee` à `privee`. Elle verrouille l'Image (`SELECT … FOR UPDATE`) et suit la même séquence que `verser` : `404 image.indisponible`, puis `403 image.reservee_au_proprietaire`. Une Image déjà `privee` ne change pas.
- **Point d'accès :** `DELETE /images/{id}/versement?confirme=`.
  - Si des collègues ont un lien vers l'Image (un `lien_image` dont `enseignant_id` diffère du propriétaire) et que `confirme` est faux, le back refuse avec `409 image.versement.reutilisee` et n'écrit rien.
  - Sinon, l'Image passe à `privee`, et la réponse est la Carte d'identité.
- **Front, Carte d'identité de la propriétaire :** une Image versée affiche « Ne plus verser ».
  - Le premier envoi part sans confirmation. S'il réussit, le Bandeau « Annuler » s'affiche 8 s : « L'image n'est plus dans la banque. ». « Annuler » la verse à nouveau.
  - Sur un `409`, un Dialogue de confirmation s'ouvre, avec le titre « Ne plus verser cette image ? » et la phrase « Des collègues l'utilisent : leurs préparations afficheront « image retirée de la banque ». ». Le bouton « Ne plus verser » renvoie la requête avec `confirme=true`, sans Bandeau « Annuler » ensuite. Le bouton « Annuler » du Dialogue ne change rien.
- **Chez les collègues :** `aRemplacer` vaut `retiree`. C'est calculé à la lecture, jamais stocké, dans `Images.vue`, quand le lecteur n'est pas le propriétaire et que l'Image est `privee`. Un non-propriétaire ne voit une Image privée que par son propre lien.
  - La Carte de Mot de sa Préparation montre l'Image grisée (opacité ≈ 0,4) avec le badge « image retirée de la banque » (triangle d'alerte, jetons `--cm-etat-retiree-*`).
  - La Carte d'identité de la collègue montre le même badge.
  - L'Image n'est plus proposée nulle part, et `reutilisable` vaut `false` : c'est déjà le cas par `proposable`.
  - Un clic sur la vignette ouvre le Panneau de choix pour choisir une autre Image (comportement existant).

## Boundaries & Constraints

**Toujours :**
- Seul `vocabulaire.service` change `etat`, avec une méthode par transition et un acteur explicite (AD-3). Le statut `abandonnee` et les Notifications appartiennent à d'autres parties ou stories (3.5 partie 2, 3.6).
- La visibilité est décidée par `VisibiliteImages`. On n'ajoute aucun filtrage d'Images ailleurs, front compris (AD-2).
- Les textes sont en français, au vouvoiement. Le nouveau code d'erreur est traduit dans `MESSAGES_PAR_CODE`. On régénère et versionne `front/openapi/`.

**Jamais :**
- Aucune copie, aucune modification des liens des collègues : leur lien reste, seule la lecture change.
- Aucun « Ne plus verser » en lot dans cette partie. Pas de Notification.

## I/O & Edge-Case Matrix

| Scénario | Entrée / État | Résultat attendu | Erreur |
|---|---|---|---|
| Sans réutilisation | Ma versée, liée seulement par moi ou par personne | `200` : `privee`, Carte d'identité | — |
| Réutilisée, sans confirmation | Zoé a un lien | Rien n'est écrit | `409 image.versement.reutilisee` |
| Réutilisée, `confirme=true` | idem | `200` : `privee` ; le lien de Zoé est intact | — |
| Déjà privée | Ma privée | `200`, rien ne change | — |
| Image d'une collègue | Versée de Zoé | Rien n'est écrit | `403 image.reservee_au_proprietaire` |
| Invisible | Privée d'une collègue sans lien, ou inexistante | Rien n'est écrit | `404 image.indisponible` |
| Lecture chez Zoé | Son Mot lié à mon Image redevenue privée | `aRemplacer = retiree`, `reutilisable = false` dans la Préparation et dans la Carte d'identité ; absente de la détection, de la Banque, de l'Encart et des propositions | — |
| Lecture chez moi | Mon Image privée | `aRemplacer = null` | — |
| Front, sans réutilisation | Clic « Ne plus verser » | Carte à jour ; Bandeau « Annuler » 8 s ; « Annuler » reverse | — |
| Front, 409 | idem | Dialogue ; « Ne plus verser » renvoie avec `confirme=true` ; « Annuler » ne change rien | — |
| Front, Carte de Mot | Image `retiree` | Vignette grisée et badge « image retirée de la banque » ; clic → Panneau de choix | — |

</frozen-after-approval>

## Code Map

- `back/src/main/java/fr/corpusmots/vocabulaire/service/Versements.java` : `verser` (l. 55 à 64) et `verserSousVerrou` (l. 110 à 132) servent de modèle. Ajouter `nePlusVerser(UUID imageId, boolean confirme, Acteur.Proprietaire acteur)` et la constante `CODE_REUTILISEE = "image.versement.reutilisee"`.
- `vocabulaire/persistance/LienImageRepository.java` : ajouter `existeHorsEnseignant(imageId, proprietaireId)`, sur le modèle de `existePourImage` (l. 38).
- `vocabulaire/api/ImagesResource.java` : `@DELETE @Path("/{id}/versement")`, `operationId = "nePlusVerserImage"`, `@QueryParam("confirme") boolean`, réponse `CarteIdentiteImageDto` comme `POST` (l. 348 à 359). Mettre à jour la liste des codes dans la Javadoc de la classe (l. 70 à 75).
- `vocabulaire/service/Images.java` `vue(...)` (l. 651 à 669) : `aRemplacer = !proprietaire && PRIVEE ? "retiree" : null`. Mettre à jour la Javadoc de `ImageVue` (l. 6 à 12).
- Front :
  - `commun/carte-identite/versement-image.ts` reçoit « Ne plus verser » (nouvelle entrée `versee`, déjà présente, et sortie `nePlusVerser`) ;
  - `carte-identite.ts` monte le composant aussi pour une Image versée du propriétaire (l. 714 à 722), ajoute un flux `nePlusVerser` sur le modèle de `verser` (l. 1429 à 1488, `fileEnregistrements`), utilise `DialogueConfirmation.confirmer` (déjà injecté, l. 842) et `BandeauAnnuler.afficher` ;
  - badge `retiree` dans la Carte d'identité, près du badge « versée » (l. 374).
- `front/src/app/preparations/carte-mot.ts` (vignette l. 118 à 138, badges l. 151 à 159) : classe `carte-mot--retiree` (opacité de la vignette via un jeton) et badge `retiree` avec l'icône d'alerte. Ajouter à `styles/_jetons.scss` un jeton d'opacité, s'il manque. Styles dans `carte-mot.scss`, à côté de `.carte-mot__versee` (l. 209).
- `commun/erreurs/` : traduction de `image.versement.reutilisee`.
- Tests :
  - `VersementImagesResourceTest`, une méthode par ligne back de la matrice ;
  - le test de lecture `retiree` dans un test de Préparation, `ImagesMotsPreparationResourceTest` ou `MotsPreparationResourceTest` ;
  - specs `versement-image.spec.ts`, `carte-identite.spec.ts`, `carte-mot.spec.ts`.

## Tasks & Acceptance

**Exécution :**
- [x] Back : `existeHorsEnseignant`, `nePlusVerser`, point d'accès, `aRemplacer` calculé, et tests.
- [x] `front/openapi/` : régénérer et versionner.
- [x] Front : « Ne plus verser » (Bandeau, Dialogue) dans la Carte d'identité et ses specs.
- [x] Front : rendu `retiree` (Carte de Mot, Carte d'identité) et specs.

**Critères d'acceptation :**
- Étant donné mon Image versée que Zoé utilise, quand je choisis « Ne plus verser » et confirme, alors elle est privée pour moi, et Zoé la voit grisée « image retirée de la banque » dans sa Préparation, sans pouvoir la choisir ailleurs.

## Review Triage Log

Revue 1 (Blind Hunter BH, Edge Case Hunter ECH, Verification Gap VG).

- ECH-2 / BH-2 (patch) : « Réessayer », après l'échec d'une requête confirmée, renvoyait la requête sans `confirme`. Le Dialogue revenait. Corrigé, avec une spec.
- ECH-4 à ECH-7 / BH-1 (patch) : le Bandeau « Annuler » en faisait moins que « Verser ». Il active maintenant `versementEnCours`, met le focus sur le message, relit la Carte sur un refus `400`, et annonce l'échec si le Panneau a changé, au lieu de le taire. Ajout d'une spec d'échec.
- VG-1 (patch) : les branches où le Panneau est fermé ou remplacé n'avaient pas de test : fermé pendant l'envoi, autre Image pendant l'envoi, « Annuler » après un changement d'Image. Specs ajoutées.
- BH-4 (patch) : la règle `aRemplacer` sort de `Images.vue` pour aller dans `VisibiliteImages` (AD-2), avec un test unitaire.
- BH-5 (patch) : ajout du test où un administrateur non propriétaire tente « Ne plus verser » (`403`).
- BH-9 (patch) : réponses `403`, `404` et `409` documentées dans l'OpenAPI, si les points d'accès voisins le font.
- BH-12 (patch) : `existeHorsEnseignant` fait désormais une requête d'existence au lieu d'un comptage.
- BH-10 / BH-11 (patch) : Javadoc remise à la largeur, ordre des imports, « son propriétaire », noms et assertions de focus des tests.
- ECH-3 (false) : confirmation envoyée pour une Image qui n'est plus affichée. Le numéro de lecture est déjà vérifié avant l'envoi confirmé, et le Dialogue est modal.
- ECH-1 (rejeté) : `aRemplacer = supprimee`. Il relève de la story 3.6, qui crée l'état `supprimee`.
- BH-3 (low, rejeté) : pas de relecture de la Carte après un `403`, `404` ou `409` de « Ne plus verser ». Ces cas sont rares pour la propriétaire, et le Bandeau d'erreur s'affiche.
- BH-6 (false) : l'Encart n'est pas testé. Il filtre déjà par `proposable`, que cette partie ne touche pas.
- BH-7 (low, rejeté) : `confirme=oui` lu comme faux. C'est le comportement standard de JAX-RS, et seul le client généré appelle ce point d'accès.
- BH-8 (false) : le contrat et le suivi sont absents du diff de revue. C'est voulu, ils sont relus à la clôture.

## Spec Change Log

## Verification

**Commandes :**
- `cd back && ./mvnw verify` : tests verts (`@QuarkusTest` en local contre un PostgreSQL de test lancé à la main), `front/openapi/` à jour.
- `cd front && npm test -- --watch=false && npm run build` : tests verts, paquet initial ≤ 600 kB.

Vérification à la clôture : back `./mvnw verify` 850 tests, 849 verts. Seul échec : le test chronométré de la Banque (2 101 ms pour 2 000), sans lien avec cette partie ; sa classe relancée seule donne 67 tests verts. `front/openapi/` régénéré (opération `nePlusVerserImage`). Front : 1 092 tests verts. `npm run build` réussi, paquet initial 599,89 kB.
