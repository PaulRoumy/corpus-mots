---
title: 'Story 1.6 : Gérer les comptes de l''équipe (désactiver, réactiver, rôle)'
type: 'feature'
created: '2026-11-03'
status: 'done'
baseline_commit: 'b4edf3998f1b5851a607f9471add7e14ec23d42e'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/realisation/epic-1-context.md'
  - '{project-root}/docs/realisation/spec-1-5-inviter-un-collegue.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** l'administrateur voit les comptes de l'équipe mais ne peut ni couper l'accès d'un collègue, ni le rendre, ni partager ou retirer le rôle d'administrateur (FR-32, UX-DR-41).

**Approach:** ajouter sur Administration › Comptes, pour chaque ligne, les actions Désactiver / Réactiver et Donner / Retirer le rôle d'administrateur ; Keycloak d'abord, base ensuite (AD-18) ; refuser, avec sa raison, toute action qui laisserait l'équipe sans administrateur actif (AD-6).

## Boundaries & Constraints

**Always:**
- Désactiver : Keycloak `enabled=false` et révocation de ses sessions, puis `statut = desactive` ; aucune donnée effacée. Le filtre de 1.3 refuse déjà l'API (`403 compte.inconnu_ou_inactif`) dès l'écriture en base.
- Réactiver : Keycloak `enabled=true`, puis `statut = actif` si le compte a déjà un nom affiché, sinon `invite` (jamais activé).
- Rôle : Keycloak seulement, jamais copié en base ; il s'applique au prochain jeton de l'enseignant.
- « Au moins un administrateur actif » : retirer le rôle ou désactiver est refusé (`409 compte.dernier_administrateur`) si la cible est le seul membre activé du rôle `admin` ; le décompte se lit dans Keycloak, sérialisé entre requêtes concurrentes (décision 1).
- Gestes annulables, donc sans Dialogue de confirmation : chaque action réussie affiche le Bandeau « Annuler », dont l'opération inverse est l'action contraire (Réactiver, Désactiver, Retirer, Donner) ; un refus ou un échec affiche le Bandeau d'erreur ; la liste est rechargée après chaque action.
- Ressources sous `/api/comptes/{id}/…`, `@RolesAllowed("admin")` ; `404 ressource.introuvable` pour un compte absent ou `supprime` ; `409 compte.statut_incompatible` pour une action sans objet (désactiver un compte déjà désactivé, réactiver un compte non désactivé).

**Décisions (Paul, 2026-11-03) :**
- Story découpée : cette spec couvre les actions sur les comptes ; la réconciliation et l'annuaire sont reportés (`deferred-work.md`).
- 1. Sérialisation : transaction de verrou seul. Une transaction qui n'écrit rien prend `pg_advisory_xact_lock`, lit le décompte dans Keycloak et fait l'appel Keycloak, puis se termine ; le statut s'écrit ensuite dans une transaction normale. Exception à AD-17 limitée à ce verrou, commentée dans le code.
- 2. Un administrateur ne peut pas se désactiver lui-même : « Désactiver » est absent de sa propre ligne, et le back refuse (`409 compte.auto_desactivation`, « Vous ne pouvez pas désactiver votre propre compte. ») ; il peut retirer son propre rôle s'il reste un autre administrateur actif.
- 3. Textes : menu « Actions » de chaque ligne avec « Désactiver », « Réactiver », « Donner le rôle d'administrateur », « Retirer le rôle d'administrateur » ; Bandeau « Annuler » : « Compte de … désactivé. », « Compte de … réactivé. », « … est administrateur. », « … n'est plus administrateur. » (nom affiché, sinon e-mail) ; `compte.dernier_administrateur` « Il doit rester au moins un administrateur actif. » ; `compte.statut_incompatible` « Ce compte a changé entre-temps. La liste est rechargée. »

**Never:**
- Pas de tâche de réconciliation ni d'annuaire `GET /api/enseignants` (parties 2 et 3, `deferred-work.md`) ; pas de suppression de compte (Epic 6).
- Pas de copie du rôle en base ; pas de Dialogue de confirmation pour ces gestes.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Désactiver | collègue `actif` | Keycloak désactivé, sessions révoquées, `statut = desactive` ; ligne « désactivé » ; Bandeau « Annuler » | N/A |
| Désactivé appelle l'API | jeton encore valide | `403 compte.inconnu_ou_inactif` | N/A |
| Réactiver | `desactive` avec nom / sans nom | `actif` / `invite` ; données intactes | N/A |
| Donner le rôle | enseignant `actif` | membre du rôle `admin` ; ligne « administrateur » | N/A |
| Retirer le rôle | deux administrateurs actifs | rôle retiré | N/A |
| Dernier administrateur | seul admin activé : retirer son rôle ou le désactiver | `409 compte.dernier_administrateur`, Keycloak inchangé | N/A |
| Deux retraits simultanés | deux admins, chacun retire l'autre | un seul réussit, l'autre reçoit `409 compte.dernier_administrateur` | N/A |
| Action sans objet | désactiver un `desactive` | `409 compte.statut_incompatible` | N/A |
| Se désactiver | l'administrateur sur sa propre ligne | action absente ; appel direct : `409 compte.auto_desactivation` | N/A |
| Échec Keycloak | Keycloak injoignable | base inchangée ; `500` ; Bandeau d'erreur, « Réessayer » rejoue | N/A |
| Non-administrateur | jeton sans `admin` | `403 acces.refuse` sur chaque ressource | N/A |

</frozen-after-approval>

## Code Map

- `back/.../comptes/service/Identites.java`, `IdentitesKeycloak.java` -- ajouter `desactiver(id)` (`enabled=false` puis `users().get(id).logout()`), `reactiver(id)`, `retirerRoleAdministrateur(id)`, `administrateursActives()` (membres du rôle `admin` dont `enabled` est vrai) ; `donnerRoleAdministrateur` existe.
- `back/.../comptes/service/ComptesAdministration.java` -- orchestration sans transaction (lister, inviter, renvoyer) : y ajouter les quatre actions, Keycloak d'abord puis `ComptesService`.
- `back/.../comptes/service/ComptesService.java` -- `verifierInvite` : modèle pour lire et contrôler un `Enseignant` ; ajouter les écritures de statut.
- `back/.../comptes/persistance/Enseignant.java` -- `activer(nom)` ; ajouter `desactiver()`, `reactiver()` (selon `nomAffiche`). Contrainte SQL : `statut = 'invite' OR nom_affiche IS NOT NULL`.
- `back/.../comptes/api/ComptesResource.java` -- y ajouter `POST /{id}/desactivation`, `POST /{id}/reactivation`, `PUT /{id}/administrateur` (`{ administrateur: boolean }`), tous `204`.
- `back/src/test/.../comptes/service/IdentitesFactices.java` -- double de Keycloak : y ajouter `enabled`, sessions révoquées, rôles ; `ComptesResourceTest` : modèle des tests (dont `@TestSecurity` admin).
- `front/src/app/administration/comptes/comptes.ts` (+ spec) -- liste, `renvoisEnCours` (`Set`), Bandeau d'erreur, `messageErreur` ; ajouter le menu « Actions » (`mat-menu`) et le Bandeau « Annuler » (`commun/bandeau-annuler`).
- `front/src/app/commun/erreurs/message-erreur.ts` -- ajouter les deux codes.
- `front/openapi/` -- régénéré par `./mvnw package -DskipTests`, versionné.

## Tasks & Acceptance

**Execution:**
- [x] `back/.../comptes/service/Identites.java`, `IdentitesKeycloak.java` -- quatre opérations Keycloak.
- [x] `back/.../comptes/persistance/Enseignant.java`, `service/ComptesService.java` -- transitions de statut et contrôles (`404`, `409 compte.statut_incompatible`).
- [x] `back/.../comptes/service/ComptesAdministration.java` -- actions et règle du dernier administrateur, sérialisée selon la décision 1.
- [x] `back/.../comptes/api/ComptesResource.java` -- trois ressources.
- [x] `back/src/test/.../comptes/` -- matrice côté back, dont les deux retraits simultanés.
- [x] `front/openapi/` -- régénérer et versionner.
- [x] `front/src/app/administration/comptes/` et `commun/erreurs/message-erreur.ts` (+ specs) -- menu « Actions », Bandeau « Annuler » avec opération inverse, Bandeau d'erreur, rechargement ; matrice côté front.

**Acceptance Criteria:**
- Given un collègue désactivé, when il tente de se connecter, then Keycloak refuse avec le message « compte désactivé » du thème, et il retrouve tout après « Réactiver ».
- Given le contrat OpenAPI, when la CI le compare, then `front/openapi/` est à jour.

## Implementation Notes

- Contrainte `enseignant_nom_affiche_renseigne` (`statut = 'invite' OR nom_affiche IS NOT NULL`) incompatible avec « désactivé sans nom » de la matrice : nouvelle migration `V202611031500__comptes_enseignant_desactive_sans_nom.sql` (`statut IN ('invite', 'desactive') OR …`), la migration publiée restant intacte (AD-22).
- Verrou : `ComptesService.sousVerrouAdministrateurs` (transaction sans écriture, `pg_advisory_xact_lock(hashtext('comptes.administrateurs'))` pris par `EnseignantRepository`), utilisé pour Désactiver et Retirer le rôle ; Réactiver et Donner le rôle ne peuvent pas retirer d'administrateur et s'en passent. Le test des deux retraits simultanés échoue (`[204, 204]`) si on retire le verrou.
- Rôle sur un compte `suppression_en_cours` : `409 compte.statut_incompatible` (action sans objet) ; Donner ou Retirer un rôle déjà donné ou absent : `204` sans effet.
- `compte.auto_desactivation` ajouté aussi à `messageErreur` (texte de la décision 2).
- Front : l'opération inverse du Bandeau « Annuler » joue l'action contraire sans ouvrir de nouveau Bandeau « Annuler » (son résultat est annoncé) ; un refus définitif (`dernier_administrateur`, `auto_desactivation`, `statut_incompatible`, `ressource.introuvable`) fait recharger la liste par « Réessayer », tout autre échec rejoue l'action.

## Spec Change Log

## Review Triage Log

Passe 1 (Blind Hunter = BH, Edge Case Hunter = EC, Verification Gap = VG).

| # | Source | Constat | Verdict | Preuve | Route |
|---|--------|---------|---------|--------|-------|
| 1 | EC, BH, VG | Décompte des administrateurs actifs : un invité (activé dans Keycloak) ou un compte `desactive` en base compte comme actif ; une lecture vide laisse passer le retrait | high | `administrateursActives()` ne filtre que sur `enabled` ; la garde ne refuse que si la cible est seule dans l'ensemble | patch (Keycloak activé ∩ base `actif`, refus si personne d'autre) |
| 2 | VG, BH | Nouvelles opérations de `IdentitesKeycloak` testées seulement contre le double | medium | Aucune référence à `IdentitesKeycloak` dans `back/src/test` | defer (avec le test de l'adaptateur déjà reporté) |
| 3 | VG | « Réessayer » après `statut_incompatible`, `ressource.introuvable` non testé | low | Seul `dernier_administrateur` clique « Réessayer » | patch |
| 4 | EC, BH | Keycloak réussi puis écriture en base échouée : base et Keycloak divergent | low | « Réessayer » rejoue l'action de façon idempotente ; la réconciliation reportée doit aussi couvrir ce sens | defer (précision ajoutée au report) |
| 5 | EC, BH | `logout()` en échec après `enabled=false` : sessions vivantes | low | `500` ; « Réessayer » rejoue désactivation et révocation | rejeté |
| 6 | EC | Utilisateur Keycloak absent pour un `Enseignant` : `500` | low | Seulement après suppression manuelle ; la réconciliation traitera ces écarts | rejeté |
| 7 | EC, BH | Lecture puis réécriture de toute la représentation de l'utilisateur | low | Fenêtre de quelques millisecondes ; une représentation partielle n'est pas vérifiable sans vrai Keycloak | rejeté |
| 8 | EC, BH | Verrou et connexion tenus pendant les appels Keycloak, sans délai borné | low | Borné par le délai de transaction ; exception à AD-17 voulue (décision 1) | rejeté |
| 9 | EC, BH | Rôle `admin` hérité d'un groupe ou d'un rôle composite | low | Le realm n'en utilise pas (même constat qu'en 1.5) | rejeté |
| 10 | EC | `CompteCourant` encore nul : « Désactiver » sur sa propre ligne | false | La coquille n'affiche les pages qu'une fois le compte chargé | rejeté |
| 11 | EC | « Annuler » pendant une action en cours sur la même ligne : ignoré sans le dire | low | Cas rare ; correctif = file ou annonce | rejeté |
| 12 | EC | `403 acces.refuse` après retrait de son propre rôle : « Réessayer » rejoue | low | Absent de `REFUS_DEFINITIFS` | patch |
| 13 | EC, BH | Chargements de la liste qui se chevauchent (action puis annulation) | medium | `agir()` recharge à chaque fin d'action, sans garde d'ordre | patch (compteur de chargements) |
| 14 | EC | Messages « Compte de  désactivé. » sans nom ni e-mail | low | Compte inconnu de Keycloak, cas rare | rejeté |
| 15 | BH | Concurrence : désactivations croisées non testées | low | Même verrou que les retraits simultanés, testés | rejeté |
| 16 | BH | Retrait de son propre rôle : front encore en mode administrateur | low | Jusqu'au prochain jeton ; les appels échouent en `403`, désormais sans rejeu | rejeté |
| 17 | BH | Focus perdu après une action du menu (déclencheur désactivé) | medium | `[disabled]` sur le déclencheur au retour du focus | patch (`disabledInteractive`) |
| 18 | BH | « Réessayer » redondant pour un refus définitif | low | Double rechargement sans effet visible | rejeté |
| 19 | BH | Suivi incohérent, `source_spec: none`, preuves manuelles absentes, matrice incomplète | false | Suivi mis à jour à la présentation ; format prescrit pour un découpage ; essai manuel prévu avec Paul ; correctif = édition de la spec | rejeté |

## Verification

**Commands:**
- `cd back && ./mvnw verify` (avec `DOCKER_HOST` Podman) -- expected: tests verts, ArchUnit compris.
- `cd front && npm test -- --watch=false && npm run build` -- expected: verts, sans avertissement de budget.

**Manual checks:**
- `compose.dev.yaml` : désactiver le compte de test de la 1.5, connexion refusée ; réactiver ; donner puis retirer le rôle ; tenter de retirer son propre rôle en étant seul administrateur.
