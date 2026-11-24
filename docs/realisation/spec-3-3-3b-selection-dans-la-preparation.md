---
title: 'Story 3.3, partie 3b : sélection, Verser et « Retirer de la Préparation » en lot dans la Préparation'
type: 'feature'
created: '2026-11-24'
status: 'done'
baseline_commit: 'f7970ea59274e7c2fa406b2d35dbb7f05cfc3963'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/realisation/epic-3-context.md'
  - '{project-root}/docs/realisation/spec-3-3-3a-selection-et-versement-en-lot-banque.md'
  - '{project-root}/docs/realisation/spec-retro-e2-2-encart-et-bandeau.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** La partie 3a a livré la sélection et la Barre d'actions en lot, mais seulement dans la Banque. La story 3.3 (UX-DR-12) les veut identiques dans la Préparation. Il manque aussi deux actions : « Verser » pour les Images des Mots sélectionnés, et « Retirer de la Préparation », annulable.

**Approach:** Brancher dans la Grille de Cartes de Mot le modèle de sélection, la Case de sélection et la Barre d'actions en lot de `commun/`, tels quels. La Préparation fournit deux actions. « Verser » reprend la logique de la Banque, partagée plutôt que recopiée. « Retirer de la Préparation » s'appuie sur le retrait existant, avec un seul Bandeau « Annuler » pour tout le lot.

Décisions :
- **Sélection des Mots :**
  - **Ce qui est sélectionné :** des Mots de Préparation, dans l'ordre de la Grille. La Case de sélection se place sur la Carte de Mot, avec le même comportement que dans la Banque : survol, focus, tactile, Espace, Maj+clic et `pointer-events`. Son nom accessible est « Sélectionner « forme » ».
  - **Libellés de la barre :** « N mot(s) sélectionné(s) », avec « Tout sélectionner » et « Désélectionner ».
  - **Échap :** même règle que dans la Banque. Il ferme d'abord le Panneau ouvert (Carte d'identité, Panneau de choix, détection), et ne vide jamais la sélection quand on l'appuie dans un champ, en particulier la saisie rapide, ou dans un menu.
  - **Durée de vie :** la sélection se vide quand on change de Préparation. Un Mot qui quitte la Grille en sort, qu'il soit retiré, y compris par le geste unitaire « Retirer », ou que la Grille soit relue.
- **Verser** (barre) :
  - **Ce qui part :** les Images des Mots sélectionnés, par `POST /images/versements` en paquets de 500 au plus.
  - **Mots sans Image :** ils restent hors du lot avec la raison « pas d'image ». Si plusieurs Mots partagent une Image, elle n'est envoyée qu'une fois.
  - **Comportement :** le même que dans la Banque, pour l'envoi, le figement, le récapitulatif nommé par la forme et le Sens, les raisons, l'échec partiel, « Réessayer » et l'arrêt sur changement de contexte. Les Cartes de Mot versées prennent `etat = versee` et `versabilite = null`, et le panneau Carte d'identité ouvert est relu.
  - **Mise en commun :** l'orchestration du versement en lot (paquets, fusion, récapitulatif, reprise) passe dans `commun/versement/` et sert aux deux pages. Le comportement de la Banque ne change pas : ses tests existants restent verts.
- **Retirer de la Préparation** (barre) :
  - **Retrait :** il retire tous les Mots sélectionnés, en reprenant le geste unitaire. Les Cartes disparaissent aussitôt, et les retraits partent un par un, dans l'ordre de la Grille.
  - **Bandeau « Annuler » :** un seul pour le lot, « N mots retirés de la préparation. », ou le message unitaire actuel s'il n'y a qu'un Mot. « Annuler » rétablit tous les Mots retirés avec succès, chacun à sa place, et annonce « N mots rétablis. ». La règle de navigation de la rétrospective de l'Epic 2 (action 2) s'applique : le Bandeau se ferme à la navigation.
  - **Échecs :** les Mots dont le retrait échoue reviennent dans la Grille, et le Bandeau d'erreur existant les nomme, avec « Réessayer ». Le Bandeau « Annuler » ne porte que les retraits réussis.
  - **Focus :** il va à la Carte qui suit le dernier Mot retiré, sinon au champ de saisie rapide.
  - **Effets de bord :** les panneaux ouverts sur un Mot retiré se ferment, comme pour le geste unitaire. L'Encart « mots déjà illustrés » est relu une seule fois à la fin du lot.
- **Ordre des actions dans la barre :** « Verser », puis « Retirer de la Préparation ».

## Boundaries & Constraints

**Always:**
- Le client généré seulement (AD-7). Aucun changement du back ni du contrat : les retraits et les rétablissements passent par les routes unitaires existantes.
- Le paquet initial ne grossit pas, à 599,78 kB. La build doit le confirmer.
- Le comportement existant de la Préparation reste inchangé (tests existants verts) : saisie rapide, détection, panneaux, retrait unitaire et son Bandeau, Encart. Les tests de la sélection et du versement de la Banque restent aussi verts.
- Accessibilité et jetons comme dans la partie 3a.

**Never:**
- Pas de nouvelle route de lot pour le retrait.
- Pas de « Créer une fiche avec cette sélection », ni d'autres actions en lot (Thème, Section) : elles relèvent d'autres stories.
- Pas de recopie de la logique de versement en lot de la Banque.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Cocher | Case d'une Carte de Mot | Barre « 1 mot sélectionné », la Carte ne s'ouvre pas | N/A |
| Plage | Maj+clic | Mots de l'ancre au Mot cliqué | N/A |
| Échap dans la saisie rapide | Sélection, Échap dans le champ | Sélection gardée | N/A |
| Verser mixte | Mot avec ma photo, Mot « à illustrer », Mot avec l'Image versée de Zoé | 1 versée ; « pas d'image », « image d'un collègue » ; badge « versée » sur ma Carte | N/A |
| Image partagée | Deux Mots, même Image | Un seul identifiant envoyé | N/A |
| Retirer en lot | 3 Mots sélectionnés, « Retirer de la Préparation » | 3 Cartes retirées, 3 `DELETE`, un Bandeau « 3 mots retirés de la préparation. » | N/A |
| Annuler | « Annuler » sur ce Bandeau | 3 rétablissements, Mots à leur place, « 3 mots rétablis. » | Échec d'un rétablissement : Bandeau d'erreur existant |
| Échec partiel | Le 2e `DELETE` échoue | Ce Mot revient, Bandeau d'erreur qui le nomme ; « Annuler » ne rétablit que les 2 autres | « Réessayer » le retire de nouveau |
| Un seul Mot | 1 Mot sélectionné, retiré | Message unitaire actuel | N/A |
| Navigation | Retrait en lot puis autre page | Bandeau fermé, rien rétabli | N/A |
| Autre Préparation | Sélection puis ouverture d'une autre Préparation | Sélection vide | N/A |

</frozen-after-approval>

## Code Map

- `front/src/app/preparations/preparation.ts` (+ spec, scss) -- `retirerMot` (l.~1194), `envoyerRetrait`, `retablirMot`, `reessayerRetraits`, `echecRetrait`, panneaux, Échap, `grille`, `dernierChargement`, Encart.
- `front/src/app/preparations/carte-mot.ts` (+ scss, spec) -- Carte de Mot, badge « versée ».
- `front/src/app/preparations/grille-mots.ts` -- `mots()`, `retirer`, `ajouter`.
- `front/src/app/commun/selection/`, `front/src/app/commun/barre-actions-lot/` -- livrés par la partie 3a.
- `front/src/app/banque/banque.ts` -- versement en lot à extraire vers `commun/versement/`.
- `front/src/app/commun/bandeau-annuler/bandeau-annuler.ts` -- `afficher(message, annuler, appelant)`.

## Tasks & Acceptance

**Execution:**
- [x] Extraire l'orchestration du versement en lot dans `commun/versement/`, et la Banque l'utilise.
- [x] Préparation : sélection, Case sur la Carte de Mot, barre, Échap, durée de vie.
- [x] Verser en lot dans la Préparation.
- [x] Retirer en lot, un Bandeau « Annuler », échecs.
- [x] Tests : un par ligne de la matrice.

**Acceptance Criteria:**
- Given une Préparation, when l'enseignant coche des Cases de sélection, then la Barre d'actions en lot apparaît avec le nombre sélectionné, « Verser » et « Retirer de la Préparation ».
- Given une sélection, when il choisit « Retirer de la Préparation » puis « Annuler », then les Mots reviennent à leur place.
- Given une sélection mixte, when il choisit « Verser », then les Images versables sont versées et les autres restent hors du lot avec leur raison.

## Implementation Notes

- `commun/versement/versement-lot.ts` : classe `VersementLot`, créée par la page dans son contexte d'injection avec sa `Selection`, `imagesSelectionnees` (pour « Réessayer ») et `appliquer` (cartes, sélection, Carte d'identité). Elle porte `enCours`, `recapitulatif`, `erreur`, le `journal` des Images versées (relu par la Banque à la réception d'une page), la reprise et `changerDeContexte()`. `recapitulatifVersement`, `fusionnerResultat`, `TAILLE_PAQUET_VERSEMENT` y ont déménagé depuis `banque.ts`. `verser(ids, noms, refusesAvant)` dédoublonne les identifiants et accepte des refus faits sans envoi (Mot sans Image, clé `mot:<id>`). La promesse rendue dit si le récapitulatif complet est affiché : la page envoie alors le focus au bouton « Fermer le récapitulatif » s'il est perdu.
- `commun/versement/recapitulatif-versement-lot.ts` : Bandeau d'erreur du versement et récapitulatif (même DOM que la partie 3a, classes `versement-lot__*`), projeté en `barreActionsLotSuite` par la Banque et la Préparation. Les sélecteurs `banque__bilan`, `banque__partage`, `banque__refusees`, `banque__erreur-versement` du spec de la Banque sont renommés en conséquence ; aucun test de la Banque n'a changé de contenu.
- `commun/selection/echap.ts` : `echapDeSaisieOuMenu`, sorti de la Banque, avec des sélecteurs propres à la page (Préparation : `mat-form-field`, `.mat-mdc-select`).
- `BarreActionsLot` : entrée `libelleNombre` (défaut `libelleSelection`), `libelleSelectionMots` pour « N mot(s) sélectionné(s) ».
- Carte de Mot : Case de sélection en premier (avant « Retirer »), en haut à gauche, mêmes propriétés `--case-selection-*` que la vignette de la Banque ; sélectionnée, fond `primary-container` et anneau `primary` de 2 px (pas d'état « ouverte » sur la Carte de Mot).
- Préparation : sélection dans l'ordre de la Grille, réduite par un `effect` sur la Grille (retrait unitaire ou en lot, relecture, `vider`), vidée avec le versement dans `charger`. Échap (hôte) : dialogue ouvert ou événement déjà traité, rien ; Carte d'identité puis Panneau de choix ouverts, fermés ; sinon la sélection se vide, hors versement, champ, menu ou détection.
- Verser : Images des Mots sélectionnés dans l'ordre de la Grille, une fois chacune, nommées par le premier Mot qui les montre ; les Cartes de Mot versées prennent `etat = versee`, `versabilite = null` ; leurs Mots sortent de la sélection, Mots sans Image et refusés y restent.
- Retirer en lot : retraits séquentiels (ils partent même si une autre Préparation s'ouvre, sans rien écrire) ; un Mot en échec revient aussitôt et rejoint le Bandeau d'erreur existant ; Encart relu et Bandeau « Annuler » unique à la fin (`messageRetraitLot`). « Annuler » : un seul Mot, le rétablissement unitaire ; sinon `retablirLot`, séquentiel, une relecture de l'Encart, « N mots rétablis. », focus au premier Mot rétabli. `EchecRetablissement` porte désormais une liste de Mots (« « a », « b » n'ont pas été rétablis. »).
- Corrections de la revue 1 :
  - « Réessayer » des retraits en échec : un seul Mot, le geste unitaire ; plusieurs, `retirerLot` (le même chemin que « Retirer de la préparation »), donc des retraits séquentiels et un seul Bandeau « Annuler ». Le test « deux retraits en échec » attend désormais les réponses l'une après l'autre et un seul Bandeau « 2 mots retirés de la préparation. ».
  - Pendant un retrait en lot (`retraitLotEnCours`) : sélection figée, « Tout sélectionner », « Désélectionner », « Verser » et « Retirer de la préparation » désactivés, « Retirer » de chaque Carte en `disabledInteractive` (entrée `retraitIndisponible` de la Carte de Mot), « Réessayer » des retraits masqué. Le drapeau est remis à zéro dans `charger` et, en fin de lot, seulement si la Préparation n'a pas changé.
  - Les actions de la barre sont aussi indisponibles (`actionsLotIndisponibles`) pendant une relecture des Mots (compteur `lecturesMots` autour de `chargerMots`) ou tant que `erreurMots` est affichée, comme la Banque pendant un rechargement.
  - `retablirLot` garde toutes les erreurs : « Réessayer » seulement si chacune est passagère (`erreurPassagere`) ; le message vient de la dernière erreur dans ce cas, sinon de la première erreur non passagère.
  - `messageEchecRetrait` et `messageEchecRetablissement` partagent `phraseEchecMots` : au-delà de 3 Mots, leur nombre (« 12 mots n'ont pas été rétablis. »).
  - `VersementLot.changerDeContexte()` remet `enCours` à faux et libère la sélection ; le `finally` de l'envoi ne le fait que si le contexte n'a pas changé (un lot parti dans le nouveau contexte reste « en cours »). `journal` est exposé en lecture seule (accesseur sur un tableau privé). `RefusAffiche.imageId` devient `cle`. Refus d'une Image non nommée à l'envoi : « Élément inconnu ».
  - Échap dans la Préparation : venu d'un champ de saisie (saisie rapide comprise), d'un `mat-form-field`, d'une liste `mat-select` ou d'un menu, il ne fait rien, pas même fermer un panneau. Sinon : Carte d'identité, Panneau de choix, puis Panneau de détection (nouvelles méthodes `ouvert()` et `masquer()` du Panneau de détection, le champ garde sa saisie et la frappe suivante relance la détection), et enfin seulement la sélection.
  - `nomImage` déménage dans `commun/nom-image.ts` (la Préparation n'importe plus rien de `banque/`). Le récapitulatif prend `libelleRefusees` : « Images non versées » dans la Banque, « Mots non versés » dans la Préparation, « Éléments non versés » par défaut.
  - Styles : la visibilité de la Case de sélection (opacité, pointeur, survol, `focus-within`, classe « sélection active », `hover: none`) est le mixin `visibilite` de `commun/selection/_case-selection-hote.scss`, inclus par la Carte de Mot et la vignette de la Banque. L'anneau de la Carte sélectionnée lit `--case-selection-anneau-carte` (DESIGN.md › case-selection, selected-card-ring), propriété locale définie par ce mixin (`calc(var(--cm-epaisseur-separateur) * 2)`) plutôt qu'un jeton global de `_jetons.scss`, pour ne pas faire grossir le paquet initial. La case de la Carte de Mot est décalée de `--cm-espace-1`, sur le fond `surface` et ronde comme « Retirer », et la partie gauche lui réserve sa hauteur (`padding-block-start`) : elle ne couvre ni la vignette ni le « + ».
  - Délais de 20 s de `banque.spec.ts` : les deux tests « filtres changés » et « page quittée » rendent 650 vignettes comme les deux « gros lot » qui avaient déjà 20 s ; mesurés seuls, 3,6 à 3,9 s (contre 4,3 à 5 s pour les « gros lot »), près des 5 s par défaut, dépassés quand toute la suite tourne. La cause est le rendu, pas le versement ; un commentaire le dit.
  - Nouveaux tests : `versement-lot.spec.ts` (refus avant l'envoi, doublons, Mots sans Image seuls sans requête, changement de contexte pendant l'envoi), `echap.spec.ts` (champs, menus, liste `ignores`), et dans `preparation.spec.ts` : échec réseau du versement puis « Réessayer » après une désélection, versement en cours puis autre Préparation, Mot coché puis « Retirer » de sa Carte, barre et « Retirer » figés pendant un retrait en lot, deux rétablissements en échec (pluriel, « Réessayer », « 2 mots rétablis. »), rétablissements aux erreurs mêlées sans « Réessayer », Échap depuis le Panneau de détection, panneau ouvert sur un Mot retiré en lot, et les messages au-delà de 3 Mots.

Vérification à la clôture : front 1026 tests, `verifier-jetons` vert, paquet initial 599,78 kB (inchangé). Non vérifié en navigateur : case de sélection sur la Carte de Mot, barre collante.

## Spec Change Log

## Review Triage Log

Revue 1 (Blind Hunter BH, Edge Case Hunter EC, Verification Gap VG).

| # | Constat | Verdict | Preuve | Suite |
|---|---------|---------|--------|-------|
| 1 | BH-1, EC-3 : « Réessayer » après des retraits de lot les renvoie un par un | high | Un Bandeau « Annuler » par Mot, seul le dernier annulable | patch |
| 2 | BH-2, EC-2 : deux retraits qui se chevauchent | high | Le premier lot ne peut plus être annulé | patch (barre figée pendant le retrait) |
| 3 | BH-3, EC-4 : rétablissements aux erreurs mêlées | low | `reessayable` tiré de la dernière erreur | patch |
| 4 | BH-4 : messages d'échec sans limite | low | Lot de 40 Mots | patch (compte au-delà de 3) |
| 5 | EC-1 : changement de contexte pendant un versement | medium | Nouvelle Préparation figée sur « Versement… » | patch |
| 6 | EC-6, EC-5, VG-6 : Échap ne ferme pas le Panneau de détection ; Échap d'un champ ferme un panneau | medium | Contraire à la spec | patch |
| 7 | BH-13 : barre active pendant la relecture de la Grille | low | La Banque la fige | patch |
| 8 | BH-5, BH-6, BH-14 : `nomImage` dans `banque/`, `imageId` qui porte une clé de Mot, `journal` modifiable | low | Dépendance entre fonctionnalités ; nom trompeur | patch |
| 9 | BH-9, BH-10, BH-11 : visibilité de la case recopiée, case sans place réservée, anneau emprunté | low | Dérive ; case sur la vignette | patch |
| 10 | BH-7, BH-8, VG-1 à VG-5 : tests manquants (code partagé, échec et reprise du versement, changement de Préparation, retrait unitaire, panneau, rétablissements multiples) | medium | Régressions silencieuses | patch (tests) |
| 11 | BH-12 : délais de 20 s sans explication | low | Cause à nommer | patch (cause ou commentaire) |

## Verification

**Commands:**
- `cd front && npm test -- --watch=false && npm run build` -- expected: tests et `verifier-jetons` au vert, paquet initial ≤ 599,78 kB.
