---
title: 'Story 1.7, partie 1 : Mon compte'
type: 'feature'
created: '2026-11-04'
status: 'done'
baseline_commit: 'c634f3e3b21fd872474ad641233cda8b224a0f42'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/realisation/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** la route `/mon-compte` affiche encore « Cette page arrive bientôt. » ; l'enseignant ne voit pas ce que l'application garde sur lui et ne peut pas corriger le nom affiché, repris à l'activation de son prénom et de son nom saisis dans Keycloak (FR-3).

**Approach:** `GET /api/mon-compte` renvoie aussi l'e-mail, lu dans le jeton ; une nouvelle opération enregistre le nom affiché dans `enseignant`. La page Mon compte montre le nom affiché (modifiable), l'e-mail et le rôle (lecture seule), et rien d'autre.

## Boundaries & Constraints

**Always:**
- E-mail tiré de la revendication `email` du jeton (Keycloak fait foi, AD-6), chaîne vide si elle manque ; rôle tiré du jeton, comme aujourd'hui.
- Nom affiché nettoyé des espaces de début et de fin, 1 à 100 caractères, sinon `400 compte.nom_affiche_invalide` ; écrit dans `enseignant` seulement, par `comptes.service`, dans une transaction sans appel Keycloak. Le prénom et le nom gardés dans Keycloak ne changent pas : aucun e-mail ni écran ne les montre.
- Enseignant courant tiré du jeton, jamais d'un paramètre ; ouvert à tout enseignant actif, sans rôle.
- Après l'enregistrement, `CompteCourant` porte le nouveau nom (Menu de profil et avatar à jour sans recharger la page), et `Annuaire` est relu s'il était déjà chargé.
- Échec d'enregistrement : Bandeau d'erreur (« Réessayer »), saisie conservée ; message du `code` traduit dans `commun/erreurs`.
- Décision de Paul : bouton « Enregistrer », actif seulement quand la saisie diffère du nom enregistré et qu'elle est valide (pas d'enregistrement à la sortie du champ).
- Rôle affiché « Administrateur » ou « Enseignant » ; textes au vouvoiement.

**Never:**
- Aucun autre champ (ni donnée d'élève, ni photo, ni classe) ; e-mail et rôle non modifiables ici.
- Pas de Mes données ni de page « Données personnelles » (partie 2), pas d'export de Mes mots.
- Pas d'appel HTTP écrit à la main (AD-7), pas de copie du nom dans un autre module (AD-20).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Lecture | enseignant actif, jeton avec `email` | `200` `id`, `nomAffiche`, `email`, `administrateur` | N/A |
| Jeton sans e-mail | revendication `email` absente | `200`, `email` vide | N/A |
| Renommer | `"  Claire Dupont "` | `200`, nom enregistré `Claire Dupont`, compte renvoyé | N/A |
| Nom vide | `""`, `"   "` ou champ absent | `400 compte.nom_affiche_invalide`, rien d'écrit | Front : champ en erreur, pas d'envoi |
| Nom trop long | 101 caractères après nettoyage | `400 compte.nom_affiche_invalide` | Front : même contrôle avant envoi |
| Sans jeton | — | `401` | N/A |
| Compte inactif | jeton d'un enseignant `desactive` | `403 compte.inconnu_ou_inactif` | N/A |
| Échec réseau ou `500` | enregistrement | Bandeau d'erreur, saisie gardée, « Réessayer » renvoie | N/A |

</frozen-after-approval>

## Code Map

- `back/.../comptes/api/MonCompteResource.java` -- `GET` existant (`lireMonCompte`) ; y ajouter l'opération d'écriture (`PUT /mon-compte/nom-affiche`, `operationId = "modifierNomAffiche"`, corps `NomAfficheDto(nomAffiche)` requis, réponse `MonCompteDto`). E-mail : `jeton.getClaim("email")`, avec la lecture texte `String`/`JsonString` de `FiltreCompteActif.texte`.
- `back/.../comptes/api/MonCompteDto.java`, `service/MonCompteVue.java` -- ajouter `email` (`@Schema(required = true)`).
- `back/.../comptes/service/ComptesService.java` -- `monCompte(sub, administrateur)` à étendre ; nouvelle méthode de renommage sur le modèle de `verifierActif` (`identifiant(sub)`, `inconnuOuInactif`) ; codes `static final` en tête de classe ; `ErreurMetier(400, code, détail)` comme `ComptesAdministration` l.168.
- `back/.../comptes/persistance/Enseignant.java` -- ajouter une transition de renommage réservée à `ACTIF` (`IllegalStateException` sinon, comme `activer`). Contrainte `enseignant_nom_affiche_renseigne` inchangée : aucune migration.
- `back/src/test/.../comptes/api/CompteActifTest.java` -- tests de `GET /api/mon-compte` (`@OidcSecurity` + `@Claim`, insertion SQL) : ajouter l'e-mail ; modèle pour un `MonCompteResourceTest` dédié au renommage.
- `front/openapi/` -- régénérer (`./mvnw package -DskipTests`) et versionner.
- `front/src/app/commun/compte-courant.ts` (+ spec) -- ajouter une mise à jour du compte chargé après renommage.
- `front/src/app/commun/annuaire.ts` -- `recharger()` existant ; n'appeler que si l'état est `charge`.
- `front/src/app/commun/erreurs/message-erreur.ts` (+ spec, liste `codesDuBack`) -- message de `compte.nom_affiche_invalide`.
- `front/src/app/administration/comptes/comptes.ts` -- modèle de formulaire (`FormControl`, `Validators`, `mat-form-field`, `app-bandeau-erreur`) et de page chargée à la demande.
- `front/src/app/app.routes.ts` -- `/mon-compte` passe de `PageBientot` à la nouvelle page, chargée par `loadComponent` (formulaires Material hors du paquet initial) ; `/mes-donnees` garde `PageBientot`.
- `front/src/app/app.spec.ts` l.78-91, `coquille/coquille.spec.ts` l.216 -- attendent la page d'attente sur `/mon-compte` : adapter (ordre de tabulation compris).

## Tasks & Acceptance

**Execution:**
- [x] `back/.../comptes/persistance/Enseignant.java`, `service/ComptesService.java`, `service/MonCompteVue.java` -- e-mail dans la vue, renommage validé.
- [x] `back/.../comptes/api/MonCompteResource.java`, `MonCompteDto.java`, `NomAfficheDto.java` -- lecture enrichie et `modifierNomAffiche`.
- [x] `back/src/test/.../comptes/api/MonCompteResourceTest.java` (+ `CompteActifTest` si besoin) -- matrice côté back.
- [x] `front/openapi/` -- régénérer et versionner.
- [x] `front/src/app/commun/compte-courant.ts`, `commun/erreurs/message-erreur.ts` (+ specs) -- mise à jour du compte, message du code.
- [x] `front/src/app/compte/mon-compte.ts` (+ spec) -- page et matrice côté front.
- [x] `front/src/app/app.routes.ts`, `app.spec.ts`, `coquille/coquille.spec.ts` -- route et tests existants.

**Acceptance Criteria:**
- Given la page Mon compte, when un enseignant la parcourt au clavier, then il n'y trouve que le champ du nom affiché et ses actions, avec un libellé visible pour le nom, l'e-mail et le rôle.
- Given le nom enregistré, when l'enseignant ouvre le Menu de profil, then le nouveau nom et sa nouvelle initiale y figurent sans rechargement.
- Given le contrat OpenAPI, when la CI le compare, then `front/openapi/` est à jour.

## Implementation Notes

- E-mail absent du jeton : la page affiche « Non renseigné ».
- « Enregistrer » utilise `disabledInteractive` : focalisable même inactif, donc présent dans l'ordre de tabulation.
- Tout échec d'enregistrement, `400` du back compris, passe par le Bandeau d'erreur ; le contrôle avant envoi montre l'erreur sous le champ.
- Nettoyage du nom : mêmes caractères que `trim()` en JavaScript (blancs, `\p{Z}`, U+FEFF), aux deux extrémités.
- Mon compte chargée à la demande : les tests de l'application et de la coquille importent la page avant de naviguer.
- Vérifié après revue : `./mvnw verify` 115 tests verts ; `npm test` 147 tests verts ; `npm run build` sans avertissement (paquet initial 579 kB, `mon-compte` 5,6 kB).

## Spec Change Log

## Review Triage Log

Passe 1 (Blind Hunter = BH, Edge Case Hunter = EC, Verification Gap = VG).

| # | Source | Constat | Verdict | Preuve | Route |
|---|--------|---------|---------|--------|-------|
| 1 | BH, EC | `NomAfficheDto` : `minLength`/`maxLength` portent sur la valeur brute, le back borne après nettoyage | low | `unNomDeCentCaracteresEstAccepte` envoie 102 caractères et reçoit `200` | patch (bornes dans `description`) |
| 2 | BH, EC | Nettoyage différent : `strip()` garde U+00A0 et U+FEFF, `trim()` les retire | low | Un nom fait d'espaces insécables passe par l'API ; commentaire « même règle » faux | patch (même jeu de caractères, test) |
| 3 | VG | Corps vide (`nom == null`) non testé | low | `@ValueSource` n'envoie que des objets JSON | patch (test) |
| 4 | EC | « Réessayer » après une saisie redevenue identique ou invalide : rien ne se passe, le Bandeau reste | low | `enregistrer()` sort sans effacer `erreur` | patch (effacer le Bandeau, test) |
| 5 | VG | Garde de la saisie modifiée pendant l'envoi non testée | low | Aucun test ne change le champ entre l'envoi et la réponse | patch (test) |
| 6 | VG | Menu de profil et avatar après renommage non vérifiés (critère d'acceptation) | medium | Aucun test ne rend la coquille après `mettreAJour` | patch (test coquille) |
| 7 | BH, EC | Caractères de contrôle et sauts de ligne acceptés dans le nom | low | `input type="text"` retire les sauts de ligne ; seul un appel direct à l'API les envoie ; garde supplémentaire | rejeté |
| 8 | BH, EC | Longueur comptée en unités UTF-16, pas en caractères | low | Front et back comptent pareil ; un nom de 100 caractères avec émojis est improbable ; sans `maxLength` au contrat (constat 1) plus d'écart | rejeté |
| 9 | BH, EC | `mettreAJour` perdu face à un `charger()` en cours | false | La coquille ne rend la page qu'une fois le compte chargé, et `charger()` ne relit jamais (`??=`) | rejeté |
| 10 | BH, EC | `403 compte.inconnu_ou_inactif` à l'enregistrement : Bandeau au lieu de l'état `inactif` | low | Message traduit affiché ; même traitement que l'Administration ; la page suivante passe par `CompteCourant` | rejeté |
| 11 | BH, EC | Annuaire en `chargement` pendant l'enregistrement : nom ancien possible | low | Aucun écran ne charge l'annuaire avant l'Epic 3 ; l'état initial `chargement` ferait relire à tort | rejeté |
| 12 | BH | Invité ou supprimé appelant le `PUT` non testés | low | Refusés par le filtre, couvert par `CompteActifTest` | rejeté |
| 13 | BH, EC | Réponses `401`/`403` et schéma `problem+json` absents du contrat | low | Même convention que les ressources existantes (1.6-3, constat 12) | rejeté |
| 14 | BH | Pas d'indicateur d'envoi, double envoi non testé | low | Requête courte ; bouton inactif pendant l'envoi (`envoiEnCours`) | rejeté |
| 15 | BH | Erreur de longueur visible seulement à la sortie du champ, sans compteur | low | Nom de plus de 100 caractères improbable ; bouton inactif | rejeté |
| 16 | BH | `email` requis avec `""` pour « absent » | false | Choix fixé par la spec (chaîne vide si la revendication manque) | rejeté |
| 17 | BH | `FiltreCompteActif.texte` rendu visible au paquetage | low | Même paquetage `comptes.api` ; aucun appelant ne diverge | rejeté |
| 18 | EC | JSON illisible ou mauvais `Content-Type` hors RFC 9457 | false | `ErreursMappers` traduit `JsonProcessingException`, `MismatchedInputException` et `415 format.non_supporte` | rejeté |
| 19 | BH | `openapi.json`, spec et suivi absents du diff | false | Exclus volontairement du diff relu ; la CI compare le contrat | rejeté |

## Verification

**Commands:**
- `cd back && ./mvnw verify` (avec `DOCKER_HOST` Podman) -- expected: tests verts, ArchUnit compris.
- `cd front && npm test -- --watch=false && npm run build` -- expected: verts, sans avertissement de budget.

**Manual checks (if no CLI):**
- En local (`compose.dev.yaml`, `quarkus:dev`, `npm start`) : Mon compte montre l'e-mail réel du jeton Keycloak ; renommer met à jour le Menu de profil.
