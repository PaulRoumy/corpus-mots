---
title: 'Story 2.2, partie 1 : En-tête de Préparation modifiable'
type: 'feature'
created: '2026-11-09'
status: 'done'
baseline_commit: 'd2dd42d56be223fc92501cba0bd38c7b5536a759'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/realisation/epic-2-context.md'
  - '{project-root}/docs/realisation/spec-2-1-creer-une-preparation-pour-un-album.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** L'En-tête de Préparation est en lecture seule. L'enseignant ne peut ni changer le Module ou le Thème par défaut choisis à la création, ni noter le « Temps passé » qui sert au bilan SM-3 (FR-6, UX-DR-25).

**Approach:** Ajouter à `preparations` les réglages d'une Préparation (Module, Thème par défaut, Temps passé), modifiables par son seul propriétaire. Dans l'En-tête, ces trois valeurs deviennent des champs, enregistrés dès que l'enseignant quitte le champ, sans bouton « Enregistrer ».

Décision de Paul : la story 2.2 est découpée. La partie 1 rend l'En-tête modifiable. Les Modules (« Nouveau module », renommer, supprimer), les Thèmes (Champ à étiquettes, création) et « Corriger l'album » forment les parties 2 à 4 (`deferred-work.md`).

Décision de Paul : l'enseignant saisit le « Temps passé » en heures, dans un seul champ numérique, au pas d'une demi-heure (« 3,5 » suivi de « h »). Le back l'enregistre en minutes : 3,5 h donnent 210. Un champ vide retire la valeur.

## Boundaries & Constraints

**Always:**
- Seul le propriétaire modifie sa Préparation. Celle d'un collègue répond `404 ressource.introuvable`, comme en lecture.
- Le Module doit appartenir à l'Album de la Préparation, et le Thème doit exister : mêmes codes qu'à la création (`preparation.module_invalide`, `preparation.theme_introuvable`). `null` retire la valeur.
- Enregistrement à la sortie du champ (`blur`, ou choix dans une liste). En cas d'échec, la valeur saisie reste affichée et un Bandeau d'erreur apparaît, avec un « Réessayer » qui renvoie la même valeur.
- Chaque nouveau `code` d'erreur est traduit dans `MESSAGES_PAR_CODE`.

**Never:**
- Pas de « Nouveau module » ni de Champ à étiquettes : les listes proposent les Modules et les Thèmes existants (parties 2 et 3). Pas de « Corriger l'album » (partie 4), ni de changement d'Album ou de Section.
- Pas d'appel à `Usages.changerContextePreparation` : `vocabulaire.service.Usages` n'existe pas avant la story 2.3, qui devra brancher cet appel sur le changement de Module.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Régler | `PUT /api/preparations/{id}/reglages {moduleId, themeDefautId, tempsPasseMinutes}` par le propriétaire | 200 `PreparationDto` avec les trois valeurs, relue identique ensuite | — |
| Retirer | les trois valeurs à `null` | 200, Module, Thème par défaut et Temps passé absents | — |
| Module d'un autre Album | `moduleId` inconnu ou d'un autre Album | 400 `preparation.module_invalide`, rien n'est modifié | — |
| Thème inconnu | `themeDefautId` inexistant | 400 `preparation.theme_introuvable`, rien n'est modifié | — |
| Temps hors bornes | `tempsPasseMinutes` < 0 ou > 6000 | 400 `preparation.temps_passe_invalide`, rien n'est modifié | — |
| Préparation d'un collègue | `PUT` sur la Préparation d'un autre enseignant | 404 `ressource.introuvable`, rien n'est modifié | — |

</frozen-after-approval>

## Code Map

- `back/src/main/java/fr/corpusmots/preparations/service/PreparationsService.java` -- `creer` valide déjà le Module (même Album) et le Thème par `ReferentielsService` : reprendre ces vérifications dans `regler`. `lire` et `vue()` produisent `PreparationVue`, à compléter avec `tempsPasseMinutes`.
- `back/src/main/java/fr/corpusmots/preparations/persistance/Preparation.java` -- entité sans mutateur : ajouter `regler(moduleId, themeDefautId, tempsPasseMinutes)` et le champ `tempsPasseMinutes`.
- `back/src/main/java/fr/corpusmots/preparations/persistance/PreparationRepository.java` -- `duProprietaire(id, proprietaireId)` sert à la fois pour lire et pour modifier.
- `back/src/main/java/fr/corpusmots/preparations/api/PreparationsResource.java`, `PreparationDto.java` -- modèle de Resource et Dto ; ajouter `tempsPasseMinutes` (facultatif) au Dto.
- `back/src/main/resources/db/migration/V202611091010__preparations_preparation.sql` -- publiée, à ne pas modifier : la colonne vient d'une nouvelle migration.
- `back/src/test/java/fr/corpusmots/preparations/api/PreparationsResourceTest.java` -- données (`ReferentielsDeTest`, `EnseignantsDeTest`) et style à étendre.
- `front/src/app/preparations/preparation.ts`, `.scss`, `.spec.ts` -- En-tête actuel en lecture seule (`entete__module`, `entete__theme`), chargement avec garde `dernierChargement`, `Title`.
- `front/src/app/preparations/nouvelle-preparation-dialogue.ts` -- modèle des `mat-select` Module et Thème (« Aucun module », « Aucun thème »), et des appels `listerModulesDeLAlbum` et `listerThemes`.
- `front/src/app/commun/bandeau-erreur/`, `commun/erreurs/message-erreur.ts` -- Bandeau d'erreur et traduction des codes.
- `docs/ux-designs/ux-corpus-mots-2026-10-28/.working/key-preparation.html:280-290,395-402` -- maquette de l'En-tête : « Temps passé » avec le pictogramme horloge et l'indication « facultatif ».

## Tasks & Acceptance

**Execution:**
- [x] `back/src/main/resources/db/migration/V202611091800__preparations_temps_passe.sql` -- `temps_passe_minutes integer NULL`, avec un `CHECK` nommé (0 à 6000).
- [x] `back/src/main/java/fr/corpusmots/preparations/persistance/Preparation.java` -- champ et mutateur `regler`.
- [x] `back/src/main/java/fr/corpusmots/preparations/service/{PreparationsService,ReglagesPreparationCommande,PreparationVue}.java` -- `regler(id, commande)` dans une transaction : 404 si la Préparation n'appartient pas à l'enseignant courant, validations, puis `PreparationVue` complétée.
- [x] `back/src/main/java/fr/corpusmots/preparations/api/{PreparationsResource,ReglagesPreparationDto,PreparationDto}.java` -- `PUT /preparations/{id}/reglages` (`reglerPreparation`), corps nul → `requete.invalide`, et `tempsPasseMinutes` dans `PreparationDto`.
- [x] `back/src/test/java/fr/corpusmots/preparations/api/PreparationsResourceTest.java` -- une ligne de test par ligne de la matrice, avec « rien n'est modifié » relu en base.
- [x] `front/openapi/` -- régénérer par `./mvnw package -DskipTests` et versionner.
- [x] `front/src/app/preparations/preparation.ts` + `.scss` -- dans l'En-tête :
  - Module : `mat-select` avec « Aucun module » et les Modules de l'Album dans leur ordre, affiché seulement si l'Album a des Modules ;
  - Thème par défaut : `mat-select` avec « Aucun thème », affiché seulement s'il existe des Thèmes ;
  - « Temps passé (facultatif) » : champ numérique en heures (`step` 0,5, de 0 à 100), suffixe « h », pictogramme horloge. Il accepte la virgule comme le point. Une valeur hors bornes ou qui n'est pas un multiple de 0,5 n'est pas envoyée : le champ montre « Saisissez un nombre d'heures entre 0 et 100, par demi-heure. ».
  
  Chaque changement envoie les trois valeurs courantes par `reglerPreparation`, un enregistrement à la fois, et l'En-tête prend la Préparation renvoyée. En cas d'échec, la valeur saisie reste affichée et un Bandeau d'erreur apparaît avec « Réessayer ». Les listes se chargent avec la Préparation ; si elles échouent, elles ont leur propre erreur, sans masquer l'En-tête.
- [x] `front/src/app/commun/erreurs/message-erreur.ts` + spec -- `preparation.temps_passe_invalide` « Saisissez un nombre d'heures entre 0 et 100, par demi-heure. ».
- [x] `front/src/app/commun/icones.ts` -- pictogramme `horloge`.
- [x] `front/src/app/preparations/preparation.spec.ts` -- pour chaque champ, la valeur est enregistrée à la sortie du champ ; un échec garde la valeur et affiche le Bandeau, puis « Réessayer » renvoie la même valeur ; les champs sont masqués quand les listes sont vides ; le temps est converti entre la saisie et les minutes.

**Acceptance Criteria:**
- Given une Préparation ouverte, when l'enseignant choisit un autre Module, then il est enregistré sans bouton, et l'En-tête le montre encore après rechargement de la page.
- Given un « Temps passé » saisi, when l'enseignant quitte le champ, then la valeur est enregistrée ; given un échec réseau, then la valeur reste affichée et le Bandeau d'erreur propose « Réessayer ».
- Given le clavier seul, then chaque champ de l'En-tête est atteignable et a une étiquette lue par un lecteur d'écran.

## Implementation Notes

- `PreparationsService` : les vérifications du Module et du Thème de `creer` deviennent `moduleDeLAlbum` et `themeExistant`, partagées avec `regler` ; `mienne(id)` porte le 404, partagé avec `lire`. Le 404 passe avant les validations : une Préparation d'un collègue répond 404 même avec un Module invalide.
- Le « Temps passé » est un champ `type="text"` avec `inputmode="decimal"`, pas `type="number"` : selon la langue du navigateur, `type="number"` refuse la virgule sans le dire (sa valeur devient vide, comme un champ effacé). Bornes et pas de demi-heure sont vérifiés par `heuresEnMinutes`, validateur du `FormControl`, dont l'erreur s'affiche en `mat-error`.
- « Réessayer » renvoie les valeurs affichées, qui incluent celle de l'échec, gardée à l'écran. Un Temps passé invalide n'est jamais envoyé : si l'enseignant change le Module pendant ce temps, le dernier Temps passé enregistré est renvoyé.
- Un enregistrement à la fois : un changement fait pendant un envoi en déclenche un seul autre après lui, avec les valeurs du moment. Les champs ne sont pas réécrits par la réponse, pour ne pas effacer une saisie en cours.
- La sortie du champ Temps passé sans changement (par rapport à la valeur enregistrée) n'envoie rien, sauf si un Bandeau d'échec est affiché.
- Si les listes n'ont pas pu être chargées, l'En-tête garde le Module et le Thème en lecture seule (rendu de la story 2.1), à côté du Bandeau d'erreur des listes.
- `mat-select` n'affiche rien pour la valeur `null` (« Aucun module », « Aucun thème ») : seule l'étiquette reste visible, comme dans le Dialogue « Nouvelle préparation ».
- Revue : le back refuse aussi un Temps passé qui n'est pas un multiple de 30 minutes (`400 preparation.temps_passe_invalide`, et `temps_passe_minutes % 30 = 0` dans la contrainte `preparation_temps_passe_borne`), pour que toute valeur enregistrée s'affiche comme une saisie valide.
- Jetons ajoutés : `--cm-largeur-champ-entete` (220 px) et `--cm-largeur-champ-temps` (200 px).

## Spec Change Log

## Review Triage Log

Revue 1 (Blind Hunter BH, Edge Case Hunter EC, Verification Gap VG).

| # | Constat | Verdict | Preuve | Suite |
|---|---------|---------|--------|-------|
| 1 | BH-1, EC-2, EC claim 2, VG autre : le back accepte toute minute de 0 à 6000, le front seulement les demi-heures ; 45 min s'affiche « 0,75 » et passe en erreur | low | Valeur impossible par l'interface, possible par l'API ; la décision de Paul fixe la demi-heure | patch (le back refuse un multiple autre que 30, `CHECK` compris, migration non publiée) |
| 2 | BH-2, EC-3 : Jackson tronque un nombre décimal en `Integer` | low | Seulement par appel direct à l'API ; aucune donnée fausse au-delà d'une minute | rejeté |
| 3 | EC-1, EC claim 1 : sortie du champ sur l'ancienne valeur pendant un enregistrement en vol, rien n'est renvoyé | low | Fenêtre de quelques millisecondes ; il faudrait une garde de plus | rejeté |
| 4 | EC-4, BH-5 : deux onglets, le dernier enregistrement gagne | low | Une Préparation n'a qu'un propriétaire ; il faudrait une version optimiste | rejeté |
| 5 | EC-5 : fermer le Bandeau sans réessayer laisse une valeur non enregistrée affichée | low | Choix explicite de l'enseignant ; il faudrait un indicateur de plus | rejeté |
| 6 | EC-6 : « Réessayer » après une saisie devenue invalide renvoie le dernier temps enregistré | low | Cas combiné improbable ; la saisie invalide reste signalée sur le champ | rejeté |
| 7 | VG-1 : réponse tardive d'un enregistrement après changement de Préparation non testée | medium | Constat vérifié par la couche VG | patch |
| 8 | VG-2 : listes tardives après changement de Préparation non testées | medium | Constat vérifié par la couche VG | patch |
| 9 | VG-3 : renvoi à la sortie du Temps passé quand un Bandeau d'échec est affiché non testé | medium | Constat vérifié par la couche VG | patch |
| 10 | VG-4, BH-3 : 404 avant validation testé seulement avec un corps valide | medium | Constat vérifié par la couche VG | patch |
| 11 | BH-4 : l'échec n'est pas marqué sur le champ lui-même | low | La spec retient le Bandeau d'erreur ; il faudrait un état par champ | rejeté |
| 12 | BH-6 : rien ne rappelle à la story 2.3 l'appel `changerContextePreparation` | medium | Seule la section Never de cette spec le mentionne | report |
| 13 | BH-7 : entrées de `deferred-work.md` en `source_spec: none` | low | Elles viennent de cette spec ; correction directe | patch (fait dans la documentation) |
| 14 | BH-8 : 404 absent du contrat OpenAPI | low | Convention du back (2.1, ligne 13) | rejeté |
| 15 | BH-9 : `openapi.yaml` absent du diff | false | Exclu du fichier de revue, présent dans l'arbre et versionné | rejeté |
| 16 | BH-10 : la tâche décrit un champ numérique, le code un champ texte | low | Écart consigné dans les Implementation Notes ; corriger la tâche reviendrait à modifier la spec | rejeté |
| 17 | BH-11 : après `preparation.module_invalide`, la liste n'est pas rechargée et l'erreur se répète | medium | Inatteignable tant qu'un Module ne peut être supprimé ; devient possible avec la partie 2 | report (partie 2) |
| 18 | BH-12 : quelques tests ne vérifient pas l'affichage final | low | Les comportements sont couverts par les autres cas | rejeté |
| 19 | BH-13 : ordre des validations non spécifié | low | Sans effet pour l'enseignant | rejeté |
| 20 | BH-14 : la borne de 6000 minutes est écrite en cinq endroits | low | Convention existante, sans dérive aujourd'hui | rejeté |


## Verification

**Commands:**
- `cd back && ./mvnw verify` -- expected : vert, ArchUnit compris ; `front/openapi/` réécrit.
- `cd front && npm test -- --watch=false && npm run build` -- expected : vert, `verifier-jetons` compris, paquet initial sous 600 kB.

**Manual checks (if no CLI):**
- Avec `compose.dev.yaml`, `quarkus:dev` et `npm start` : modifier le Module, le Thème par défaut et le Temps passé d'une Préparation, recharger la page et vérifier que les valeurs sont gardées.
