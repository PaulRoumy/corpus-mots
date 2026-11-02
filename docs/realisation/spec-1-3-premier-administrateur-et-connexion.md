---
title: 'Story 1.3 : Premier administrateur et connexion'
type: 'feature'
created: '2026-11-02'
status: 'done'
baseline_commit: '061166fc430273fc6954486d9b948f6d2eb82b6f'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/realisation/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** l'application n'a ni compte ni connexion : personne ne peut y entrer, et l'API est ouverte à tous (FR-2, AD-6).

**Approach:** au démarrage, `comptes.service` invite l'e-mail d'administrateur défini dans `deploiement/.env` si la base n'a aucun `Enseignant` (Keycloak d'abord, base ensuite) ; le back exige un jeton Keycloak et un `Enseignant` actif sur tout `/api` ; le front se connecte par code + PKCE (`keycloak-js`), renouvelle le jeton en silence et propose la déconnexion.

## Boundaries & Constraints

**Always:**
- Aucun appel Keycloak dans une transaction ouverte : création de l'utilisateur, rôle `admin`, e-mail « Créer mon mot de passe » (`UPDATE_PASSWORD`, lien 7 jours), puis transaction qui insère l'`Enseignant` `invite` ; tout échec Keycloak ou base → suppression de l'utilisateur Keycloak créé (AD-17, AD-18).
- Le rôle `admin` se lit dans le jeton, jamais en base ; seul `comptes.service` insère dans `enseignant`.
- Toute ressource `/api` authentifiée par défaut ; erreurs `401`/`403` au format RFC 9457 avec `code` (`authentification.requise`, `compte.inconnu_ou_inactif`).
- Passage `invite` → `actif` : au premier appel `/api` portant un jeton valide de cet `Enseignant` (un jeton prouve que le mot de passe a été créé).
- Textes en français, vouvoiement ; pages Keycloak utilisables à 360 px.

**Décisions (Paul, 2026-11-02) :**
- Nom affiché : l'e-mail d'invitation demande `UPDATE_PASSWORD` et `UPDATE_PROFILE` ; « Créer mon mot de passe » fait saisir prénom et nom (e-mail non modifiable par l'utilisateur). `nom_affiche` est vide tant que `invite`, puis rempli à l'activation avec le claim `name` du jeton (« Prénom Nom »).
- Session : case « Rester connecté » (`rememberMe`) : cochée → session de 30 jours (inactivité et durée max) ; sinon session de 10 h au plus, cookie fermé avec le navigateur.
- Après « Créer mon mot de passe », une connexion peut être redemandée une fois ; comportement exact vérifié au déploiement, non bloquant pour la story.
- Spec gardée entière malgré sa taille (~3 000 tokens).
- Environnement de développement local (revue, constat « `npm start` ne fonctionne plus seul ») : `deploiement/compose.dev.yaml` lancé par `podman compose`, avec PostgreSQL, Keycloak (realm et thème importés) et Mailpit ; `npm start` passe par un proxy `/api` et `/auth` ; le profil `%dev` du back pointe sur ces conteneurs.

**Never:**
- Pas d'écran d'Administration, d'invitation manuelle ni de tâche de réconciliation horaire (stories 1.5, 1.6) ; pas de coquille ni de Menu de profil (1.4) : déconnexion par un bouton provisoire sur l'Accueil.
- Pas de création d'`Enseignant` à la volée pour un `sub` inconnu ; pas de console `/auth/admin` exposée.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Premier démarrage | aucun `Enseignant`, `ADMIN_INITIAL_EMAIL` défini | utilisateur Keycloak + rôle `admin` + e-mail envoyé, puis `Enseignant` `invite` | N/A |
| Démarrages suivants | au moins un `Enseignant` | rien n'est créé | N/A |
| Keycloak pas encore prêt | appel Keycloak en échec | rien en base ; journal d'avertissement | nouvel essai à la tâche suivante (chaque minute tant qu'aucun `Enseignant`) |
| Base en échec après Keycloak | insertion refusée | utilisateur Keycloak supprimé | nouvel essai à la tâche suivante |
| E-mail déjà présent dans Keycloak | `409` à la création | utilisateur existant non modifié, rien en base | journal d'erreur, pas de boucle de suppression |
| `ADMIN_INITIAL_EMAIL` vide | base vide | rien n'est fait | journal d'avertissement unique |
| Jeton valide, `Enseignant` `actif` | `GET /api/mon-compte` | `200` `{ id, nomAffiche, administrateur }` | N/A |
| Jeton valide, `Enseignant` `invite` | premier appel `/api` | statut → `actif`, `nom_affiche` = claim `name`, réponse normale | claim `name` absent → `403 compte.inconnu_ou_inactif`, reste `invite` |
| Jeton valide, `sub` inconnu ou `desactive` | appel `/api` | `403` `compte.inconnu_ou_inactif` | N/A |
| Sans jeton ou jeton invalide | appel `/api` | `401` `authentification.requise` + `WWW-Authenticate` | N/A |

</frozen-after-approval>

## Code Map

- `back/src/main/java/fr/corpusmots/commun/api/ErreursMappers.java` -- ajouter les mappers `UnauthorizedException`/`AuthenticationFailedException` → `401` (avec `WWW-Authenticate: Bearer`) et `ForbiddenException` → `403` ; le mapper `Exception` en ferait sinon des `500`.
- `back/src/main/java/fr/corpusmots/commun/api/ErreurMetier.java` -- à réutiliser pour `403 compte.inconnu_ou_inactif`.
- `back/src/test/java/fr/corpusmots/commun/api/ErreursTestResource.java` -- devient authentifiée par défaut : `@PermitAll` ou `@TestSecurity` dans `ErreursTest`.
- `back/src/main/resources/application.properties` -- aucune config OIDC aujourd'hui ; profils `dev`/`test`/`prod`.
- `deploiement/keycloak/realm-corpus-mots.json` -- client public `corpus-mots-front` (PKCE S256) existant ; ajouter le client confidentiel du back et les durées de session.
- `deploiement/compose.yaml` -- service `back` sans variable Keycloak ; `keycloak` avec `KC_HOSTNAME` public.
- `front/src/app/app.config.ts`, `app.routes.ts`, `accueil/accueil.ts` -- aucun intercepteur ni initialisation OIDC ; l'Accueil est provisoire (remplacé en 1.4).
- Report de 1.1 (`deferred-work.md`) : l'import du realm et des placeholders `${env.X}` reste à vérifier sur un vrai Keycloak.

## Tasks & Acceptance

**Execution:**
- [x] `back/pom.xml` -- ajouter `quarkus-oidc`, `quarkus-keycloak-admin-rest-client`, `quarkus-scheduler` ; en test `quarkus-test-security-oidc` (versions du BOM) -- dépendances.
- [x] `back/src/main/resources/db/migration/V202611021000__comptes_enseignant.sql` -- table `enseignant` (`id uuid` PK sans défaut, `nom_affiche text` obligatoire sauf au statut `invite` (`check`), `statut text not null` avec `check` des 5 valeurs, `cree_le timestamptz not null default now()`) -- modèle AD-6.
- [x] `back/src/main/java/fr/corpusmots/comptes/persistance/` -- entité `Enseignant`, `StatutEnseignant`, `EnseignantRepository` -- persistance.
- [x] `back/src/main/java/fr/corpusmots/comptes/service/` -- `Identites` (interface : créer l'utilisateur, donner `admin`, envoyer l'e-mail, supprimer) et son implémentation par le client admin Keycloak ; `InvitationService` (circuit d'invitation avec compensation) ; `PremierAdministrateur` (`@Scheduled` chaque minute, `concurrentExecution = SKIP`, ne fait rien dès qu'un `Enseignant` existe) ; `ComptesService.verifierActif(sub)` (active un `invite`, refuse le reste) ; `MonCompteVue` -- règles.
- [x] `back/src/main/java/fr/corpusmots/comptes/api/` -- filtre `ContainerRequestFilter` sur `/api` (après authentification) appelant `verifierActif` ; `MonCompteResource` `GET /api/mon-compte` → `MonCompteDto` -- AD-6.
- [x] `back/src/main/resources/application.properties` -- OIDC bearer (`auth-server-url` interne, issuer public), `quarkus.http.auth.proactive=false`, ressources authentifiées par défaut, client admin (client credentials), `corpusmots.admin-initial.email` ; `%test` : Dev Services Keycloak désactivés -- configuration.
- [x] `back/src/test/java/fr/corpusmots/comptes/` -- tests `@QuarkusTest` de chaque ligne de la matrice, `Identites` remplacée par un double de test -- matrice.
- [x] `deploiement/keycloak/realm-corpus-mots.json` -- client confidentiel `corpus-mots-back` (compte de service, `manage-users`, `view-users`, secret `${env.KEYCLOAK_BACK_SECRET}`), `rememberMe: true` et durées de session (décision), `accessTokenLifespan` 300 s, profil utilisateur (prénom et nom obligatoires, e-mail non modifiable par l'utilisateur) -- identité.
- [x] `deploiement/keycloak/themes/corpus-mots/login/messages/messages_fr.properties` (et `email/messages/` si nécessaire) -- « Rester connecté », textes de l'e-mail « Créer mon mot de passe », du formulaire prénom/nom et de la page de confirmation, lien « Données personnelles » si le thème le permet -- UX-DR-39.
- [x] `deploiement/compose.yaml`, `deploiement/.env.exemple`, `deploiement/README.md` -- `back` : variables Keycloak, `ADMIN_INITIAL_EMAIL`, `depends_on keycloak healthy` ; `keycloak` : `KC_HOSTNAME_BACKCHANNEL_DYNAMIC=true` ; note : realm déjà importé non mis à jour -- déploiement.
- [x] `front/package.json` -- `keycloak-js` 26.2.5 exact -- OIDC.
- [x] `front/src/app/commun/authentification/` -- initialisation (`login-required`, PKCE S256, `checkLoginIframe: false`) avant le démarrage, intercepteur (jeton sur `/api`, `401` → renouvellement puis un seul rejeu, échec → connexion avec retour à l'URL courante), `deconnecter()` ; tests Vitest de l'intercepteur -- session.
- [x] `front/src/app/accueil/accueil.ts` -- appelle `GET /api/mon-compte` par le client généré : « Bonjour, {nomAffiche} », bouton « Se déconnecter », message pour `403` -- AC.
- [x] `front/openapi/` -- régénéré par `./mvnw package -DskipTests` -- contrat.
- [x] `deploiement/compose.dev.yaml` -- projet `corpus-mots-dev` : `postgres` (port 5433, `postgres/init-keycloak.sh`, volume), `keycloak` (`start-dev --import-realm`, port 8180, `/auth`, `KC_HOSTNAME=http://localhost:4200/auth`, base `keycloak` du même PostgreSQL), `mailpit` (interface 8025, SMTP 1025) ; aucun secret réel, valeurs de développement en clair -- dev local.
- [x] `deploiement/keycloak/realm-corpus-mots.json`, `deploiement/compose.yaml` -- URL de l'application par `${env.URL_PUBLIQUE}` (au lieu de `https://${env.DOMAINE}`), fournie à Keycloak dans les deux Compose -- dev local.
- [x] `front/proxy.conf.json`, `front/angular.json` -- `ng serve` relaie `/api` vers `localhost:8080` et `/auth` vers `localhost:8180` -- dev local.
- [x] `back/src/main/resources/application.properties` -- `%dev` : base `localhost:5433`, Dev Services désactivés, OIDC et client admin sur `localhost:8180`, issuer `http://localhost:4200/auth/realms/corpus-mots`, administrateur initial `admin@corpus-mots.localhost` -- dev local.
- [x] `deploiement/README.md`, `AGENTS.md` -- section « Développement local » (démarrage, Mailpit, remise à zéro par `down -v`) -- dev local.

**Acceptance Criteria:**
- Given Paul déconnecté, when il clique « Se déconnecter », then la session Keycloak est fermée et la page de Connexion s'affiche.
- Given un access token expiré et une session vivante, when le front appelle `/api`, then le jeton est renouvelé sans redirection et la requête rejouée.
- Given une session expirée, when le front reçoit `401`, then Connexion puis retour à la même URL.
- Given des identifiants refusés, then le message ne dit pas lequel est faux.

## Design Notes

Keycloak est joint par le réseau interne (`http://keycloak:8080/auth`) mais émet des jetons à l'issuer public : `KC_HOSTNAME_BACKCHANNEL_DYNAMIC` fait pointer `jwks_uri` vers l'hôte interne, et `quarkus.oidc.token.issuer` reste l'URL publique. En dev, `compose.dev.yaml` reproduit ce montage : le navigateur ne voit que `localhost:4200` (proxy d'`ng serve`, comme Caddy en production), le back joint Keycloak sur `localhost:8180` ; PostgreSQL et Keycloak gardent leurs données ensemble (un seul volume), si bien que le premier administrateur n'est invité qu'une fois. Les tests (`%test`) gardent les Dev Services et le double de Keycloak.

## Verification

**Commands:**
- `cd back && ./mvnw verify` -- expected: tests verts (`DOCKER_HOST` sur le socket de la machine Podman), `front/openapi/` à jour.
- `cd front && npm test -- --watch=false && npm run build` -- expected: verts.

**Manual checks (if no CLI):**
- En local : `podman compose -f deploiement/compose.dev.yaml up -d`, `./mvnw quarkus:dev`, `npm start` ; dans Mailpit, e-mail reçu, mot de passe créé, Accueil « Bonjour », identifiants refusés, mot de passe oublié, déconnexion, page à 360 px.
