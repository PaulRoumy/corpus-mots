---
title: 'Rétrospective de l''Epic 2, action 1, partie 2 : panneaux latéraux fiables'
type: 'bugfix'
created: '2026-11-23'
status: 'done'
baseline_commit: '56af894b8d15640d8e13fa1aba0fba859beaa16d'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/realisation/epic-2-retro-2026-11-22.md'
  - '{project-root}/docs/realisation/spec-retro-e2-1-grille-mots.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** La rétrospective de l'Epic 2 (constats B-2 et B-3) et la revue de la partie 1 relèvent trois défauts.
- **Résultat perdu (B-2) :** le Panneau de choix d'Image perd le résultat d'un choix, d'un changement de Sens ou d'une création de Sens si on le ferme pendant la requête (« Fermer », Échap). Il le perd aussi, pour un choix d'Image, si on le fait passer à un autre Mot. Le serveur a pourtant enregistré : la Grille ne correspond plus à la base.
- **Mot disparu (B-3) :** quand le Mot d'un panneau latéral quitte la Grille par une relecture, la Carte d'identité reste ouverte sur un Mot absent, et le Panneau de choix est détruit sans rendre le focus.
- **Annonce fantôme :** un changement de Sens ou d'Image sur un Mot sorti de la Grille est quand même annoncé, et le focus est envoyé vers une vignette absente.

**Approach:**
- Le Panneau de choix d'Image reçoit de la page des rappels d'application, sur le modèle de `[appliquer]` de la Carte d'identité (story 2.6). Une réponse réussie s'applique donc à la Grille même si le panneau est fermé ou ouvert sur un autre Mot.
- Quand le Mot d'un panneau latéral disparaît de la Grille, le panneau se ferme et le focus va au Champ de saisie rapide.
- Une mise à jour qui ne trouve plus son Mot n'annonce rien et ne déplace pas le focus.

Décisions :
- **Panneau de choix :** les sorties `choisi` et `sensChange` sont remplacées par deux entrées de rappel. Elles sont appelées pour toute réponse réussie, quel que soit le Mot affiché et même après la fermeture.
  - Le focus et la fermeture restent liés au Mot affiché. Un choix réussi ferme le panneau et rend le focus à la vignette seulement si le panneau est encore ouvert sur ce Mot. Sinon, la Carte est mise à jour sans fermer ni déplacer le focus.
  - Les messages d'erreur ne s'affichent que si le panneau montre encore le Mot concerné, comme aujourd'hui.
- **Panneau fermé pendant l'envoi :** la réponse met à jour la Carte et son compteur, puis s'annonce (« Image de « loup » changée. », « Sens de « loup » : … »). Le focus ne bouge pas.
- **Mot disparu de la Grille :**
  - si la Carte d'identité ou le Panneau de choix est ouvert sur lui, le panneau se ferme et le focus va au Champ de saisie rapide ;
  - l'annonce « « loup » n'est plus dans la préparation. » est faite par `Annonces` ;
  - en plein écran, la page redevient active.
  - Un retrait fait par l'enseignant garde son comportement actuel : panneau fermé, focus à la Carte voisine.
- **Mise à jour d'un Mot absent :** quand `GrilleMots.remplacer` renvoie faux, il n'y a ni annonce ni déplacement du focus. Cela vaut pour `appliquerChangementSens`, `appliquerChoixImage` et le chemin du pictogramme, déjà traité.

## Boundaries & Constraints

**Always:**
- Les écritures de la Grille passent par `GrilleMots`, et les annonces par `Annonces` (partie 1).
- La Carte d'identité garde son rappel `[appliquer]`. Le Panneau de choix suit le même modèle, et les deux restent chargés comme aujourd'hui (Panneau de choix à la demande).
- Paquet initial sous 600 kB.
- Textes en français, au vouvoiement ; accessibilité inchangée par ailleurs.

**Never:**
- Aucun changement du back, du contrat ni de `front/src/app/api/`.
- Pas de nouvelle requête : rien n'est relu pour appliquer une réponse.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Choix puis fermeture | Image choisie, « Fermer » avant la réponse, puis réponse | Carte avec la nouvelle Image, compteur suivi, annonce, focus inchangé | N/A |
| Choix puis Échap | Idem avec Échap | Idem | N/A |
| Choix puis autre Mot | Image choisie pour « loup », vignette de « renard » cliquée, puis réponse | Carte « loup » mise à jour, panneau ouvert sur « renard », focus inchangé | N/A |
| Sens puis fermeture | Changement de Sens, « Fermer », puis réponse | Carte avec le nouveau Sens (Image retirée si de l'ancien Sens), annonce | N/A |
| Création de Sens puis fermeture | « Créer le sens », « Fermer », puis réponse | Carte avec le Sens créé | N/A |
| Choix nominal | Panneau ouvert sur le Mot jusqu'à la réponse | Comme aujourd'hui : panneau fermé, focus à la vignette | N/A |
| Mot disparu, Panneau de choix | Relecture sans le Mot du panneau ouvert | Panneau fermé, focus au champ, annonce « … n'est plus dans la préparation. » | N/A |
| Mot disparu, Carte d'identité | Relecture sans le Mot de la Carte ouverte | Carte fermée, focus au champ, annonce | N/A |
| Mise à jour d'un absent | Réponse de Sens ou de choix pour un Mot retiré entre-temps | Aucune annonce, focus inchangé, Grille inchangée | N/A |
| Échec après fermeture | Erreur réseau sur un choix, panneau fermé | Rien d'affiché, Grille inchangée | N/A |

</frozen-after-approval>

## Code Map

- `front/src/app/preparations/panneau-choix-image.ts` -- sorties `choisi` (envoi l.~455-470, émise seulement si même Mot) et `sensChange` (`choisirSens`, `creerSens`), « Fermer » et Échap : rappels d'application à la place.
- `front/src/app/preparations/preparation.ts` -- `afficherChoixImage` (l.858, abonnements l.891-900), `appliquerChoixImage` (l.~1436), `appliquerChangementSens`, `carteOuverte` / `choixOuvert` / `motChoixImage` (l.793-810), `rendreFocusVignette` (l.1521), `appliquerCarteIdentite` (l.1541, modèle), fermeture lors d'un retrait (l.1193-1197).
- `front/src/app/preparations/grille-mots.ts`, `annonces.ts` -- services de la partie 1.
- `front/src/app/preparations/panneau-choix-image.spec.ts`, `preparation.spec.ts` -- test « panneau fermé pendant l'enregistrement » de la Carte d'identité (l.~4215) comme modèle ; l'assertion de `panneau-choix-image.spec.ts:284` (choix non émis après changement de Mot) est à revoir.

## Tasks & Acceptance

**Execution:**
- [x] `front/src/app/preparations/panneau-choix-image.ts` (+ spec) -- rappels d'application.
- [x] `front/src/app/preparations/preparation.ts` (+ spec) -- branchement des rappels, fermeture des panneaux sur Mot disparu, mises à jour silencieuses d'un absent ; une ligne de test par ligne de la matrice.

**Acceptance Criteria:**
- Given un choix d'Image en cours, when l'enseignant ferme le panneau puis que la réponse arrive, then la Carte affiche la nouvelle Image.
- Given un panneau ouvert sur « loup », when une relecture ne contient plus « loup », then le panneau est fermé et le focus est dans le Champ de saisie rapide.

## Implementation Notes

- `PanneauChoixImage` : sorties `choisi` et `sensChange` remplacées par les entrées `appliquerChoix` et `appliquerSens` (rappels `(mot) => void`), appelées pour toute réponse réussie. À la destruction du panneau (`DestroyRef`), `envoiCourant` et `derniereLecture` sont incrémentés : une réponse arrivée après la fermeture appelle son rappel, mais n'affiche aucun message, ne relit pas les propositions et ne touche pas au focus du panneau. Les échecs restent ignorés si le panneau ne montre plus le Mot.
- `Preparation` : les rappels sont passés par `setInput` à la création du panneau. `appliquerChoixImage` et `appliquerChangementSens` deviennent des propriétés fléchées et ne font rien si `GrilleMots.remplacer` renvoie faux. `appliquerChoixImage` ne ferme le panneau et ne rend le focus à la vignette que si `choixOuvert()` est encore ce Mot.
- B-3 : `chargerMots` appelle `fermerPanneauSansMot(avant)` quand la liste relue est écrite. Si le Mot du Panneau de choix ou de la Carte d'identité n'y est plus, le panneau se ferme, `Annonces` dit « « loup » n'est plus dans la préparation. » et le focus va au Champ de saisie rapide. `chargerMots` renvoie alors vrai, et `signalerMotChange` ne pose pas son propre focus.
- Tests modifiés : `panneau-choix-image.spec.ts`, « passé à un autre Mot pendant un envoi réussi », attendait que le Mot de l'ancien ne soit pas émis. Il attend maintenant qu'il soit appliqué, le panneau restant sur le nouveau Mot. Dans le bloc « 600 px » de `preparation.spec.ts`, `ouvrirPanneau` renvoie `{ racine, fixture, serveur, stabiliser }`.
- Tests ajoutés : panneau fermé pendant un choix, en succès et en échec, et pendant un changement de Sens. Côté page, une ligne par ligne de la matrice (le choix nominal est couvert par les tests existants), plus la relecture qui garde le Mot, la Carte d'identité dont le Mot disparaît et la page redevenue active sous 600 px.
- Paquet initial : 599,12 kB, inchangé.

## Spec Change Log

## Review Triage Log

Revue 1 (Blind Hunter BH, Edge Case Hunter EC, Verification Gap VG).

| # | Constat | Verdict | Preuve | Suite |
|---|---------|---------|--------|-------|
| 1 | BH-1, EC-3 : une réponse tardive ferme un panneau rouvert sur le même Mot et déplace le focus | medium | `choixOuvert() === change.id` ne distingue pas une réouverture | patch (le panneau dit s'il montre encore le Mot) |
| 2 | BH-3 : rappels de la page appelés dans le `try` de la requête | low | Une exception de la page passerait pour un échec d'envoi | patch |
| 3 | BH-4, EC-4 : focus envoyé au champ derrière un dialogue ouvert | medium | Téléverser ou Thème ouvert pendant la relecture | patch |
| 4 | VG-1 : garde `!panneauFerme` de `signalerMotChange` non testée | medium | Aucun test de pictogramme avec panneau ouvert | patch (test) |
| 5 | BH-10 : EXPERIENCE.md ne décrit pas l'annonce ni la règle de focus | low | Comportements nouveaux | patch |
| 6 | EC-1, EC-2 : deux réponses pour un même Mot arrivant dans le désordre | low | Deux envois en vol sur le même Mot, dans deux ouvertures du panneau ; rare | defer |
| 7 | BH-2 : panneau rouvert affichant un Sens d'avant une réponse tardive | low | Rouvrir pendant l'envoi ; corrigé à la réouverture suivante | defer |
| 8 | EC-5 : Mot absent de la nouvelle liste et de l'ancienne | low | Aucun panneau ne peut être ouvert sur un Mot absent de l'ancienne liste | rejeté |
| 9 | EC-6, BH-5 : rejet levé vers une Création de Sens détruite | low | Sans effet visible, noté dans l'implémentation | rejeté |
| 10 | BH-6 : assertion de focus faible (Sens puis Fermer) | low | Le navigateur perd le focus au re-rendu de la vignette ; hors de notre code | rejeté |
| 11 | BH-7, BH-8, BH-9 : test sous 600 px incomplet, téléversement depuis le panneau, aide dupliquée | low | Chemins couverts par les tests de page ; refactor de test sans effet produit | rejeté |
| 12 | BH-11 : sections de revue vides, marge du paquet | — | Remplies au tri ; marge déjà connue (rétrospective) | rejeté |

## Verification

**Commands:**
- `cd front && npm test -- --watch=false && npm run build` -- expected: tests et `verifier-jetons` au vert, paquet initial sous 600 kB.
