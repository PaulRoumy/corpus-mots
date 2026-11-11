---
title: 'Story 2.3, partie 3 : Thème de chaque Mot'
type: 'feature'
created: '2026-11-11'
status: 'done'
baseline_commit: '6cdcd59feffc85e54f1df36e6ce4b2347ea48f63'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/realisation/epic-2-context.md'
  - '{project-root}/docs/realisation/spec-2-3-2-retirer-un-mot.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Le Thème par défaut d'une Préparation ne s'applique à aucun Mot, et l'enseignant ne peut pas donner un autre Thème à un Mot (FR-6, story 2.3).

**Approach:** `preparation_mot` reçoit un Thème facultatif (un seul, comme le Thème par défaut). À la saisie, il prend le Thème par défaut de la Préparation. La Carte de Mot l'affiche sous forme de bouton texte (« cuisine », ou « Sans thème »). Ce bouton ouvre un Dialogue « Thème de « citrouille » » avec le Champ à étiquettes existant.

Partie 3 et dernière de la story 2.3, découpée par Paul. Interface choisie par Paul : un libellé cliquable. Changer le Thème par défaut ne touche pas les Mots déjà saisis (EXPERIENCE.md : « appliqué aux Mots saisis ensuite »).

## Boundaries & Constraints

**Always:**
- Un Mot ajouté prend le `themeDefautId` de sa Préparation au moment de l'ajout. Un Mot rétabli par « Annuler » reprend le Thème qu'il avait.
- Changer le Thème d'un Mot (y compris le retirer) est réservé au propriétaire de la Préparation. Sinon, ou si le Mot de Préparation n'est pas dans cette Préparation, la réponse est `404 ressource.introuvable`. Un Thème inconnu donne `400 preparation.theme_invalide`, vérifié par `referentiels.service` comme pour le Thème par défaut.
- Supprimer un Thème le retire de tous les Mots de Préparation qui le portaient, dans la même transaction (`ThemesDesPreparations`, AD-15). Un Thème porté seulement par des Mots reste supprimable : FR-5 ne bloque que pour les Images.
- Chaque nouveau `code` d'erreur est traduit dans `MESSAGES_PAR_CODE`.

**Never:**
- Changer le Thème par défaut ne réécrit pas les Mots déjà saisis.
- Pas de changement de Thème en lot ni de Module par Mot (plus tard).
- Pas de clé étrangère vers `theme` (AD-1).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Défaut appliqué | Préparation avec le Thème par défaut « cuisine », `POST …/mots` | Mot renvoyé et listé avec `themeId` de « cuisine » | — |
| Sans défaut | Préparation sans Thème par défaut | `themeId` nul | — |
| Changer | `PUT /api/preparations/{id}/mots/{motPreparationId}/theme {themeId}` | 200 Mot avec le nouveau `themeId`, relu en base | — |
| Retirer le Thème | même appel avec `themeId` nul | 200, `themeId` nul | — |
| Défaut changé ensuite | `reglages` change le Thème par défaut | Mots déjà saisis inchangés ; le Mot suivant prend le nouveau | — |
| Rétablir | retrait puis rétablissement avec le `themeId` renvoyé | Mot rétabli avec ce Thème | Thème supprimé entre-temps : rétabli sans Thème |
| Thème supprimé | `DELETE /api/themes/{id}` d'un Thème porté par des Mots | 204 ; ces Mots ont `themeId` nul | — |
| Refus | Thème inconnu / Préparation d'un collègue ou Mot d'une autre Préparation | 400 `preparation.theme_invalide` / 404 `ressource.introuvable`, rien n'est modifié | — |

</frozen-after-approval>

## Code Map

- `back/src/main/java/fr/corpusmots/preparations/service/PreparationsService.java` -- `ajouterMot`, `retirerMot`, `retablirMot`, `regler` (vérifie déjà `themeDefautId` par `referentiels.service`, modèle du 400) et le verrou `verrouillee`.
- `back/src/main/java/fr/corpusmots/preparations/persistance/{PreparationMot,PreparationMotRepository,PreparationRepository}.java` -- `retirerThemeDefaut`, modèle du retrait par Thème.
- `back/src/main/java/fr/corpusmots/preparations/service/{ThemesDesPreparations,MotPreparationVue,RetablirMotCommande}.java`, `api/{PreparationsResource,MotPreparationDto,RetablissementMotPreparationDto}.java`.
- `back/src/test/java/fr/corpusmots/preparations/api/MotsPreparationResourceTest.java` et le test de suppression des Thèmes (`referentiels`) : à étendre.
- `front/src/app/preparations/{carte-mot,preparation}.ts` -- Carte, Grille, `themes()` déjà chargés pour l'En-tête, `creerTheme`, `renommerTheme`, `supprimerTheme`.
- `front/src/app/commun/champ-themes/champ-themes.ts` -- `limite`, `choisis`, `creer`, `gerable` ; `front/src/app/preparations/corriger-album-dialogue.ts` : modèle de Dialogue.

## Tasks & Acceptance

**Execution:**
- [x] `back/src/main/resources/db/migration/V202611111400__preparations_preparation_mot_theme.sql` -- `preparation_mot.theme_id uuid` nullable, sans clé étrangère.
- [x] `back/src/main/java/fr/corpusmots/preparations/{persistance,service,api}/` -- `themeId` dans `PreparationMot`, la Vue et `MotPreparationDto` (nullable) ; `ajouterMot` copie le Thème par défaut ; `retirerMot` le renvoie ; `retablirMot` accepte `themeId` (un Thème qui n'existe plus est rétabli nul) ; `changerThemeMot` sous le verrou (`PUT /preparations/{id}/mots/{motPreparationId}/theme`, `changerThemeMotPreparation`, corps `{themeId}`, corps nul → `requete.invalide`) ; `ThemesDesPreparations` retire aussi le Thème des Mots.
- [x] Tests back -- une ligne de test par ligne de la matrice, avec relecture en base.
- [x] `front/openapi/` -- régénérer et versionner.
- [x] `front/src/app/preparations/carte-mot.ts` (+ `.scss`, spec) -- entrée `theme` (nom ou nul), bouton texte « cuisine » ou « Sans thème », nom accessible « Thème de « citrouille » : cuisine », sortie `changerTheme`.
- [x] `front/src/app/preparations/theme-mot-dialogue.ts` (+ spec) -- Dialogue « Thème de « citrouille » » : Champ à étiquettes limité à un Thème (création, renommage et suppression comme dans l'En-tête), « Enregistrer » et « Annuler » ; échec : message dans le Dialogue, qui reste ouvert.
- [x] `front/src/app/preparations/preparation.ts` (+ spec) -- ouvre le Dialogue, met à jour la Carte ; le rétablissement renvoie le `themeId` ; le focus revient au bouton du Thème à la fermeture.
- [x] `front/src/app/commun/erreurs/message-erreur.ts` + spec -- `preparation.theme_invalide` « Ce thème n'existe plus. ».

**Acceptance Criteria:**
- Given une Préparation avec le Thème par défaut « cuisine », when l'enseignant saisit « citrouille », then sa Carte affiche « cuisine ».
- Given cette Carte, when il choisit le Thème « automne » dans le Dialogue et enregistre, then la Carte affiche « automne », et le garde après rechargement.
- Given le clavier seul, then on ouvre le Dialogue, on change le Thème et on revient à la Carte sans perdre le focus.

## Implementation Notes

- Back : `PUT …/mots/{motPreparationId}/theme` prend le corps `ThemeMotPreparationDto {themeId}` (nul ou absent retire le Thème) ; ordre des refus 404 (Préparation verrouillée, puis Mot de Préparation) puis 400 `preparation.theme_introuvable`, le code déjà renvoyé pour un Thème par défaut inconnu (la spec nommait à tort `preparation.theme_invalide`, non créé). Index partiel `preparation_mot (theme_id) WHERE theme_id IS NOT NULL` pour `retirerTheme`. `RetablissementMotPreparationDto` reçoit `themeId` facultatif : un Thème inconnu au rétablissement est ignoré, sans erreur. `ThemesDesPreparations` appelle `PreparationMotRepository.retirerTheme` après `retirerThemeDefaut`. Les tests de suppression d'un Thème porté par des Mots sont dans `MotsPreparationResourceTest`, comme ceux du Thème par défaut sont dans `PreparationsResourceTest`.
- Front : pas de dialogue sur un dialogue, donc dans le Dialogue du Thème la suppression d'un Thème se confirme sur place (à la place du champ, Échap la replie), et non par le Dialogue de confirmation de l'En-tête ; même phrase (`phraseSuppressionTheme`), qui mentionne désormais les Mots. Le Dialogue appelle lui-même le back (créer, renommer, supprimer, enregistrer) et signale chaque Thème créé, renommé ou supprimé à la page (`themesModifies`), qui met à jour Thèmes, En-tête et Cartes même si le Dialogue est ensuite annulé. « Enregistrer » sans changement ferme sans requête : la valeur de départ est le Thème du Mot s'il figure parmi les Thèmes chargés (sinon aucun), remise à nul si ce Thème est supprimé depuis le Dialogue. Pendant toute requête (enregistrer, créer, renommer, supprimer), « Annuler » est désactivé et `disableClose` empêche Échap et le clic extérieur de fermer le Dialogue. Le bouton du Thème de la Carte est souligné en permanence. Le bouton du Thème n'apparaît sur la Carte qu'une fois les Thèmes chargés. Bouton texte natif (pas `matButton`) pour pouvoir le tronquer par une ellipse ; jeton `--cm-hauteur-bouton-theme-mot` (24 px, WCAG 2.5.8). `parNom` devient `themesParNom`, exporté par `champ-themes.ts`.

## Spec Change Log

- Revue 1, ligne 1 du journal de tri : le code d'un Thème inconnu est `preparation.theme_introuvable` (déjà utilisé pour le Thème par défaut), et non `preparation.theme_invalide` comme l'écrivent la section figée et les tâches. Le texte figé n'a pas été réécrit.

## Review Triage Log

Revue 1 (Blind Hunter BH, Edge Case Hunter EC, Verification Gap VG).

| # | Constat | Verdict | Preuve | Suite |
|---|---------|---------|--------|-------|
| 1 | Code `preparation.theme_invalide` en double de `preparation.theme_introuvable` (Thème par défaut) | medium | Erreur de la spec, relevée par l'implémentation ; un seul code pour un Thème inconnu | patch |
| 2 | BH-3 : pas d'index sur `preparation_mot.theme_id`, `retirerTheme` parcourt toute la table | low | Migration non publiée ; correction directe | patch |
| 3 | BH-4, BH-10 : Javadoc de `supprimerTheme` périmée, lignes trop longues | low | Correction directe | patch |
| 4 | EC-3, EC-6, BH-6 : `choisi` initialisé sur un Thème absent de la liste ; PUT inutile après suppression du Thème du Mot | low | Correction directe dans le Dialogue | patch |
| 5 | EC-4, BH-8 : Dialogue fermable pendant une création, un renommage ou une suppression | low | L'erreur se perd ; correction directe | patch |
| 6 | VG-1, BH-7 : changements `cree` et `renomme` du Dialogue non testés au niveau de la page | medium | Constat vérifié par la couche VG | patch |
| 7 | BH-12 : « Sans thème » ne paraît pas cliquable sur écran tactile | low | Seul indice : soulignement au survol | patch |
| 8 | VG-2 : `retirerThemeDesMots` non observé par les tests | low | Effet visible tenu par `nomTheme` et le back (test `unMotRetabliApresLaSuppressionDeSonThemeEstSansTheme`) | rejeté |
| 9 | EC-1, EC-2, BH-2 : un Thème supprimé en même temps qu'un ajout, un changement ou un rétablissement reste sur le Mot | low | Concurrence rare ; même écart que `retirerThemeDefaut` (story 2.2) ; affiché « Sans thème » et rétabli sans Thème | report |
| 10 | EC-5, BH-5 : PUT répondu 404 (Mot retiré ailleurs) laisse le Dialogue ouvert | low | Deux onglets sur la même Préparation ; recharger rétablit la Grille | rejeté |
| 11 | BH-1 : contrat OpenAPI et spec absents du diff relu | false | Exclus du fichier de revue, présents et versionnés | rejeté |
| 12 | BH-9 : corps de rétablissement sans clé `themeId` non testé | low | Champ facultatif lu nul par Jackson, comme `ordre` | rejeté |
| 13 | BH-11 : erreurs de création non effacées à l'ouverture du renommage | low | Message encore juste ; disparaît à l'action suivante | rejeté |

## Design Notes

- Le Thème d'un Mot vit dans `preparation_mot` (`preparations`), pas sur l'Image. Il servira à la Fiche thématique, et il pourra préremplir le Thème d'une Image créée depuis la Carte (story 2.4 et suivantes). Il ne compte pas comme « utilisé » pour la suppression d'un Thème.
- Le Dialogue reprend le Champ à étiquettes de l'En-tête, avec `limite` 1. Une Carte reste lisible : le libellé du Thème est tronqué par une ellipse, et le nom accessible porte le nom complet.

## Verification

**Commands:**
- `cd back && ./mvnw verify` -- expected : vert, ArchUnit compris ; `front/openapi/` réécrit.
- `cd front && npm test -- --watch=false && npm run build` -- expected : vert, `verifier-jetons` compris, paquet initial sous 600 kB.

**Manual checks (if no CLI):**
- Avec `compose.dev.yaml`, `quarkus:dev` et `npm start` : Thème par défaut « cuisine », saisir deux Mots, changer le Thème de l'un, recharger.
