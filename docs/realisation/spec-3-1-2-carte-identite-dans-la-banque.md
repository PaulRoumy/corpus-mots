---
title: 'Story 3.1, partie 2 : ouvrir la Carte d''identité depuis la Banque'
type: 'feature'
created: '2026-11-23'
status: 'done'
baseline_commit: 'd55edca7fc64eec641b1b64acca6610867bfeba8'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/realisation/epic-3-context.md'
  - '{project-root}/docs/realisation/spec-3-1-1-grille-de-la-banque.md'
  - '{project-root}/docs/ux-designs/ux-corpus-mots-2026-10-28/.working/key-banque.html'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Dans la Banque livrée par la partie 1, une vignette n'est pas cliquable. Pour consulter ou corriger une Image, l'enseignant doit passer par une Préparation. La story 3.1 demande qu'un clic sur une vignette ouvre le Panneau Carte d'identité de la story 2.6. Le panneau ne masque pas la grille ; il est modifiable par le propriétaire et en lecture seule sinon.

**Approach:**
- La vignette devient un bouton qui ouvre le composant existant `commun/carte-identite` en panneau latéral droit. La mise en page reprend celle de la Préparation : grille et panneau côte à côte, panneau en plein écran sous 600 px, page inerte dessous. Le composant décide déjà seul s'il est modifiable ; rien n'y change.
- La page passe au composant un rappel `[appliquer]` qui met à jour la vignette après chaque enregistrement.

Décisions :
- **Vignette :**
  - Toute la vignette est un `button`, de nom accessible « Carte d'identité de « forme » ». Le propriétaire et les badges restent lisibles dans ce nom ou à côté.
  - Clic, Entrée ou Espace ouvre le panneau sur cette Image.
  - La vignette de l'Image ouverte porte `aria-expanded="true"` et un état visuel sélectionné (anneau `primary`, selon DESIGN.md).
- **Panneau :**
  - Il s'ouvre à droite, à `{spacing.side-panel-width}`, et la grille garde ses colonnes visibles. Sous 600 px, il couvre l'écran et la page dessous est inerte, comme dans la Préparation.
  - Un clic sur une autre vignette remplace l'Image affichée.
  - Un clic sur la même vignette ne relit rien et rend le focus au panneau.
- **Fermeture :** « Fermer » ou Échap ferme le panneau, et le focus revient à la vignette de l'Image. Si cette vignette n'est plus affichée, le focus va au titre « Banque ».
- **Mise à jour :** le rappel `[appliquer]` reçoit la Carte d'identité enregistrée, et la vignette suit. Cela vaut même si le panneau a été fermé ou est passé à une autre Image pendant l'envoi, comme dans la Préparation (B-2).
  - **Champs suivis :** Sections, type, Mot et Sens.
  - **Changement de Sens :** l'Image rejoint le groupe de son nouveau Sens s'il est déjà chargé. Sinon, elle forme un nouveau groupe à sa place actuelle. Un groupe n'apparaît jamais deux fois.
  - Le nombre total ne change pas.
- **Changement de provenance :** il ferme le panneau. « Afficher plus » le laisse ouvert.
- La Carte d'identité garde son comportement de la story 2.6 :
  - enregistrement automatique à la sortie de chaque champ ;
  - lecture seule pour une Image versée d'un collègue, avec son propriétaire ;
  - erreurs affichées dans le panneau.

## Boundaries & Constraints

**Always:**
- Le composant `commun/carte-identite` est réutilisé tel quel. S'il faut l'adapter, l'adaptation ne doit pas changer son comportement dans la Préparation (tests existants verts).
- La Banque reste chargée à la demande, et le paquet initial reste sous 600 kB.
- Accessibilité : `aria-expanded`, le focus rendu et la page inerte en plein écran, comme dans la Préparation.
- Textes en français, au vouvoiement ; jetons de DESIGN.md.

**Never:**
- Aucun changement du back, du contrat ni de `front/src/app/api/`.
- Pas de Verser, de Supprimer, de sélection ni de « Utiliser dans une préparation » : ce sont d'autres stories.
- Pas de nouvelle requête pour mettre la vignette à jour : on n'utilise que la réponse de l'enregistrement.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Ouvrir sa propre Image | Clic sur une vignette de Mes mots | Panneau à droite, grille visible, champs modifiables ; vignette `aria-expanded="true"` | N/A |
| Ouvrir l'Image d'un collègue | Clic sur une vignette versée d'un collègue (Banque de l'école) | Panneau en lecture seule, propriétaire affiché | N/A |
| Clavier | Tab jusqu'à une vignette, Entrée | Panneau ouvert, focus dans le panneau | N/A |
| Autre vignette | Panneau ouvert, clic sur une autre vignette | Le panneau montre la nouvelle Image | N/A |
| Fermer | « Fermer » ou Échap | Panneau fermé, focus sur la vignette | N/A |
| Modification | Le propriétaire change le type ou les Sections | La vignette affiche le nouveau badge ou les nouvelles Sections | Erreur d'enregistrement : affichée dans le panneau, vignette inchangée |
| Changement de Sens | Sens changé vers un Sens déjà affiché | La vignette rejoint ce groupe ; aucun groupe en double | N/A |
| Fermé pendant l'envoi | Modification, « Fermer » avant la réponse, puis réponse | Vignette mise à jour, focus inchangé | N/A |
| Petit écran | Largeur < 600 px | Panneau plein écran, page inerte ; à la fermeture, page active et focus sur la vignette | N/A |
| Changement de provenance | Panneau ouvert, autre puce de provenance | Panneau fermé, liste rechargée | N/A |

</frozen-after-approval>

## Code Map

- `front/src/app/banque/vignette-banque.ts` (+ scss) -- vignette en `button`, état sélectionné, `aria-expanded`.
- `front/src/app/banque/banque.ts` (+ spec) -- disposition grille + panneau, ouverture, fermeture et focus, `[appliquer]`, regroupement par clé de Sens sans doublon.
- `front/src/app/commun/carte-identite/carte-identite.ts` -- entrées `imageId`, `appliquer`, sortie `fermer` ; `focus()`.
- `front/src/app/preparations/preparation.ts` -- modèle : `disposition`, `pleinEcran`, `pageInerte`, `ouvrirCarteIdentite`, `fermerCarteIdentite`, `rendreFocusVignette`, `appliquerCarteIdentite`.

## Tasks & Acceptance

**Execution:**
- [x] `front/src/app/banque/vignette-banque.ts` -- bouton, sélection.
- [x] `front/src/app/banque/banque.ts` (+ spec) -- panneau, focus, mise à jour ; un test par ligne de la matrice.

**Acceptance Criteria:**
- Given une vignette de la Banque, when l'enseignant clique dessus, then la Carte d'identité s'ouvre à droite sans masquer la grille, modifiable s'il est propriétaire et en lecture seule sinon.
- Given le panneau ouvert, when l'enseignant le ferme, then le focus revient à la vignette.

## Implementation Notes

- La mise en page grille + panneau (`.disposition*`) est extraite de `preparation.scss` vers `commun/disposition-panneau.scss`, partagée par la Préparation et la Banque ; `commun/carte-identite` n'est pas modifié.
- Vignette : bouton nommé « Carte d'identité de « forme » », Repères, Badges et propriétaire en `aria-describedby` ; anneau `primary` par le nouveau jeton `--cm-epaisseur-anneau-vignette-ouverte`.
- Changée de Sens, la vignette change de groupe et est recréée : si elle avait le focus, il la suit.
- Vérification : front 856 tests, `verifier-jetons` vert, paquet initial 599,04 kB.

## Spec Change Log

## Review Triage Log

Revue 1 (Blind Hunter BH, Edge Case Hunter EC, Verification Gap VG).

| # | Constat | Verdict | Preuve | Suite |
|---|---------|---------|--------|-------|
| 1 | BH-1 : panneau resté ouvert sur une Image sortie de la liste | medium | `appliquer` sans effet ensuite ; la Préparation ferme déjà (B-3) | patch |
| 2 | EC-1 : provenance changée par l'historique, focus dans le panneau | medium | Focus perdu sur `body` | patch |
| 3 | EC-2 : passage sous 600 px, focus resté dans la page inerte | medium | Clavier bloqué | patch |
| 4 | BH-4, EC-5 : `etat`, `aRemplacer`, `reutilisable` non repris de la Carte | low | Badge « versée » périmé | patch |
| 5 | EC-4 : libellé ou catégorie du Sens changés, en-tête de groupe inchangé | low | En-tête faux | patch |
| 6 | BH-2, BH-3, BH-9 : état ouvert semblable au focus, nom accessible sans Sens, `aria-controls` absent | low | DESIGN.md `selected-card-background` ; deux vignettes de même nom | patch |
| 7 | VG-1 : catégorie reprise de la Carte non testée | low | Aucun test ne la fait changer | patch (test) |
| 8 | BH-12 : commentaire de `disposition-panneau.scss` périmé | low | Usages partagés non dits | patch |
| 9 | VG-2 : seuil de 600 px non vérifié par le faux `BreakpointObserver` | low | Même procédé que la Préparation | defer |
| 10 | BH-5 : changement de Sens puis « Afficher plus » peut sauter une Image | low | Même cause que la pagination par décalage | defer (entrée de la partie 1) |
| 11 | BH-8 : logique de panneau recopiée de la Préparation | low | Partage à faire avec un troisième usage | defer |
| 12 | EC-3 : enregistrement arrivé pendant le rechargement de la première page | low | La liste relue après l'enregistrement le contient | rejeté |
| 13 | BH-6, BH-7 : test clavier par clic, tests d'Échap sur une liste ouverte, redimensionnement, ids | low | Bouton natif ; Échap géré par la Carte d'identité (story 2.6) ; redimensionnement couvert par la ligne 3 | rejeté |
| 14 | BH-10 : compteur d'identifiants au niveau du module | low | Sans effet visible | rejeté |
| 15 | BH-11 : paquet initial au bord du budget | low | La Carte d'identité entre dans le morceau de la Banque, chargé à la demande | rejeté |

## Verification

**Commands:**
- `cd front && npm test -- --watch=false && npm run build` -- expected: tests et `verifier-jetons` au vert, paquet initial sous 600 kB.
