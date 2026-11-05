---
title: 'Rétrospective Epic 1, action 1 : EnseignantCourant dans commun et garde-fous ArchUnit'
type: 'refactor'
created: '2026-11-05'
status: 'done'
baseline_commit: 'b96c212910749c531010977d32f8b4972c668eac'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/architecture/architecture-corpus-mots-2026-10-29/ARCHITECTURE-SPINE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** AD-1 annonce dans `commun` une interface `EnseignantCourant`, mais elle n'existe pas : seul `comptes.api` lit le jeton. La story 2.1 ne pourra donc pas connaître l'enseignant courant dans `preparations`, qui n'a pas le droit de dépendre de `comptes`. De plus, la façade `comptes.service` expose un type de persistance (`Map<UUID, StatutEnseignant>`), et aucune règle n'empêche un appel Keycloak dans une transaction (rétrospective de l'Epic 1, constats A-1, A-2, A-7).

**Approach:**
- créer `commun.service.EnseignantCourant`, implémentée dans `comptes` à partir du jeton ;
- retirer `StatutEnseignant` des signatures publiques de `comptes.service` ;
- figer les deux règles en ArchUnit, chacune éprouvée sur des fixtures en violation.

## Boundaries & Constraints

**Always:**
- `EnseignantCourant` n'expose que `UUID id()`, le `sub` du jeton (AD-6), sans paramètre de requête. Hors requête authentifiée (anonyme, `sub` absent ou qui n'est pas un UUID), `id()` lève une `IllegalStateException` explicite et ne renvoie jamais `null`.
- L'implémentation vit dans `comptes.api`, à côté de `FiltreCompteActif`, en bean `@RequestScoped`. Les autres modules ne connaissent que l'interface de `commun.service`.
- `ComptesResource.desactiver` prend l'acteur dans `EnseignantCourant` au lieu de `UUID.fromString(jeton.getSubject())`.
- Règle « signatures de service » : aucune méthode, aucun constructeur ni champ **public** d'une classe publique d'un `<module>.service` ne mentionne un type d'un `<module>.persistance`, que ce soit en retour, en paramètre ou en argument générique. Elle tourne sur le back réel et sur des fixtures.
- Règle « transactions » : aucune méthode `@Transactional` (sur la méthode ou la classe, `jakarta.transaction`) n'appelle directement une méthode d'un type assignable à `comptes.service.Identites`. Elle tourne sur le back réel et sur des fixtures.
- Comportement inchangé : `./mvnw verify` reste vert, sans changement d'API ni de `front/openapi/`.

**Never:**
- Pas d'autre méthode dans `EnseignantCourant` (ni rôle, ni nom) : le rôle reste lu par `@RolesAllowed` (AD-6).
- Pas de renommage de `EnseignantLu` ni d'autre refactorisation de `ComptesService` (constat A-3 reporté).
- Pas d'exception codée en dur dans la règle « transactions » : `sousVerrouAdministrateurs` reçoit un `Runnable`, donc ses appels Keycloak ne sont pas des appels directs.

</frozen-after-approval>

## Code Map

- `back/src/main/java/fr/corpusmots/commun/service/` -- vide aujourd'hui (seul `package-info.java`). Y créer l'interface `EnseignantCourant`.
- `back/src/main/java/fr/corpusmots/comptes/api/FiltreCompteActif.java` -- lecture du jeton par `SecurityIdentity.getPrincipal()` casté en `JsonWebToken` ; l'implémentation peut injecter `JsonWebToken`, comme `ComptesResource:35`.
- `back/src/main/java/fr/corpusmots/comptes/api/ComptesResource.java:65-68` -- `UUID.fromString(jeton.getSubject())` à remplacer. Le champ `jeton` devient inutile s'il n'a pas d'autre usage.
- `back/src/main/java/fr/corpusmots/comptes/service/ComptesService.java:126-131` -- `statutsDesEnseignants()` est publique et renvoie `Map<UUID, StatutEnseignant>`. Son seul appelant, `ReconciliationComptes:72`, est dans le même paquetage : la rendre visible au paquetage seulement (ArC intercepte les méthodes non privées, `@Transactional` reste actif). C'est la seule signature publique concernée.
- `back/src/main/java/fr/corpusmots/comptes/service/ComptesService.java:186-189` -- `sousVerrouAdministrateurs(Runnable)` : appels Keycloak dans des lambdas de `ComptesAdministration`, donc pas d'appel direct (exception d'AD-17, décision 1 de la story 1.6).
- `back/src/test/java/fr/corpusmots/architecture/ReglesArchitecture.java` -- règles paramétrées par la racine (`dependancesEntreModules`, `classesDansUnModuleEtUneCouche`, `nomsDeDtoUniques`) et Javadoc listant les règles. Y ajouter les deux nouvelles règles sur ce modèle.
- `back/src/test/java/fr/corpusmots/architecture/ArchitectureTest.java` -- une méthode par règle sur `classesDuBack`.
- `back/src/test/java/fr/corpusmots/architecture/ReglesArchitectureTest.java` et `fixtures/<module>/<couche>/` -- un test refusé et un test accepté par règle. Les fixtures doivent respecter la structure `<module connu>.<couche>` ; une annotation `jakarta.transaction.Transactional` est disponible en test.
- `back/src/test/java/fr/corpusmots/comptes/api/GestionDesComptesTest.java:123` -- le refus de se désactiver soi-même couvre déjà le nouvel acteur de bout en bout.

## Tasks & Acceptance

**Execution:**
- [x] `back/src/main/java/fr/corpusmots/commun/service/EnseignantCourant.java` -- l'interface, avec une Javadoc qui cite AD-1 et AD-6.
- [x] `back/src/main/java/fr/corpusmots/comptes/api/EnseignantDuJeton.java` -- l'implémentation `@RequestScoped`, plus un test : le `sub` d'un jeton est rendu en UUID, une requête anonyme lève `IllegalStateException`.
- [x] `back/src/main/java/fr/corpusmots/comptes/api/ComptesResource.java` -- acteur tiré d'`EnseignantCourant`.
- [x] `back/src/main/java/fr/corpusmots/comptes/service/ComptesService.java` -- `statutsDesEnseignants()` visible au paquetage seulement.
- [x] `back/src/test/java/fr/corpusmots/architecture/ReglesArchitecture.java`, `ArchitectureTest.java`, `ReglesArchitectureTest.java`, `fixtures/` -- les deux règles, leur passage sur le back et leurs fixtures en violation et conformes.

**Acceptance Criteria:**
- Given le back, when `./mvnw verify` tourne, then les cinq règles ArchUnit passent sur le code réel, et chaque nouvelle règle échoue sur sa fixture en violation avec un message qui nomme la classe et la règle.
- Given une classe de `preparations.service` qui injecte `EnseignantCourant`, when la règle AD-1 est vérifiée, then elle est acceptée (fixture conforme).
- Given le contrat, when `./mvnw package -DskipTests` tourne, then `front/openapi/` est inchangé.

## Implementation Notes

- `EnseignantDuJeton` lit le `sub` par `SecurityIdentity`, comme `FiltreCompteActif`. Hors contexte de requête, c'est le proxy CDI qui échoue (`ContextNotActiveException`, Javadoc de l'interface).
- La règle AD-17 ne voit que les appels directs : lambdas exécutées dans la transaction, appels indirects et transactions programmatiques échappent, et sa Javadoc le dit. `ArchitectureTest` échoue si `comptes.service.Identites` disparaît.
- Vérifié qu'un `statutsDesEnseignants()` redevenu public fait bien échouer `ArchitectureTest`.
- Vérifié après revue : `./mvnw verify` 128 tests verts (ArchUnit : 5 règles sur le back, 18 cas sur les fixtures) ; `front/openapi/` inchangé.

## Spec Change Log

## Review Triage Log

Passe 1 (Blind Hunter = BH, Edge Case Hunter = EC, Verification Gap = VG).

| # | Source | Constat | Verdict | Preuve | Route |
|---|--------|---------|---------|--------|-------|
| 1 | EC, BH | Hors contexte de requête, `id()` lève `ContextNotActiveException`, pas l'`IllegalStateException` promise | low | `EnseignantDuJeton` est `@RequestScoped` : le proxy échoue avant `id()` | patch (Javadoc) |
| 2 | EC, BH | Règle AD-17 aveugle aux lambdas exécutées dans la transaction, aux appels indirects (helper, autre bean) et aux transactions programmatiques | low | `getMethodCallsFromSelf()` ne voit que les appels directs ; l'intention fige « directement » | patch (limites écrites dans la Javadoc) |
| 3 | EC | `Identites` renommée ou déplacée : la règle AD-17 passe sans rien vérifier | low | La cible n'est qu'un nom (`IDENTITES`) | patch (assertion de présence dans `ArchitectureTest`) |
| 4 | EC, BH | Le refus au niveau de la classe ne vérifie pas que le message cite la règle | low | Assertion sur le nom de classe seul, alors que le critère d'acceptation veut la classe et la règle | patch |
| 5 | BH | La fixture présente le cas `Runnable` comme conforme à AD-17 alors qu'il s'exécute dans la transaction | low | ArC intercepte l'auto-appel ; c'est l'exception tolérée de `sousVerrouAdministrateurs` | patch (Javadoc de la fixture) |
| 6 | VG, BH | Règle AD-16 testée sur un type de retour seulement ; paramètre, constructeur et champ publics jamais refusés en test | medium | `ReferentielsExposeAlbum` n'a qu'un `Map<UUID, AlbumFixture>` en retour | patch (fixture et test) |
| 7 | EC, BH | `@Transactional(NOT_SUPPORTED/NEVER)` compté comme transaction ouverte | low | Aucun usage dans le back ; lire `value()` ajoute une branche | rejeté |
| 8 | EC | `@Transactional` ou méthodes héritées d'une superclasse ignorés | low | Aucun héritage de bean dans le back | rejeté |
| 9 | EC, BH | Clauses `throws` et membres protégés non inspectés par la règle AD-16 | low | Hors de la liste fixée par la spec (retour, paramètre, champ, argument générique) ; aucun cas dans le back | rejeté |
| 10 | BH | `MonCompteResource` lit encore le `sub` lui-même | low | La spec ne vise que `ComptesResource` ; `ComptesService.monCompte` attend le `sub` en texte | rejeté |
| 11 | BH | Aucune fixture n'appelle la classe concrète, seulement l'interface | low | `isAssignableTo` couvre les deux ; le back appelle l'interface | rejeté |
| 12 | BH | `identite == null` inatteignable ; principal non JWT non testé | low | Garde défensive ; seul l'OIDC est configuré | rejeté |
| 13 | BH | Une `IllegalStateException` sous `/api` deviendrait un 500 générique | false | `FiltreCompteActif` refuse, avant la ressource, tout `sub` sans Enseignant actif | rejeté |
| 14 | BH | Références AD incohérentes (AD-15 dans `AGENTS.md`), ARASAAC non couvert | low | AD-17 porte la règle ; le client ARASAAC n'existe pas encore | rejeté |
| 15 | BH | La spec manque dans le diff | false | Exclue volontairement : elle est l'auto-description de la modification | rejeté |

## Verification

**Commands:**
- `cd back && ./mvnw verify` (avec `JAVA_HOME` sur Temurin 25 et `DOCKER_HOST=npipe:////./pipe/podman-corpus-mots-machine`) -- expected: tests verts, ArchUnit compris.
- `git status --short front/openapi/` -- expected: vide.
