#!/bin/sh
# Exécuté par l'image PostgreSQL à la première initialisation du volume seulement.
# Le superutilisateur reste « postgres » ; le back et Keycloak ont chacun un rôle ordinaire,
# propriétaire de sa base. unaccent et pg_trgm sont « trusted » : la migration Flyway du back
# les crée avec le rôle corpusmots.
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
	-v mdp_corpusmots="$BD_MOT_DE_PASSE" \
	-v mdp_keycloak="$KEYCLOAK_BD_MOT_DE_PASSE" <<'SQL'
CREATE ROLE corpusmots WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD :'mdp_corpusmots';
CREATE DATABASE corpusmots OWNER corpusmots;
CREATE ROLE keycloak WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD :'mdp_keycloak';
CREATE DATABASE keycloak OWNER keycloak;
SQL
