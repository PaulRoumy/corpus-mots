---
title: 'Rétrospective de l''Epic 2, action 1, partie 1 : état de la Grille hors de preparation.ts'
type: 'refactor'
created: '2026-11-23'
status: 'done'
baseline_commit: '6c8babd3c0a1b8b7683400cf1e31808fa18f7470'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/realisation/epic-2-retro-2026-11-22.md'
  - '{project-root}/docs/realisation/spec-2-4-2-choisir-un-pictogramme.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** La rétrospective de l'Epic 2 (constats A-1, B-1, B-7) relève trois problèmes dans `preparation.ts`.
- **Concentration :** le fichier fait 2 032 lignes et écrit la Grille (`mots`) à 12 endroits.
- **Relecture périmée (B-1) :** seule une Image posée incrémente la révision qui protège contre une relecture. Une relecture des Mots partie avant un ajout, une reprise, un retrait, un rétablissement, un Thème ou un Sens peut donc annuler ce changement. Elle peut aussi ressusciter une Carte retirée ou doubler un Mot.
- **Annonces perdues (B-7) :** la région `aria-live` est écrite tantôt directement, tantôt de façon différée. Une annonce peut ainsi en écraser une autre.

**Approach:** L'état de la Grille sort de la page dans un service `GrilleMots`, fourni par le composant `Preparation` (`providers`). Il détient la liste des Mots, sa révision et toutes ses écritures. Un service d'annonce unique écrit la région `aria-live`. B-1 et B-7 sont corrigés par construction. Aucun comportement visible ne change, sauf la disparition de ces deux défauts. La partie 2 traitera le Panneau de choix fermé pendant l'envoi (B-2) et les panneaux dont le Mot disparaît (B-3).

Décisions :
- **`GrilleMots`** expose en lecture `mots()`, `null` tant que rien n'est chargé. Ses écritures sont les seules du front :
  - `charger(liste, revisionAuDepart)` : n'écrit que si aucune écriture locale n'a eu lieu depuis `revisionAuDepart`.
  - `ajouter(mot)` : sans doublon, à sa place selon `ordre`.
  - `remplacer(mot)` : renvoie faux si le Mot n'y est plus.
  - `retirer(id)`.
  - `vider()`.

  Toute écriture locale incrémente la révision, lue par `revision()`. Les listes dérivées que la page utilise aujourd'hui (nombre de Mots, déjà illustrés, `motsPresents`, Mot d'un panneau) deviennent des `computed` du service ou de la page, lus depuis `mots()`.
- **Relecture concurrente :** si une écriture locale a eu lieu pendant une relecture, la réponse de la relecture est ignorée, comme aujourd'hui pour une Image. Le Mot qui a déclenché la relecture garde alors son état local. C'est le compromis déjà accepté dans la story 2.4.2 ; rien n'est fusionné.
- **`Annonces`**, un service fourni par la page : `annoncer(message)` est le seul moyen d'écrire la région `aria-live` de la page. Il vide la région, puis la remplit après le rendu, comme `annoncer()` aujourd'hui. Deux annonces dans le même tour donnent la dernière, sans qu'un `set` direct l'écrase ensuite. Les annonces directes actuelles passent par lui : ajout, rétablissement, téléversement. L'Encart garde sa sortie `(annonce)`, branchée sur ce service.
- `preparation.ts` perd la gestion de la liste et des annonces. Il garde la mise en page, l'orchestration des requêtes et la file d'ajouts.

## Boundaries & Constraints

**Always:**
- Aucune écriture de la liste des Mots en dehors de `GrilleMots`, et aucune écriture de la région `aria-live` en dehors d'`Annonces`. Un test de chaque service, plus une vérification que `preparation.ts` n'écrit plus `mots` directement : recherche de `.set(` et `.update(` sur la liste.
- Les services sont fournis au niveau du composant `Preparation`, pas en `root` : une Préparation ouverte après une autre repart d'un état vide.
- Tous les tests existants de `preparation.spec.ts` passent sans changer leurs attentes, sauf celles qui décrivaient le défaut corrigé. Ces dernières sont nommées dans les Implementation Notes.
- Paquet initial sous 600 kB, aujourd'hui à 599,12 kB : le code déplacé reste dans le chunk de la Préparation, chargé à la demande.
- Textes, jetons et accessibilité inchangés.

**Never:**
- Aucun changement du back, du contrat ni de `front/src/app/api/`.
- Pas de bibliothèque d'état (NgRx ou autre) : des services Angular à signaux.
- Ne pas traiter B-2 ni B-3, qui relèvent de la partie 2.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Relecture puis retrait | Refus d'un pictogramme (relecture lancée), puis « Retirer » sur une autre Carte, puis réponse de la relecture | La Carte retirée ne revient pas | N/A |
| Relecture puis reprise | Relecture lancée, puis « Reprendre » dans l'Encart, puis réponse | Le Mot repris reste dans la Grille | N/A |
| Relecture puis Sens | Relecture lancée, puis changement de Sens dans le Panneau de choix, puis réponse | Le nouveau Sens reste | N/A |
| Relecture puis ajout | Relecture lancée, puis ajout par le champ, puis réponse contenant déjà ce Mot | Un seul exemplaire du Mot | N/A |
| Relecture seule | Aucune écriture locale pendant la relecture | La liste relue remplace la Grille | N/A |
| Ajout en double | `ajouter` d'un Mot déjà présent | Un seul exemplaire, à sa place `ordre` | N/A |
| Remplacer un absent | `remplacer` d'un Mot retiré | Faux, Grille inchangée | N/A |
| Deux annonces | Réponse d'ajout et reprise de l'Encart dans le même tour | La région contient une annonce complète, jamais vidée par l'autre ; aucune écriture directe | N/A |
| Autre Préparation | Ouverture d'une autre Préparation | Grille et révision repartent de zéro | N/A |

</frozen-after-approval>

## Code Map

- `front/src/app/preparations/preparation.ts` -- `mots` (l.769), `annonce` (l.775), `revisionMots` (l.843), `chargerMots` (l.1006), écritures l.943, 1051, 1125, 1194, 1243, 1273, 1348, 1424, 1467, 1558, 1605 ; `annoncer` (l.1531) ; annonces directes l.951, 1135, 1276, 1379 ; `inserer` (l.250), `remplacerMotIllustre` (l.1418) ; la région `aria-live` (l.648).
- `front/src/app/preparations/encart-mots-deja-illustres.ts` -- sortie `(annonce)` branchée sur `annoncer`.
- `front/src/app/preparations/preparation.spec.ts` -- tests existants ; le test « une relecture des Mots partie avant un choix réussi ne l'écrase pas » sert de modèle aux nouveaux.
- `front/src/app/preparations/` -- nouveaux `grille-mots.ts`, `annonces.ts` (+ specs).

## Tasks & Acceptance

**Execution:**
- [x] `front/src/app/preparations/grille-mots.ts` (+ spec) -- liste, révision, écritures, chargement gardé.
- [x] `front/src/app/preparations/annonces.ts` (+ spec) -- écriture unique de la région `aria-live`.
- [x] `front/src/app/preparations/preparation.ts` -- n'utilise plus que ces deux services pour la liste et les annonces.
- [x] `front/src/app/preparations/preparation.spec.ts` -- une ligne de test par ligne de la matrice ; tests existants verts.

**Acceptance Criteria:**
- Given `preparation.ts`, when on cherche une écriture de la liste des Mots ou de la région `aria-live` hors des deux services, then il n'y en a aucune.
- Given les tests de la page, when on lance `npm test`, then tous passent, et les quatre scénarios de relecture de la matrice sont couverts.

## Implementation Notes

- `GrilleMots` (`grille-mots.ts`) : `mots()`, `revision()`, `motsPresents()` et `nombreIllustres()` en lecture ; `charger(liste, revisionAuDepart)` renvoie vrai s'il a écrit. Une écriture sur une Grille pas encore chargée (`null`) ne fait rien et ne compte pas. `vider()` remet la liste à `null` et la révision à 0 ; la page continue d'ignorer par `dernierChargement` les réponses d'une Préparation quittée. Les reports sur plusieurs Mots (Carte d'identité, Thème supprimé) passent par un `remplacer` par Mot concerné.
- `Annonces` (`annonces.ts`) : `annoncer` vide la région et garde un seul message en attente, écrit par un unique `afterNextRender` ; plusieurs annonces avant le rendu donnent la dernière. `effacer()` sert à l'ouverture d'une autre Préparation (la page vidait déjà la région). Les ajouts, le rétablissement et le téléversement, autrefois écrits directement, sont donc annoncés après le rendu, comme les autres.
- `preparation.ts` : plus aucun `mots.set`/`mots.update` ni écriture de `annonce` ; `revisionMots`, `inserer` et `annoncer` supprimés. 2 032 → 2 004 lignes.
- Tests existants : aucune attente modifiée. Nouveaux tests de page (bloc « Grille et annonces ») : retrait, reprise, Sens, ajout (dans les deux ordres de réponse), relecture seule, deux annonces, autre Préparation. Cinq d'entre eux échouent sur le code de base (retrait, reprise, Sens, ajout dont la réponse arrive après la relecture, deux annonces). Le scénario Sens appelle directement `appliquerChangementSens`, gestionnaire de la sortie `sensChange` du Panneau de choix, sans passer par la liste déroulante.
- Paquet initial : 599,12 kB, inchangé.

Après revue : la relecture lancée par un refus de pictogramme est relancée jusqu'à deux fois si une écriture locale l'a rendue périmée ; le test « une relecture des Mots partie avant un choix réussi ne l'écrase pas » garde son attente et reçoit en plus la réponse de la relecture relancée (`[false, false]`).

## Spec Change Log

## Review Triage Log

Revue 1 (Blind Hunter BH, Edge Case Hunter EC, Verification Gap VG).

| # | Constat | Verdict | Preuve | Suite |
|---|---------|---------|--------|-------|
| 1 | BH-1, BH-2, EC-1, VG-1 : relecture d'un refus de pictogramme jetée dès qu'une écriture locale survient, jamais relancée | medium | Mot illustré ailleurs affiché « à illustrer » avec son bandeau | patch (relance bornée) |
| 2 | BH-6 : `retirer` d'un absent incrémente la révision | low | Relecture valable jetée sans raison | patch |
| 3 | BH-3 : test « relecture puis ajout » qui ne prouve pas le dédoublonnage | low | La relecture est ignorée avant | patch (renommé) |
| 4 | BH-9, EC-2, EC-3 : annonce et focus pour un Mot sorti de la Grille (Sens, choix d'Image) | medium | Relève de B-3 | defer (partie 2) |
| 5 | BH-4 : le Bandeau « Annuler » annonce par `LiveAnnouncer`, hors d'`Annonces` | low | Région distincte, celle du Bandeau | defer (action 2) |
| 6 | BH-5 : `vider()` remet la révision à zéro (ABA) | low | Décision gelée de la spec ; `dernierChargement` filtre les réponses d'une autre Préparation, testé | rejeté |
| 7 | BH-7, EC-4 : ordre tenu par `ajouter` seul ; ajout trié au lieu d'ajouté en fin | low | Le back donne la liste triée et un nouvel ajout a l'`ordre` le plus grand : même rendu | rejeté |
| 8 | BH-8 : écritures multiples en N appels | low | Coût négligeable à l'échelle d'une Préparation | rejeté |
| 9 | BH-10 : tests qui appellent des méthodes internes | low | Chemins couverts par ailleurs ; sans effet produit | rejeté |

## Verification

**Commands:**
- `cd front && npm test -- --watch=false && npm run build` -- expected: tests et `verifier-jetons` au vert, paquet initial sous 600 kB.
