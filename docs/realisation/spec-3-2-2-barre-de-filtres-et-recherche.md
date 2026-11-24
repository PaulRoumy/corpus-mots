---
title: 'Story 3.2, partie 2 : barre de filtres de la Banque et Champ de recherche'
type: 'feature'
created: '2026-11-24'
status: 'done'
baseline_commit: 'b29eaa3b6ca46f6480181fdfd1b64759326a82d3'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/realisation/epic-3-context.md'
  - '{project-root}/docs/realisation/spec-3-2-1-filtres-de-la-banque.md'
  - '{project-root}/docs/realisation/spec-3-1-2-carte-identite-dans-la-banque.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Le back filtre la Banque depuis la partie 1, mais la page n'en montre rien. Il n'y a pas de puces de filtre, la Banque ignore `?mot=` envoyé par le Champ de recherche, et un filtre sans résultat n'a pas d'état vide. La story 3.2 (FR-15) demande des puces combinables, reflétées dans l'URL, avec « Aucune image » et « Effacer les filtres ».

**Approach:** Une barre de Puces de filtre sous la puce de provenance. Chaque filtre est un paramètre de requête nommé comme celui de `GET /api/images`, et l'URL est la seule source des filtres. Changer un filtre recharge la grille depuis la première page, comme un changement de provenance.

Décisions :
- **Paramètres d'URL :** `mot`, `sensId`, `section`, `albumId`, `moduleId`, `themeId`, `categorie`, `typeImage` et `proprietaireId`, à côté de `provenance`. Une valeur invalide dans l'URL est ignorée par le front, qui ne l'envoie pas au back.
- **Puces :** une puce par filtre, en choix unique (DESIGN.md, Puce de filtre). Une puce sans valeur montre le nom du filtre, par exemple « Section ». Une puce avec valeur montre « Section : GS », en `secondary-container` avec coche, et se retire par un bouton « Retirer le filtre Section ». Les options viennent de :
  - **Section :** PS, MS, GS ;
  - **catégorie grammaticale** et **type d'image :** les valeurs du contrat, avec les libellés déjà employés par la Carte d'identité ;
  - **Thème :** `listerThemes` ;
  - **Album :** un champ de recherche dans le menu, avec `rechercherAlbums` pendant la frappe ;
  - **Module :** `listerModulesDeLAlbum` de l'Album choisi. Sans Album, la puce est désactivée, avec l'indication « Choisissez d'abord un album ». Retirer ou changer l'Album retire aussi le Module ;
  - **propriétaire :** `listerProprietairesBanque`, avec les noms de l'Annuaire (AD-20). L'enseignant apparaît en premier, sous le libellé « Moi » ;
  - **Mot :** il vient du Champ de recherche. La puce affiche « Mot : citrouille », avec la saisie telle que l'URL la porte, et se retire comme les autres ;
  - **Sens :** l'en-tête de chaque groupe de la grille porte un bouton « Filtrer sur ce sens ». La puce montre le libellé du Sens tant qu'un groupe le fournit, sinon « Sens choisi ».
- **Libellés après rechargement de la page :** le titre de l'Album vient de `lireAlbum`, le nom du Module de `listerModulesDeLAlbum` et le Thème de `listerThemes`. Si une lecture échoue, la puce affiche le nom du filtre suivi de « (inconnu) » et reste retirable.
- **« Effacer les filtres »** retire tous les filtres sauf la provenance. Il apparaît dans la barre dès qu'un filtre est posé, et dans l'état vide.
- **État vide filtré :** un filtre posé et un total de 0 affichent « Aucune image » et « Effacer les filtres ». Sans aucun filtre, l'état vide de la story 3.1 (« Ajouter une image » sous Mes mots) ne change pas.
- **Champ de recherche :** Entrée ouvre `/banque?provenance=tout&mot=<saisie>`, même règle que Tout (EXPERIENCE.md). Les autres filtres sont abandonnés. La tolérance (casse, accents, article) est celle du back. Taper depuis la Banque elle-même remplace la recherche. Le champ se vide une fois la navigation faite.
- **Annonces :** chaque rechargement filtré annonce le nombre d'Images, comme un changement de provenance. Le panneau Carte d'identité se ferme à chaque changement de filtre.
- **Erreur de la route :** un `400 requete.invalide` est traité comme une autre erreur de chargement, avec le Bandeau d'erreur existant et « Réessayer ».

## Boundaries & Constraints

**Always:**
- Le client généré seulement (AD-7). Aucun changement du back ni du contrat.
- La barre de filtres vit dans le morceau de la Banque, chargé à la demande. Le paquet initial reste sous 600 kB : la coquille ne gagne que le paramètre `provenance=tout`.
- Accessibilité : les puces sont des boutons nommés, les menus se pilotent au clavier, et le focus revient à la puce à la fermeture du menu. Après « Effacer les filtres », le focus va au titre « Banque ».
- Une réponse arrivée pour des filtres quittés depuis n'écrit rien, comme pour la provenance (story 3.1).
- Textes en français, au vouvoiement ; jetons de DESIGN.md.

**Never:**
- Pas de valeurs multiples par filtre, ni de filtre construit à la main hors des paramètres listés.
- Pas de suggestion de Mots pendant la frappe dans le Champ de recherche.
- Pas de sélection, de Verser ni d'actions en lot : ce sont d'autres stories.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Combiner | Section GS, puis catégorie verbe | URL `?section=gs&categorie=verbe`, grille rechargée avec ces deux filtres envoyés | N/A |
| Retirer un filtre | « Retirer le filtre Section » | Paramètre retiré de l'URL, grille rechargée | N/A |
| Module sans Album | Aucun Album | Puce Module désactivée avec l'indication | N/A |
| Album changé | Album et Module posés, autre Album choisi | Module retiré | N/A |
| Propriétaires | Ouverture de la puce | « Moi » d'abord, puis les collègues nommés par l'Annuaire | Échec : message dans le menu et « Réessayer » |
| Sens | « Filtrer sur ce sens » sur un groupe | `?sensId=…`, puce au libellé du Sens | N/A |
| Sans résultat | Filtres posés, total 0 | « Aucune image » + « Effacer les filtres » | N/A |
| Effacer | « Effacer les filtres » | Ne reste que `provenance`, focus sur le titre | N/A |
| Recherche | « la Citrouille » + Entrée, depuis n'importe quelle page | `/banque?provenance=tout&mot=la%20Citrouille`, puce « Mot : la Citrouille » | N/A |
| Recherche vide | Entrée sur un champ vide | Rien | N/A |
| Lien partagé | URL avec `albumId` et `themeId`, page rechargée | Puces aux bons libellés | Lecture en échec : « Album (inconnu) », retirable |
| URL invalide | `?section=cp` | Filtre ignoré, non envoyé | N/A |
| Réponse périmée | Filtre changé avant la réponse précédente | Seule la dernière réponse s'affiche | N/A |

</frozen-after-approval>

## Code Map

- `front/src/app/banque/banque.ts` (+ spec) -- `provenanceDeLUrl`, signal `provenance` tiré de `queryParamMap`, rechargement à la première page, annonces, état vide, en-têtes de groupe, panneau.
- `front/src/app/banque/` -- nouveau composant de barre de filtres (fichier à part, dans le morceau de la Banque).
- `front/src/app/coquille/coquille.ts` (+ spec) -- `chercher` (l.~236).
- `front/src/app/commun/carte-identite/` -- libellés de catégorie et de type à réutiliser.
- Annuaire (`GET /enseignants`) -- noms des propriétaires, comme pour les vignettes (story 3.1).

## Tasks & Acceptance

**Execution:**
- [x] Barre de filtres : puces, menus, options, libellés, retrait, « Effacer les filtres ».
- [x] Banque : filtres lus dans l'URL et envoyés au client, rechargement, état vide filtré, « Filtrer sur ce sens ».
- [x] Coquille : `provenance=tout` dans la recherche, champ vidé.
- [x] Tests : au moins un test par ligne de la matrice.

**Acceptance Criteria:**
- Given la Banque, when l'enseignant combine des puces, then l'URL porte un paramètre par filtre et la grille ne montre que les Images qui les satisfont.
- Given un filtre sans résultat, when la grille est vide, then elle affiche « Aucune image » et « Effacer les filtres ».
- Given le Champ de recherche, when l'enseignant tape « la Citrouille » puis Entrée, then la Banque s'ouvre en Tout, filtrée sur ce Mot.

## Implementation Notes

- Filtres lus par `banque/filtres-banque.ts` (`filtresDeLUrl`) : identifiant sous forme canonique, Section, catégorie et type parmi les valeurs du contrat, identifiants passés en minuscules, `mot` rogné de 1 à 100 caractères (`LONGUEUR_MAX_MOT` de `commun/longueur-mot.ts`, aussi `maxlength` du Champ de recherche et source de `preparations/longueurs-mot.ts`), paramètre répété ignoré. Un `moduleId` sans `albumId` est ignoré aussi (la puce Module n'existe qu'avec l'Album). La Banque dérive `provenance` et `filtres` d'un seul signal des paramètres ; `filtres` compare champ à champ, donc une même URL ne relit rien.
- Barre : `banque/barre-filtres.ts` (+ scss), dans le morceau de la Banque. Puces en `button` maison (Puce de filtre de DESIGN.md : 32 px, `secondary-container` et coche une fois choisie, triangle de menu en CSS), menus `mat-menu` (déjà dans le paquet initial par la coquille) aux entrées `menuitemradio` ; le focus revient à la puce à la fermeture. Mot et Sens n'ont pas de menu : leur puce ne paraît qu'une fois posée ; les retirer donne le focus à la puce Section. Retirer une autre puce garde le focus sur elle.
- Options lues à l'ouverture du menu (Thèmes, propriétaires) ou dès que la valeur est posée (Thème, titre de l'Album par `lireAlbum`, Modules de l'Album) ; libellé « … choisi » pendant la lecture, « … (inconnu) » en échec ou si la valeur n'est pas dans la liste. Un propriétaire absent de l'annuaire chargé : « Propriétaire : ancien compte » (comme les vignettes). Menu en échec : message et entrée « Réessayer » qui garde le menu ouvert. Recherche d'Album : champ dans le menu, délai et longueur minimale de `preparations/recherche-albums.ts`, Flèche bas passe aux résultats, Échap et Tab ferment.
- Puce Module sans Album : `aria-disabled`, sans menu, indication « Choisissez d'abord un album » en description (texte masqué) et en `title`.
- Annonce du nombre d'Images (« 3 images. », « Aucune image. ») à chaque première page lue après un changement de provenance ou de filtres, et à l'arrivée sur une URL filtrée ; « Réessayer » garde l'annonce due par la lecture échouée ; rien à l'arrivée sans filtre ni après un ajout d'Image. L'annonce n'existait pas pour la provenance avant cette partie : elle vaut désormais pour les deux.
- « Filtrer sur ce sens » : bouton à côté du `h2` du groupe (hors du titre), décrit par lui ; masqué sur le groupe du Sens déjà filtré. La puce dit « Sens : forme (Sens) », libellé gardé d'une lecture à l'autre ; liste chargée sans ce Sens et sans libellé connu : « Sens (inconnu) ».
- « Effacer les filtres » retire les seuls paramètres de filtre : la provenance reste telle que l'URL la porte (absente, elle reste absente).
- Recherche d'Album : Flèche bas passe au premier résultat par l'entrée Material (le gestionnaire de clavier du menu suit), Flèche haut sur le premier résultat revient au champ ; plus de titres trouvés qu'affichés : « Précisez votre recherche pour voir les autres albums. ». Le même Album re-choisi après un titre illisible prend le titre de la recherche ; une lecture en échec est refaite quand l'Album revient par l'URL. Minuteries libérées à la fermeture du menu et à la destruction.
- Puces : couche d'état au survol et au focus (opacités `--mat-sys-*-state-layer-opacity`), anneau de focus `primary`.
- Coquille : `/banque?provenance=tout&mot=…` sans fusion des paramètres (les filtres sont abandonnés), champ vidé une fois la navigation faite (sauf navigation refusée).
- Nouveaux jetons : `--cm-hauteur-puce`, `--cm-epaisseur-bordure-puce`, `--cm-taille-retrait-puce`, `--cm-largeur-menu-recherche`.
- Vérification : front 883 tests et `verifier-jetons` verts ; paquet initial 599,60 kB (599,04 kB avant), sous le budget de 600 kB mais avec 0,4 kB de marge seulement. La hausse vient des jetons (styles +0,12 kB), de la coquille et d'environ 0,38 kB de plus dans le morceau partagé d'`@angular/core` (non attribué : retirer `NgTemplateOutlet` n'y change rien).

Vérification à la clôture : front 893 tests, `verifier-jetons` vert, paquet initial 599,66 kB (0,34 kB de marge).

## Spec Change Log

## Review Triage Log

Revue 1 (Blind Hunter BH, Edge Case Hunter EC, Verification Gap VG).

| # | Constat | Verdict | Preuve | Suite |
|---|---------|---------|--------|-------|
| 1 | BH-1, BH-2, BH-3, EC-3 : puce Sens figée sur « Sens choisi », clignotante, sans la forme du Mot | medium | Lien partagé sans résultat ; rechargement remet `images` à `null` | patch |
| 2 | BH-7, EC-6 : « Réessayer » après un changement de filtre perd l'annonce | medium | `chargerPremierePage()` sans `annoncer` | patch |
| 3 | EC-8 : arrivée filtrée (recherche, lien) sans annonce | low | Spec : chaque rechargement filtré annonce | patch |
| 4 | BH-8 : « Effacer les filtres » ajoute `provenance=mes-mots` | low | Absence de provenance = Mes mots | patch |
| 5 | EC-1 : UUID en majuscules dans l'URL | low | Comparaisons strictes : « (inconnu) », « ancien compte » | patch |
| 6 | EC-2 : titre d'Album en échec jamais relu | low | Même Album rechoisi | patch |
| 7 | BH-6, EC-4, EC-5 : recherche d'Album au clavier (gestionnaire de focus, retour au champ), résultats tronqués muets | medium | Clavier bloqué dans le menu | patch |
| 8 | BH-15 : minuteries non annulées | low | Focus sur un champ disparu | patch |
| 9 | BH-12 : puces sans survol ni focus visible | medium | Focus clavier invisible | patch |
| 10 | BH-4, EC-7 : longueur 100 recopiée ; navigation rejetée non traitée | low | Dérive possible ; promesse rejetée | patch |
| 11 | BH-13bis : commentaire de la Banque inexact | low | Bouton masqué sur le groupe filtré | patch |
| 12 | VG-1, VG-2, VG-3, BH-9, BH-10, BH-11, VG-4 : tests manquants (pages suivantes filtrées, provenance, « Réessayer », Thème, Module, échecs, mêmes filtres) | medium | Régressions silencieuses | patch (tests) |
| 13 | BH-5 : contenu non `menuitem` dans les `mat-menu` (messages, champ de recherche) | low | Rôle ARIA `menu` ; à reprendre avec un combobox ou un dialogue | defer |
| 14 | BH-14 : `barre-filtres.ts` de 773 lignes | low | Lisibilité ; découpe avec la Génération de Fiche (mêmes filtres) | defer |
| 15 | BH-13 : listes des propriétaires et des Thèmes lues une fois par page | low | Nouveau versement rare pendant la consultation | defer |
| 16 | EC-9 : `mot` rogné avant affichage | low | Le back rogne aussi ; pas d'écart de résultat | rejeté |

## Verification

**Commands:**
- `cd front && npm test -- --watch=false && npm run build` -- expected: tests et `verifier-jetons` au vert, paquet initial sous 600 kB.
