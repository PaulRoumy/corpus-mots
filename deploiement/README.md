# Déploiement de corpus-mots

Toute l'application tourne dans des conteneurs **Podman rootless**, pilotés par `podman compose` (AD-21) :

| Service | Image | Rôle |
| --- | --- | --- |
| `caddy` | `docker.io/library/caddy:2.11` | HTTPS (Let's Encrypt), routage `/` → front, `/api` → back, `/auth` → Keycloak ; `/auth/admin` et `/auth/realms/master` renvoient 404 |
| `front` | `ghcr.io/paulroumy/corpus-mots-front:${VERSION}` | Application Angular statique |
| `back` | `ghcr.io/paulroumy/corpus-mots-back:${VERSION}` | API Quarkus |
| `keycloak` | `quay.io/keycloak/keycloak:26.8` | Comptes et connexion (realm `corpus-mots` importé au démarrage) |
| `postgres` | `docker.io/library/postgres:18.6` | Bases `corpusmots` et `keycloak` |

`compose.yaml`, `Caddyfile` et `keycloak/` sont identiques sur toute machine ; ce qui dépend de la machine est dans `.env`, jamais commité.

## Prérequis de l'hôte

Un hôte Linux (mini-PC ou VPS dans l'UE) avec :

1. **Podman 6.1** et un fournisseur compose : `podman compose` délègue au binaire Docker Compose v5 (CLI seule, sans démon Docker) ou à `podman-compose`. Vérifier avec `podman compose version`.
2. Les **ports 80 et 443** autorisés aux utilisateurs non privilégiés (rootless) :

   ```sh
   echo 'net.ipv4.ip_unprivileged_port_start=80' | sudo tee /etc/sysctl.d/99-corpus-mots.conf
   sudo sysctl --system
   ```

3. La **relance des conteneurs au démarrage** de la machine, pour l'utilisateur qui les fait tourner :

   ```sh
   sudo loginctl enable-linger "$USER"
   systemctl --user enable --now podman-restart.service
   ```

   `podman-restart.service` relance au démarrage les conteneurs dont la politique est `restart: unless-stopped` ou `always`.

4. Un enregistrement **DNS A** du domaine vers l'IP publique, et seuls les ports 80 et 443 ouverts sur la box ou le pare-feu.

## Installation

```sh
git clone https://github.com/PaulRoumy/corpus-mots.git
cd corpus-mots/deploiement
cp .env.exemple .env
# Éditer .env : VERSION, DOMAINE, ACME_EMAIL, mots de passe (postgres, corpusmots, keycloak), relais SMTP.
podman compose config --quiet   # vérifie la configuration
podman compose pull
podman compose up -d
podman compose ps               # tous les services doivent finir « healthy »
```

Au premier démarrage, PostgreSQL exécute `postgres/init-keycloak.sh`, qui crée les rôles ordinaires `corpusmots` et `keycloak`, chacun propriétaire de sa base (le superutilisateur `postgres` ne sert qu'à l'administration et aux sauvegardes) ; Keycloak importe ensuite `keycloak/realm-corpus-mots.json`. Les mots de passe des bases ne sont lus qu'à cette première initialisation : les changer ensuite demande un `ALTER USER` dans PostgreSQL.

Vérifications rapides, depuis n'importe quel poste :

```sh
curl -sI https://<domaine>/                     # 200, page du front
curl -s  https://<domaine>/api/inexistant      # 404, application/problem+json
curl -sI https://<domaine>/auth/realms/corpus-mots/.well-known/openid-configuration   # 200
curl -sI https://<domaine>/auth/admin/          # 404 : console Keycloak jamais exposée
curl -sI https://<domaine>/auth/realms/master/  # 404 : realm master jamais exposé
```

## Mise à jour

Une nouvelle version est publiée par un tag Git `vX.Y.Z` (GitHub Actions construit et pousse les images). Sur le serveur :

```sh
cd corpus-mots/deploiement
git pull                                         # compose.yaml, Caddyfile, realm à jour
# Dans .env : VERSION=X.Y.Z
podman compose pull
podman compose up -d
```

Keycloak et PostgreSQL suivent alors leurs versions correctives (`26.8`, `18.6`).

Le realm n'est importé que s'il n'existe pas encore : une modification de `keycloak/realm-corpus-mots.json` après la première installation s'applique à la main (ou par une story dédiée).

## Sauvegarde

Chaque nuit à 03:00, `sauvegarde.sh` écrit un `pg_dumpall` compressé des deux bases (`corpusmots` et `keycloak`, rôles compris) sur le disque externe, sous le nom `corpus-mots-AAAA-MM-JJ_HHMM.sql.gz`, et garde `SAUVEGARDE_JOURS` jours (14 par défaut). Il est lancé par un timer systemd **utilisateur**, au nom du même utilisateur que Podman rootless (pas de `cron`, rien en root). Si la machine était éteinte à 03:00, la sauvegarde est faite à son démarrage suivant ; en cas d'échec, systemd la relance toutes les 15 minutes, dans la limite de 4 lancements en 2 heures.

Les anciennes sauvegardes ne sont supprimées qu'après une sauvegarde réussie : disque absent, disque plein ou base injoignable, rien n'est effacé.

### Installation

1. Monter le disque externe et y créer le dossier de sauvegarde avec son **fichier repère**. Sans ce repère, le disque est considéré absent : un point de montage vide n'est jamais pris pour le disque.

   ```sh
   mkdir -p /media/sauvegarde/corpus-mots
   touch /media/sauvegarde/corpus-mots/.corpus-mots-sauvegarde
   ```

2. Dans `.env`, renseigner `SAUVEGARDE_DESTINATION` (ce dossier) ; `SAUVEGARDE_ETAT` et `SAUVEGARDE_JOURS` sont facultatifs. `/media/sauvegarde/corpus-mots` n'est qu'un exemple : dans toutes les commandes de cette section et de [RESTAURATION.md](RESTAURATION.md), le remplacer par la valeur de `SAUVEGARDE_DESTINATION`, et `etat-sauvegarde/` par celle de `SAUVEGARDE_ETAT` si elle est renseignée.

3. Vérifier par une sauvegarde manuelle, depuis n'importe quel répertoire :

   ```sh
   ~/corpus-mots/deploiement/sauvegarde.sh && echo "sauvegarde réussie"
   ls -l /media/sauvegarde/corpus-mots/
   ```

4. Installer et activer le timer (les unités supposent le clone dans `~/corpus-mots` ; sinon, adapter `ExecStart` dans le `.service` copié) :

   ```sh
   mkdir -p ~/.config/systemd/user
   cp ~/corpus-mots/deploiement/systemd/corpus-mots-sauvegarde.service ~/corpus-mots/deploiement/systemd/corpus-mots-sauvegarde.timer ~/.config/systemd/user/
   systemctl --user daemon-reload
   systemctl --user enable --now corpus-mots-sauvegarde.timer
   systemctl --user list-timers corpus-mots-sauvegarde.timer   # prochaine exécution : 03:00
   ```

   Le timer tourne même sans session ouverte grâce à `loginctl enable-linger` (prérequis 3).

### Contrôler les sauvegardes

Chaque exécution écrit un fichier d'état `AAAA-MM-JJ_HHMM.etat` dans `SAUVEGARDE_ETAT` (par défaut `deploiement/etat-sauvegarde/`, sur le disque système pour rester lisible quand le disque externe manque) ; après une sauvegarde réussie, ceux de plus de `SAUVEGARDE_JOURS` jours sont purgés (un échec n'efface rien).

```sh
cat "$(ls -t ~/corpus-mots/deploiement/etat-sauvegarde/*.etat | head -n 1)"   # dernier état
journalctl --user -u corpus-mots-sauvegarde.service -n 20                       # journal des exécutions
systemctl --user start corpus-mots-sauvegarde.service                           # sauvegarde immédiate
```

Un fichier d'état contient :

```text
date=2026-10-31T02:00:04Z
resultat=succes
fichier=corpus-mots-2026-10-31_0300.sql.gz
taille_octets=184320
cause=
```

En cas d'échec, `resultat=echec` et `cause` vaut :

| `cause` | Signification | Que faire |
| --- | --- | --- |
| `configuration` | `SAUVEGARDE_DESTINATION` vide ou `SAUVEGARDE_JOURS` invalide dans `.env` | Corriger `.env` |
| `disque_absent` | Dossier introuvable ou sans `.corpus-mots-sauvegarde` | Brancher et monter le disque, vérifier le repère |
| `ecriture_impossible` | Écriture impossible sur le disque (plein, en lecture seule) | Libérer de la place ou réduire `SAUVEGARDE_JOURS` |
| `dump_impossible` | `pg_dumpall` a échoué (conteneur `postgres` arrêté…) | `podman compose ps`, puis `podman compose logs postgres` |
| `interrompu` | Sauvegarde arrêtée en cours (`systemctl --user stop`, arrêt de la machine, délai de 2 h dépassé) | Relancer : `systemctl --user start corpus-mots-sauvegarde.service` |

### Restauration

La procédure pas à pas est dans [RESTAURATION.md](RESTAURATION.md).

## Journaux

```sh
podman compose logs -f back
```
