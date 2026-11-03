---
title: 'Story 1.5 : Inviter un collègue'
type: 'feature'
created: '2026-11-03'
status: 'done'
baseline_commit: '47ecaa975d7a001a0ee7591dcd962b93bb72945a'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/realisation/epic-1-context.md'
  - '{project-root}/docs/realisation/spec-1-3-premier-administrateur-et-connexion.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** seul le premier administrateur a un compte : aucun écran ni aucune API ne permet d'inviter un collègue ni de voir les comptes de l'équipe (FR-1, UX-DR-41).

**Approach:** ouvrir sous `/api/comptes`, réservé au rôle `admin`, la liste des comptes, l'invitation (circuit d'AD-18 déjà écrit dans `InvitationService`) et le renvoi de l'invitation ; remplacer la page d'attente `/administration` par Administration › Comptes (formulaire « Inviter », liste) ; traduire en français le message Keycloak du lien expiré.

## Boundaries & Constraints

**Always:**
- Keycloak d'abord, base ensuite, aucune requête Keycloak dans une transaction ouverte (AD-17, AD-18) ; l'e-mail et le rôle se lisent dans Keycloak, jamais copiés en base ; `nom_affiche` et `statut` viennent de `enseignant`.
- Ressources `/api/comptes` en `@RolesAllowed("admin")` : un non-administrateur reçoit `403 acces.refuse` ; le front garde la redirection de `/administration` vers l'accueil.
- E-mail normalisé (espaces retirés, minuscules) et validé avant tout appel Keycloak : invalide → `400 requete.invalide`.
- Erreurs RFC 9457 avec un `code` stable, traduit par `messageErreur` ; échec du chargement de la liste ou de l'invitation → Bandeau d'erreur avec « Réessayer », saisie conservée.
- Textes en français, vouvoiement, verbes à l'infinitif.

**Décisions (Paul, 2026-11-03) :**
- Textes : `compte.email_deja_utilise` « Cet e-mail est déjà associé à un compte. » ; `compte.invitation_inutile` « Ce compte est déjà actif : aucune invitation à renvoyer. » ; lien expiré (page Keycloak, la même pour un lien « Mot de passe oublié » périmé) « Ce lien a expiré. Demandez une nouvelle invitation à l'administrateur de l'école, ou refaites « Mot de passe oublié ». » ; écran : titre « Comptes », champ « E-mail du collègue », bouton « Inviter », colonnes « Nom », « E-mail », « Statut », « Rôle » ; statuts « invité », « actif », « désactivé » ; rôles « administrateur », « enseignant » ; nom d'un invité « en attente » ; action « Renvoyer l'invitation » sur les lignes « invité ».
- E-mail (revue, constat 14) : seuls les espaces en début et en fin sont retirés, puis minuscules ; un espace restant au milieu rend l'adresse invalide (`400 requete.invalide`, message sous le champ).
- Ordre de la liste : invités d'abord, puis par nom affiché (ordre alphabétique français, insensible à la casse et aux accents) ; entre invités, par e-mail.

**Never:**
- Pas de désactivation, réactivation, changement de rôle, tâche de réconciliation ni annuaire `GET /api/enseignants` (story 1.6) ; pas d'invitation directe d'un administrateur depuis l'écran (le rôle se donne en 1.6).
- Pas de copie de l'e-mail ni du rôle en base ; pas de page d'inscription (`registrationAllowed` reste `false`).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Inviter | admin, « Claire@ecole.fr » | `201` ; Keycloak crée `claire@ecole.fr` et envoie l'e-mail (7 jours) ; `Enseignant` `invite` ; liste rechargée, ligne « invité » ; champ vidé ; « Invitation envoyée à claire@ecole.fr. » annoncé | N/A |
| E-mail déjà utilisé | Keycloak répond `409` | `409 compte.email_deja_utilise` ; message sous le champ, saisie gardée ; aucun `Enseignant` créé | N/A |
| Échec après Keycloak | base en échec | utilisateur Keycloak supprimé ; `500` ; Bandeau d'erreur, saisie gardée | Compensation en échec : journalisée |
| E-mail invalide | « claire » ou vide | `400 requete.invalide`, aucun appel Keycloak ; le front refuse avant l'envoi | N/A |
| Renvoyer | compte `invite` | `204`, nouvel e-mail (7 jours) ; « Invitation renvoyée à … » annoncé | N/A |
| Renvoyer à un compte actif | statut ≠ `invite` | `409 compte.invitation_inutile` | N/A |
| Renvoyer à un inconnu | id absent | `404 ressource.introuvable` | N/A |
| Non-administrateur | jeton sans `admin` | `403 acces.refuse` sur les trois ressources | N/A |
| Lien expiré | invité ouvre un lien de plus de 7 jours | page Keycloak en français qui invite à demander une nouvelle invitation | N/A |

</frozen-after-approval>

## Code Map

- `back/.../comptes/service/InvitationService.java` -- `inviter(email, administrateur)` : circuit complet avec compensation `finally` ; à réutiliser tel quel (`administrateur = false`).
- `back/.../comptes/service/Identites.java`, `IdentitesKeycloak.java` -- ajouter `lister()` (utilisateurs du realm : `id`, `email` ; membres du rôle `admin` par `roles().get("admin").getUserMembers`) ; `envoyerInvitation(id)` sert au renvoi. `IdentiteDejaExistante` sur `409`.
- `back/.../comptes/service/ComptesService.java` -- `creerInvite`, `ROLE_ADMINISTRATEUR`, `identifiant(sub)` ; ajouter la lecture des `Enseignant` (hors `supprime`) et le contrôle « statut `invite` » pour le renvoi.
- `back/.../comptes/api/` -- `MonCompteResource`, `MonCompteDto` (records `@Schema(required = true)`, `operationId` explicite) : modèle des nouvelles ressources `ComptesResource` (`listerComptes`, `inviter`, `renvoyerInvitation`) et DTO `CompteDto`, `InvitationDto`.
- `back/.../commun/api/ErreurMetier.java`, `ErreursMappers.java` -- `ErreurMetier(status, code, message)` ; `ForbiddenException` → `403 acces.refuse` déjà en place ; pas de Hibernate Validator dans le `pom.xml` : valider l'e-mail dans le service (`ErreurMetier(400, "requete.invalide", …)`), sans nouvelle dépendance.
- `back/src/test/.../comptes/service/IdentitesFactices.java` -- double de Keycloak (`echouerA`, `emailDejaUtilise`) : y ajouter `lister` ; tests `@TestSecurity(roles = "admin")` + `@OidcSecurity` comme `CompteActifTest`.
- `deploiement/keycloak/themes/corpus-mots/login/messages/messages_fr.properties` -- surcharger les clés du lien expiré ; les relever dans le thème `base` de l'image `quay.io/keycloak/keycloak:26.8` (`expiredActionTokenNoSessionMessage`, `expiredActionTokenSessionExistsMessage`, `expiredActionMessage` attendues).
- `front/src/app/app.routes.ts` -- `/administration` (garde `administrateurSeulement`) sert `PageBientot` : la remplacer par `administration/comptes` (et `/administration` → `comptes`).
- `front/src/app/commun/` -- `BandeauErreur`, `Squelette`, `messageErreur` (ajouter les deux codes à `MESSAGES_PAR_CODE` et à son test), `LiveAnnouncer` ; `page-rubrique.scss` pour le titre.
- `front/openapi/` -- régénéré par `./mvnw package -DskipTests`, versionné.

## Tasks & Acceptance

**Execution:**
- [x] `back/.../comptes/service/Identites.java`, `IdentitesKeycloak.java`, `IdentiteVue.java` -- `lister()` -- e-mail et rôle lus dans Keycloak.
- [x] `back/.../comptes/service/ComptesService.java`, `CompteVue.java`, `ComptesAdministration.java` (ou équivalent) -- lister (base puis Keycloak, hors transaction pour Keycloak), inviter (normalisation, `409 compte.email_deja_utilise`), renvoyer (`404`, `409 compte.invitation_inutile`).
- [x] `back/.../comptes/api/ComptesResource.java`, `CompteDto.java`, `InvitationDto.java` -- `GET /api/comptes`, `POST /api/comptes` (`201`), `POST /api/comptes/{id}/invitation` (`204`), `@RolesAllowed("admin")`.
- [x] `back/src/test/.../comptes/` -- `ComptesResourceTest` : chaque ligne de la matrice côté back ; `IdentitesFactices.lister`.
- [x] `front/openapi/` -- régénérer et versionner.
- [x] `deploiement/keycloak/themes/corpus-mots/login/messages/messages_fr.properties` -- message du lien expiré.
- [x] `front/src/app/administration/comptes/` (`comptes.ts`, `.scss`, `.spec.ts`) -- formulaire, liste (`mat-table`), squelettes au chargement, Bandeau d'erreur, renvoi ; `app.routes.ts` ; `message-erreur.ts` (+ spec) -- matrice côté front.

**Acceptance Criteria:**
- Given un administrateur, when il invite un e-mail, then l'e-mail d'invitation en français arrive dans Mailpit avec un lien valable 7 jours, et l'invité passe `actif` à sa première arrivée dans l'application (circuit de 1.3).
- Given le contrat OpenAPI, when la CI le compare, then `front/openapi/` est à jour.

## Implementation Notes

## Spec Change Log

## Review Triage Log

Passe 1 (Blind Hunter = BH, Edge Case Hunter = EC, Verification Gap = VG).

| # | Source | Constat | Verdict | Preuve | Route |
|---|--------|---------|---------|--------|-------|
| 1 | VG | `IdentitesKeycloak.lister()` (pages de 100, rôle `admin`) jamais testé contre Keycloak | medium | Tous les tests passent par `IdentitesFactices` | defer (avec le test de l'adaptateur déjà reporté) |
| 2 | VG, BH | Compte connu en base mais inconnu de Keycloak : repli `""` / `false` non testé | low | `equipe()` donne une identité à chaque compte | patch |
| 3 | VG | Renvoi en `404` : rechargement de la liste non testé | low | Seul le `409` est servi dans le spec | patch |
| 4 | EC | Renvoi à un `invite` sans utilisateur Keycloak : `404` en boucle | low | Seulement après une suppression manuelle dans Keycloak ; la réconciliation de 1.6 traitera ces écarts | rejeté |
| 5 | EC | Compte activé entre `verifierInvite` et l'envoi : e-mail superflu | low | Fenêtre de quelques millisecondes ; e-mail sans effet sur un compte actif | rejeté |
| 6 | EC, BH | Rôle `admin` hérité d'un groupe ou d'un rôle composite non vu | low | Le rôle n'est donné qu'en direct (1.3, 1.6) ; le realm n'a ni groupe ni rôle composite | rejeté |
| 7 | EC | Rôle `admin` absent du realm | false | Le realm versionné le déclare ; l'invitation du premier administrateur en dépend | rejeté |
| 8 | EC | Identifiant Keycloak qui n'est pas un UUID | false | Aucune fédération d'utilisateurs ; Keycloak génère des UUID | rejeté |
| 9 | EC | Utilisateurs créés ou supprimés entre deux pages | low | Équipe d'une école : une seule page en pratique | rejeté |
| 10 | EC, BH | Adresse trop longue ou à caractères refusés par Keycloak : `500` au lieu d'un `400` | medium | L'expression régulière n'a ni borne ni liste de caractères ; seul `409` est traité à la création | patch (254 caractères, caractères exclus) |
| 11 | EC, BH | Deux chargements de la liste qui se chevauchent | low | Une réponse plus ancienne n'arrive après la plus récente qu'exceptionnellement ; correctif = jeton de chargement | rejeté |
| 12 | EC, BH | `renvoiEnCours` ne suit qu'une ligne : double envoi possible | low | Le `finally` de A remet `null` pendant l'envoi de B | patch (`Set`) |
| 13 | EC, BH | « Réessayer » après une invitation en échec relit le champ | medium | `envoyerInvitation()` lit la saisie au clic | patch (adresse capturée) |
| 14 | BH | Espaces intérieurs supprimés : invitation vers une adresse non tapée | medium | `normaliser` retire tous les espaces ; intention ambiguë (« espaces retirés ») | intent_gap → décision de Paul : bords seulement, espace intérieur refusé ; patch |
| 15 | EC, BH | Renvoi refusé (`409`, `404`) : « Réessayer » rejoue un échec certain | low | Vérifié dans `renvoyer()` | patch (« Réessayer » recharge la liste) |
| 16 | BH | Texte « déjà actif » faux pour un compte désactivé | low | Bouton seulement sur les lignes « invité » ; le cas ne vient que d'une liste périmée, et la désactivation arrive en 1.6 | rejeté |
| 17 | EC | Annonce « Invitation renvoyée à . » pour un e-mail vide | low | Compte sans utilisateur Keycloak, cas rare | rejeté |
| 18 | EC, BH | Compensation en échec non testée au niveau de la ressource ; adresse bloquée jusqu'à la réconciliation | low | Testé dans `PremierAdministrateurTest` ; la réconciliation de 1.6 supprimera l'utilisateur orphelin | rejeté |
| 19 | BH | `users().list` en représentation complète | low | Une page pour une équipe d'école | rejeté |
| 20 | BH | Boutons « Renvoyer l'invitation » au même nom accessible ; tableau sans nom | medium | Vérifié dans le gabarit | patch |
| 21 | BH | « en attente » lu comme un nom | low | Colonne « Nom » ; libellé validé par Paul | rejeté |
| 22 | BH | Suivi incohérent (`in-review` contre `in-progress`), vérifications manuelles non consignées | false | Le suivi passe à `review` à la présentation ; les vérifications manuelles se font avec Paul avant le commit ; clés du thème relevées dans l'image 26.8.1 | rejeté |
| 23 | BH | Contrat OpenAPI sans réponses d'erreur | low | Report existant (spec 1.3, typage de `ProblemeDto`) | rejeté |

## Verification

**Commands:**
- `cd back && ./mvnw verify` (avec `DOCKER_HOST` Podman) -- expected: tests verts, ArchUnit compris, `front/openapi/` inchangé après régénération versionnée.
- `cd front && npm test -- --watch=false && npm run build` -- expected: verts, sans avertissement de budget.

**Manual checks:**
- `compose.dev.yaml` + `quarkus:dev` + `npm start` : inviter une adresse, e-mail dans Mailpit, création du mot de passe dans une fenêtre privée, statut « actif » dans la liste ; renvoyer ; e-mail en double ; compte enseignant sur `/administration`.
