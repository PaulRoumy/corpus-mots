---
title: Revue des versions et choix techniques — ARCHITECTURE-SPINE corpus-mots
reviewed: ARCHITECTURE-SPINE.md (draft 2026-10-29)
date: 2026-10-29
method: vérification web directe (sites officiels, registres npm/Maven, API GitHub) ; .memlog.md n'enregistrait que des sources secondaires
---

# Revue des versions — corpus-mots

## Verdict

Les choix tiennent tous (chaque technologie existe et convient), mais quatre versions de la table Stack sont dépassées à la date du 2026-10-29 : la LTS Quarkus recommandée est désormais 3.40, Apache POI 6.0.0 est sorti, Keycloak est passé en 26.8.x, et Node.js 24 est passé en Maintenance LTS (Node 26 est l'Active LTS). La mention « Docker Compose v2 » est à reformuler. Le .memlog ne s'appuyait que sur des sources secondaires ; tout ce qui suit a été revérifié sur les sources primaires.

## Détail par élément

| # | Élément | Annoncé (spine) | Valeur vérifiée | Source | Verdict |
|---|---|---|---|---|---|
| 1 | Quarkus LTS | 3.33.x | Deux LTS actives : **3.40** (sortie 2026-09-30, maintenue jusqu'au 2027-09-30, dernier correctif 3.40.1.1 du 2026-10-19) et 3.33 (2026-03-25 → 2027-03-25, dernier 3.33.4.1). La page Releases indique : « Recommended for production: use the latest LTS release, Quarkus 3.40. » 3.40 est la dernière version de fonctionnalités de Quarkus 3 ; Quarkus 4 est en préparation (aucune bêta parue). | https://quarkus.io/releases ; https://quarkus.io/blog/quarkus-3-40-released/ | **update** → 3.40.x (3.40.1.1). Un projet greenfield sur 3.33 perdrait son support 6 mois plus tôt (mars 2027) |
| 2 | Quarkus + Java 25 | Java 25 LTS | Quarkus prend entièrement en charge Java 25 depuis 3.31 (images d'exécution, natif Mandrel) ; en mode JVM, Quarkus 3.x accepte les JDK 17 à 25 ; Quarkus 4 portera le minimum à 21. Red Hat liste OpenJDK 25/21/17 pour 3.33. Selon une source secondaire, le cache AOT Leyden de 3.40 exige Java 25. | https://quarkus.io/blog/quarkus-3-31-released/ ; https://quarkus.io/blog/java21/ ; https://access.redhat.com/articles/4966181 ; https://byteiota.com/quarkus-3-40-lts-java-25-leyden-aot-signal/ | ok |
| 3 | BOM Quarkus (Flyway, Hibernate ORM, quarkus-oidc, SmallRye OpenAPI) | gérés par BOM 3.33 | Inchangé sur le principe ; suivra le BOM 3.40. À noter pour les agents : depuis 3.31, quarkus-junit5 → `quarkus-junit` (JUnit 6) et Testcontainers 2 (coordonnées renommées). | https://docs.openrewrite.org/recipes/quarkus/updates/core/quarkus331/testcontainers2 ; https://camel.apache.org/camel-quarkus/next/migration-guide/3.31.0.html | **update** → « gérés par le BOM Quarkus 3.40 » |
| 4 | Apache POI | 5.5.1 | **6.0.0** publiée le 2026-10-22 (Maven Central `release` = 6.0.0) ; « POI requires Java 17 or newer since version 6.0.0 » (Java 25 donc compatible). 5.5.1 (2025-11-30) reste la dernière 5.x. La liste détaillée des ruptures d'API de 6.0.0 n'a pas été examinée (suppression d'API dépréciées annoncée). | https://poi.apache.org/ ; https://poi.apache.org/changes.html ; https://repo1.maven.org/maven2/org/apache/poi/poi-ooxml/maven-metadata.xml | **update** → 6.0.0 (greenfield, aucune dette de migration). Repli acceptable : 5.5.1 si 6.0.0 pose problème au scaffolding |
| 5 | Angular | 22.2.x | `@angular/core` latest = **22.2.3** ; Angular 22 est une version active. | https://registry.npmjs.org/@angular/core/latest ; https://angular.dev/reference/versions | ok |
| 6 | Angular Material | 22.2.x | `@angular/material` latest = **22.2.5** (peer `@angular/core` ^22 \|\| ^23, `@angular/cdk` 22.2.5). Disponible et aligné. | https://registry.npmjs.org/@angular/material/latest | ok |
| 7 | Node.js (build du front) | 24 LTS | `@angular/core` 22.2.3 `engines.node` = `^22.22.3 || ^24.15.0 || >=26.0.0`. Calendrier officiel : Node 24 est passé en **Maintenance LTS le 2026-10-20** (fin 2028-04-30) ; **Node 26 est devenu Active LTS le 2026-10-28** (fin 2029-04-30). Dernière 24.x : 24.22.2 ; dernière 26.x : 26.13.0. | https://raw.githubusercontent.com/nodejs/Release/main/schedule.json ; https://nodejs.org/en/about/previous-releases ; https://registry.npmjs.org/@angular/core/latest | **update** → Node 26 LTS (compatible Angular 22). Node 24 ≥ 24.15 reste techniquement valable mais est déjà en maintenance |
| 8 | Keycloak | 26.7.x | Dernière version : **26.8.1** (2026-10-13, 22 correctifs de sécurité). 26.8.0 sortie le 2026-10-01 selon une source secondaire. Keycloak n'a pas de ligne LTS : seule la dernière mineure reçoit les correctifs de sécurité, donc 26.7.x n'en reçoit plus. | https://www.keycloak.org/downloads ; https://www.keycloak.org/2026/10/keycloak-2681-released ; https://wz-it.com/en/blog/keycloak-26-8-upgrade-guide/ | **update** → 26.8.x (26.8.1) |
| 9 | Keycloak sur un serveur PostgreSQL partagé, base séparée | base `keycloak` dans le même serveur | Pris en charge : `--db postgres --db-url-host … --db-url-database keycloak` (option `db-url-database` / `KC_DB_URL_DATABASE`) ; `db-schema` en option. PostgreSQL 18.x est la version testée (versions 14 à 18 prises en charge). L'utilisateur doit avoir `SELECT` sur `pg_class` et `pg_namespace` pour les mises à jour. | https://www.keycloak.org/server/db | ok |
| 10 | PostgreSQL | 18.6 | 18.6 (2026-08-13) est la dernière mineure. La prochaine mise à jour trimestrielle est prévue autour du 2026-11-12 (18.7 attendue, non confirmée). | https://www.postgresql.org/ | ok (épingler l'image `postgres:18` et suivre les mineures) |
| 11 | `uuidv7()` natif dans PG18 | `uuidv7()` généré par la base | Fonction du cœur (doc 18, §9.14, table 9.45) : `uuidv7([shift interval]) → uuid` ; aucune extension nécessaire (contrairement à uuid-ossp). | https://www.postgresql.org/docs/18/functions-uuid.html | ok |
| 12 | `unaccent`, `pg_trgm` | extensions | Modules contrib standard fournis avec PostgreSQL et dans l'image officielle ; à activer par `CREATE EXTENSION` dans une migration Flyway. Non revérifié spécifiquement pour la 18.6 (inchangé depuis des années). | https://www.postgresql.org/docs/18/contrib.html | ok |
| 13 | Caddy | 2.11.x | Dernière version **v2.11.7** (2026-10-03). | https://api.github.com/repos/caddyserver/caddy/releases/latest | ok |
| 14 | Docker Compose | v2 | La dernière version est **v5.6.1** (2026-10-21) : la numérotation de Compose a dépassé la v2. « v2 » ne désigne donc plus une version actuelle ; si l'intention était « plugin `docker compose` (et non `docker-compose` v1) », c'est à reformuler. | https://api.github.com/repos/docker/compose/releases/latest | **update** → « plugin `docker compose` (v5.x actuel) » |
| 15 | Java (Eclipse Temurin) 25 LTS | 25 LTS | Java 25 est la LTS actuelle (sortie en septembre 2025), prise en charge par Quarkus (n° 2) et POI 6 (Java 17+). La dernière mise à jour Temurin 25.0.x n'a pas été vérifiée. | voir n° 2 et 4 | ok |
| 16 | Quarkus Dev Services PostgreSQL sous Windows + Docker Desktop | tests `@QuarkusTest` + Dev Services | Dev Services pour bases de données repose sur Testcontainers (Docker requis) ; l'image par défaut est `docker.io/library/postgres:18` (même version que la prod). Testcontainers est « actively tested against … Docker Desktop on Mac and Windows ». Problèmes ponctuels signalés (WSL : quarkusio/quarkus#37272 ; Testcontainers 1.20.6 cassé par Docker Desktop 4.56, sans rapport avec Quarkus ≥ 3.31 qui embarque Testcontainers 2). | https://quarkus.io/guides/databases-dev-services ; https://java.testcontainers.org/supported_docker_environment/ ; https://github.com/quarkusio/quarkus/issues/37272 | ok (à confirmer par un premier `mvn quarkus:dev` au scaffolding) |
| 17 | quarkus-smallrye-openapi (génération OpenAPI) | OpenAPI généré depuis Quarkus | Extension active ; `quarkus.smallrye-openapi.store-schema-directory` écrit `openapi.json`/`openapi.yaml` au build (utile pour la CI). **Version OpenAPI produite par défaut : 3.1.0** (forçable : `open-api-version=3.0.4`). | https://quarkus.io/guides/openapi-swaggerui | ok, avec contrainte : le générateur front doit lire OpenAPI 3.1, ou forcer 3.0.4 |
| 18a | openapi-generator `typescript-angular` | générateur de client Angular (non tranché dans la spine) | Maintenu : dernière version v7.26.0 (2026-10-06) ; `ngVersion` par défaut = 22.0.0, Angular 9 à 22 pris en charge. La documentation ne confirme pas la prise en charge d'OpenAPI 3.1 (toujours partielle dans openapi-generator). Exige un JRE (déjà présent) ou le paquet npm `@openapitools/openapi-generator-cli`. | https://openapi-generator.tech/docs/generators/typescript-angular/ ; https://api.github.com/repos/OpenAPITools/openapi-generator/releases/latest | ok si `open-api-version=3.0.4` est forcé côté Quarkus |
| 18b | ng-openapi-gen | idem | Dernière version npm 1.1.0, peer `@angular/core >=16` ; OpenAPI 3.0 et 3.1 pris en charge depuis 1.0. Activité récente (dates de commit) non vérifiée. | https://registry.npmjs.org/ng-openapi-gen/latest ; https://github.com/cyclosproject/ng-openapi-gen | ok (le plus simple avec OpenAPI 3.1 par défaut) |
| 19 | API ARASAAC (api.arasaac.org) — disponibilité | proxy back vers l'API ARASAAC | **Disponible** : `GET https://api.arasaac.org/v1/pictograms/fr/search/chat` renvoie du JSON (14 résultats, premier `_id` 7114). La racine `https://api.arasaac.org/` renvoie 404 (normal, seul le préfixe `/v1` est servi). | https://api.arasaac.org/v1/pictograms/fr/search/chat | ok |
| 20 | API ARASAAC — conditions | licence `arasaac_cc_by_nc_sa`, crédits auto | Licence CC BY-NC-SA confirmée par les conditions d'Aula Abierta (site officiel ARASAAC) : usage non commercial, attribution (auteur Sergio Palao, origine ARASAAC, propriétaire Gouvernement d'Aragon, licence), partage dans les mêmes conditions. La page officielle `arasaac.org/terms-of-use` est une application JS non lisible par l'outil ; **aucune condition propre à l'API (quota, cache, stockage de copies) n'a été trouvée.** | https://aulaabierta.arasaac.org/en/terms-of-use ; https://arasaac.org/terms-of-use | **unconfirmed** (déjà en Deferred Q-2 ; à lire avant de développer l'intégration, en particulier le droit de stocker des copies en base, AD-9) |

## Éléments à modifier dans la spine (table Stack)

| Ligne | Actuel | Recommandé |
|---|---|---|
| Quarkus (LTS) | 3.33.x | **3.40.x** (3.40.1.1) |
| Flyway, Hibernate ORM, quarkus-oidc, SmallRye OpenAPI | BOM Quarkus 3.33 | **BOM Quarkus 3.40** |
| Apache POI | 5.5.1 | **6.0.0** (Java 17+) |
| Node.js (build du front) | 24 LTS | **26 LTS** (Active LTS depuis le 2026-10-28 ; Angular 22 accepte >=26.0.0) |
| Keycloak | 26.7.x | **26.8.x** (26.8.1) |
| Docker Compose | v2 | **plugin `docker compose` v5.x** |

## Points à ajouter (non bloquants)

- AD-7 / Stack : nommer le générateur de client. Quarkus produit de l'OpenAPI **3.1.0** par défaut : soit `ng-openapi-gen` (3.1 natif), soit openapi-generator `typescript-angular` avec `quarkus.smallrye-openapi.open-api-version=3.0.4`.
- Tests : depuis Quarkus 3.31, l'extension de test est `quarkus-junit` (JUnit 6) et Testcontainers 2 ; à préciser pour les agents afin qu'ils n'utilisent pas `quarkus-junit5`.
- PostgreSQL : une 18.7 est attendue vers le 2026-11-12 ; épingler `postgres:18` (mineure flottante) ou mettre à jour l'épinglage au scaffolding.
- Quarkus 4 est en préparation (Java 21 minimum) ; 3.40 étant la dernière LTS 3.x (maintenue jusqu'en septembre 2027), la migration vers 4.x est à prévoir après le pilote.

## Non confirmé

- Conditions propres à l'API ARASAAC (n° 20) : déjà en Deferred (Q-2), à garder bloquant avant l'intégration.
- Ruptures d'API d'Apache POI 6.0.0 (n° 4) : à vérifier dans les notes de version au premier usage ; repli 5.5.1 possible.
- Dernier correctif Temurin 25.0.x et activité récente de ng-openapi-gen : sans enjeu pour la spine.
