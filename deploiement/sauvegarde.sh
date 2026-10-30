#!/bin/sh
# Sauvegarde nocturne de corpus-mots (NFR-8), lancée par le timer systemd utilisateur
# corpus-mots-sauvegarde.timer (voir README.md, section « Sauvegarde »).
#
# Écrit un pg_dumpall compressé et daté des bases corpusmots et keycloak sur le disque externe,
# garde SAUVEGARDE_JOURS jours de sauvegardes et consigne le résultat dans un fichier d'état daté.
# Réglages lus dans le .env voisin de ce script :
#   SAUVEGARDE_DESTINATION  dossier sur le disque externe (obligatoire), qui doit contenir le
#                           fichier repère .corpus-mots-sauvegarde
#   SAUVEGARDE_ETAT         dossier des fichiers d'état (défaut : etat-sauvegarde/ à côté du script)
#   SAUVEGARDE_JOURS        durée de conservation en jours (défaut : 14)
# Commande podman surchargeable par la variable PODMAN (tests).
# Code de sortie : 0 si la sauvegarde a réussi, 1 sinon.
# Restauration : RESTAURATION.md.

set -u
# Sauvegardes et fichiers d'état lisibles par le seul utilisateur qui les écrit.
umask 077

PODMAN="${PODMAN:-podman}"
REPERE=.corpus-mots-sauvegarde

# Le script se lance depuis n'importe où : podman compose doit trouver compose.yaml et .env.
DOSSIER=$(cd "$(dirname "$0")" && pwd) || exit 1
cd "$DOSSIER" || exit 1

HORODATAGE=$(date +%Y-%m-%d_%H%M)
DATE_ISO=$(date -u +%Y-%m-%dT%H:%M:%SZ)
FICHIER="corpus-mots-$HORODATAGE.sql.gz"

journal() {
	printf 'corpus-mots-sauvegarde : %s\n' "$*" >&2
}

# Valeur de la clé $1 dans .env (dernière occurrence), sans guillemets, retour chariot ni
# commentaire de fin de ligne (hors guillemets). Le fichier n'est jamais « sourcé » : seules ces
# clés sont lues.
lire_reglage() {
	[ -f .env ] || return 0
	sed -n "s/^[[:space:]]*$1[[:space:]]*=//p" .env | tail -n 1 | tr -d '\r' |
		sed -e 's/^[[:space:]]*//' \
			-e "/^[\"']/!s/[[:space:]]#.*\$//" \
			-e 's/[[:space:]]*$//' \
			-e 's/^"\([^"]*\)".*$/\1/' \
			-e "s/^'\\([^']*\\)'.*\$/\\1/"
}

DESTINATION=$(lire_reglage SAUVEGARDE_DESTINATION)
ETAT=$(lire_reglage SAUVEGARDE_ETAT)
ETAT="${ETAT:-$DOSSIER/etat-sauvegarde}"
JOURS=$(lire_reglage SAUVEGARDE_JOURS)
JOURS="${JOURS:-14}"

# Écrit le fichier d'état, journalise, et termine. $1 : succes | echec ; $2 : cause ; $3 : taille.
terminer() {
	resultat=$1
	cause=$2
	taille=$3
	fichier_etat=""
	[ "$resultat" = succes ] && fichier_etat=$FICHIER
	if mkdir -p "$ETAT" && {
		printf 'date=%s\n' "$DATE_ISO"
		printf 'resultat=%s\n' "$resultat"
		printf 'fichier=%s\n' "$fichier_etat"
		printf 'taille_octets=%s\n' "$taille"
		printf 'cause=%s\n' "$cause"
	} >"$ETAT/$HORODATAGE.etat"; then
		:
	else
		journal "fichier d'état impossible à écrire dans $ETAT"
	fi
	if [ "$resultat" = succes ]; then
		journal "succès : $FICHIER ($taille octets)"
		exit 0
	fi
	journal "échec : $cause"
	exit 1
}

# Arrêt demandé (systemctl stop, Ctrl+C) : l'échec est consigné ; le trap EXIT efface le .partiel.
trap 'terminer echec interrompu ""' HUP INT TERM

if [ -z "$DESTINATION" ]; then
	journal "SAUVEGARDE_DESTINATION absente de $DOSSIER/.env"
	terminer echec configuration ""
fi
# 1 à 4 chiffres, zéros de tête retirés (« 08 » n'est pas de l'octal), 0 refusé : une valeur
# fausse ne doit jamais purger la sauvegarde du soir.
case "$JOURS" in
'' | *[!0-9]* | ?????*) JOURS="" ;;
*) JOURS=${JOURS#"${JOURS%%[!0]*}"} ;;
esac
if [ -z "$JOURS" ]; then
	journal "SAUVEGARDE_JOURS doit être un nombre de jours de 1 à 9999"
	terminer echec configuration ""
fi

# Un point de montage vide n'est jamais pris pour le disque : le repère doit y être.
if [ ! -d "$DESTINATION" ] || [ ! -f "$DESTINATION/$REPERE" ]; then
	journal "disque absent : $DESTINATION/$REPERE introuvable"
	terminer echec disque_absent ""
fi

PARTIEL="$DESTINATION/$FICHIER.partiel"
STATUT_DUMP=$(mktemp) || terminer echec ecriture_impossible ""
trap 'rm -f "$PARTIEL" "$STATUT_DUMP"' EXIT

# POSIX sh n'a pas PIPESTATUS : le code de sortie du dump passe par un fichier temporaire.
{
	"$PODMAN" compose exec -T postgres pg_dumpall -U postgres --clean --if-exists
	echo $? >"$STATUT_DUMP"
} | gzip >"$PARTIEL"
statut_gzip=$?
statut_dump=$(cat "$STATUT_DUMP")

# Une écriture ratée (disque plein) interrompt aussi le dump : elle est examinée en premier.
if [ "$statut_gzip" -ne 0 ]; then
	terminer echec ecriture_impossible ""
fi
if [ "$statut_dump" != 0 ]; then
	terminer echec dump_impossible ""
fi
if ! mv "$PARTIEL" "$DESTINATION/$FICHIER"; then
	terminer echec ecriture_impossible ""
fi

TAILLE=$(wc -c <"$DESTINATION/$FICHIER" | tr -d ' ')

# Purge seulement après une sauvegarde réussie, et seulement des sauvegardes et fichiers d'état.
MINUTES=$((JOURS * 24 * 60))
find "$DESTINATION" -maxdepth 1 -type f -name 'corpus-mots-*.sql.gz' -mmin +"$MINUTES" -exec rm -f {} + ||
	journal "purge des anciennes sauvegardes incomplète"
# .partiel orphelins d'une coupure de courant (celui d'une sauvegarde en cours a moins d'un jour).
find "$DESTINATION" -maxdepth 1 -type f -name 'corpus-mots-*.sql.gz.partiel' -mmin +1440 -exec rm -f {} + ||
	journal "purge des .partiel orphelins incomplète"
if [ -d "$ETAT" ]; then
	find "$ETAT" -maxdepth 1 -type f -name '*.etat' -mmin +"$MINUTES" -exec rm -f {} + ||
		journal "purge des anciens fichiers d'état incomplète"
fi

terminer succes "" "$TAILLE"
