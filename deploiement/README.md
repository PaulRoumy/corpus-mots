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

## Journaux

```sh
podman compose logs -f back
```
