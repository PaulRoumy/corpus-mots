<!-- bmad:context -->
<!-- Vérifié le 2026-10-30 contre 98a54e3. Géré par bmad-project-context ; le contenu entre ces marqueurs est remplacé au refresh. Gardez hors des marqueurs ce que vous voulez conserver. -->

## corpus-mots

Application web gratuite pour les enseignants de maternelle : banque mot-image partagée dans l'école, préparation du vocabulaire des albums, génération de fiches Word et PowerPoint. Monolithe modulaire Quarkus (Java) + SPA Angular, Keycloak, PostgreSQL, déployés par Docker Compose. La planification BMAD est dans `docs/` (PRD, UX, architecture, epics) ; le suivi de réalisation dans `docs/realisation/`.

## Où sont les choses

- Avant de modifier `back/`, `front/` ou `deploiement/`, lire `docs/architecture/architecture-corpus-mots-2026-10-29/ARCHITECTURE-SPINE.md` : les AD-n cités par les stories y sont définis.
- Sens des termes du domaine (Mot, Sens, Image, Préparation, verser, Banque…) : Glossaire, §3 de `docs/prd/prd-corpus-mots-2026-10-27/prd.md`.
- Écrans et comportements : `docs/ux-designs/ux-corpus-mots-2026-10-28/DESIGN.md` et `EXPERIENCE.md`.
- Stories et critères d'acceptation : `docs/epics/epics-corpus-mots-2026-10-29/epics.md`.

## Lancer et vérifier

- TODO (story 1.1) : commandes de build et de test du back (Maven Wrapper, Quarkus), du front (npm, Angular) et du déploiement (`docker compose` dans `deploiement/`), à vérifier au premier refresh.
- Versions : tableau Stack de l'architecture tant que `back/pom.xml` et `front/package.json` n'existent pas, puis ces fichiers font foi ; ne jamais reprendre une version de mémoire.

## Conventions qui s'écartent des défauts

- Tout doit tourner sous macOS comme sous Windows : scripts en bash POSIX (Git Bash sous Windows), `./mvnw` et npm ; jamais de script PowerShell ou `.cmd` seul, ni de chemin absolu ou de séparateur `\`.
- Termes du domaine en français sans accents, vocabulaire technique en anglais (`PreparationResource`, `ImageRepository`) ; le module d'import s'appelle `importation` (AD-13).
- Un module du back n'en appelle un autre que par son paquetage `service`, dans le sens du graphe d'AD-1 ; entre modules, se référencer par UUID, jamais par entité, Repository ou clé étrangère SQL.
- Ce qu'un enseignant voit d'une Image se décide uniquement dans `vocabulaire.service.VisibiliteImages`, et l'`etat` d'une Image ne change que par `vocabulaire.service` ; ne jamais filtrer les Images ailleurs (AD-2, AD-3).
- Aucun appel HTTP sortant (Keycloak, ARASAAC) dans une transaction ouverte : appeler d'abord, écrire ensuite. Pas de `@ObservesAsync`, `REQUIRES_NEW` ni `TransactionPhase.AFTER_*` pour une règle de cohérence ; utiliser `@Observes` synchrone (AD-15, AD-17).
- Ne jamais éditer `front/src/app/api/` ni écrire d'appel HTTP à la main dans le front : modifier le back, puis régénérer le client ng-openapi-gen (AD-7).
- Migrations Flyway : `V<AAAAMMJJHHMM>__<module>_<objet>.sql`, limitées aux tables du module ; ne jamais modifier une migration publiée, en ajouter une nouvelle (AD-22).
- Aucune ressource chargée depuis un CDN ou un service tiers par le navigateur, y compris les polices Google qu'ajoute le schematic Angular Material : tout est servi par l'application.
- Textes affichés en français, au vouvoiement ; le back renvoie une erreur RFC 9457 avec un `code` stable, que le front traduit.

<!-- /bmad:context -->
