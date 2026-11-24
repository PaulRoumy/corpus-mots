---
title: 'Story 3.3, partie 3a : sélection, Barre d''actions en lot et Verser en lot dans la Banque'
type: 'feature'
created: '2026-11-24'
status: 'done'
baseline_commit: 'bf79892ed7b920f1ebc02b2a8ff03c80f59879c9'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/realisation/epic-3-context.md'
  - '{project-root}/docs/realisation/spec-3-3-1-verser-cote-back.md'
  - '{project-root}/docs/realisation/spec-3-3-2-verser-depuis-la-carte-identite.md'
  - '{project-root}/docs/realisation/spec-3-2-2-barre-de-filtres-et-recherche.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Verser plusieurs Images oblige aujourd'hui à les ouvrir une par une. La story 3.3 (UX-DR-12) demande des Cases de sélection et une Barre d'actions en lot, au comportement identique dans la Banque, la Préparation et l'Import, et un « Verser » en lot. Les Images non versables restent alors hors du lot, avec leur raison.

**Approach:** Construire une fois la sélection et la Barre d'actions en lot, dans `commun/`, et les brancher dans la Banque avec l'action Verser. La partie 3b les branchera dans la Préparation.

Décisions :
- **Modèle de sélection partagé** (`commun/selection/`) : un ensemble d'identifiants, dans l'ordre d'affichage que fournit la page.
  - Opérations : basculer un élément, sélectionner une plage, tout sélectionner, tout désélectionner et garder les seuls identifiants encore affichés.
  - L'ancre de plage est le dernier élément basculé.
  - Maj+clic sélectionne de l'ancre jusqu'à l'élément, dans l'ordre d'affichage, sans désélectionner le reste.
- **Case de sélection** (sur la vignette de la Banque) :
  - **Contrôle :** une case à cocher native stylée, de nom accessible « Sélectionner « forme » (sens) ».
  - **Visibilité :** elle apparaît au survol et au focus de la vignette. Dès qu'une sélection existe, toutes les cases sont visibles.
  - **Geste :** un clic sur la case ou Espace la coche sans ouvrir la Carte d'identité. Un clic sur le reste de la vignette garde son action, ouvrir la Carte.
  - **Ordre de tabulation :** la case précède le bouton de la vignette.
  - **État coché :** la vignette sélectionnée prend l'état visuel « sélectionnée » de DESIGN.md, distinct de « ouverte ».
- **Barre d'actions en lot** (`commun/barre-actions-lot/`) :
  - **Position :** en haut de la grille, présente seulement quand une sélection existe, et collante au défilement.
  - **Contenu :** « N image(s) sélectionnée(s) », « Tout sélectionner », « Désélectionner », puis les actions de la page, en projection de contenu. Le nombre est annoncé poliment à chaque changement.
- **Échap :**
  - Si le panneau, un menu ou un dialogue est ouvert, Échap le ferme d'abord, comme aujourd'hui.
  - Sinon, Échap vide la sélection, et le focus reste où il est, ou va au titre « Banque » si l'élément focalisé disparaît.
- **« Tout sélectionner »** : toutes les Images affichées, c'est-à-dire les pages déjà chargées, pas le total.
- **Durée de vie de la sélection :** elle survit à « Afficher plus » et à l'ouverture de la Carte d'identité. Elle se vide à chaque changement de provenance ou de filtres, et se réduit aux Images encore affichées après un rechargement.
- **Verser en lot** (Banque) :
  - **Bouton :** « Verser » dans la barre. Il envoie `POST /images/versements` avec les identifiants sélectionnés, par paquets de 500 au plus.
  - **Pendant l'envoi :** le bouton indique « Versement… » et la sélection est figée.
  - **Récapitulatif**, affiché dans la barre en `role="status"` jusqu'à sa fermeture ou à la sélection suivante :
    - « N images versées. » (avec `dejaVersees` compté à part : « M étaient déjà dans la banque. ») ;
    - puis la liste des refusées, « forme (sens) : raison ». Les raisons viennent de `raisons-versement.ts`, augmenté de « image d'un collègue » pour `image.reservee_au_proprietaire` et de « image indisponible » pour `image.indisponible`. La licence du refus départage « licence à préciser » et « licence non partageable ».
  - **Après la réponse :**
    - les vignettes versées prennent `etat = versee` et `versabilite = null`, sans relire la liste ;
    - les Images versées sortent de la sélection, les refusées y restent ;
    - si le panneau est ouvert sur une Image versée, la Carte est relue.
  - **En cas d'erreur de la route** (réseau, 400) : le Bandeau d'erreur de la Banque, avec « Réessayer » qui renvoie le même lot. Rien ne change dans la grille.
- **Message de partage :** si au moins une Image est versée, le récapitulatif commence par « L'image reste la vôtre. Les collègues peuvent l'utiliser, personne ne peut la modifier. », au pluriel quand il y a plusieurs Images.

## Boundaries & Constraints

**Always:**
- Le client généré seulement (AD-7). Aucun changement du back ni du contrat.
- Le paquet initial ne grossit pas : 599,78 kB. Le modèle, la case et la barre ne sont importés que par des morceaux chargés à la demande. La build doit le confirmer.
- Le comportement de la Banque est inchangé hors sélection : filtres, panneau, focus, pagination (tests existants verts).
- Le modèle de sélection et la barre ne dépendent pas de la Banque, pour que la Préparation (3b) et l'Import les reprennent tels quels.
- Accessibilité : tout se fait au clavier, le nombre sélectionné est annoncé, le récapitulatif est lisible et le focus est géré. Les jetons viennent de DESIGN.md.

**Never:**
- Pas de branchement dans la Préparation : c'est la partie 3b.
- Pas de « Créer une fiche avec cette sélection » : c'est l'Epic des Fiches.
- Pas de sélection au-delà des Images affichées.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Cocher | Survol d'une vignette, clic sur la case | Case cochée, barre « 1 image sélectionnée », Carte non ouverte | N/A |
| Clavier | Tab jusqu'à la case, Espace | Cochée, nombre annoncé | N/A |
| Plage | Case 2 cochée, Maj+clic sur la case 5 | Images 2 à 5 sélectionnées | N/A |
| Tout | « Tout sélectionner » avec 2 pages chargées | Toutes les Images affichées sélectionnées | N/A |
| Échap | Sélection, aucun panneau ouvert, Échap | Sélection vide, barre masquée | N/A |
| Échap avec panneau | Panneau ouvert et sélection, Échap | Panneau fermé, sélection gardée | N/A |
| Filtre | Sélection, puis filtre Section | Sélection vide | N/A |
| Lot mixte | Ma photo, mon image d'album, l'Image versée de Zoé | Récapitulatif : 1 versée, message de partage ; « … : une image d'album reste dans Mes mots », « … : image d'un collègue » ; photo badge « versée », les deux autres restent sélectionnées | N/A |
| Licence | Refus `licence_non_versable` sans licence / avec `pixabay` | « licence à préciser » / « licence non partageable » | N/A |
| Déjà versée | Une de mes Images déjà versée dans le lot | Comptée dans « étaient déjà dans la banque » | N/A |
| Gros lot | 650 Images sélectionnées | Deux appels (500 + 150), un récapitulatif | Échec du second : Bandeau, le premier paquet reste appliqué |
| Erreur | Réseau en échec | Bandeau d'erreur, « Réessayer » renvoie le lot | N/A |
| Panneau ouvert | Carte ouverte sur une Image du lot versée | Carte relue, badge « versée » | N/A |

</frozen-after-approval>

## Code Map

- `front/src/app/banque/banque.ts` (+ spec, scss) -- grille, groupes, pages reçues, rechargement (provenance, filtres), panneau, Échap, `appliquer`.
- `front/src/app/banque/vignette-banque.ts` (+ scss) -- bouton de vignette, `aria-expanded`, badge « versée ».
- `front/src/app/commun/versement/raisons-versement.ts` -- raisons, libellés `LIBELLE_VERSER` / `LIBELLE_VERSEMENT_EN_COURS`, message de partage.
- `front/src/app/commun/bandeau-erreur/` -- Bandeau d'erreur.
- Nouveau : `front/src/app/commun/selection/`, `front/src/app/commun/barre-actions-lot/`.
- DESIGN.md : Case de sélection, Barre d'actions en lot, état sélectionné.

## Tasks & Acceptance

**Execution:**
- [x] Modèle de sélection (+ spec unitaire : bascule, plage, tout, réduction).
- [x] Barre d'actions en lot (+ spec).
- [x] Case de sélection sur la vignette, état sélectionné.
- [x] Banque : sélection, Échap, durée de vie, Verser en lot, récapitulatif, mise à jour des vignettes.
- [x] Tests : un par ligne de la matrice.

**Acceptance Criteria:**
- Given la Banque, when l'enseignant coche des Cases de sélection (survol ou focus, Espace, Maj+clic, « Tout sélectionner », Échap), then la Barre d'actions en lot apparaît avec le nombre sélectionné et ses actions.
- Given une sélection mixte, when il choisit « Verser », then les Images versables sont versées et les autres restent hors du lot avec leur raison.

## Implementation Notes

- `commun/selection/selection.ts` : classe `Selection` (signaux), créée par la page avec sa fonction d'ordre d'affichage. `basculer` (ancre = dernier basculé), `selectionnerPlage` (sans ancre affichée : l'élément est sélectionné, jamais désélectionné, et devient l'ancre ; l'ancre ne bouge pas après une plage), `toutSelectionner`, `toutDeselectionner`, `garderSeulement`, `retirer`, `reinitialiser`, `identifiants` (ordre d'affichage). `figer(true)` ignore les gestes de l'enseignant ; `garderSeulement`, `retirer` et `reinitialiser` s'appliquent toujours.
- `commun/selection/case-selection.ts` : case native en `appearance: none` (DESIGN.md › case-selection : 18 px, bordure `outline` de 2 px, fond `surface` ; cochée, fond `primary` et coche `on-primary` tracée en `::before`), cible de 40 px. Nom donné par la page, `preventDefault` + `stopPropagation` (l'état coché suit l'entrée, la vignette ne reçoit pas le clic), Maj+clic = plage, `aria-disabled` quand figée. La carte pose `--case-selection-opacite` et `--case-selection-pointeur` (masquée : opacité 0 et `pointer-events: none`, toujours atteignable au clavier) ; visible au survol, au focus, dès qu'une sélection existe, cochée, et toujours sous `@media (hover: none)`.
- `commun/barre-actions-lot/barre-actions-lot.ts` : toujours dans la vue de la page, affichée si `nombre > 0` ou `ouverte` ; `role="region"`, collante ; nombre, « Tout sélectionner », « Désélectionner » (si nombre > 0), actions projetées, contenu `[barreActionsLotSuite]` sous la ligne. Annonce polie à chaque changement du nombre (retour à « Aucune image sélectionnée. » compris), sauf avec `annoncer` à faux.
- Jetons : aucun ajout dans `_jetons.scss` (le paquet initial ne grossit pas). Taille de la case et épaisseurs dérivées des jetons existants, plan de la barre (`--barre-actions-lot-plan: 1`) et hauteur maximale de la liste des refusées (`5 × --cm-espace-6`) en propriétés locales.
- Vignette : case avant le bouton (position absolue en haut à gauche). « Sélectionnée » = fond `primary-container` avec la case cochée ; « ouverte » = anneau `primary` de 2 px sans fond ; les deux se combinent.
- Nom partagé `banque/nom-image.ts` (« « loup » (animal) », « « loup » » sans Sens) : nom de la vignette, de la case et des refusées du récapitulatif.
- Banque, sélection : ordre = ordre de la grille (groupes par Sens). Sélection, récapitulatif et échec de versement vidés à chaque changement de provenance ou de filtres (compteur de contexte), sélection réduite à la réception d'une première page. Pendant un rechargement (`images() === null`), « Tout sélectionner », « Désélectionner » et « Verser » sont indisponibles.
- Échap (hôte de la Banque), ignoré si l'événement est déjà traité ou un dialogue ouvert : panneau ouvert → il se ferme, toujours (même sans sélection ou pendant un versement) ; sinon, avec une sélection ou un récapitulatif, hors versement et hors champ de saisie (input texte, textarea, select) ou menu, la sélection se vide ; focus au titre si l'élément focalisé a disparu.
- Verser en lot : un nouveau « Verser » repart à zéro (récapitulatif et échec effacés). Paquets de 500 envoyés l'un après l'autre ; chaque paquet reçu est appliqué aussitôt : vignettes versées ou déjà versées en `versee` (badge, `versabilite = null`), sorties de la sélection, Carte ouverte sur l'une d'elles relue par `CarteIdentite.actualiser()` (à la suite des enregistrements en file ; relit depuis le début si la Carte est encore en lecture). Les identifiants versés sont journalisés : une page demandée avant et reçue après les reprend en `versee`. Changement de contexte ou page détruite (`DestroyRef`) pendant l'envoi : plus aucun paquet, rien d'écrit (sauf le journal).
- Échec : Bandeau propre au versement (`erreurVersement`, dans la barre), indépendant de celui des lectures ; récapitulatif des paquets déjà appliqués affiché avec lui. « Réessayer » seulement pour une erreur passagère (`erreurPassagere`) : il envoie les Images non envoyées encore sélectionnées (la sélection n'est plus figée après l'échec) et complète le même récapitulatif. Tant qu'un lot en échec attend, les gestes de sélection ne ferment pas le récapitulatif ; fermer le Bandeau abandonne la reprise.
- Récapitulatif : message de partage (singulier ou pluriel) si au moins une versée, bilan seul dans la région `role="status"` (présente avant d'être remplie), liste des refusées hors de la région, défilante au clavier. Refusées dédoublonnées par Image à la fusion des paquets (une Image versée depuis n'y est plus). L'annonce du nombre par la barre est tue pendant l'envoi et à l'arrivée du récapitulatif. Si « Verser » disparaît, le focus va au bouton « Fermer le récapitulatif » (référence de gabarit lue en `ElementRef`).

Vérification : specs de `banque`, `commun/selection`, `commun/barre-actions-lot` et `commun/carte-identite` vertes (135 tests pour les trois premiers, 87 pour la Carte d'identité) ; `verifier-jetons` vert ; vérification complète et taille du paquet initial faites par le coordinateur.

Vérification à la clôture : front 991 tests, `verifier-jetons` vert, paquet initial 599,78 kB (inchangé). Les deux tests de gros lot (650 vignettes) ont un délai de 20 s : le délai par défaut de 5 s était dépassé sous la charge de la suite complète. Non vérifié en navigateur : apparition au survol, barre collante, case `appearance: none`.

## Spec Change Log

## Review Triage Log

Revue 1 (Blind Hunter BH, Edge Case Hunter EC, Verification Gap VG).

| # | Constat | Verdict | Preuve | Suite |
|---|---------|---------|--------|-------|
| 1 | BH-1, EC-5, VG-autre : « Réessayer » renvoie des Images désélectionnées après l'échec | high | Versement sans consentement | patch (intersection avec la sélection courante) |
| 2 | EC-1, EC-8 : changement de contexte ou destruction pendant la boucle | high | Paquets envoyés, récapitulatif sur la mauvaise liste | patch |
| 3 | BH-2, EC-4, VG-autre : une seule erreur pour la liste et le versement | medium | « Réessayer » perdu d'un côté ou de l'autre | patch |
| 4 | BH-3, EC-6 : échec partiel sans récapitulatif | medium | Résultats appliqués jamais montrés | patch |
| 5 | BH-4 : 4xx déterministes réessayables | low | Échec répété | patch |
| 6 | EC-2 : rechargement périmé efface les badges « versée » | medium | Réponse partie avant le versement | patch |
| 7 | EC-3 : actions actives pendant le rechargement | low | Verser muet, « Tout sélectionner » vide | patch |
| 8 | EC-7, EC-12 : Carte ouverte sur une déjà versée non relue | low | Bouton Verser périmé | patch |
| 9 | BH-5 : Échap incohérent (panneau, figé, champ de recherche) | medium | Sélection effacée par Échap dans un champ | patch |
| 10 | BH-6, BH-7, BH-8 : nom « loup () », récapitulatif sans limite, annonces simultanées | medium | Lot de centaines de refus ; bilan perdu | patch |
| 11 | BH-9, EC-9, BH-10 : case invisible active, tactile, style natif hors DESIGN.md | medium | Sélection accidentelle sur tablette | patch |
| 12 | BH-11 : vignette ouverte en jaune réservé | low | DESIGN.md : jaune pour navigation, puces, étiquettes | patch (anneau seul ; sélection en `primary-container`) |
| 13 | EC-10 : Maj+clic sans ancre désélectionne | low | Geste de plage | patch |
| 14 | VG-1, VG-2, BH-12, BH-13, BH-14 : tests manquants (`actualiser`, récapitulatif, filtres), `querySelector`, doublons | medium | Régressions silencieuses | patch |
| 15 | EC-11 : le lot n'est pas tout ou rien comme la spec le laisse lire | low | Paquets appliqués au retour, voulu pour 650 Images | rejeté (noté dans l'implémentation) |
| 16 | BH-4 (suite) : réseau coupé après validation → « déjà dans la banque » | low | Ambiguïté inhérente au réseau ; le compte reste juste | rejeté |

## Verification

**Commands:**
- `cd front && npm test -- --watch=false && npm run build` -- expected: tests et `verifier-jetons` au vert, paquet initial ≤ 599,78 kB.
