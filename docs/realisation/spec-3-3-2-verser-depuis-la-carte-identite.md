---
title: 'Story 3.3, partie 2 : « Verser » dans la Carte d''identité'
type: 'feature'
created: '2026-11-24'
status: 'done'
baseline_commit: 'ae49fedd95f34ce91deb0f33ef1ceeca22abfca2'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/realisation/epic-3-context.md'
  - '{project-root}/docs/realisation/spec-3-3-1-verser-cote-back.md'
  - '{project-root}/docs/realisation/spec-3-1-2-carte-identite-dans-la-banque.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Le back sait verser une Image depuis la partie 1, mais aucun écran ne le propose. La story 3.3 demande que le propriétaire verse une Image depuis le Panneau Carte d'identité, dans la Banque comme dans la Préparation. Il doit voir le message de partage puis le badge « versée ». Quand l'Image n'est pas versable, « Verser » est indisponible et la raison exacte s'affiche (NFR-10, NFR-11).

**Approach:** Une section « Verser » dans la Carte d'identité, visible seulement pour le propriétaire d'une Image privée. Son état découle de `versabilite`, que chaque Carte renvoyée remet à jour. Le versement passe par `POST /images/{id}/versement`. La Carte reçue en réponse est appliquée comme après tout enregistrement, ce qui met à jour la vignette de la Banque ou de la Préparation.

Décisions :
- **Affichage :**
  - Avec `versabilite = "versable"`, la section montre un bouton tonal « Verser dans la banque de l'école ».
  - Avec un code de refus, le bouton reste visible mais indisponible (`aria-disabled`, toujours focusable). Il est suivi de la raison, liée par `aria-describedby` : « Verser indisponible : <raison>. »
  - Avec `versabilite = null` (Image versée, ou lecteur qui n'en est pas le propriétaire), la section n'apparaît pas.
- **Raisons, au vouvoiement, une par code :**
  - `image_album` : « une image d'album reste dans Mes mots » ;
  - `type_inconnu` : « type inconnu, précisez le type de l'image » ;
  - `source_manquante` : « source à préciser » ;
  - `licence_non_versable` sans licence : « licence à préciser » ;
  - `licence_non_versable` avec une licence : « licence non partageable » ;
  - `retrait_admin` : « image retirée par l'administrateur ; modifiez sa carte d'identité pour la verser à nouveau ».

  Ces libellés vivent dans un fichier partagé `commun/versement/raisons-versement.ts`, que la Barre d'actions en lot de la partie 3 réutilisera. Ce fichier n'est importé que par des composants chargés à la demande. `MESSAGES_PAR_CODE` ne change pas.
- **Verser :**
  - Pendant l'envoi, le bouton est indisponible et indique « Versement… ».
  - En cas de succès, la Carte reçue remplace la Carte affichée et passe par `[appliquer]`. Le message « L'image reste la vôtre. Les collègues peuvent l'utiliser, personne ne peut la modifier. » s'affiche dans la section en `role="status"`. Le badge « versée » apparaît dans les repères de la Carte et sur la vignette.
  - Le message reste affiché jusqu'au changement d'Image ou à la fermeture du panneau.
  - Le focus passe au message, puisque le bouton disparaît.
- **Erreurs :**
  - **Code de versabilité reçu en 400** (la Carte a changé ailleurs) : la Carte est relue et la raison s'affiche.
  - **`409 ressource.modifiee_entre_temps`** : la Carte est relue et le message du code s'affiche dans le Bandeau d'erreur de la Carte.
  - **`404 image.indisponible`** et autres erreurs : le Bandeau d'erreur existant, avec « Réessayer » si l'erreur est réessayable.
  - Une réponse arrivée après un changement d'Image ou une fermeture du panneau n'écrit rien dans le panneau. La Carte reçue passe quand même par `[appliquer]`, comme pour les autres enregistrements (B-2).
- **Badge « versée » dans la Carte :** un repère « versée » (`{colors.etat-versee-bg}`) s'ajoute aux repères quand `etat = versee`, pour le propriétaire comme pour les collègues en lecture seule.
- **Après une modification d'un champ :** la Carte renvoyée met `versabilite` à jour. La raison change ou disparaît sans action de l'enseignant, par exemple quand il renseigne la source.

## Boundaries & Constraints

**Always:**
- Le client généré seulement (AD-7). Aucun changement du back ni du contrat.
- Le paquet initial ne grossit pas. Il est à 599,78 kB : les nouveaux libellés et la section restent dans les morceaux chargés à la demande. La build doit le confirmer.
- Le comportement actuel de la Carte d'identité est inchangé (tests existants verts), dans la Banque comme dans la Préparation.
- Accessibilité : le bouton indisponible reste focusable, la raison est annoncée et le focus est géré après le versement. Les jetons viennent de DESIGN.md.

**Never:**
- Pas de retrait (« Ne plus verser ») : c'est la story 3.5.
- Pas de sélection ni d'actions en lot : c'est la partie 3.
- Pas de confirmation avant de verser : le message suffit, et la story 3.5 apportera le retrait.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Versable | Ma photo privée | Bouton « Verser dans la banque de l'école » actif | N/A |
| Verser | Clic sur le bouton | `POST …/versement`, message de partage, repère « versée », vignette mise à jour, focus sur le message | N/A |
| Image d'album | Mon image d'album | Bouton indisponible, « Verser indisponible : une image d'album reste dans Mes mots. » | N/A |
| Licence absente | Image libre sourcée, sans licence | « … licence à préciser. » | N/A |
| Licence non partageable | Licence Pixabay | « … licence non partageable. » | N/A |
| Source manquante | Image libre sans source | « … source à préciser. » | N/A |
| Retrait admin | `versabilite = retrait_admin` | Raison du retrait affichée | N/A |
| Correction | Source renseignée puis enregistrée | La raison disparaît, le bouton devient actif | N/A |
| Collègue | Image versée de Zoé | Pas de section Verser, repère « versée » visible | N/A |
| Déjà versée | Ma photo versée | Pas de section, repère « versée » | N/A |
| Refus serveur | 400 `image.versement.source_manquante` | Carte relue, raison affichée | N/A |
| Conflit | 409 `ressource.modifiee_entre_temps` | Carte relue, Bandeau d'erreur avec le message | N/A |
| Fermé pendant l'envoi | Fermeture avant la réponse | Vignette mise à jour par `[appliquer]`, rien dans le panneau | N/A |

</frozen-after-approval>

## Code Map

- `front/src/app/commun/carte-identite/carte-identite.ts` (+ spec, scss) -- repères (l.~345), `modifiable`, `lectureSeule`, `appliquer` (l.785), enregistrements et réponses tardives (l.~1250, 1376), Bandeau d'erreur.
- `front/src/app/commun/versement/` -- nouveau fichier des raisons.
- `front/src/app/banque/banque.ts`, `front/src/app/preparations/preparation.ts` -- `[appliquer]` et badge « versée » des vignettes (à vérifier, sans changement si `etat` est déjà repris).
- `front/src/app/commun/erreurs/message-erreur.ts` -- `messageErreur`, sans ajout.

## Tasks & Acceptance

**Execution:**
- [x] Section Verser (de préférence un sous-composant de la Carte), raisons, envoi, message, focus.
- [x] Repère « versée » dans la Carte.
- [x] Tests : un par ligne de la matrice ; vérifier dans la Banque et la Préparation que la vignette prend le badge.

**Acceptance Criteria:**
- Given une de mes Images versables ouverte dans la Carte, when je choisis « Verser », then le message de partage s'affiche, puis le badge « versée ».
- Given une Image non versable, when j'ouvre sa Carte, then « Verser » est indisponible et la raison exacte s'affiche.

## Implementation Notes

- `commun/versement/raisons-versement.ts` : `Versabilite`, `CodeRefusVersement`, `LIBELLE_VERSER`, `LIBELLE_VERSEMENT_EN_COURS`, `MESSAGE_VERSEMENT`, `estRefusVersement`, `raisonVersement` (« licence à préciser » sans licence, « motif inconnu » pour un code inconnu) et `phraseVersementIndisponible`. Importé seulement par `commun/carte-identite`, chargée à la demande.
- Sous-composant présentationnel `commun/carte-identite/versement-image.ts` : bouton `matButton="tonal"` avec `disabledInteractive` (`aria-disabled`, focusable, clic sans effet), raison en `aria-describedby`, « Versement… » pendant l'envoi. Le message de partage n'a pas de région vive : il est lu parce qu'il prend le focus (`focusMessage()`).
- `CarteIdentite` : `verser()` passe dans `fileEnregistrements` (`.catch`, puis `versementEnCours` remis à faux dans `finally`) ; au moment d'envoyer, la versabilité de la Carte affichée est revérifiée (sinon rien n'est envoyé et la raison est annoncée). Succès : Carte passée à `appliquer` (protégé : une erreur de la page n'est pas un échec du versement), affichée, message focalisé.
- Refus de versabilité en 400 ou `409` : relecture sans squelette, passée à `appliquer` même panneau fermé ou remplacé ; dans le panneau, seule la Carte est remplacée et les champs non modifiés (valeur égale à l'ancienne Carte) la suivent, les saisies non enregistrées et le champ signalé restent. Le refus est annoncé par `LiveAnnouncer` (poli) ; si la Carte relue est encore versable, la raison reçue s'affiche dans le Bandeau. Le 409 affiche son message dans le Bandeau. Focus rendu au panneau si son élément a disparu.
- « Réessayer » : l'action à reprendre (versement, relecture) est portée par l'erreur affichée (`ErreurAffichee.reprendre`) ; sans elle, le champ signalé est renvoyé.
- À la destruction du panneau, `derniereLecture` est incrémenté : toute réponse tardive ne passe plus que par `appliquer`.
- Repère « versée » (`--cm-etat-versee-*`, icône `coche`) dans les repères de la Carte, pour tous les lecteurs.
- Banque : `appliquerCarteIdentite` reprend aussi `versabilite`. Préparation : `appliquerCarteIdentite` reprend `etat`, `aRemplacer`, `reutilisable` et `versabilite` ; la Carte de Mot affiche le Badge « versée » seulement pour une Image de l'enseignant connecté (FR-18).

Vérification à la clôture : front 933 tests, `verifier-jetons` vert, paquet initial 599,78 kB (inchangé). Un versement encore en file quand le panneau se ferme ou change d'Image n'est pas envoyé (contrôle à l'envoi).

## Spec Change Log

## Review Triage Log

Revue 1 (Blind Hunter BH, Edge Case Hunter EC, Verification Gap VG).

| # | Constat | Verdict | Preuve | Suite |
|---|---------|---------|--------|-------|
| 1 | BH-1, BH-2, EC-2, VG-2, VG-3 : « Réessayer » relance la mauvaise action (Bandeau fermé, échec de champ, relecture en échec) | high | Indicateur `echecVersement` qui survit à l'erreur | patch (action portée par l'erreur affichée) |
| 2 | BH-6, EC-1 : la relecture efface la saisie non enregistrée et les erreurs de champ | medium | `remplir` réinitialise tout le formulaire | patch |
| 3 | BH-3, EC-3 : refus 400 non annoncé ; Carte relue encore versable, clic muet | medium | Description changée sur un élément déjà focalisé | patch |
| 4 | BH-4 : message de réussite en `role="status"` inséré déjà rempli puis focalisé | low | Annonce double ou absente | patch |
| 5 | BH-5 : versabilité contrôlée au clic, pas à l'envoi | low | Aller-retour 400 évitable | patch |
| 6 | EC-6 : file d'enregistrements bloquée par une exception | medium | `versementEnCours` figé | patch |
| 7 | EC-5 : refus arrivé après fermeture, vignette non relue | low | Badge ou versabilité périmés | patch |
| 8 | EC-4 : exception de `[appliquer]` prise pour un échec | low | « Réessayer » reverserait | patch |
| 9 | EC-7, BH-12 : code inconnu → « undefined » ; libellés exportés inutilisés | low | Dérive de contrat | patch |
| 10 | BH-9 : badge « versée » sur l'Image d'un collègue dans la Préparation | low | EXPERIENCE : « versée » sur ses Images | patch (propriétaire seulement) |
| 11 | BH-8, VG-1 : tests manquants (sous-composant, raisons, `autre_inconnue`, `[appliquer]` sur 409, focus après relecture) | medium | Régressions silencieuses | patch (tests) |
| 12 | BH-11 : lignes de JSDoc trop longues | low | Convention de largeur | patch |
| 13 | BH-7 : badge « versée » écrit trois fois | low | Composant `app-badge-etat` à extraire avec « image retirée de la banque » (story 3.5) | defer |
| 14 | BH-10 : message et badge simultanés, la story dit « puis » | low | « puis » = conséquence ; aucun délai voulu | rejeté |

## Verification

**Commands:**
- `cd front && npm test -- --watch=false && npm run build` -- expected: tests et `verifier-jetons` au vert, paquet initial inchangé (≤ 599,78 kB).
