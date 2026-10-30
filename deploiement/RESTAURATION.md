# Restaurer une sauvegarde de corpus-mots

Les sauvegardes sont des `pg_dumpall --clean --if-exists` compressés, écrits chaque nuit par `sauvegarde.sh` (voir [README.md](README.md), section « Sauvegarde »). Un fichier contient les deux bases (`corpusmots` et `keycloak`) et les rôles PostgreSQL : le restaurer remplace **tout** le contenu actuel (comptes, mots de passe, images, préparations) par celui de la date choisie.

Toutes les commandes se lancent sur le serveur, au nom de l'utilisateur qui fait tourner Podman, depuis le dossier `deploiement` du clone. Elles se copient telles quelles, sauf la ligne de l'étape 1 où il faut choisir le fichier. `/media/sauvegarde/corpus-mots` et `etat-sauvegarde/` sont les valeurs d'exemple : les remplacer par celles de `SAUVEGARDE_DESTINATION` et de `SAUVEGARDE_ETAT` dans `.env` si elles diffèrent.

Deux cas :

- **A. La base existe encore** (erreur de manipulation, données à remettre à une date antérieure) : étapes 1 à 6.
- **B. Volume perdu ou machine neuve** (le volume `postgres-donnees` est vide ou à recréer) : étapes 1, puis B1 à B3, puis 5 et 6.

## 1. Choisir la sauvegarde

```sh
cd ~/corpus-mots/deploiement
ls -l /media/sauvegarde/corpus-mots/corpus-mots-*.sql.gz      # dossier = SAUVEGARDE_DESTINATION de .env
cat "$(ls -t etat-sauvegarde/*.etat | head -n 1)"             # dernier état : resultat=succes ?
```

Puis désigner le fichier choisi (à adapter), le **copier sur le disque système**, hors du dossier que purge `sauvegarde.sh` (la sauvegarde de l'étape 2 pourrait sinon l'effacer s'il a presque 14 jours), et vérifier la copie, d'où se fera la restauration :

```sh
FICHIER=/media/sauvegarde/corpus-mots/corpus-mots-2026-10-31_0300.sql.gz
mkdir -p ~/restauration && cp "$FICHIER" ~/restauration/
FICHIER=~/restauration/$(basename "$FICHIER")
gunzip -t "$FICHIER" && echo "copie intacte : $FICHIER"
```

## 2. Sauvegarder l'état actuel (cas A)

Pour pouvoir revenir en arrière si la restauration n'était pas la bonne :

```sh
./sauvegarde.sh && echo "état actuel sauvegardé"
```

## 3. Arrêter le back et Keycloak (cas A)

Plus aucune connexion aux bases `corpusmots` et `keycloak` ne doit rester ouverte, sinon elles ne peuvent pas être remplacées. PostgreSQL, lui, reste démarré.

```sh
podman compose stop back keycloak
podman compose ps
```

## 4. Restaurer (cas A)

```sh
gunzip -c "$FICHIER" | podman compose exec -T postgres psql -U postgres -d postgres 2>&1 | tee restauration.log
grep ERROR restauration.log
```

Le script supprime puis recrée les bases et les rôles. Les erreurs qui concernent le rôle `postgres` lui-même (par exemple `current user cannot be dropped` ou `role "postgres" already exists`) sont attendues : on ne peut pas supprimer l'utilisateur connecté. Toute autre ligne `ERROR` est à examiner avant de redémarrer ; en cas de doute, relancer cette étape avec la sauvegarde faite à l'étape 2.

## 5. Redémarrer

```sh
podman compose up -d
podman compose ps                 # tous les services doivent finir « healthy »
```

## 6. Vérifier

```sh
podman compose exec -T postgres psql -U postgres -d postgres -c '\l'
podman compose exec -T postgres psql -U postgres -d corpusmots -c 'SELECT version, description, installed_on FROM flyway_schema_history ORDER BY installed_rank DESC LIMIT 3;'
podman compose exec -T postgres psql -U postgres -d keycloak -c "SELECT count(*) AS utilisateurs FROM user_entity WHERE realm_id = (SELECT id FROM realm WHERE name = 'corpus-mots');"
podman compose logs --tail 50 back
```

Attendu : les bases `corpusmots` et `keycloak` listées, la dernière migration Flyway et le nombre d'utilisateurs correspondant à la date de la sauvegarde, aucune erreur dans les journaux du back. Enfin, depuis un navigateur, se connecter à `https://<domaine>/` et vérifier qu'on retrouve les données de cette date.

Une fois satisfait, supprimer le journal et la copie de restauration :

```sh
rm restauration.log "$FICHIER"
```

## Cas B : restaurer sur un volume neuf

À la place des étapes 2 à 4.

### B1. Repartir d'un volume vide

Sur une machine neuve, suivre d'abord l'installation du [README.md](README.md) jusqu'à la copie de `.env`, **avec les mêmes mots de passe** que l'ancienne installation (les rôles restaurés gardent les mots de passe de la sauvegarde). Puis, si un volume `postgres-donnees` existe déjà (endommagé), le supprimer :

```sh
podman compose down
podman volume rm corpus-mots_postgres-donnees
```

### B2. Démarrer PostgreSQL seul

```sh
podman compose up -d postgres
until podman compose exec -T postgres pg_isready -h 127.0.0.1 -U postgres -d postgres; do sleep 2; done
```

PostgreSQL initialise le volume et crée les bases vides par `postgres/init-keycloak.sh` ; la restauration les remplace aussitôt.

### B3. Restaurer

```sh
gunzip -c "$FICHIER" | podman compose exec -T postgres psql -U postgres -d postgres 2>&1 | tee restauration.log
grep ERROR restauration.log
```

Mêmes erreurs attendues qu'à l'étape 4. Continuer ensuite par les étapes 5 et 6.
