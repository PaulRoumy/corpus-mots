# corpus-mots

Une application web gratuite qui aide les enseignants de maternelle à préparer, partager et réutiliser le vocabulaire des albums étudiés en classe.

> **Statut : développement de l'Epic 1 en cours.** Brief, PRD, UX, architecture et epics sont validés ; le socle de l'application (back, front, déploiement, CI) est en place.

## Le problème

En maternelle, chaque album étudié demande de préparer son vocabulaire : choisir les mots nécessaires à la compréhension, trouver pour chacun une image simple et claire, puis monter des fiches à projeter ou à imprimer.

Aujourd'hui, ce travail se fait dans Word et PowerPoint et prend **environ 6 heures par album**. Surtout, il est refait sans cesse : retrouver une image déjà choisie pour un mot prend plus de temps que d'en chercher une nouvelle. Et comme les enseignants d'une même école étudient souvent les mêmes albums, chacun refait aussi le travail de ses collègues.

## La solution

corpus-mots rend **la réutilisation plus rapide que la refaite**.

- **Une banque mot-image centralisée.** À la saisie d'un mot, l'application indique s'il existe déjà, dans quels albums, et propose les images déjà utilisées.
- **Une carte d'identité par image** : sens du mot, section (PS, MS, GS), album d'origine, module, thème, catégorie grammaticale. Un même mot peut ainsi avoir plusieurs images, selon son sens (« étalé » après une chute ou en cuisine) ou l'âge des enfants.
- **Un partage à l'échelle de l'école.** Chaque enseignant garde son espace « Mes mots » et choisit ce qu'il verse dans la « Banque de l'école ». Rien n'est écrasé, et un administrateur modère.
- **Des fiches générées depuis la banque** : cartes de vocabulaire, fiches d'activité, fiches thématiques. Le mot peut s'écrire en cursive, en script, en Arial ou pas du tout, et plusieurs écritures peuvent se combiner. Export en Word et PowerPoint.

## Pour qui

Les **enseignants de maternelle**, seuls utilisateurs de l'application. L'ATSEM et les enfants profitent des fiches imprimées et des images projetées, sans accès à l'application.

Le projet est conçu par un enseignant, à partir de sa pratique, et sera d'abord déployé dans une école pilote de 6 enseignants. Il est **non commercial** : gratuit et sans publicité.

## Feuille de route

| Version | Contenu |
|---|---|
| **V1** | Banque mot-image, détection des mots existants, partage dans l'école, import des fichiers Word et PowerPoint existants, ajout de photos depuis un téléphone, génération et export des fiches |
| **V2** | Pilotage du corpus : importer une liste de référence par section (par exemple la liste de Boisseau), voir les mots couverts et manquants, et obtenir des combinaisons d'albums qui couvrent le corpus |
| **Plus tard** | Envoi hebdomadaire aux familles, vidéos courtes pour les verbes d'action, ouverture à d'autres écoles |

## Démarrage

Le dépôt contient trois parties : `back/` (API Quarkus, Java), `front/` (application Angular) et `deploiement/` (conteneurs Podman). Les commandes fonctionnent sous macOS, Linux et Windows (Git Bash).

Prérequis : JDK **Temurin 25**, **Node.js 26** et **Podman 6.1** avec son socket compatible Docker activé (les tests du back démarrent un PostgreSQL de test dans un conteneur).

```sh
# Back, depuis la racine : tests (ArchUnit, erreurs, migrations) et construction ;
# régénère front/openapi/openapi.json
(cd back && ./mvnw verify)
(cd back && ./mvnw quarkus:dev)          # API sur http://localhost:8080/api

# Front, depuis la racine : génère le client d'API depuis openapi/, puis teste et construit
(cd front && npm ci && npm test -- --watch=false && npm run build)
(cd front && npm start)                  # http://localhost:4200
```

Installation sur un serveur : voir [`deploiement/README.md`](deploiement/README.md) (`podman compose`, Caddy, Keycloak, PostgreSQL). Chaque tag `vX.Y.Z` publie les images `front` et `back` sur ghcr.io.

## Licence

Code sous licence [GNU AGPL v3](LICENSE).

## Documentation

Le projet suit la méthode [BMAD](https://github.com/bmad-code-org/BMAD-METHOD). Les documents de conception sont dans `docs/` :

- [Product brief](docs/briefs/brief-corpus-mots-2026-10-25/brief.md) et son [addendum](docs/briefs/brief-corpus-mots-2026-10-25/addendum.md) (recherche, détails pour le PRD)
- [Synthèse du brainstorming](docs/brainstorming/brainstorm-app-vocabulaire-maternelle-2026-10-25/brainstorm-intent.md)
