---
title: 'Rétrospective de l''Epic 2, action 2 : Encart et Bandeau « Annuler »'
type: 'bugfix'
created: '2026-11-23'
status: 'done'
baseline_commit: '4b70c4e4d1f4b8091d756486fca0942e99282729'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/realisation/epic-2-retro-2026-11-22.md'
  - '{project-root}/docs/realisation/spec-2-9-reprendre-les-mots-deja-illustres.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** La rétrospective de l'Epic 2 relève trois défauts : B-4, B-5 et B-6.
- **B-4, le Bandeau « Annuler » survit à la sortie de la page.** C'est un `MatSnackBar` racine que rien ne ferme à la navigation.
  - Si l'enseignant quitte la Préparation après un retrait puis clique « Annuler », le rétablissement est envoyé, et sa réponse est écrite dans un composant détruit.
  - Après un écart, « Annuler » ne fait rien, et rien ne le dit.
  - Les comptes de l'administration sont exposés de la même façon.
- **B-5, un rechargement de l'Encart peut faire revenir un Mot tout juste écarté ou repris.** `recharger()`, que la page appelle après chaque retrait et chaque rétablissement, écrit sa réponse même si un geste de l'Encart a eu lieu pendant la lecture.
- **B-6, un refus sous verrou mal traduit.** L'Encart ne traduit pas `ressource.introuvable`, renvoyé par `Usages.lierImage` quand l'Image cesse d'être proposable, en « image indisponible ». La page, elle, le fait.

**Approach:**
- Le Bandeau « Annuler » se ferme, sans annuler, dès que la navigation commence. Son opération reste faite, comme quand un nouveau Bandeau remplace le précédent.
- L'Encart tient une révision de ses gestes, comme `GrilleMots` pour la Grille. Une relecture partie avant un geste est ignorée.
- `ressource.introuvable` rejoint les codes « image indisponible » de l'Encart.

Décisions :
- **Fermeture à la navigation :** `BandeauAnnuler`, un service racine, ferme le bandeau ouvert au premier événement de navigation du routeur (`NavigationStart`), quelle que soit la page. Cela vaut aussi pour les comptes et pour le passage d'une Préparation à une autre. Il n'y a ni annonce ni message. Les bandeaux restent un seul à la fois.
- **Révision de l'Encart :** toute écriture locale de la liste des candidats (reprise d'un Mot, « Tout reprendre », écart) incrémente une révision. `recharger()` note la révision au départ et n'écrit sa réponse que si elle n'a pas changé. Comme dans la partie 1, aucune fusion et aucune relance. `charger()` est la lecture à l'ouverture et sur « Réessayer » ; il garde son numéro de chargement actuel.
- **Codes :** l'Encart traduit `ressource.introuvable` comme la page, avec le message « image indisponible » propre à l'Encart, suivi du rechargement de l'Encart. L'unification des listes de codes avec le back relève de l'action 3, pas d'ici.

## Boundaries & Constraints

**Always:**
- Le minuteur de 8 s, la suspension au survol et au focus, et l'unicité du bandeau restent inchangés.
- Textes en français, au vouvoiement ; jetons et accessibilité inchangés.
- Paquet initial sous 600 kB, aujourd'hui à 599,12 kB : le service racine est déjà dans le paquet initial, et l'ajout doit y rester minime.

**Never:**
- Aucun changement du back, du contrat ni de `front/src/app/api/`.
- Ne pas annuler l'opération à la fermeture du bandeau, ni demander confirmation pour quitter la page.
- Ne pas toucher aux codes d'erreur du back : c'est l'action 3.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Retrait puis navigation | Retrait d'un Mot, puis « Mes préparations » | Bandeau fermé, aucun rétablissement possible ni envoyé | N/A |
| Écart puis navigation | Écart dans l'Encart, puis navigation | Bandeau fermé | N/A |
| Autre Préparation | Retrait, puis ouverture d'une autre Préparation | Bandeau fermé | N/A |
| Comptes | Action annulable sur un compte, puis navigation | Bandeau fermé, l'action reste faite | N/A |
| Sans navigation | Retrait puis « Annuler » sur la même page | Comme aujourd'hui : Mot rétabli | N/A |
| Relecture puis écart | Retrait (relecture de l'Encart lancée), écart d'un candidat, puis réponse contenant ce candidat | Le candidat écarté ne revient pas | N/A |
| Relecture puis reprise | Relecture lancée, « Reprendre » d'un candidat, puis réponse le contenant encore | Le candidat repris ne revient pas | N/A |
| Relecture seule | Aucun geste pendant la relecture | La liste relue remplace l'Encart | N/A |
| Refus sous verrou | « Reprendre » refusé par 409 `ressource.introuvable` | Message « image indisponible » de l'Encart, Encart rechargé | N/A |

</frozen-after-approval>

## Code Map

- `front/src/app/commun/bandeau-annuler/bandeau-annuler.ts` -- `BandeauAnnuler.afficher` (snackbar racine) : fermeture à `NavigationStart`.
- `front/src/app/preparations/encart-mots-deja-illustres.ts` -- `CODES_IMAGE_INDISPONIBLE` (l.56), `charger` (l.277), `reprendreUn`, « Tout reprendre » (l.~340-398), `ecarter` (l.402), `annulerEcart`, `retirer` (l.486), `recharger` (l.498).
- `front/src/app/preparations/grille-mots.ts` -- modèle de la révision.
- Specs : `bandeau-annuler.spec.ts`, `encart-mots-deja-illustres.spec.ts`, `preparation.spec.ts` (retrait puis navigation).

## Tasks & Acceptance

**Execution:**
- [x] `front/src/app/commun/bandeau-annuler/bandeau-annuler.ts` (+ spec) -- fermeture à la navigation.
- [x] `front/src/app/preparations/encart-mots-deja-illustres.ts` (+ spec) -- révision des gestes, `ressource.introuvable`.
- [x] Tests : une ligne de test par ligne de la matrice, au niveau qui convient (service, Encart ou page).

**Acceptance Criteria:**
- Given un Bandeau « Annuler » affiché, when l'enseignant navigue ailleurs, then le bandeau disparaît et son opération reste faite.
- Given une relecture de l'Encart en cours, when l'enseignant écarte ou reprend un candidat, then ce candidat ne réapparaît pas à l'arrivée de la relecture.

## Implementation Notes

- `BandeauAnnuler` garde la référence du bandeau ouvert et s'abonne aux événements du `Router` ; à `NavigationStart`, il appelle `BandeauAnnulerContenu.fermer()`, qui marque le bandeau terminé (un clic pendant l'animation de sortie n'annule plus rien), suspend la minuterie et ferme sans action. Paquet initial : 599,25 kB.
- Encart : champ `revision`, augmenté dans `retirer` (reprise, écart) et `appliquerReprises` (« Tout reprendre ») ; `recharger()` n'écrit que si chargement et révision sont inchangés. `charger()` inchangé. `ressource.introuvable` ajouté à `CODES_IMAGE_INDISPONIBLE` ; l'ancien test « autre code » utilise désormais `preparation.mot_deja_illustre`.
- Après revue : `afficher` prend le `DestroyRef` de l'appelant (page, Encart, comptes) ; appelant détruit, aucun bandeau ; sa destruction ferme le sien. Le bandeau remplacé est marqué terminé avant l'ouverture du suivant. `recharger()` numérote ses appels (seul le dernier écrit) et relance la lecture, au plus 2 fois, quand un geste a changé la révision ; l'annulation d'un écart augmente la révision. `ressource.introuvable` n'est « image indisponible » que sur un 409 ; un 404 garde son message générique. EXPERIENCE.md : le bandeau se ferme, sans annuler, à la navigation.
- Tests : navigation (retrait, autre Préparation, comptes, sans navigation) dans `bandeau-annuler.spec.ts` ; retrait puis navigation avec le bandeau réel dans `preparation.spec.ts` ; relecture puis écart, reprise, « Tout reprendre », relecture seule et refus sous verrou dans `encart-mots-deja-illustres.spec.ts`. Les nouveaux tests échouent sans le correctif (vérifié par mutation).

## Spec Change Log

## Review Triage Log

Revue 1 (Blind Hunter BH, Edge Case Hunter EC, Verification Gap VG).

| # | Constat | Verdict | Preuve | Suite |
|---|---------|---------|--------|-------|
| 1 | EC-1, EC-2, EC-7 : réponse d'un geste arrivée après la navigation, Bandeau ouvert sur la page suivante | high | « Annuler » viserait encore la page quittée : B-4 pas fermé | patch (`DestroyRef` de l'appelant) |
| 2 | BH-2 : Bandeau remplacé non marqué terminé | medium | Son « Annuler » agit pendant l'animation de sortie | patch |
| 3 | VG-1, BH-1 : clic pendant la sortie non testé | medium | Le test clique après destruction de la vue | patch (test) |
| 4 | BH-5, EC-4 : relecture jetée qui portait le Mot retiré de la Grille | medium | Le Mot ne revient pas dans l'Encart | patch (relance bornée) |
| 5 | EC-5 : deux relectures dans le désordre | low | Retrait de la Grille et annulation d'écart rapprochés | patch |
| 6 | EC-6 : `annulerEcart` n'augmente pas la révision | low | Relecture plus ancienne écraserait le Mot rendu | patch |
| 7 | BH-6 : `ressource.introuvable` traduit aussi sur 404 | medium | Mot ou Préparation supprimé ailleurs : message faux | patch (409 seulement) |
| 8 | VG-2, BH-3, EC-8 : titre de test « sans navigation » trompeur | low | Le cas est couvert par « Annuler à 5 s » | patch (renommé) |
| 9 | BH-9 : EXPERIENCE.md muet sur la fermeture à la navigation | low | Règle nouvelle | patch |
| 10 | BH-8, EC-3 : `NavigationStart` d'une navigation qui reste sur la page | low | Décision gelée ; redirections rares, l'opération reste faite | rejeté |
| 11 | BH-4, BH-7 : pas de test de page ou de comptes pour le clic après navigation | low | Couvert au niveau du service et par la ligne 1 | rejeté |
| 12 | BH-10, BH-11 : suivi documentaire, marge du paquet | — | Faits à la clôture ; marge connue de la rétrospective | rejeté |

## Verification

**Commands:**
- `cd front && npm test -- --watch=false && npm run build` -- expected: tests et `verifier-jetons` au vert, paquet initial sous 600 kB.
