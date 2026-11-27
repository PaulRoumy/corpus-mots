---
title: 'Story 3.7, partie 2 : Bandeau « Annuler » sans minuterie pour un geste en lot'
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

**Problème :** après « Retirer de la Préparation » sur plusieurs Mots, le Bandeau « Annuler » disparaît au bout de 8 s, comme pour un geste unitaire. Pendant la démo du 25 novembre, l'enseignante n'avait pas le temps de vérifier son lot avant d'annuler (UX-DR-13, décision D-5 de la proposition de changement du 2026-11-26).

**Approche :** `BandeauAnnuler.afficher` reçoit une option « lot ». Un bandeau de lot n'a aucune minuterie. Il reste affiché jusqu'au geste suivant de l'enseignante, jusqu'à un autre bandeau ou jusqu'à sa fermeture :
- le geste suivant est une action qui modifie des données, donc toute requête HTTP `POST`, `PUT`, `PATCH` ou `DELETE` vers `/api`, repérée par un intercepteur ;
- la fermeture passe par un bouton « Fermer » propre au mode lot.

Il se ferme sans annuler quand l'enseignante quitte la page : navigation, ou destruction de l'appelant (comportement actuel). Un geste unitaire garde 8 s, avec un décompte suspendu au survol et au focus, sans changement. Dans la Préparation, le retrait en lot utilise ce mode dès que plus d'un Mot a été retiré.

</frozen-after-approval>

## Implementation Notes

- `commun/bandeau-annuler/bandeau-annuler.ts` :
  - `afficher(message, annuler, appelant?, { lot })` ;
  - en mode lot, `BandeauAnnulerContenu` ne lance aucune minuterie, ignore survol et focus, et montre un bouton icône « Fermer » (`aria-label="Fermer"`, comme le Bandeau d'erreur) ;
  - `fermerLot()` ferme sans annuler le bandeau ouvert s'il est de lot ; un bandeau unitaire garde ses 8 s.
- Geste suivant : `bandeau-lot-interceptor.ts` (enregistré dans `app.config.ts` avant `jetonInterceptor`, pour agir dès l'envoi) émet sur `ecrituresApi` (`geste-suivant.ts`, simple `Subject`) à chaque `POST`, `PUT`, `PATCH` ou `DELETE` vers l'API. Il reprend `estUnAppelApi`, désormais exporté par `jeton-interceptor.ts`. `BandeauAnnuler` s'abonne à `ecrituresApi`.
  - Surprise : importer `BandeauAnnuler` directement dans l'intercepteur tirait le snackbar Material dans le paquet initial (618 kB pour un budget de 600 kB). Le sujet sans dépendance ramène le paquet à 599,93 kB.
  - L'opération inverse lancée par « Annuler » part après la fermeture du bandeau (`termine`) ; elle ne le ferme donc pas une seconde fois.
- `preparations/preparation.ts` : le retrait en lot passe `{ lot: retires.length > 1 }`, si bien qu'un lot réduit à un seul Mot retiré garde 8 s.
- Tests :
  - `bandeau-annuler.spec.ts` (6 nouveaux) : aucune minuterie après 10 min, « Annuler » puis « Fermer » absent en unitaire, geste suivant signalé, unitaire inchangé, autre bandeau, navigation ;
  - `bandeau-lot-interceptor.spec.ts` : écritures vers `/api`, lecture, écriture de même origine hors `/api`, autre origine ;
  - `preparation.spec.ts` : options `{ lot: true }` pour 3 Mots retirés, `{ lot: false }` pour un seul.
- Prettier a remis en forme `app.config.ts` et `jeton-interceptor.ts`.

## Review Triage Log

Revue 1 (Blind Hunter BH).

- BH-1 (false) : Implementation Notes vides et statut `in-progress`. Les notes sont remplies et le statut est mis à jour à la clôture.
- BH-2 (low, rejeté) : DESIGN.md (`duration: 8s`) et EXPERIENCE.md ne décrivent pas le bouton « Fermer ». EXPERIENCE.md prévoit déjà « sa fermeture », et le bouton reprend celui du Bandeau d'erreur.
- BH-3 (false) : « toute écriture vers `/api` compte comme geste suivant ». C'est l'approche voulue par l'intention, qui définit le geste suivant comme une action qui modifie des données. Aucune écriture automatique n'existe aujourd'hui.
- BH-4 (low, rejeté) : pas de test de bout en bout avec le vrai intercepteur. Bandeau, intercepteur et options de la Préparation sont testés chacun séparément.
- BH-5 (low, patch partiel) : cas manquants dans les tests de l'intercepteur. L'écriture de même origine hors `/api` (`/apix/…`) est ajoutée. Le rejeu après 401 et l'ordre des intercepteurs sont rejetés : l'intercepteur est placé avant `jetonInterceptor`, et le rejeu ne repasse pas par lui.
- BH-6 (low, rejeté) : l'intercepteur importe `estUnAppelApi` du dossier d'authentification. Cela évite une seconde définition de « requête vers l'API ».
- BH-7 (low, patch) : sur le fond sombre, survol et focus de « Fermer » restaient peu visibles. La couche d'état prend la couleur claire du texte (`--mat-icon-button-state-layer-color`). La couleur reprend le jeton du texte du snackbar.
- BH-8 (low, rejeté) : libellé « Fermer » trop générique, pas de touche Échap. Le libellé est identique à celui du Bandeau d'erreur, et le bandeau reste atteignable au clavier.
- BH-9 (low, rejeté) : le bandeau persistant pourrait masquer du contenu. Le snackbar est centré en bas, comme avant, et « Fermer » le retire.
- BH-10 (low, rejeté) : `get lot()` double l'état des données. L'accesseur est en lecture seule et sert au seul service.
- BH-11 (low, rejeté) : reformatage Prettier mêlé au diff. Il est limité à deux fichiers touchés par la story.

Vérification à la clôture : front `npm test` 1 058 tests verts ; `npm run build` réussi, paquet initial 599,93 kB (budget 600 kB) ; aucun changement du back ni du contrat.
