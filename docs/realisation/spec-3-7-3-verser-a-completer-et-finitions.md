---
title: 'Story 3.7, partie 3 : verser avec un Sens « à compléter » et finitions de la Banque'
type: 'feature'
created: '2026-11-27'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '{project-root}/docs/realisation/epic-3-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problème :** deux critères de la story 3.7 restent ouverts après la démo du 25 novembre.
- **Versement :** aucun test ne garantit qu'une Image versable par ailleurs, dont le Sens est « à compléter », peut être versée (FR-19).
- **Finitions visuelles :**
  - le libellé « Temps passé (facultatif) » de l'En-tête de Préparation est coupé (écart E-3) ;
  - le fond de focus reste sur la puce de provenance de la Banque après un clic (E-4) ;
  - dans la grille de la Banque, les cartes avec et sans badge « versée » ne sont pas alignées (E-5).

**Approche :**
- **Versement :** un test dédié montre que l'Image est versée et que la Carte d'identité garde le Sens « à compléter » mis en avant (`sens.aCompleter`). Si le versement était refusé, la règle serait corrigée dans `Versabilite`.
- **Champ « Temps passé » :** il est assez large pour son libellé (jeton `--cm-largeur-champ-temps`).
- **Puces de provenance :** elles ne montrent la couche de focus qu'au focus clavier (`:focus-visible`), avec un contour visible.
- **Grille de la Banque :** chaque vignette prend toute la hauteur de sa rangée, si bien que les vignettes d'une même rangée ont la même hauteur, badge « versée » ou non.

</frozen-after-approval>

## Implementation Notes

- **Versement :** `VersementImagesResourceTest.unSensACompleterNeBloquePasLeVersement`. Une image libre CC0 sourcée, au Sens « à compléter », est versée (`200`, `versee`, `versabilite` nulle), et sa Carte d'identité garde `sens.aCompleter = true`. Le test passe sans changer `Versabilite`, qui ne regarde pas le Sens : aucun correctif côté back.
- **E-3 :** `--cm-largeur-champ-temps` passe de 200 à 264 px (`styles/_jetons.scss`). L'En-tête (`.entete__bas`) passe à la ligne au besoin (`flex-wrap`).
- **E-4 :** dans `banque/banque.scss`, les puces de provenance prennent `mat.chips-overrides` (opacités de focus à 0, sélectionnée comprise) tant qu'aucun de leurs éléments n'a `:focus-visible`. Au focus clavier, la couche de Material revient, avec un contour (`--cm-anneau-focus-epaisseur`, `--cm-anneau-focus-decalage`, comme les autres anneaux de focus).
- **E-5 :** `.groupe__vignettes > li { display: grid; }`. La vignette s'étire à la hauteur de la rangée de la grille : sa `height: 100%` ne portait que sur un hôte de hauteur automatique.
- E-3 à E-5 relèvent de la mise en page : ni jsdom ni les tests unitaires ne les vérifient. Elles restent à contrôler à l'œil dans l'application.

## Review Triage Log

Revue 1 (Blind Hunter BH).

- BH-1 (low, patch) : l'anneau de focus des puces empruntait le jeton de l'anneau de vignette ouverte. Il prend maintenant les jetons de focus du projet.
- BH-2 (low, patch) : des variables CSS de Material étaient posées à la main. La surcharge passe désormais par `mat.chips-overrides`, qui échoue à la compilation si un jeton change.
- BH-3 (low, rejeté) : libellé « à compléter » écrit en dur dans le test. `Usages.LIBELLE_A_COMPLETER` est privé au paquetage `vocabulaire.service`, et les tests de l'API écrivent déjà ce libellé ainsi (`CarteIdentiteImageResourceTest`, `SensImageResourceTest`). L'assertion `sens.aCompleter` échouerait si le libellé divergeait.
- BH-4 (low, rejeté) : vue d'un collègue. Le versement ne dépend pas du Sens, et la visibilité d'une Image versée est déjà testée.
- BH-5 / BH-6 (false) : notes et vérification de la spec, remplies à la clôture.
- BH-7 (false) : sprint-status. La story passe en `review` à la clôture de sa dernière partie.
- BH-8 (low, rejeté) : largeur fixe de 264 px. Le zoom met les px à l'échelle avec le texte, et l'En-tête passe à la ligne.
- BH-9 (low, rejeté) : seuls les cadres des vignettes sont égalisés, pas leur contenu. L'écart de la démo portait sur les cartes, désormais de même hauteur. Le haut des vignettes (photo) est déjà aligné.
- BH-10 (low, rejeté) : aucun test front du focus des puces. `:focus-visible` n'est pas fiable sous jsdom.

Vérification à la clôture : back `./mvnw verify` 826 tests verts, `@QuarkusTest` compris (PostgreSQL de test lancé à la main), contrat inchangé ; front 1 058 tests verts, puis Banque 113 tests verts après les corrections de la revue ; `npm run build` réussi, paquet initial 599,93 kB.
