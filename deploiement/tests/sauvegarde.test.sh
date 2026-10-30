#!/bin/sh
# Tests de deploiement/sauvegarde.sh : la matrice de la story 1.2 et ses cas limites.
# Lancement : sh deploiement/tests/sauvegarde.test.sh (Linux ou Git Bash ; dates GNU par touch -d).
# Chaque cas travaille dans un dossier temporaire : une copie du script, son .env, un faux podman
# et un faux disque externe. Sortie non nulle au premier échec.

set -u

RACINE=$(cd "$(dirname "$0")/.." && pwd) || exit 1
SCRIPT="$RACINE/sauvegarde.sh"
SECRET=secret-de-test-a-ne-jamais-journaliser
DUMP_FACTICE='-- dump factice de corpus-mots'
T=""

# Le dossier temporaire du cas en cours est supprimé même après un échec.
trap '[ -z "$T" ] || rm -rf "$T"' EXIT

echec() {
	printf 'ÉCHEC - %s : %s\n' "$CAS" "$*" >&2
	exit 1
}

ok() {
	printf 'ok - %s\n' "$CAS"
}

# Prépare un espace de travail neuf dans $T :
#   $T/deploiement/sauvegarde.sh et .env, $T/bin/podman (faux), $T/disque (avec repère),
#   $T/etat (fichiers d'état), $T/appels-podman (trace des appels au faux podman).
# Le faux podman échoue si FAUX_DUMP_ECHEC est définie ; si FAUX_DUMP_INTERRUPTION l'est, il
# envoie TERM au script, dont le test écrit le PID dans $T/pid-script.
preparer() {
	CAS=$1
	T=$(mktemp -d) || exit 1
	ETAT_DOSSIER="$T/etat"
	mkdir -p "$T/deploiement" "$T/bin" "$T/disque" "$T/etat"
	cp "$SCRIPT" "$T/deploiement/sauvegarde.sh"
	touch "$T/disque/.corpus-mots-sauvegarde"
	cat >"$T/bin/podman" <<EOF
#!/bin/sh
echo "\$*" >>"$T/appels-podman"
if [ "\$*" != "compose exec -T postgres pg_dumpall -U postgres --clean --if-exists" ]; then
	echo "faux podman : arguments inattendus : \$*" >&2
	exit 2
fi
if [ -n "\${FAUX_DUMP_ECHEC:-}" ]; then
	echo "Error: no container with name or ID \"corpus-mots-postgres-1\" found" >&2
	exit 125
fi
printf '%s\n' "$DUMP_FACTICE"
if [ -n "\${FAUX_DUMP_INTERRUPTION:-}" ]; then
	i=0
	while [ ! -s "$T/pid-script" ] && [ "\$i" -lt 20 ]; do
		sleep 1
		i=\$((i + 1))
	done
	kill -TERM "\$(cat "$T/pid-script")"
	sleep 1
	exit 143
fi
EOF
	chmod +x "$T/bin/podman"
	ecrire_env "$T/disque"
}

# .env du cas : $1 = SAUVEGARDE_DESTINATION, $2 = SAUVEGARDE_JOURS (défaut 14).
ecrire_env() {
	cat >"$T/deploiement/.env" <<EOF
POSTGRES_MOT_DE_PASSE=$SECRET
SAUVEGARDE_DESTINATION=$1
SAUVEGARDE_ETAT=$T/etat
SAUVEGARDE_JOURS=${2:-14}
EOF
}

# Crée la sauvegarde factice $1 (nom de fichier) dans le faux disque, vieille de $2 secondes.
sauvegarde_agee() {
	echo ancienne | gzip >"$T/disque/$1"
	touch -d "@$(($(date +%s) - $2))" "$T/disque/$1"
}

# Crée une sauvegarde factice vieille de $1 jours.
vieille_sauvegarde() {
	f="$T/disque/corpus-mots-ancienne-$1j.sql.gz"
	echo ancienne | gzip >"$f"
	touch -d "$1 days ago" "$f"
}

presente() {
	[ -f "$T/disque/$1" ] || echec "$1 supprimée"
}

purgee() {
	[ ! -e "$T/disque/$1" ] || echec "$1 conservée"
}

# Lance le script copié ; sortie dans $T/sortie, code dans $CODE.
lancer() {
	(cd / && PODMAN="$T/bin/podman" PATH="$T/bin:$PATH" sh "$T/deploiement/sauvegarde.sh") >"$T/sortie" 2>&1
	CODE=$?
}

# Comme lancer, mais en arrière-plan, le PID du script étant donné au faux podman.
lancer_interrompu() {
	(cd / && PODMAN="$T/bin/podman" PATH="$T/bin:$PATH" FAUX_DUMP_INTERRUPTION=1 exec sh "$T/deploiement/sauvegarde.sh") >"$T/sortie" 2>&1 &
	echo $! >"$T/pid-script"
	wait $!
	CODE=$?
}

# Fichier d'état écrit par le script (ceux que préparent les cas commencent par 2000-).
etat() {
	ETAT_FICHIER=""
	for f in "$ETAT_DOSSIER"/*.etat; do
		case $(basename "$f") in
		2000-* | '*.etat') ;;
		*) ETAT_FICHIER=$f ;;
		esac
	done
	[ -n "$ETAT_FICHIER" ] || echec "aucun fichier d'état dans $ETAT_DOSSIER"
}

# Vérifie la ligne cle=valeur $1=$2 du fichier d'état.
attendre_etat() {
	grep -qx "$1=$2" "$ETAT_FICHIER" || echec "état : $1=$2 attendu, obtenu : $(grep "^$1=" "$ETAT_FICHIER")"
}

verifier_echec() {
	[ "$CODE" -eq 1 ] || echec "code de sortie $CODE au lieu de 1 : $(cat "$T/sortie")"
	etat
	attendre_etat resultat echec
	attendre_etat cause "$1"
	attendre_etat fichier ''
	grep -qE '^date=[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$' "$ETAT_FICHIER" || echec "date ISO 8601 absente"
	verifier_secret
}

# Vérifie un succès et renvoie dans $nouvelle le nom de la sauvegarde écrite.
verifier_succes() {
	[ "$CODE" -eq 0 ] || echec "code de sortie $CODE au lieu de 0 : $(cat "$T/sortie")"
	nouvelle=""
	for f in "$T/disque"/corpus-mots-[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]_[0-9][0-9][0-9][0-9].sql.gz; do
		[ -f "$f" ] && nouvelle=$(basename "$f")
	done
	[ -n "$nouvelle" ] || echec "aucune nouvelle sauvegarde datée"
	[ "$(gzip -dc "$T/disque/$nouvelle")" = "$DUMP_FACTICE" ] || echec "contenu de la sauvegarde inattendu"
	aucun_partiel
	etat
	[ "$(basename "$ETAT_FICHIER" .etat)" = "$(basename "$nouvelle" .sql.gz | sed 's/^corpus-mots-//')" ] ||
		echec "fichier d'état $(basename "$ETAT_FICHIER") mal nommé"
	attendre_etat resultat succes
	attendre_etat fichier "$nouvelle"
	attendre_etat taille_octets "$(wc -c <"$T/disque/$nouvelle" | tr -d ' ')"
	attendre_etat cause ''
	verifier_secret
}

verifier_secret() {
	if grep -q "$SECRET" "$T/sortie" "$ETAT_DOSSIER"/*.etat 2>/dev/null; then
		echec "mot de passe présent dans le journal ou l'état"
	fi
}

aucun_partiel() {
	for f in "$T/disque"/*.partiel; do
		[ ! -e "$f" ] || echec ".partiel laissé sur le disque : $f"
	done
}

contenu_disque() {
	(cd "$T/disque" && find . | sort)
}

disque_inchange() {
	[ "$(contenu_disque)" = "$avant" ] || echec "le dossier de destination a changé"
}

podman_non_appele() {
	[ ! -e "$T/appels-podman" ] || echec "podman appelé"
}

nettoyer() {
	rm -rf "$T"
	T=""
}

# --- Nuit normale -------------------------------------------------------------------------------
preparer "nuit normale"
for jours in 1 2 3 4 5 6 7 8 9 10 11 12 13 15 16 17 18 19 20; do
	vieille_sauvegarde "$jours"
done
# Limite des 14 jours, sans âge exactement à la limite (test stable).
sauvegarde_agee corpus-mots-limite-moins.sql.gz $((14 * 86400 - 3600))
sauvegarde_agee corpus-mots-limite-plus.sql.gz $((14 * 86400 + 3600))
# .partiel orphelin d'une coupure de courant.
echo coupe >"$T/disque/corpus-mots-2000-01-01_0300.sql.gz.partiel"
touch -d "2 days ago" "$T/disque/corpus-mots-2000-01-01_0300.sql.gz.partiel"
echo autre >"$T/disque/autre-fichier.txt"
touch -d "30 days ago" "$T/disque/autre-fichier.txt"
echo ancien >"$T/etat/2000-01-01_0300.etat"
touch -d "20 days ago" "$T/etat/2000-01-01_0300.etat"
echo recent >"$T/etat/2000-01-02_0300.etat"
touch -d "2 days ago" "$T/etat/2000-01-02_0300.etat"
lancer
verifier_succes
for jours in 1 2 3 4 5 6 7 8 9 10 11 12 13; do
	presente "corpus-mots-ancienne-${jours}j.sql.gz"
done
for jours in 15 16 17 18 19 20; do
	purgee "corpus-mots-ancienne-${jours}j.sql.gz"
done
presente corpus-mots-limite-moins.sql.gz
purgee corpus-mots-limite-plus.sql.gz
purgee corpus-mots-2000-01-01_0300.sql.gz.partiel
[ -f "$T/disque/autre-fichier.txt" ] || echec "fichier étranger aux sauvegardes supprimé"
[ -f "$T/disque/.corpus-mots-sauvegarde" ] || echec "repère supprimé"
[ ! -e "$T/etat/2000-01-01_0300.etat" ] || echec "fichier d'état de 20 jours conservé"
[ -f "$T/etat/2000-01-02_0300.etat" ] || echec "fichier d'état de 2 jours supprimé"
ok
nettoyer

# --- Réglages par défaut : SAUVEGARDE_ETAT et SAUVEGARDE_JOURS absents ---------------------------
preparer "réglages par défaut"
printf 'POSTGRES_MOT_DE_PASSE=%s\nSAUVEGARDE_DESTINATION=%s\n' "$SECRET" "$T/disque" >"$T/deploiement/.env"
ETAT_DOSSIER="$T/deploiement/etat-sauvegarde"
vieille_sauvegarde 13
vieille_sauvegarde 15
lancer
verifier_succes
presente corpus-mots-ancienne-13j.sql.gz
purgee corpus-mots-ancienne-15j.sql.gz
ok
nettoyer

# --- .env avec guillemets, CRLF et commentaires de fin de ligne -----------------------------------
preparer ".env avec guillemets, CRLF et commentaires"
printf 'POSTGRES_MOT_DE_PASSE=%s\r\nSAUVEGARDE_DESTINATION="%s"\r\nSAUVEGARDE_ETAT='"'"'%s'"'"' # état\r\nSAUVEGARDE_JOURS=14 # jours\r\n' \
	"$SECRET" "$T/disque" "$T/etat" >"$T/deploiement/.env"
vieille_sauvegarde 13
vieille_sauvegarde 15
lancer
verifier_succes
presente corpus-mots-ancienne-13j.sql.gz
purgee corpus-mots-ancienne-15j.sql.gz
ok
nettoyer

# --- SAUVEGARDE_JOURS=08 : zéro de tête retiré, 8 jours (pas d'octal) ----------------------------
preparer "SAUVEGARDE_JOURS=08"
ecrire_env "$T/disque" 08
vieille_sauvegarde 7
vieille_sauvegarde 9
lancer
verifier_succes
presente corpus-mots-ancienne-7j.sql.gz
purgee corpus-mots-ancienne-9j.sql.gz
ok
nettoyer

# --- SAUVEGARDE_JOURS invalide ------------------------------------------------------------------
for jours in 0 00 abc 12345 -1; do
	preparer "SAUVEGARDE_JOURS=$jours"
	ecrire_env "$T/disque" "$jours"
	vieille_sauvegarde 1
	avant=$(contenu_disque)
	lancer
	verifier_echec configuration
	disque_inchange
	podman_non_appele
	ok
	nettoyer
done

# --- Disque absent : dossier inexistant -----------------------------------------------------------
preparer "disque absent (dossier inexistant)"
ecrire_env "$T/disque-non-monte"
lancer
verifier_echec disque_absent
[ ! -e "$T/disque-non-monte" ] || echec "dossier de destination créé"
podman_non_appele
ok
nettoyer

# --- Disque absent : point de montage vide (repère absent) ----------------------------------------
preparer "disque absent (repère absent)"
rm "$T/disque/.corpus-mots-sauvegarde"
vieille_sauvegarde 20
echo ancien >"$T/etat/2000-01-01_0300.etat"
touch -d "20 days ago" "$T/etat/2000-01-01_0300.etat"
avant=$(contenu_disque)
lancer
verifier_echec disque_absent
disque_inchange
podman_non_appele
[ -f "$T/etat/2000-01-01_0300.etat" ] || echec "fichier d'état de 20 jours purgé après un échec"
ok
nettoyer

# --- Disque plein : l'écriture du .partiel échoue -------------------------------------------------
# Faux gzip : consomme le dump, écrit un début de fichier puis échoue comme sur un disque plein.
faux_gzip_plein() {
	cat >"$T/bin/gzip" <<'EOF'
#!/bin/sh
cat >/dev/null
printf 'debut'
echo "gzip: stdout: No space left on device" >&2
exit 1
EOF
	chmod +x "$T/bin/gzip"
}

preparer "disque plein"
faux_gzip_plein
vieille_sauvegarde 20
avant=$(contenu_disque)
lancer
verifier_echec ecriture_impossible
aucun_partiel
disque_inchange
ok
nettoyer

# --- Disque plein et dump en échec ensemble : l'écriture l'emporte --------------------------------
preparer "disque plein et dump en échec"
faux_gzip_plein
vieille_sauvegarde 20
avant=$(contenu_disque)
FAUX_DUMP_ECHEC=1
export FAUX_DUMP_ECHEC
lancer
unset FAUX_DUMP_ECHEC
verifier_echec ecriture_impossible
aucun_partiel
disque_inchange
ok
nettoyer

# --- Base injoignable : pg_dumpall échoue ---------------------------------------------------------
preparer "base injoignable"
vieille_sauvegarde 20
avant=$(contenu_disque)
FAUX_DUMP_ECHEC=1
export FAUX_DUMP_ECHEC
lancer
unset FAUX_DUMP_ECHEC
verifier_echec dump_impossible
aucun_partiel
disque_inchange
ok
nettoyer

# --- Interruption pendant le dump (TERM) ----------------------------------------------------------
preparer "interruption"
vieille_sauvegarde 20
avant=$(contenu_disque)
lancer_interrompu
verifier_echec interrompu
aucun_partiel
disque_inchange
ok
nettoyer

# --- .env incomplet : SAUVEGARDE_DESTINATION vide -------------------------------------------------
preparer ".env incomplet"
ecrire_env ""
vieille_sauvegarde 20
avant=$(contenu_disque)
lancer
verifier_echec configuration
disque_inchange
podman_non_appele
ok
nettoyer

echo "Tous les cas de sauvegarde.sh passent."
