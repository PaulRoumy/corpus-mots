---
title: 'Story 1.6, partie 3 : Annuaire des enseignants'
type: 'feature'
created: '2026-11-03'
status: 'done'
baseline_commit: '87dafb74551cf04c527c77ffc8b49166633d1890'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/realisation/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** le nom affiché n'est stocké que dans `enseignant` (AD-20) ; les Epics 3 et 6 devront afficher le propriétaire d'une Image ou l'auteur d'une action à partir de son seul identifiant, et aucun moyen ne permet encore au front de le résoudre.

**Approach:** une ressource `GET /api/enseignants` ouverte à tout enseignant actif, qui renvoie `id`, `nomAffiche` et `statut` des comptes de l'équipe hors invités, et un service front `commun/annuaire` qui la lit une fois et garde les noms en cache.

## Boundaries & Constraints

**Always:**
- Ressource authentifiée sans rôle particulier (le filtre de 1.3 exige un Enseignant `actif`) ; lecture seule, dans une transaction de `ComptesService`, sans appel Keycloak.
- Réponse : liste complète, non paginée, comme `GET /api/comptes` (l'équipe d'une école tient en une page ; le cache a besoin de tout) ; statuts `actif`, `desactive`, `suppression_en_cours`, `supprime` ; jamais `invite` (ni nom ni existence d'un invité), jamais d'e-mail ni de rôle.
- `commun/annuaire` : service `providedIn: 'root'` à signals, sur le modèle de `CompteCourant` ; un seul appel tant que le chargement réussit (les appels concurrents attendent le même) ; un échec n'est pas mis en cache, l'appel suivant recharge ; `recharger()` force une nouvelle lecture ; `enseignant(id)` renvoie l'entrée ou `null` pour un identifiant absent.
- Appel HTTP uniquement par le client généré (AD-7).

**Never:**
- Pas d'écran ni d'usage de l'annuaire dans cette partie (Epic 3) ; pas de texte de repli pour un identifiant inconnu (« ancien membre de l'équipe » : Epic 6).
- Pas de copie du nom dans un autre module (AD-20).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Lecture | enseignant actif ; équipe avec actifs, désactivé, supprimé, invités | `200`, tous sauf les invités, `id`/`nomAffiche`/`statut` seulement | N/A |
| Non administrateur | jeton sans `admin` | `200` | N/A |
| Sans jeton | — | `401` | N/A |
| Compte inactif | jeton d'un enseignant `desactive` | `403 compte.inconnu_ou_inactif` | N/A |
| Cache | deux appels à `charger()` | une seule requête | N/A |
| Échec puis reprise | première lecture en `500` | état d'erreur ; `charger()` suivant relit | N/A |
| Identifiant absent | `enseignant(id)` inconnu | `null` | N/A |

</frozen-after-approval>

## Code Map

- `back/.../comptes/api/MonCompteResource.java` -- modèle de ressource sans `@RolesAllowed` (rôles par défaut `**`) et d'`@Operation(operationId)`.
- `back/.../comptes/api/CompteDto.java` -- modèle de DTO `record` avec `@Schema(required, enumeration)` et fabrique `de(vue)` ; noms de DTO uniques (ArchUnit, AD-16) : `EnseignantDto` est libre.
- `back/.../comptes/service/ComptesService.java` -- `enseignantsDeLEquipe()` et le record `EnseignantLu(id, nomAffiche, statut)` à réutiliser ; ajouter la variante sans invités.
- `back/src/test/.../comptes/api/ComptesResourceTest.java` -- modèle de test : équipe insérée en SQL, `@TestSecurity` + `@OidcSecurity(claims = sub)`.
- `front/src/app/commun/compte-courant.ts` (+ spec) -- modèle du service et de son test (`HttpTestingController`, `expectOne`).
- `front/openapi/` -- régénéré par `./mvnw package -DskipTests`, versionné ; `npm run api` produit `fn/enseignants-resource/…`.

## Tasks & Acceptance

**Execution:**
- [x] `back/.../comptes/service/ComptesService.java` -- lecture de l'annuaire (hors `invite`).
- [x] `back/.../comptes/api/EnseignantsResource.java`, `EnseignantDto.java` -- `GET /api/enseignants` (`operationId = "listerEnseignants"`).
- [x] `back/src/test/.../comptes/api/EnseignantsResourceTest.java` -- matrice côté back.
- [x] `front/openapi/` -- régénérer et versionner.
- [x] `front/src/app/commun/annuaire.ts` (+ spec) -- service et matrice côté front.

**Acceptance Criteria:**
- Given le contrat OpenAPI, when la CI le compare, then `front/openapi/` est à jour.

## Implementation Notes

- Un invité désactivé avant d'avoir saisi son nom (`desactive` sans nom, permis par `V202611031500`) reste un invité : exclu de l'annuaire (`statut <> 'invite' and nomAffiche is not null`), ce qui garde `nomAffiche` obligatoire dans le contrat.
- Front : `recharger()` ignore une réponse dépassée par une lecture plus récente.
- Vérifié par l'implémentation : `./mvnw verify` 103 tests verts ; `npm test` 130 tests verts, 132 après revue ; `npm run build` sans avertissement.

## Spec Change Log

## Review Triage Log

Passe 1 (Blind Hunter = BH, Edge Case Hunter = EC, Verification Gap = VG).

| # | Source | Constat | Verdict | Preuve | Route |
|---|--------|---------|---------|--------|-------|
| 1 | EC, BH | `recharger()` en échec après un chargement réussi : état `erreur`, tous les noms en cache perdus | medium | Branche d'erreur de `lire()` : `etatCourant.set({ statut: 'erreur' })` vide `parId` | patch (garder l'état `charge`, test) |
| 2 | VG | Échec d'une lecture dépassée par `recharger()` non testé (garde `chargement === lecture`) | low | Seul le cas succès contre succès est testé | patch (test) |
| 3 | BH | `recharger()` qui échoue avant la réussite d'une lecture plus ancienne : la liste arrivée est ignorée | low | Suppose un rechargement pendant le tout premier chargement, et son échec ; correctif = file d'attente | rejeté |
| 4 | EC | État laissé à `erreur` pendant une nouvelle tentative | false | Conforme à l'UX : le Bandeau d'erreur reste jusqu'à résolution | rejeté |
| 5 | EC, BH | État initial `chargement` avant tout appel à `charger()` | low | Même modèle que `CompteCourant`, voulu par la spec | rejeté |
| 6 | EC, BH | Réponse sans ordre | low | L'annuaire se lit par identifiant ; l'ordre d'affichage (collation française) revient à l'écran qui listera | rejeté |
| 7 | BH | Anciens membres anonymisés : nom gardé ou filtré par `nomAffiche is not null` | false | La contrainte `enseignant_nom_affiche_renseigne` impose un nom à tout `supprime` : l'anonymisation (Epic 6) en posera un de remplacement | rejeté |
| 8 | BH | `403 compte.inconnu_ou_inactif` non distingué des autres échecs | low | `CompteCourant` traite déjà ce cas : la coquille n'affiche aucune page à un compte inactif | rejeté |
| 9 | BH | Cache jamais invalidé après les actions d'administration ni à la déconnexion | low | Aucun écran ne lit l'annuaire avant l'Epic 3 ; la déconnexion recharge l'application (redirection Keycloak) | rejeté |
| 10 | BH | Projection `EnseignantLu` dupliquée dans `ComptesService` | low | Deux lignes ; aucun appelant ne divergerait aujourd'hui | rejeté |
| 11 | BH | Test back : un seul élément comparé champ à champ ; invité avec jeton, invité activé au premier appel non testés | low | Le DTO n'a que trois champs ; les cas d'invité relèvent du filtre, testé en 1.3 (`CompteActifTest`) | rejeté |
| 12 | BH | Réponses `401` / `403` absentes du contrat OpenAPI | low | Même convention que les ressources existantes | rejeté |
| 13 | BH | Fichiers de suivi absents du diff | false | Spec volontairement hors diff (claims) ; suivi mis à jour à la présentation | rejeté |

## Verification

**Commands:**
- `cd back && ./mvnw verify` (avec `DOCKER_HOST` Podman) -- expected: tests verts, ArchUnit compris.
- `cd front && npm test -- --watch=false && npm run build` -- expected: verts, sans avertissement de budget.
