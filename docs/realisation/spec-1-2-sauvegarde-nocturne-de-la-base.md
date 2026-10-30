---
title: 'Story 1.2 : Sauvegarde nocturne de la base'
type: 'feature'
created: '2026-10-30'
status: 'done'
baseline_commit: '008baeaae9d8fdc2a153eafa43dbea3e5766aadf'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/realisation/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** rien ne protège aujourd'hui les données de l'équipe : une panne du mini-PC ou une erreur de manipulation ferait tout perdre (NFR-8).

**Approach:** un script `deploiement/sauvegarde.sh`, lancé chaque nuit par un timer systemd utilisateur, écrit un `pg_dumpall` compressé et daté des deux bases sur le disque externe, garde 14 jours, consigne le résultat dans un fichier d'état daté ; la restauration est décrite pas à pas dans `deploiement/`.

## Boundaries & Constraints

**Always:**
- Bash POSIX (pas de bashismes non portables), lancé depuis n'importe quel répertoire ; réglages lus dans `deploiement/.env` : `SAUVEGARDE_DESTINATION` (dossier sur le disque externe, obligatoire), `SAUVEGARDE_ETAT` (dossier des fichiers d'état, sur le disque système, défaut `deploiement/etat-sauvegarde/`), `SAUVEGARDE_JOURS` (défaut 14).
- Disque présent = `SAUVEGARDE_DESTINATION` existe et contient le fichier repère `.corpus-mots-sauvegarde` (créé à l'installation) : un point de montage vide n'est jamais pris pour le disque.
- Dump : `podman compose exec -T postgres pg_dumpall -U postgres --clean --if-exists`, compressé par `gzip`, écrit d'abord en `.partiel` puis renommé `corpus-mots-AAAA-MM-JJ_HHMM.sql.gz` seulement si `pg_dumpall` et `gzip` ont réussi (code de sortie des deux étapes vérifié).
- Fichier d'état `AAAA-MM-JJ_HHMM.etat` dans `SAUVEGARDE_ETAT`, lignes `cle=valeur` : `date` (ISO 8601), `resultat` (`succes` | `echec`), `fichier`, `taille_octets`, `cause` (vide en cas de succès). Les fichiers d'état de plus de `SAUVEGARDE_JOURS` jours sont aussi purgés. Code de sortie du script : 0 si succès, 1 sinon.
- Purge des sauvegardes de plus de `SAUVEGARDE_JOURS` jours **seulement après** une sauvegarde réussie, et seulement des fichiers `corpus-mots-*.sql.gz` du dossier de destination.
- Aucun mot de passe ni contenu de base dans les journaux ou le fichier d'état.

**Never:**
- Pas de chiffrement, pas de copie hors site (reportés par l'architecture), pas de test complet de restauration (Epic 6).
- Ne jamais supprimer de sauvegarde quand la sauvegarde du jour a échoué.
- Pas de `cron` ni de service root : timer systemd **utilisateur** (même utilisateur que Podman rootless).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Nuit normale | disque présent, postgres répond, sauvegardes de 1 à 20 jours | nouveau `.sql.gz` ; celles de plus de 14 jours supprimées ; état `succes` + taille | N/A |
| Disque absent | repère `.corpus-mots-sauvegarde` absent ou dossier inexistant | aucun fichier écrit ni supprimé | état `echec`, `cause=disque_absent`, sortie 1 |
| Disque plein | écriture du `.partiel` échoue | `.partiel` supprimé, aucune sauvegarde existante supprimée | état `echec`, `cause=ecriture_impossible`, sortie 1 |
| Base injoignable | `pg_dumpall` échoue (conteneur arrêté) | `.partiel` supprimé, rien d'autre ne change | état `echec`, `cause=dump_impossible`, sortie 1 |
| `.env` incomplet | `SAUVEGARDE_DESTINATION` vide | rien n'est fait | état `echec`, `cause=configuration`, sortie 1 |

</frozen-after-approval>

## Code Map

- `deploiement/compose.yaml` -- service `postgres` (superutilisateur `postgres`, connexion locale sans mot de passe dans le conteneur) : ne pas modifier.
- `deploiement/.env.exemple` -- ajouter la section « Sauvegarde ».
- `deploiement/README.md` -- ajouter « Sauvegarde » (installation du repère et du timer) et un lien vers la restauration.
- `.gitignore` -- ajouter `deploiement/etat-sauvegarde/`.
- `.github/workflows/ci.yml` -- job `configuration` (ubuntu, Podman) : y ajouter `shellcheck` et le test du script.
- Continuité 1.1 : rôles `corpusmots`/`keycloak` créés par `postgres/init-keycloak.sh` ; `pg_dumpall --clean --if-exists` les recrée à la restauration.

## Tasks & Acceptance

**Execution:**
- [x] `deploiement/sauvegarde.sh` -- script décrit ci-dessus, exécutable (`git update-index --chmod=+x`) ; commande `podman` surchargeable par la variable `PODMAN` (pour les tests) -- story.
- [x] `deploiement/systemd/corpus-mots-sauvegarde.service`, `deploiement/systemd/corpus-mots-sauvegarde.timer` -- service `oneshot` lançant le script depuis le clone ; timer quotidien à 03:00, `Persistent=true` (rattrape une nuit où la machine était éteinte) -- planification.
- [x] `deploiement/tests/sauvegarde.test.sh` -- un cas par ligne de la matrice, avec un faux `podman` (script dans un dossier temporaire) et des dossiers temporaires ; dates de fichiers vieillies par `touch -d` ; sortie non nulle au premier échec -- matrice.
- [x] `deploiement/RESTAURATION.md` -- pas à pas : arrêter `back` et `keycloak`, `gunzip -c <fichier> | podman compose exec -T postgres psql -U postgres -d postgres`, redémarrer, vérifier ; restauration sur un volume neuf -- AC restauration.
- [x] `deploiement/.env.exemple`, `deploiement/README.md`, `.gitignore` -- variables, installation (`touch <disque>/.corpus-mots-sauvegarde`, copie des unités dans `~/.config/systemd/user/`, `systemctl --user enable --now corpus-mots-sauvegarde.timer`), lecture de l'état -- exploitation.
- [x] `.github/workflows/ci.yml` -- `shellcheck deploiement/*.sh deploiement/tests/*.sh deploiement/postgres/*.sh` puis `sh deploiement/tests/sauvegarde.test.sh` -- CI.

**Acceptance Criteria:**
- Given le timer installé, when `systemctl --user list-timers` s'exécute, then `corpus-mots-sauvegarde.timer` est planifié chaque nuit.
- Given la CI, when le job `configuration` s'exécute, then shellcheck ne signale rien et tous les cas de `sauvegarde.test.sh` passent.
- Given `deploiement/RESTAURATION.md`, when Paul le suit, then chaque étape est une commande copiable, de l'arrêt des services à la vérification.

## Implementation Notes

- `.env` n'est jamais « sourcé » : `sauvegarde.sh` n'en lit que les trois clés `SAUVEGARDE_*` (guillemets et CR tolérés). Il se place dans son propre dossier, si bien que les tests en lancent une copie dans un dossier temporaire avec son `.env`, sans toucher au vrai.
- POSIX sh sans `PIPESTATUS` : le code de sortie de `pg_dumpall` passe par un fichier temporaire ; un échec de `gzip` est classé `ecriture_impossible` avant d'examiner le dump (un disque plein fait aussi échouer le dump par SIGPIPE).
- « Plus de N jours » = `find -mmin +N*1440` (garde la sauvegarde du jour et les 13 précédentes à 14 jours). Les fichiers d'état ne sont purgés qu'après une sauvegarde réussie, pour garder la trace de la dernière réussite pendant une longue absence du disque.
- Disque plein simulé dans le test par un faux `gzip` placé en tête du `PATH` (portable, contrairement à `/dev/full` ou `chmod` sous Git Bash).
- Dates : nom des fichiers en heure locale (`AAAA-MM-JJ_HHMM`), champ `date` de l'état en ISO 8601 UTC.
- Unités systemd : `ExecStart=/bin/sh %h/corpus-mots/deploiement/sauvegarde.sh` (clone supposé dans `~/corpus-mots`, à adapter sinon, documenté dans le README).

## Spec Change Log

## Review Triage Log

Passe 1 (Blind Hunter = BH, Edge Case Hunter = EC, Verification Gap = VG).

| # | Source | Constat | Verdict | Preuve | Route |
|---|--------|---------|---------|--------|-------|
| 1 | BH, EC | Purge à l'âge seul : après plus de 14 jours d'échecs, la première réussite supprime toutes les anciennes sauvegardes | false | Comportement voulu par l'intention figée (purge des sauvegardes de plus de 14 jours) et par la promesse de conservation de 14 jours au plus pour les comptes supprimés ; garder un nombre minimal violerait cette promesse | rejeté (signalé à Paul) |
| 2 | BH, EC | Deux exécutions simultanées sans verrou | low | Collision seulement dans la même minute (timer 03:00 contre lancement manuel) ; verrou = nouvelle branche | rejeté |
| 3 | BH | Sauvegardes lisibles par tous (umask par défaut) | medium | Aucun `umask` dans le script ; le dump contient les hachés de mots de passe et toutes les données | patch |
| 4 | BH, EC, VG | Exécution interrompue (TERM/HUP/INT) : aucun fichier d'état ; `.partiel` orphelins jamais purgés | medium | `trap 'exit 1' HUP INT TERM` sans `terminer` ; purge limitée à `corpus-mots-*.sql.gz` | patch |
| 5 | BH, EC | Service `oneshot` sans délai maximal : un `exec` bloqué empêche les nuits suivantes | medium | Pas de `TimeoutStartSec` dans `corpus-mots-sauvegarde.service` | patch |
| 6 | BH | Aucune alerte en cas d'échec répété | medium | Seul le fichier d'état trace l'échec ; non demandé par la story | defer |
| 7 | BH | Dump vide accepté comme succès | low | Hypothétique : `podman compose exec` propage le code de `pg_dumpall` ; contrôle = nouvelle branche | rejeté |
| 8 | BH | `SAUVEGARDE_JOURS` > 14 casse la promesse de conservation sans avertissement | low | `.env.exemple` ne le signale pas ; correction = une ligne de commentaire | patch |
| 9 | EC, VG | `SAUVEGARDE_JOURS=00` passe la garde et purge tout, y compris la sauvegarde du soir ; `08`/`09` font planter l'arithmétique après le dump ; valeurs énormes débordent | high | Vérifié : `$((00 * 1440))` = 0 → `-mmin +0` ; `$((08))` → « value too great for base » | patch |
| 10 | EC | Commentaire en fin de ligne dans `.env` (`… # jours`) lu comme valeur | low | `lire_reglage` ne retire pas `[[:space:]]#…` ; correction = une expression `sed` | patch |
| 11 | EC | Rattrapage `Persistent=true` au démarrage avant le montage du disque ou le conteneur postgres : échec sans nouvel essai | medium | Le rattrapage part dès le démarrage ; aucune relance dans l'unité | patch |
| 12 | BH, EC | `RESTAURATION.md` étape 2 (`./sauvegarde.sh`) peut purger la sauvegarde choisie à l'étape 1 | medium | La sauvegarde de sécurité déclenche la purge des fichiers de plus de 14 jours | patch |
| 13 | BH, EC | Chemins `etat-sauvegarde/` et `/media/sauvegarde/…` écrits en dur dans la documentation | low | `SAUVEGARDE_ETAT` réglable ; correction = préciser d'adapter le chemin | patch |
| 14 | BH, EC | Dossiers temporaires des tests non supprimés en cas d'échec | low | `echec` sort sans `nettoyer` | patch |
| 15 | VG, BH | Cas non testés : `SAUVEGARDE_JOURS` invalide, disque plein et dump en échec ensemble, réglages par défaut, `.env` avec guillemets et CRLF, états conservés après un échec, limite des 14 jours | medium | Mutations du script non détectées par la suite (rapport VG) | patch |
| 16 | EC | Limite des 14 jours variable selon l'heure de fin du dump | low | Écart de quelques minutes autour de la limite, sans effet sur la promesse | rejeté |
| 17 | BH | `AGENTS.md` ne cite pas le test de sauvegarde ni shellcheck | low | Section « Lancer et vérifier » inchangée ; fichier d'instructions des agents | defer |
| 18 | BH | `sprint-status.yaml` absent du diff | false | Exclu volontairement du diff de revue (suivi de workflow) | rejeté |

## Verification

**Commands:**
- `sh deploiement/tests/sauvegarde.test.sh` -- expected: tous les cas « ok », code 0 (Git Bash ou Linux).
- CI au push : shellcheck et test verts dans le job `configuration`.

**Manual checks (if no CLI):**
- Sur le mini-PC : lancer `systemctl --user start corpus-mots-sauvegarde.service`, vérifier le `.sql.gz` sur le disque et le fichier d'état.
