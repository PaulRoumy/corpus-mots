---
title: 'Story 2.11, partie 2 : une Image créée depuis une Préparation reçoit sa Section'
type: 'feature'
created: '2026-11-26'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '{project-root}/docs/realisation/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problème :** une Image créée depuis une Préparation (pictogramme ARASAAC, « Téléverser » depuis la carte, Panneau de choix, « Ajouter une image » ouvert pour un Mot) naît sans aucune Section. L'enseignante doit ensuite cocher la Section dans la Carte d'identité, alors que le §4.4 du PRD veut une Carte d'identité « remplie automatiquement à partir du contexte (… Section de la Préparation) ». C'est la décision UX D-3 de la démo du 25 novembre.

**Approche :** à la création par `PreparationsService.televerserImage` (le seul chemin de ces quatre gestes), l'Image reçoit d'office la Section de la Préparation. Elle reste modifiable dans la Carte d'identité. Une Image ajoutée par « + › Ajouter une image », sans Préparation (`Images.ajouterDansMesMots`), ne reçoit aucune Section d'office.

</frozen-after-approval>

## Implementation Notes

- `TeleverserImageCommande` reçoit la Section d'office (nullable). `Images.televerser` la pose sur l'Image créée. `PreparationsService.televerserImage` passe `preparation.section()`, pour le lien comme pour le remplacement. `Images.ajouterDansMesMots` passe `null`.
- `Images.televerser` pose la Section par `Image.classer(Set.of(section), null, Set.of())` sur l'Image neuve, avant `persist` : ni Module ni Thème, comme avant ; pas `Images.classer`, réservé au propriétaire d'une Image existante.
- Tests `@QuarkusTest` (Carte d'identité `GET /api/images/{id}`, champ `sections`) :
  - pictogramme ARASAAC (`PictogrammeMotPreparationResourceTest`, toujours sans remplacement) et téléversement depuis la carte (`ImagesMotsPreparationResourceTest`) : `["ms"]`, la Section de la Préparation ;
  - téléversement en remplacement depuis le Panneau de choix (`ChoixImagePreparationResourceTest`) : `["ms"]` ;
  - « + › Ajouter une image » sans Préparation (`MesMotsImagesResourceTest`) : `[]`.
  - « Ajouter une image » ouvert pour un Mot passe par la même route que la carte (`televerser-image-dialogue.spec.ts`, `URL_TELEVERSEMENT`).
- Aucune migration, aucun changement de contrat, aucun texte affiché nouveau.

## Review Triage Log

Revue 1 (Blind Hunter BH).

- BH-1 (medium, defer) : le Module et le Thème de la Préparation ne sont pas hérités, alors que le §4.4 du PRD les cite. Le manque existait déjà ; l'intention de la story ne vise que la Section. Consigné dans `deferred-work.md`.
- BH-2 (low, patch) : les notes ne citaient pas `ChoixImagePreparationResourceTest` pour le remplacement et prêtaient un remplacement au pictogramme. Notes corrigées.
- BH-3 (false) : « Ajouter une image » ouvert pour un Mot est couvert par `televerser-image-dialogue.spec.ts`, qui attend la route `/preparations/{id}/mots/{motId}/image`.
- BH-4 (low, rejeté) : aucune assertion sur le Module nul et les Thèmes vides de l'Image neuve. Le comportement d'avant est inchangé, et ajouter ces assertions ne protège rien de nouveau.
- BH-5 (low, rejeté) : une Image créée garde sa Section si la Préparation change ensuite de Section ou est dupliquée. La Section est un attribut de la Carte d'identité, que l'enseignante modifie à son gré ; les liens portent leur propre Section.
- BH-6 (rejeté) : référence « D-3 » jugée ambiguë. Elle se trouve dans l'intention figée et renvoie à la proposition de changement du 2026-11-26.
- BH-7 (false) : statut et métadonnées de la spec, mis à jour à la clôture.
- BH-8 (low, rejeté) : une seule Section d'office n'est pas documentée sur la commande. La Javadoc dit déjà « la Section qu'elle vise d'office ».

Vérification à la clôture : back `./mvnw verify` 808 tests verts, `@QuarkusTest` compris (PostgreSQL de test lancé à la main) ; contrat OpenAPI inchangé ; aucun fichier front modifié.
