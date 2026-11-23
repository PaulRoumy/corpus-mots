---
title: 'Rétrospective de l''Epic 2, action 3 : un code d''erreur stable par condition'
type: 'refactor'
created: '2026-11-23'
status: 'done'
baseline_commit: '139ae402d2f854597b40c8bfdc9e0bf9bf0370fd'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/realisation/epic-2-retro-2026-11-22.md'
  - '{project-root}/docs/realisation/spec-retro-e2-2-encart-et-bandeau.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** La rétrospective de l'Epic 2 (constat C-2) relève que le back renvoie plusieurs codes pour une même condition.
- **Image non proposable :** `404 ressource.introuvable` depuis `Usages.lierImage`, mais `404 image.indisponible` depuis `Usages.remplacerImage` et le contrôle préalable de `PreparationsService.reutiliserImage`.
- **Image d'un autre Sens ou d'un autre Mot :** `400 image.sens_different` depuis `lierImage`, mais `400 preparation.sens_invalide` depuis `remplacerImage` et `reutiliserImage`.
- **Pictogramme ARASAAC inconnu :** `404 ressource.introuvable` depuis `SuggestionsArasaac.pictogramme`, mais `404 arasaac.pictogramme_introuvable` depuis `telecharger`.

Le front tient donc trois listes « image indisponible » différentes, dans `preparation.ts`, `encart-mots-deja-illustres.ts` et `panneau-choix-image.ts`. Il ajoute même un cas particulier, `refusSousVerrou`, pour deviner une Image non proposable derrière `ressource.introuvable`. L'Epic 3 ajoutera les états `versee` et `abandonnee`, qui multiplieront ces refus.

**Approach:** Un code par condition dans le back, et une seule liste « image indisponible » dans le front.

Décisions :
- **Image non proposable** (absente, ou que `VisibiliteImages` ne propose pas à l'enseignant) : `404 image.indisponible` partout, `lierImage` compris.
- **Image d'un autre Sens que le Sens retenu, ou d'un autre Mot :** `400 image.sens_different` partout, `remplacerImage` et `reutiliserImage` compris.
- **`preparation.sens_invalide`** ne sert plus qu'aux Sens invalides : choix de Sens et création de Sens.
- **Pictogramme inconnu d'ARASAAC :** `404 arasaac.pictogramme_introuvable` sur les deux routes.
- **`ressource.introuvable`** ne désigne plus que l'absence de la ressource adressée par l'URL : Préparation, Mot de Préparation, Mot, Image consultée, compte, Album, Module, Thème.
- **Front :** une constante partagée `CODES_IMAGE_INDISPONIBLE` = { `image.indisponible`, `image.sens_different` }, dans `front/src/app/commun/erreurs/`.
  - La page, l'Encart et le Panneau de choix l'importent.
  - `refusSousVerrou` et les listes locales disparaissent.
  - `ressource.introuvable` reprend partout son sens générique.
  - Chaque composant garde son propre message et sa propre réaction (relecture, rechargement de l'Encart, etc.) ; seule la reconnaissance du cas est partagée.
- Les statuts HTTP ne changent pas, sauf là où le code change de condition (voir la matrice).

## Boundaries & Constraints

**Always:**
- Javadoc `@throws` à jour sur chaque méthode touchée.
- Tests du back et du front à jour. Un test par route touchée vérifie le nouveau code.
- `MESSAGES_PAR_CODE` couvre tout code nouvellement renvoyé.
- Après le changement, `./mvnw package -DskipTests` et versionner `front/openapi/` si le contrat dérive.
- Paquet initial sous 600 kB.

**Never:**
- Aucune migration, aucune nouvelle route, aucun changement de règle métier : seuls les codes changent.
- Ne pas changer `ressource.introuvable` pour l'absence d'une ressource adressée.
- Ne pas filtrer les Images hors de `VisibiliteImages` (AD-2).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Choix d'une Image retirée entre-temps | `PUT …/image` (lierImage), Image plus proposable | `404 image.indisponible` | Front : message « image indisponible » et relecture des propositions |
| Choix d'une Image d'un autre Sens | lierImage, Image d'un autre Sens | `400 image.sens_different` | Idem |
| Remplacement par une Image non proposable | remplacerImage | `404 image.indisponible` (inchangé) | Idem |
| Remplacement par une Image d'un autre Mot | remplacerImage | `400 image.sens_different` (au lieu de `preparation.sens_invalide`) | Idem |
| Réutilisation d'une Image d'un autre Mot | reutiliserImage | `400 image.sens_different` | Message de la page |
| Reprise depuis l'Encart, Image retirée sous verrou | reprise, lierImage | `404 image.indisponible` | Encart : message « image indisponible », rechargement, sans cas particulier |
| Pictogramme inconnu | route `pictogramme` et route `telecharger` | `404 arasaac.pictogramme_introuvable` | Message ARASAAC existant |
| Préparation ou Mot supprimé | toute route de Préparation | `404 ressource.introuvable` (inchangé) | Message générique ou rechargement, comme aujourd'hui |
| Sens invalide | choix ou création de Sens | `400 preparation.sens_invalide` (inchangé) | Inchangé |

</frozen-after-approval>

## Code Map

- `back/src/main/java/fr/corpusmots/vocabulaire/service/Usages.java` -- `lierImage` (l.119-127), `remplacerImage` (l.~185-200), constantes l.35-38.
- `back/src/main/java/fr/corpusmots/preparations/service/PreparationsService.java` -- `reutiliserImage` (l.~437-445), javadoc l.425-430 et l.663-666.
- `back/src/main/java/fr/corpusmots/vocabulaire/service/SuggestionsArasaac.java` -- `pictogramme` (l.65-75), `telecharger` (l.~87-97).
- Tests du back qui attendent les anciens codes : rechercher `ressource.introuvable`, `preparation.sens_invalide` et `image.indisponible` dans `back/src/test`.
- `front/src/app/commun/erreurs/` -- nouvelle constante partagée.
- `front/src/app/preparations/preparation.ts` (l.212), `encart-mots-deja-illustres.ts` (l.58-91, `refusSousVerrou`), `panneau-choix-image.ts` (l.62), `suggestions-arasaac.ts` (l.49, `CODES_A_RECHARGER`, à vérifier) et leurs specs.

## Tasks & Acceptance

**Execution:**
- [x] Back : codes unifiés dans `Usages`, `PreparationsService` et `SuggestionsArasaac`, avec javadoc et tests.
- [x] Front : constante partagée, listes locales et `refusSousVerrou` supprimés, specs mises à jour.
- [x] Contrat : `./mvnw package -DskipTests`, et `front/openapi/` versionné s'il change.

**Acceptance Criteria:**
- Given une Image devenue non proposable, when n'importe laquelle des routes de liaison, de remplacement, de réutilisation ou de reprise la reçoit, then la réponse est `404 image.indisponible`.
- Given le front, when on cherche une liste de codes « image indisponible », then il n'y en a qu'une, partagée.

## Implementation Notes

- Back : `Usages.lierImage` renvoie `404 image.indisponible` (constante `CODE_INTROUVABLE` supprimée de `Usages`) ; `Usages.remplacerImage` et `PreparationsService.reutiliserImage` renvoient `400 image.sens_different` pour une Image d'un autre Mot ; `SuggestionsArasaac.pictogramme` renvoie `404 arasaac.pictogramme_introuvable` (inconnu d'ARASAAC ou identifiant nul ou négatif). Javadoc `@throws` à jour, y compris pour le contrôle sous verrou de `reutiliserImage` et pour `PreparationsService.remplacerImage`.
- `lierImage` n'est atteint, pour une Image existante, que sous verrou depuis `reutiliserImage` (et la reprise de l'Encart, qui passe par la même route) : le refus n'est pas reproductible par une requête seule, d'où un test qui appelle `Usages.lierImage` directement (`ReutilisationImagePreparationResourceTest.sousVerrouLImageNonProposableOuDUnAutreSensGardeLesMemesCodes`). `PUT …/image` passe par `remplacerImage`.
- Front : `CODES_IMAGE_INDISPONIBLE` dans `commun/erreurs/codes-image-indisponible.ts` (fichier à part, pour rester hors du paquet initial), importé par la page, l'Encart et le Panneau de choix ; `refusSousVerrou` et les trois listes locales supprimés. `suggestions-arasaac.ts` inchangé : `CODES_A_RECHARGER` (`preparation.mot_deja_illustre`, `ressource.introuvable`) garde le sens générique. `MESSAGES_PAR_CODE` couvrait déjà les codes renvoyés.
- Contrat OpenAPI inchangé (les codes ne figurent pas dans le contrat). Paquet initial : 599,25 kB.
- Vérifié en local : front 812 tests et build ; back compilation des tests, ArchUnit (24 tests) et `package -DskipTests` sans dérive de `front/openapi/`. Les `@QuarkusTest` n'ont pas tourné en local (relais Docker de la machine Podman indisponible, `win-sshproxy` en échec) : à confirmer par `./mvnw verify` ou la CI.

Vérification à la clôture : front 812 tests, paquet initial 599,25 kB, ArchUnit vert ; les `@QuarkusTest` n'ont pas tourné en local (pipe Docker de la machine Podman absent) et restent à confirmer par la CI ou un `./mvnw verify` local.

## Spec Change Log

- La ligne « Choix d'une Image retirée entre-temps » de la matrice cite `PUT …/image` via `lierImage` : cette route passe par `remplacerImage`, qui renvoie les mêmes codes ; `lierImage` n'est atteint que sous verrou (réutilisation, reprise). Intention inchangée.

## Review Triage Log

Revue 1 (Blind Hunter BH, Edge Case Hunter EC, Verification Gap VG : aucun manque).

| # | Constat | Verdict | Preuve | Suite |
|---|---------|---------|--------|-------|
| 1 | BH-3 : message de `image.sens_different` limité à « autre sens » | low | Le code couvre aussi une Image d'un autre Mot | patch |
| 2 | EC-1, EC-2 : le commentaire de la constante partagée promet ces codes sur toutes les routes de liaison | low | « Tout reprendre » et le rétablissement passent par `lierImageSiPossible`, sans refus | patch (commentaire) |
| 3 | BH-9 : commentaire de la branche de réutilisation faux pour `404 ressource.introuvable` | low | Préparation ou Mot supprimé : relancer la détection est sans objet | patch (commentaire) |
| 4 | BH-5, BH-6 : test sous verrou limité à `lien_image`, cas de la boucle sans message | low | Régression d'écriture non détectée | patch |
| 5 | BH-2, EC-3 : identifiant ARASAAC nul ou négatif, 404 sur une route, 400 sur l'autre | low | Sur `telecharger`, c'est la validation de la requête (`minimum=1`) : requête invalide, pas pictogramme inconnu | rejeté |
| 6 | BH-1 : constantes de code recopiées par module | low | Les modules ne partagent que par `service` (AD-1) ; une constante de chaîne par module est la règle actuelle | rejeté |
| 7 | BH-4 : codes absents du contrat OpenAPI | low | Hors du périmètre de l'action ; à voir si l'Epic 3 multiplie les codes | rejeté |
| 8 | EC-4 : chemin sous verrou de `reutiliserImage` non testé par HTTP | low | Inatteignable en une seule requête ; testé au niveau du service | rejeté |
| 9 | BH-7, BH-8, BH-10, BH-11 : fixture `getSingleResult`, javadoc redondante, assertions en double, suivi documentaire | low | Sans effet produit ; suivi fait à la clôture | rejeté |

## Verification

**Commands:**
- `cd back && ./mvnw verify` -- expected: tests verts, ArchUnit compris.
- `cd front && npm test -- --watch=false && npm run build` -- expected: tests verts, paquet initial sous 600 kB.
