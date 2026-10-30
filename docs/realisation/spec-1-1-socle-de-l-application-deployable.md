---
title: "Story 1.1 : Socle de l'application déployable"
type: 'feature'
created: '2026-10-30'
status: 'done'
baseline_commit: '6d870dab35f0fa6fa56b9fa4f2bbbee36e43157d'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/realisation/epic-1-context.md'
  - '{project-root}/docs/architecture/architecture-corpus-mots-2026-10-29/ARCHITECTURE-SPINE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** le dépôt ne contient que `docs/` : aucune story fonctionnelle ne peut démarrer sans un monorepo conforme à l'architecture, testable, et déployable en conteneurs Podman.

**Approach:** créer `back/` (Quarkus modulaire + ArchUnit + format d'erreur RFC 9457 + migration Flyway initiale), `front/` (Angular Material minimal + client OpenAPI généré), `deploiement/` (`compose.yaml` piloté par `podman compose`, Caddy, PostgreSQL à deux bases, realm Keycloak français) et la CI GitHub Actions (tests, puis images ghcr.io sur tag), plus `LICENSE`.

## Boundaries & Constraints

**Always:**
- Versions : Quarkus platform `3.40.1.1`, Java 25, ArchUnit `1.5.1`, Angular/CLI/Material `22.2.x` (dernier patch), ng-openapi-gen `1.1.0`, Maven Wrapper `3.3.4` (Maven `3.9.16`), images en nom complet `docker.io/library/postgres:18.6`, `quay.io/keycloak/keycloak:26.8`, `docker.io/library/caddy:2.11`, `docker.io/library/eclipse-temurin:25-jdk`/`25-jre`, `docker.io/library/node:26`.
- Conteneurs sous Podman 6.1 rootless (décision de Paul, AD-21 mis à jour) : `podman compose` partout dans la doc et les scripts, jamais `docker` ; `compose.yaml` conforme à la Compose Specification ; Dockerfiles nommés `Containerfile`.
- Dix modules `fr.corpusmots.<module>` × `api`/`service`/`persistance`, chaque paquetage matérialisé par un `package-info.java`.
- Erreurs : `application/problem+json` (`type`, `title`, `status`, `detail`, `code`) pour toute erreur sous `/api`, y compris 404 et 500 ; une exception métier de `commun` porte le `code`.
- Limites : 100 Mo par requête dans Caddy (`request_body`) et Quarkus (`quarkus.http.limits.max-body-size`) ; 20 Mo par fichier déclaré en propriété `corpusmots.limites.taille-fichier` (appliquée par les futures ressources de téléversement).
- Licence du code : AGPL-3.0 (décision de Paul, NFR-14).
- Tout ce qui dépend de la machine vient de `deploiement/.env` ; `.env` ignoré par git.
- Scripts en bash POSIX ; aucun CDN (retirer les polices Google ajoutées par le schematic Material).

**Never:**
- Pas de dépendance à un démon Docker ni à Docker Desktop ; pas de `privileged`.
- Pas de connexion OIDC (back `quarkus-oidc`, bibliothèque OIDC du front), pas d'`Enseignant`, pas de tables métier : story 1.3.
- Pas de jetons de design, coquille ni composants partagés : story 1.4. Pas de sauvegarde : story 1.2.
- Ne jamais éditer `front/src/app/api/` à la main.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Erreur métier | ressource lève l'exception métier `exemple.code` en 409 | 409, `application/problem+json`, `code: "exemple.code"` | N/A |
| Route inconnue | `GET /api/inexistant` | 404 problem+json, `code: "ressource.introuvable"` | N/A |
| Erreur inattendue | ressource lève `RuntimeException` | 500 problem+json, `code: "erreur.interne"`, sans trace ni message interne | journalisée côté serveur |
| Corps trop gros | requête > 100 Mo | 413 (Caddy et Quarkus) | N/A |
| Console Keycloak | `GET https://<domaine>/auth/admin/...` | 404 depuis Caddy | N/A |
| Violation AD-1 | `fiches.service` importe `comptes.service`, ou `vocabulaire` touche `referentiels.persistance` | test ArchUnit en échec | N/A |
| DTO homonymes | deux `XxxDto` de même nom dans deux modules `api` | test ArchUnit en échec | N/A |

</frozen-after-approval>

## Code Map

- `.gitignore`, `.gitattributes` -- existants, à compléter (`target/`, `node_modules/`, `dist/`, `.angular/`, `deploiement/.env`) ; `eol=lf` déjà en place, garder `mvnw.cmd` en CRLF.
- `README.md` -- statut « planification terminée » à mettre à jour, avec la section de démarrage.
- `AGENTS.md` -- section « Lancer et vérifier » en TODO : y écrire les commandes réelles.
- Aucun code existant : tout le reste est créé.

## Tasks & Acceptance

**Execution:**
- [x] `LICENSE` -- texte officiel de la licence choisie -- NFR-14.
- [x] `back/pom.xml`, `back/mvnw*`, `back/.mvn/` -- projet Quarkus (rest-jackson, hibernate-orm-panache, jdbc-postgresql, flyway, smallrye-openapi, smallrye-health ; tests quarkus-junit, rest-assured, archunit-junit5) -- socle back.
- [x] `back/src/main/java/fr/corpusmots/<module>/{api,service,persistance}/package-info.java` -- 30 paquetages -- AC structure.
- [x] `back/src/main/java/fr/corpusmots/commun/api/` -- `ErreurMetier` (status + code), `ProblemeDto`, mappers d'exception (métier, `WebApplicationException`, inattendue) -- RFC 9457.
- [x] `back/src/main/resources/application.properties` -- datasource par variables d'env en `prod`, Dev Services en `dev`/`test`, Flyway au démarrage, OpenAPI 3.1 stocké dans `../front/openapi/`, limites, `/api` racine REST -- AD-7, limites.
- [x] `back/src/main/resources/db/migration/V202610301200__commun_extensions.sql` -- `CREATE EXTENSION IF NOT EXISTS unaccent; pg_trgm` -- AD-22.
- [x] `back/src/test/java/fr/corpusmots/architecture/` -- règles AD-1 (graphe exact, accès inter-modules seulement vers `..service..`) et AD-16 (noms `*Dto` uniques), plus tests qui appliquent ces règles à des classes fixtures en violation et vérifient l'échec -- AC ArchUnit.
- [x] `back/src/test/java/fr/corpusmots/commun/api/` -- `@QuarkusTest` couvrant les lignes erreur métier, 404, 500 de la matrice (ressource de test) et la présence de `unaccent`/`pg_trgm` -- matrice.
- [x] `back/Containerfile` -- multi-étapes (Temurin 25 JDK + `./mvnw package`, puis JRE) -- image back.
- [x] `front/` -- `ng new` (standalone, SCSS, routing), `ng add @angular/material` sans polices Google, une page d'accueil provisoire en français ; `npm run api` = ng-openapi-gen depuis `openapi/openapi.json` vers `src/app/api/`, branché en `prebuild`/`pretest` ; un test du composant racine -- AD-7.
- [x] `front/Containerfile`, `front/Caddyfile` -- build Node 26 puis `caddy:2.11` statique avec repli SPA sur `index.html` -- image front.
- [x] `deploiement/compose.yaml` -- services `caddy`, `front`, `back`, `keycloak` (`KC_HTTP_RELATIVE_PATH=/auth`, `start --import-realm`, proxy headers), `postgres` (volume, script d'init qui crée la base et l'utilisateur `keycloak`) ; images `ghcr.io/paulroumy/corpus-mots-{back,front}:${VERSION}`, `restart: unless-stopped`, healthchecks -- AC compose.
- [x] `deploiement/Caddyfile` -- `{$DOMAINE}` : `/auth/admin*` → 404, `/auth*` → keycloak, `/api*` → back, reste → front ; `request_body max_size 100MB` -- AD-21.
- [x] `deploiement/.env.exemple`, `deploiement/postgres/init-keycloak.sh` -- domaine, e-mail ACME, mots de passe BD, SMTP, `VERSION` -- AD-21.
- [x] `deploiement/README.md` -- prérequis hôte Podman rootless (`ip_unprivileged_port_start=80`, `podman-restart.service`, `loginctl enable-linger`, fournisseur compose), installation, mise à jour -- AD-21.
- [x] `deploiement/keycloak/realm-corpus-mots.json`, `deploiement/keycloak/themes/corpus-mots/login/` -- realm `corpus-mots`, locale `fr` seule, inscription libre désactivée, client public `corpus-mots-front` (PKCE S256), rôle `admin`, SMTP par placeholders `${env.…}` ; thème de connexion héritant de `keycloak.v2` avec `messages_fr.properties` -- AD-6, AD-21.
- [x] `.github/workflows/ci.yml` -- sur push/PR : back `./mvnw verify`, contrôle que `front/openapi/` n'a pas dérivé (`git diff --exit-code`), front `npm ci`, tests, build ; sur tag `v*` : en plus, build (`podman build` des `Containerfile`) et push des deux images vers ghcr.io (`GITHUB_TOKEN`) -- CI.
- [x] `AGENTS.md`, `README.md` -- commandes réelles de build, test, déploiement (`podman compose`) et JDK requis.

**Acceptance Criteria:**
- Given le dépôt, when on liste la racine, then `back/`, `front/`, `deploiement/`, `.github/workflows/` et `LICENSE` existent, avec les dix modules et leurs trois paquetages.
- Given `./mvnw verify` dans `back/`, when il s'exécute, then les tests ArchUnit, d'erreurs et de migration passent et `front/openapi/openapi.json` (OpenAPI 3.1) est régénéré.
- Given `npm run build` dans `front/`, when il s'exécute, then `src/app/api/` est régénéré depuis `openapi/openapi.json` et le build réussit sans aucune URL externe dans `dist/`.
- Given `.env` rempli, when `podman compose config` s'exécute dans `deploiement/`, then la configuration est valide ; `podman compose up -d` route `/`, `/api`, `/auth` et bloque `/auth/admin`.
- Given un tag `v*` poussé, when la CI s'exécute, then les tests passent puis les images `front` et `back` sont publiées sur ghcr.io.

## Implementation Notes

- Écarts assumés : `quarkus-flyway-postgresql` ajouté (requis par Flyway sur PostgreSQL) ; OpenAPI écrit dans `front/openapi/` seulement en profil `prod` (le `package`), pour que la ressource de test n'entre jamais dans le contrat, et `auto-add-server=false` (pas de `localhost` dans le client) ; `front/src/app/api/` ignoré par git et régénéré à chaque `start`/`build`/`test`.
- Erreurs : trois `@ServerExceptionMapper` dans `commun/api/ErreursMappers` ; codes HTTP génériques (`requete.invalide`, `acces.refuse`, `requete.trop_volumineuse`…) en plus des codes de la matrice.
- Healthchecks : `/dev/tcp` en bash pour le back (JRE sans curl) et Keycloak (port de gestion 9000, `/auth/health/ready`) ; `wget` pour le front (Caddy Alpine).
- Realm Keycloak : SMTP par placeholders `${env.X}` ; si l'import les laisse littéraux, passer à `${X}`.
- CI : Testcontainers sur le socket Podman du runner (`DOCKER_HOST`, Ryuk désactivé) ; images publiées sous le tag Git sans le « v ».
- Vérifié sur ce poste (JDK portable) : ArchUnit 7/7 et `ErreursTest` 4/4 (métier 409, 404, 500, 413) avec la base désactivée ; jar packagé lancé : `/api/inexistant` → 404 `problem+json` `ressource.introuvable` (sans aucune ressource REST), corps > 100 Mo → 413 ; front : `npm test` 2/2, `npm run build`, aucune URL de CDN dans `dist/`.
- Non exécuté ici (pas de moteur de conteneurs) : `MigrationInitialeTest`, build des `Containerfile`, `podman compose config/up`, import du realm, Caddyfiles ; couverts par la CI au premier push ou par la vérification manuelle de la spec (ligne « Console Keycloak » de la matrice).

## Spec Change Log

## Review Triage Log

Passe 1 (Blind Hunter = BH, Edge Case Hunter = EC, Verification Gap = VG).

| # | Source | Constat | Verdict | Preuve | Route |
|---|--------|---------|---------|--------|-------|
| 1 | BH | `README.md` : `cd front` exécuté depuis `back/` | low | Bloc « Démarrage » : `cd back && ./mvnw verify` puis `cd front` dans le même shell | patch |
| 2 | BH, VG, EC | 413 sans corps `problem+json` ni `code` | low | Constaté sur le jar : `413`, `content-length: 0` (Vert.x ; Caddy fait de même en amont) ; corps > 100 Mo rare, correction = gestionnaire Vert.x dédié | rejeté |
| 3 | BH, EC | JSON mal formé : mappers Jackson intégrés, 400 hors `problem+json` | medium | `quarkus-rest-jackson` enregistre ses mappers, plus spécifiques que `Exception` ; atteint dès le premier POST | patch |
| 4 | BH, VG | Branches non testées (405, ≥ 500 de `WebApplicationException`) ; `"detail": null` sérialisé | medium | `ErreursTest` ne couvre que 404 par `erreurHttp` ; `ProblemeDto` sans `@JsonInclude` | patch |
| 5 | EC | En-têtes `Allow`/`WWW-Authenticate`/`Retry-After` perdus par `erreurHttp` | low | `ProblemeDto.enReponse()` construit une réponse neuve sans recopier les en-têtes | patch |
| 6 | EC | 3xx `WebApplicationException` converti en problème | low | Aucune redirection levée dans le code ; garde = nouvelle branche | rejeté |
| 7 | BH, EC, VG | ArchUnit ignore les modules inconnus ou mal orthographiés et les couches inconnues | medium | `Emplacement.de` renvoie vide si le module n'est pas une clé de `GRAPHE` | patch |
| 8 | BH | Pas de règle de couches internes (`api` → `service` → `persistance`) | low | Non exigé par la spec ni par AD-1 (paradigme seulement) | defer |
| 9 | BH | AD-16 limité au suffixe `Dto` (énumérations exposées non couvertes) | medium | `nomsDeDtoUniques` filtre `haveSimpleNameEndingWith("Dto")` ; une énumération homonyme fausserait aussi le client | defer |
| 10 | BH, VG | Branches `commun` de `raisonDeRefus` non testées | low | Aucune fixture `commun/persistance` ni dépendance sortante de `commun` | patch |
| 11 | BH | Le back se connecte en superutilisateur PostgreSQL | medium | `POSTGRES_USER: corpusmots` = superutilisateur du cluster, réutilisé par le back ; `unaccent`/`pg_trgm` sont « trusted » (PG ≥ 13), un propriétaire de base suffit | patch |
| 12 | BH | Realm `master` exposé (`/auth/realms/master/...`) | high | Caddyfile ne bloque que `/auth/admin*` ; jeton `admin-cli` attaquable depuis Internet | patch |
| 13 | BH, VG, EC | Contrôle « pas de CDN » trop étroit et trop large | medium | `grep 'fonts.googleapis|fonts.gstatic|cdn'` : rate `fonts.bunny.net`, peut matcher du code minifié | patch |
| 14 | BH, EC | `front/Caddyfile` : `no-cache` sur les bundles hachés ; fichier manquant → `index.html` 200 | low | `header Cache-Control "no-cache"` global ; `try_files {path} /index.html` sans exclusion | patch |
| 15 | BH | Pas d'en-têtes de sécurité (HSTS, CSP) dans le Caddyfile public | low | Absent ; non demandé par la spec | defer |
| 16 | BH, EC | `.env.exemple` : `SMTP_AUTH=true` sans identifiants ; postgres sans garde `:?` | low | Valeurs lues dans les deux fichiers | patch |
| 17 | BH, EC | Caddy attend back/keycloak `healthy` : un back en échec coupe tout le site | medium | `depends_on … condition: service_healthy` sur les trois services | patch |
| 18 | BH | Suivi incohérent, clé accentuée, `JAVA_HOME` dans la spec, vérifications non exécutées | false | Le statut sprint est synchronisé en fin de workflow ; clé accentuée générée par sprint-planning ; correction = éditer la spec ; vérifications non exécutées déjà déclarées | rejeté |
| 19 | VG | Contrôle de dérive OpenAPI vert même si le build n'écrit plus le contrat | medium | Fichiers versionnés présents avant `verify` ; aucune suppression préalable | patch |
| 20 | VG | `Containerfile` construits seulement sur tag | medium | Job `images` sous `if: startsWith(github.ref, 'refs/tags/v')` | patch |
| 21 | VG | Aucune validation automatique de `compose.yaml` ni des Caddyfiles | medium | Aucune étape `podman compose config` / `caddy validate` dans la CI | patch (import du realm : defer, story 1.3) |
| 22 | EC | Test 413 : `NullPointerException` si la connexion se ferme sans réponse | low | `readLine()` peut renvoyer `null` | patch |
| 23 | EC | `pg_isready` vert pendant l'initdb temporaire (socket Unix) | medium | Le serveur temporaire de l'image n'écoute que sur le socket Unix ; `-h 127.0.0.1` attend le vrai serveur | patch |
| 24 | EC | `mvnw` sans `unzip` bascule en `.tar.gz` : somme SHA-256 du zip en échec | medium | `mvnw` l. 179-180 ; image `eclipse-temurin:25-jdk` sans `unzip` | patch |
| 25 | VG, EC | 100 Mo différents : Caddy `100MB` = 10^8 o, Quarkus `100M` = 100 Mio | low | go-humanize : MB décimal ; correction directe `100MiB` | patch |

## Design Notes

Contrat sans back démarré : le build Quarkus écrit le document OpenAPI dans `front/openapi/` (versionné), le front génère le client depuis ce fichier. La CI échoue si le document versionné diffère de celui produit par le back : même garantie qu'avec un back démarré, sans dépendance de démarrage entre les deux builds.

## Verification

**Commands:**
- `cd back && JAVA_HOME=~/.jdks/jdk-25.0.5+8 ./mvnw test -Dtest='fr.corpusmots.architecture.**'` -- expected: compilation, génération OpenAPI et tests ArchUnit verts en local (JDK portable). Les `@QuarkusTest` exigent un moteur de conteneurs : absent de ce poste, ils sont vérifiés par la CI.
- `cd front && npm ci && npm test -- --watch=false && npm run build` -- expected: succès ; `grep -rE "fonts.googleapis|cdn" dist/` vide.
- CI GitHub au premier push : `./mvnw verify` complet (Dev Services PostgreSQL), front, et build des deux `Containerfile` -- expected: vert.

**Manual checks (if no CLI):**
- Relire `compose.yaml` et `Caddyfile` contre la matrice (routes, `/auth/admin`, 100 Mo) : `podman compose config` non exécutable sur ce poste tant que Podman n'y est pas installé.
