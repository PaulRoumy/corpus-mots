---
title: 'Story 1.6, partie 2 : Réconciliation des comptes entre Keycloak et la base'
type: 'feature'
created: '2026-11-03'
status: 'done'
baseline_commit: 'e6ce8beaa568e2d22bd88036b9ef684139cb75a9'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/realisation/epic-1-context.md'
  - '{project-root}/docs/realisation/spec-1-6-gerer-les-comptes-de-l-equipe.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** une opération de compte peut réussir dans Keycloak puis échouer en base (ou une compensation échouer) : un utilisateur Keycloak orphelin bloque alors son adresse, et un compte désactivé ou réactivé dans Keycloak garde l'ancien statut en base (AD-18, reports des revues 1.5 et 1.6).

**Approach:** une tâche planifiée de `comptes`, au démarrage puis chaque heure, compare les utilisateurs du realm aux Enseignants et achève l'opération interrompue : Keycloak a été appelé d'abord, son état fait donc foi pour activé / désactivé, sauf pour un compte en suppression.

## Boundaries & Constraints

**Always:**
- Écarts traités (le compte de service du back n'est jamais touché) :
  - utilisateur Keycloak sans Enseignant, ou dont l'Enseignant est `supprime` → supprimé de Keycloak ;
  - Keycloak désactivé, Enseignant `invite` ou `actif` → désactivation rejouée (Keycloak `enabled=false` et sessions révoquées), puis `statut = desactive` ;
  - Keycloak activé, Enseignant `desactive` → `statut = actif`, ou `invite` sans nom affiché (réactivation achevée) ;
  - Keycloak activé, Enseignant `suppression_en_cours` → désactivé dans Keycloak ;
  - Enseignant sans utilisateur Keycloak (hors `supprime`) → journalisé seulement.
- Un écart n'est corrigé que s'il est constaté, identique, à deux passages successifs : une requête en cours entre son appel Keycloak et son écriture en base n'est jamais « corrigée ».
- Base sans aucun Enseignant : aucune suppression dans Keycloak (le premier administrateur s'en charge, base peut-être mal restaurée).
- Appels Keycloak hors transaction, écritures par `ComptesService` (AD-17) ; un échec sur un compte est journalisé et n'arrête pas les autres ; un échec de lecture (Keycloak ou base) annule le passage, retenté à l'heure suivante.
- Chaque correction est journalisée (identifiant, écart, action), sans e-mail ni jeton.

**Never:**
- Pas d'écran, d'API ni de migration ; pas d'annuaire (partie 3) ; pas de recréation d'un utilisateur Keycloak manquant.
- Ne jamais réactiver dans Keycloak un compte désactivé en base, ni toucher au rôle `admin`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Orphelin | utilisateur Keycloak sans Enseignant, vu à deux passages | supprimé de Keycloak | N/A |
| Invitation en cours | orphelin au 1er passage, Enseignant créé avant le 2e | rien | N/A |
| Désactivation interrompue | Keycloak désactivé, `actif` | sessions révoquées, `desactive` | N/A |
| Réactivation interrompue | Keycloak activé, `desactive` avec / sans nom | `actif` / `invite` | N/A |
| Supprimé | Enseignant `supprime`, utilisateur Keycloak présent | supprimé de Keycloak | N/A |
| En suppression | Keycloak activé, `suppression_en_cours` | désactivé dans Keycloak | N/A |
| Compte de service | `service-account-corpus-mots-back` | jamais supprimé | N/A |
| Base vide | utilisateurs Keycloak, aucun Enseignant | aucune suppression | journal |
| Écart résolu entre-temps | écart au 1er passage, plus au 2e | rien | N/A |
| Statut changé entre lecture et écriture | `409 compte.statut_incompatible` | compte ignoré, les autres traités | journal |
| Keycloak injoignable | lecture du realm en échec | rien de modifié | journal, heure suivante |

</frozen-after-approval>

## Code Map

- `back/.../comptes/service/PremierAdministrateur.java` -- modèle de tâche : `@Scheduled(identity, every, concurrentExecution = SKIP)`, méthode testable séparée, `try/catch RuntimeException` et `LOG.warnf`, `reinitialiser()` pour les tests. `%test.quarkus.scheduler.enabled=false` : les tests appellent la méthode.
- `back/.../comptes/service/IdentiteVue.java` -- record `(id, email, administrateur)` : y ajouter `active` et `compteDeService` ; seuls constructeurs : `IdentitesKeycloak.lister()` (l. ~122) et `IdentitesFactices.lister()`. `ComptesAdministration.lister()` lit `email` et `administrateur`, inchangé.
- `back/.../comptes/service/IdentitesKeycloak.java` -- `lister()` (représentation complète, par pages de 100) : renseigner `isEnabled()` et `getServiceAccountClientId() != null` (repli : `username` qui commence par `service-account-`). `desactiver(id)` (`enabled=false` puis `logout()`) et `supprimer(id)` (404 accepté) sont idempotents : réutiliser.
- `back/.../comptes/service/ComptesService.java` -- ajouter la lecture des statuts de tous les Enseignants (supprimés compris) ; réutiliser `desactiver(id)` et `reactiver(id)` (verrou de ligne, `409 compte.statut_incompatible` si le statut a changé).
- `deploiement/keycloak/realm-corpus-mots.json` -- seul utilisateur importé : le compte de service (`serviceAccountClientId: corpus-mots-back`).
- `back/src/test/.../comptes/service/IdentitesFactices.java` -- double de Keycloak : ajouter un utilisateur compte de service, `existe(id)`, et `active` dans `lister()`.
- `back/src/test/.../comptes/service/PremierAdministrateurTest.java` -- modèle de test de tâche (base vidée par SQL, `QuarkusTransaction.requiringNew()`).

## Tasks & Acceptance

**Execution:**
- [x] `back/.../comptes/service/IdentiteVue.java`, `IdentitesKeycloak.java` -- `active` et `compteDeService` lus dans Keycloak.
- [x] `back/.../comptes/service/ComptesService.java` -- statuts de tous les Enseignants.
- [x] `back/.../comptes/service/ReconciliationComptes.java` -- nouvelle tâche (`identity = "reconciliation-comptes"`, `every = "1h"`, `SKIP`) : lecture, écarts, confirmation au passage suivant, corrections.
- [x] `back/.../comptes/service/InvitationService.java` -- commentaire de la compensation : renvoyer à la nouvelle tâche.
- [x] `back/src/test/.../comptes/service/` -- double étendu ; `ReconciliationComptesTest` couvrant la matrice.

**Acceptance Criteria:**
- Given l'environnement `compose.dev.yaml`, when le back démarre, then le journal montre un passage de réconciliation sans erreur et le compte de service existe toujours dans Keycloak.
- Given `./mvnw verify`, when il s'exécute, then tous les tests passent, ArchUnit compris, et `front/openapi/` est inchangé.

## Implementation Notes

- Mémoire des écarts conservée quand un passage est annulé (lecture Keycloak ou base en échec) : le passage suivant compare au dernier passage complet.
- Écart et correction journalisés par identifiant ; « base sans enseignant » et « enseignant sans utilisateur Keycloak » journalisés à chaque passage, sans correction ; un résumé (nombres d'utilisateurs, d'enseignants, d'écarts, de corrections) termine chaque passage.
- Double de Keycloak : compte de service `IdentitesFactices.COMPTE_DE_SERVICE` présent après chaque réinitialisation, `existe(id)`, `auPassage(etape, action)` pour simuler une requête concurrente entre deux étapes.
- Vérifié sur `compose.dev.yaml` (Keycloak 26.8) : premier passage au démarrage, « 1 utilisateurs Keycloak, 1 enseignants, 0 écarts, 0 corrigés » ; le realm compte deux utilisateurs, `users().list` exclut donc déjà le compte de service, que le filtre `compteDeService` écarte aussi par sécurité ; `service-account-corpus-mots-back` toujours présent.
- `./mvnw verify` après revue : 99 tests verts (dont 16 de `ReconciliationComptesTest` et 6 de `IdentitesKeycloakTest`), `front/openapi/` inchangé.

## Spec Change Log

## Review Triage Log

Passe 1 (Blind Hunter = BH, Edge Case Hunter = EC, Verification Gap = VG).

| # | Source | Constat | Verdict | Preuve | Route |
|---|--------|---------|---------|--------|-------|
| 1 | VG, BH | Correspondance `UserRepresentation` → `active` / `compteDeService` de `IdentitesKeycloak` jamais testée ; une régression désactiverait toute l'équipe ou supprimerait le compte de service | medium | Aucun test ne référence `IdentitesKeycloak` ; le double fournit les deux drapeaux | patch (méthode statique `vue` + `IdentitesKeycloakTest` sans conteneur) |
| 2 | VG | Déclenchement de `@Scheduled` non testé | low | `%test.quarkus.scheduler.enabled=false`, même convention que `PremierAdministrateur` ; passage au démarrage constaté dans le journal de `quarkus:dev` | rejeté |
| 3 | VG, EC, BH | `enabled` absent (`null`) lu comme désactivé : comptes actifs désactivés | false | La représentation complète de Keycloak porte toujours `enabled` (booléen du modèle) ; passage réel : 0 écart pour l'administrateur actif | rejeté |
| 4 | VG, EC, BH | Restauration partielle de la base : orphelins en masse supprimés de Keycloak ; aucune limite de corrections par passage | low | `sauvegarde.sh` restaure ensemble les bases `corpusmots` et `keycloak` (`pg_dumpall`) ; correctif = seuil, garde nouvelle | rejeté |
| 5 | EC | Utilisateur humain créé à la main dans le realm supprimé | false | Voulu par AD-18 (« tout utilisateur du realm sans Enseignant ») ; console d'administration jamais exposée | rejeté |
| 6 | EC | Identifiant Keycloak non UUID : `lister()` lève, tous les passages échouent | low | Ni fédération ni import d'utilisateurs ; `ComptesAdministration.lister()` échouerait déjà | rejeté |
| 7 | EC | Réactivation corrigée pendant une réactivation en cours de l'administrateur : `409` pour la requête | low | Écart déjà constaté une heure plus tôt et requête simultanée à la milliseconde ; état final correct | rejeté |
| 8 | EC, BH | Commentaire de `InvitationService` : « au plus tard deux passages » faux après redémarrage ou échec | low | Correction directe du texte | patch |
| 9 | BH | Suppression (Epic 6) interrompue après Keycloak `enabled=false` : achevée comme une désactivation | maybe-false | Dépend du circuit de suppression à écrire (Epic 6) : il doit laisser un état que la réconciliation distingue | defer |
| 10 | BH | `suppression_en_cours` bloquée non signalée en propre | low | Aucun compte ne prend ce statut avant l'Epic 6 ; absence dans Keycloak déjà journalisée | rejeté |
| 11 | BH | Tout `enabled=false` (verrouillage permanent, console) compris comme désactivation interrompue, hypothèse non écrite | low | Realm : `bruteForceProtected` sans `permanentLockout` (faux par défaut) ; correctif = commentaire | patch |
| 12 | BH | Confirmation sur le type d'écart seulement, pas sur l'état observé | low | Les variantes confondues (absent / `supprime`, `invite` / `actif`) mènent à la même correction, sans dommage | rejeté |
| 13 | BH | Cas de test manquants (`suppression_en_cours` désactivé, `supprime` activé, `409` côté réactivation, orphelin administrateur…) | low | Chaque ligne de la matrice a son test ; branches restantes triviales du `switch` | rejeté |
| 14 | BH | Suivi non mis à jour (spec hors diff, reports non fermés, suivi de sprint) | false | Spec volontairement hors diff (claims) ; reports jamais modifiés (format) ; suivi mis à jour à la présentation | rejeté |
| 15 | BH | Échecs répétés seulement visibles en `warn` horaire, sans alerte | low | Exploitation par Paul au journal, comme `PremierAdministrateur` ; correctif = supervision nouvelle | rejeté |
| 16 | BH | `statutsDesEnseignants()` charge des entités gérées chaque heure | low | Quelques dizaines de lignes ; aucun effet visible | rejeté |

## Design Notes

Deux passages : la tâche garde en mémoire les écarts du passage précédent (`Map<UUID, Ecart>`) et ne corrige que ceux retrouvés à l'identique ; un redémarrage remet la mémoire à zéro, ce qui retarde la correction d'une heure au plus. Les écarts arrivent après une erreur `500` déjà affichée à l'administrateur, et aucun d'eux n'ouvre d'accès : un utilisateur désactivé dans Keycloak ne se connecte pas, un Enseignant `desactive` est refusé par le filtre. Attendre une heure de plus ne coûte donc rien, et cela écarte toute course avec une requête en cours.

Aucune correction ne réduit l'ensemble des administrateurs actifs d'AD-6 (activé dans Keycloak et `actif` en base) : la règle du dernier administrateur n'est pas en jeu.

## Verification

**Commands:**
- `cd back && ./mvnw verify` (avec `DOCKER_HOST` Podman) -- expected: tests verts, ArchUnit compris, `front/openapi/` inchangé.

**Manual checks:**
- `compose.dev.yaml` puis `quarkus:dev` : journal du premier passage ; `service-account-corpus-mots-back` toujours présent (le back joint encore Keycloak : la page Comptes se charge).
