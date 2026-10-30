# Epic 1 Context: Entrer dans l'application et constituer l'équipe

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Poser le socle livrable de corpus-mots et ouvrir l'accès à l'équipe. Paul installe l'application sur son serveur (monorepo Quarkus + Angular + Keycloak + PostgreSQL, déployé par Podman (`podman compose`) derrière Caddy, sauvegardé chaque nuit), puis invite ses collègues. Chacun crée son mot de passe, se connecte sur ordinateur ou sur téléphone et arrive dans la coquille de l'application (barre supérieure, navigation, menu de profil, page « Données personnelles »). L'administrateur désactive et réactive les comptes, et donne ou retire le rôle d'administrateur. Toutes les fonctionnalités suivantes s'appuient sur ce socle : il doit être conforme à l'architecture dès le premier jour.

## Stories

- Story 1.1 : Socle de l'application déployable
- Story 1.2 : Sauvegarde nocturne de la base
- Story 1.3 : Premier administrateur et connexion
- Story 1.4 : Coquille de l'application et système de design
- Story 1.5 : Inviter un collègue
- Story 1.6 : Gérer les comptes de l'équipe
- Story 1.7 : Mon compte et page « Données personnelles »

## Requirements & Constraints

- Aucune inscription libre : un compte n'existe que par invitation de l'administrateur (lien valable 7 jours). Un e-mail déjà associé à un compte est refusé avec sa raison ; une invitation expirée peut être renvoyée.
- Connexion par e-mail et mot de passe, réinitialisation par e-mail, sur ordinateur comme sur téléphone (écran de 360 px). Session longue d'environ 30 jours sur téléphone. Identifiants refusés : message qui ne dit pas lequel des deux est faux.
- Le compte ne contient que le nom affiché, l'e-mail, le mot de passe et le rôle ; aucun champ ne permet de saisir une donnée d'élève. Seul le nom affiché est modifiable par l'enseignant.
- La page « Données personnelles » est accessible sans connexion (lien depuis la page de Connexion) et depuis Mes données : quelles données, pourquoi, combien de temps (y compris 14 jours dans les sauvegardes), comment demander l'effacement. La durée de conservation des comptes reste à valider avec le DPD (Q-3).
- Désactiver bloque connexion et API sans rien effacer ; réactiver rend tout. Il reste toujours au moins un administrateur (retrait de rôle et désactivation du dernier refusés avec leur raison). La suppression de compte et le signalement des comptes inactifs relèvent de l'Epic 6.
- Sauvegarde : au moins une par jour, `pg_dumpall` des deux bases vers le disque externe, nom daté, 14 jours conservés, fichier d'état daté (succès ou échec avec cause, taille) ; disque absent ou plein : aucune sauvegarde existante supprimée. Procédure de restauration écrite pas à pas dans `deploiement/` (le test complet a lieu en Epic 6).
- Hébergement dans l'UE, exploitable seul par Paul ; outil gratuit, sans publicité, sans traceur ni mesure d'audience tierce ; code sous licence libre (fichier `LICENSE`).
- Accessibilité WCAG 2.x AA : contrastes 4,5:1 (texte) et 3:1 (non-texte), clavier complet, focus visible, jamais la couleur seule.
- Préalable : relais SMTP choisi avant la première invitation.

## Technical Decisions

- **Stack (versions exactes) :** Java 25 LTS (Temurin), Quarkus 3.40.x LTS (Flyway, Hibernate ORM, quarkus-oidc, SmallRye OpenAPI gérés par son BOM ; tests `quarkus-junit`, Testcontainers 2), ArchUnit 1.x (dernière au scaffolding), Angular / Angular Material 22.2.x, ng-openapi-gen 1.1.x, Node.js 26 LTS, Keycloak 26.8.x (toujours la dernière 26.x), PostgreSQL 18.6 (+ `unaccent`, `pg_trgm`), Caddy 2.11.x, Podman 6.1.x avec `podman compose` (fournisseur Docker Compose v5.x). Une fois créés, `back/pom.xml` et `front/package.json` font foi.
- **Monorepo :** `back/` (Maven), `front/`, `deploiement/` (`compose.yaml`, `Caddyfile`, `.env.exemple`, `sauvegarde.sh`, `keycloak/`), `.github/workflows/`. Scripts en bash POSIX, compatibles macOS et Windows (Git Bash).
- **Modules du back :** `commun`, `comptes`, `referentiels`, `vocabulaire`, `notifications`, `preparations`, `importation`, `fiches`, `moderation`, `indicateurs`, chacun en `api` → `service` → `persistance` (`fr.corpusmots.<module>.<couche>`). Un module n'appelle un autre que par sa couche `service`, dans le sens du graphe figé (`comptes` dépend de `vocabulaire`, `preparations`, `importation`, `fiches`, `notifications` ; tout module peut dépendre de `commun`, qui ne dépend de rien). Référence entre modules par UUID uniquement. Test ArchUnit du graphe et de l'unicité des noms de DTO REST dès la story 1.1. Seuls des `record` (`…Vue`, `…Commande`) traversent une frontière.
- **Contrat généré :** API REST/JSON sous `/api`, OpenAPI 3.1 généré par SmallRye, client TypeScript généré par ng-openapi-gen dans `front/src/app/api/` (jamais édité) ; aucun appel HTTP écrit à la main dans le front.
- **Identité :** Keycloak possède e-mail, mot de passe, rôle `admin`, sessions, e-mails d'invitation et de réinitialisation. `comptes` possède `Enseignant` (`id` = `sub` Keycloak, seule exception à `uuidv7()` ; nom affiché ; `statut` parmi `invite`, `actif`, `desactive`, `suppression_en_cours`, `supprime`). Seul `comptes.service` insère dans `enseignant`, et seulement à l'invitation. Le rôle `admin` n'est jamais copié en base : il se lit dans le jeton ; « au moins un administrateur » se vérifie auprès de Keycloak sous `pg_advisory_xact_lock`. Un filtre de `comptes` répond `403 compte.inconnu_ou_inactif` si le `sub` n'a pas d'`Enseignant` `actif` ; sans jeton valide, `401`. Back : bearer OIDC, access token court ; front : code + PKCE. La console d'admin Keycloak (`/auth/admin`) n'est jamais exposée.
- **Premier administrateur :** au démarrage, base sans `Enseignant` et e-mail défini dans `deploiement/.env` → invitation par le circuit normal avec le rôle `admin` ; rien ensuite.
- **Opérations de compte (fermer d'abord, effacer ensuite) :** inviter = appel Keycloak puis création de l'`Enseignant` `invite`, avec suppression compensatoire de l'utilisateur Keycloak si la transaction échoue. Désactiver, réactiver, changer de rôle = Keycloak d'abord, base ensuite ; désactiver révoque les sessions. Tâche planifiée de `comptes` (au démarrage puis chaque heure) qui rejoue les étapes Keycloak en échec et supprime les utilisateurs Keycloak sans `Enseignant`.
- **Transactions :** ouvertes par le service du module qui reçoit la requête, jamais de `REQUIRES_NEW` (sauf tâches planifiées des comptes) ; aucun appel HTTP sortant (Keycloak) pendant une transaction ouverte.
- **Annuaire :** le nom affiché n'est stocké que dans `enseignant`. `GET /api/enseignants` renvoie `id`, `nomAffiche`, `statut` (exclut `invite`), mis en cache côté front dans `commun/annuaire`.
- **Conventions transverses :** erreurs RFC 9457 (`application/problem+json`) avec `code` stable ; pagination `?page=&taille=` (max 100), réponse `{ elements, total }` ; toute ressource authentifiée, actions admin sous rôle `admin`, enseignant courant tiré du jeton ; limites 20 Mo par fichier et 100 Mo par requête, identiques dans Caddy et Quarkus ; dates `timestamptz` / ISO 8601 UTC ; profils Quarkus `dev` et `prod` ; journaux sans jeton ni contenu d'image.
- **Base et migrations :** un seul PostgreSQL avec les bases `corpusmots` et `keycloak`. Migrations Flyway `V<AAAAMMJJHHMM>__<module>_<objet>.sql`, limitées aux tables du module, jamais modifiées après publication ; la première crée `unaccent` et `pg_trgm`. Clés étrangères obligatoires dans un module, interdites entre modules. Tables et colonnes en snake_case français au singulier.
- **Déploiement :** tout ce qui dépend de la machine (domaine, secrets, SMTP, chemin de sauvegarde, e-mail admin initial) est dans `deploiement/.env` (jamais commité, modèle `.env.exemple`) ; `compose.yaml`, `Caddyfile` et l'export du realm Keycloak (versionné, importé au démarrage, thème et textes en français) sont identiques partout. Caddy (Let's Encrypt) route `/` → front statique, `/api` → Quarkus, `/auth` → Keycloak sauf `/auth/admin`. Seuls 80 et 443 ouverts. Un tag Git déclenche GitHub Actions : tests back et front, puis images `front` et `back` publiées sur ghcr.io ; mise à jour par `podman compose pull && podman compose up -d`. Images désignées par leur nom complet ; hôte Podman rootless (ports 80/443 autorisés, `podman-restart.service`).
- **Front :** composants standalone, Angular Material, état par services à signals, pas de NgRx ; dossiers par fonctionnalité (`commun/`, `administration/`…). Bibliothèque OIDC du front et réglages de session Keycloak à choisir au scaffolding.
- **Tests :** `@QuarkusTest` contre un PostgreSQL de test (Dev Services), ArchUnit, tests de composants front pour les composants partagés.

## UX & Interaction Patterns

- **Système de design :** jetons de DESIGN.md dans le thème Angular Material 3 (rôles de couleur clairs ; rôles sombres définis mais non activés, sans entrée pour les choisir ; couleurs de Section, de type d'image et d'état ; échelles `rounded`, `spacing`, `elevation`). Les composants ne référencent que des jetons, jamais de valeur littérale. Nunito auto-hébergée pour l'interface ; police cursive réservée aux mots de vocabulaire (repli Playwrite FR Moderne auto-hébergée). Aucune police ni ressource servie par un CDN, y compris celles qu'ajoute le schematic Angular Material.
- **Coquille ordinateur (≥ 1280 px) :** barre supérieure fixe (Champ de recherche, Bouton « + », cloche des Notifications, Menu de profil) et navigation latérale gauche de 248 px (Préparations, Banque, Fiches ; entrée active en `secondary-container`). Rubriques sans contenu : État vide (une phrase, une action). Les choix du Bouton « + » (Nouvelle préparation, Ajouter une image, Importer des fichiers) restent masqués tant que leur epic n'est pas livré.
- **Menu de profil :** Mon compte, Mes données, Déconnexion, et Administration seulement si le jeton porte `admin` ; un accès direct par URL à l'Administration ramène à l'accueil.
- **Composants partagés dans `commun/` :** Bandeau « Annuler » (8 s, décompte suspendu au survol et au focus, un seul à la fois, annoncé aux lecteurs d'écran, appelle l'opération inverse) ; Bandeau d'erreur (`error-container`, « Réessayer », reste jusqu'à résolution, saisie conservée) ; Dialogue de confirmation (bouton grave `error`, bouton par défaut « Annuler ») ; État vide et squelettes de chargement ; service qui traduit chaque `code` d'erreur du back en message français.
- **Session expirée :** sur `401`, renouvellement silencieux et rejeu ; si la session elle-même a expiré, Connexion puis retour à la même page, saisie conservée.
- **Pages Keycloak** (Connexion, Créer mon mot de passe, Mot de passe oublié) : thème français, utilisables sur téléphone, lien « Données personnelles », messages identifiants refusés, lien expiré, compte désactivé.
- **Administration › Comptes :** liste (nom affiché, e-mail, statut, rôle), inviter, renvoyer l'invitation, désactiver, réactiver, changer le rôle.
- **Accessibilité et ton :** tabulation dans l'ordre de lecture, anneau de focus `primary` 2 px décalé de 2 px, Échap ferme menus et dialogues, pas de dialogue sur un dialogue. Vouvoiement, ton neutre, verbes à l'infinitif, ni émoji ni point d'exclamation.

## Cross-Story Dependencies

- 1.1 est le préalable de toutes les stories (monorepo, ArchUnit, client généré, Compose, Caddy, realm Keycloak, CI, format d'erreur). 1.2 s'appuie sur le Compose et le PostgreSQL de 1.1.
- 1.3 (premier administrateur, filtre `403`, connexion) précède 1.5 et 1.6, qui réutilisent le circuit d'invitation et les appels à l'API admin Keycloak.
- 1.4 fournit la coquille, le Menu de profil et les composants partagés (bandeaux, dialogue, État vide, traduction des codes) utilisés par 1.5, 1.6, 1.7 et tous les epics suivants. L'annuaire (`GET /api/enseignants`, `commun/annuaire`) de 1.6 sert ensuite aux Epics 3 et 6.
- Les entrées du Bouton « + » s'activent avec les Epics 2 et 5 ; la cloche des Notifications prend son contenu en Epic 3. La suppression de compte, les comptes inactifs et le test de restauration sont en Epic 6 ; la session longue sur téléphone est exploitée par l'ajout de photo en Epic 5.
- Dépendance externe : relais SMTP choisi avant 1.3 et 1.5.
