---
title: 'Story 1.4 : Coquille de l''application et système de design (composants partagés et messages d''erreur)'
type: 'feature'
created: '2026-11-03'
status: 'done'
baseline_commit: '506a1a29184ca9eb98290f0b208534c59e784196'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/realisation/epic-1-context.md'
  - '{project-root}/docs/realisation/spec-1-4-coquille-de-l-application-et-systeme-de-design.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** les stories 1.5 et suivantes ont besoin des composants partagés de `commun/` (Bandeau « Annuler », Bandeau d'erreur, Dialogue de confirmation, squelettes de chargement) et d'un service qui traduit chaque `code` d'erreur du back en message français ; rien de cela n'existe (UX-DR-13, 14, 22, 37).

**Approach:** livrer ces quatre composants dans `front/src/app/commun/`, construits sur Angular Material et les jetons de la première partie, chacun avec ses tests de composant, plus une fonction de traduction des erreurs HTTP que la coquille réutilise pour ses messages de compte.

## Boundaries & Constraints

**Always:**
- Bandeau « Annuler » : snackbar Material, fond `on-surface`, texte `background`, action « Annuler » en `primary-container` ; 8 s de décompte, suspendu tant que le pointeur le survole ou que le focus y est ; un seul à la fois (un nouveau remplace l'ancien, dont l'opération reste faite) ; message annoncé aux lecteurs d'écran ; « Annuler » appelle l'opération inverse fournie par l'appelant puis ferme le bandeau.
- Bandeau d'erreur : bannière `error-container` / `on-error-container`, icône d'alerte, message, action texte « Réessayer » en `error`, bouton « Fermer » ; `role="alert"` ; reste affiché tant que le parent le garde ; ne touche pas à la saisie de la page.
- Dialogue de confirmation : dialogue Material (`surface`, `rounded.xl`, `elevation.2`) avec titre, phrase, « Annuler » (focus initial, bouton par défaut) et bouton de confirmation `error` / `on-error` au libellé fourni (verbe à l'infinitif) ; Échap, « Annuler » ou clic hors du dialogue → refus.
- Squelettes : blocs `surface-container-high` arrondis, en forme de carte, de ligne ou de texte, animation désactivée sous `prefers-reduced-motion` ; masqués aux lecteurs d'écran, le conteneur annonçant « Chargement ».
- Traduction : un `code` connu → son message ; un `code` inconnu → message selon le statut HTTP ; statut `0` (réseau) → message de connexion. Toutes les valeurs de style passent par les jetons (`verifier-jetons`).

**Décisions (Paul, 2026-11-03) :**
- Seconde partie de la story 1.4, spec gardée entière (~2 000 tokens).
- Textes des messages : `authentification.requise` « Session expirée. Reconnectez-vous : votre saisie est conservée. » ; `compte.inconnu_ou_inactif` « Votre compte n'est pas actif. Adressez-vous à l'administrateur de l'école. » ; `acces.refuse` « Cette action est réservée à l'administrateur. » ; `ressource.introuvable` « Cet élément n'existe plus. Rechargez la page. » ; `requete.invalide` « La demande est incomplète. Vérifiez la saisie, puis réessayez. » ; `requete.trop_volumineuse` « Envoi trop volumineux : 20 Mo au plus par fichier, 100 Mo par envoi. » ; `format.non_supporte` « Format de fichier non pris en charge. » ; `erreur.interne`, `format.non_acceptable`, `methode.non_autorisee` et tout autre cas « Le service ne répond pas comme prévu. Réessayez dans un instant. » ; réseau (statut `0`) « Connexion au serveur impossible. Vérifiez votre réseau, puis réessayez. »
- Code absent ou inconnu : le statut choisit le message du code correspondant (`401`, `403`, `404`, `400`/`422`, `413`, `415`), sinon le message « Le service ne répond pas comme prévu… ».

**Never:**
- Pas d'écran qui utilise ces composants (Administration › Comptes : 1.5) ; pas de changement du back ni du contrat OpenAPI (le typage de `ProblemeDto` dans le contrat reste dans `deferred-work.md`).
- Pas de décompte chiffré visible ; pas de file d'attente de bandeaux ; pas de Dialogue de retrait (Epic 6).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Annuler à temps | bandeau affiché, clic « Annuler » à 5 s | opération inverse appelée une fois, bandeau fermé | N/A |
| Délai écoulé | aucune interaction pendant 8 s | bandeau fermé, opération inverse jamais appelée | N/A |
| Survol ou focus | pointeur dessus de 3 s à 20 s | pas de fermeture pendant le survol ; fermeture 5 s après la sortie | N/A |
| Second bandeau | nouveau bandeau pendant le premier | le premier disparaît sans annuler ; seul le second est actif | N/A |
| Réessayer | clic « Réessayer » sur le Bandeau d'erreur | événement `reessayer` émis ; bandeau toujours affiché | N/A |
| Confirmation | Échap / « Annuler » / bouton grave | `false` / `false` / `true` | N/A |
| Code connu | `403 compte.inconnu_ou_inactif` | « Votre compte n'est pas actif. Adressez-vous à l'administrateur de l'école. » | N/A |
| Code inconnu | `409 autre.code` ; `404` sans code | « Le service ne répond pas comme prévu. Réessayez dans un instant. » ; message de `ressource.introuvable` | N/A |
| Réseau | statut `0` | message de connexion impossible | N/A |

</frozen-after-approval>

## Code Map

- `back/src/main/java/fr/corpusmots/commun/api/ErreursMappers.java`, `ProblemeDto.java` -- source des codes (`acces.refuse`, `authentification.requise`, `compte.inconnu_ou_inactif`, `erreur.interne`, `format.non_acceptable`, `format.non_supporte`, `methode.non_autorisee`, `requete.invalide`, `requete.trop_volumineuse`, `ressource.introuvable`) ; corps `{ type, title, status, detail, code }`. Lecture seule.
- `front/src/app/commun/compte-courant.ts` -- `estCompteInactif` lit déjà `erreur.error.code` ; à réutiliser par la traduction plutôt que dupliquer.
- `front/src/app/coquille/coquille.ts` -- messages « compte inactif » et « non chargé » écrits en dur : les tirer de la traduction (même texte).
- `front/src/app/commun/icones.ts` -- registre `TRACES` + type `Icone` : ajouter `alerte` (triangle) et `fermer` (`i-close` de `key-accueil.html` : `M6 6l12 12M18 6 6 18`).
- `front/src/styles/_jetons.scss` -- ajouter les jetons propres aux composants (durée 8 s, tailles) ; `styles.scss` pour les surcharges Material des surcouches (`mat.snack-bar-overrides`, `mat.dialog-overrides`), comme `mat.menu-overrides`.
- `front/scripts/verifier-jetons.mjs` -- doit rester vert.
- Tests : motif `MATERIAL_ANIMATIONS` `animationsDisabled`, `vi.useFakeTimers()` pour les 8 s ; `angular.json` a `isolate: true`.

## Tasks & Acceptance

**Execution:**
- [x] `front/src/app/commun/erreurs/message-erreur.ts` (+ `.spec.ts`) -- `messageErreur(erreur: unknown): string` et `codeErreur(erreur): string | null` ; table des codes ; test qui parcourt chaque code du back et chaque ligne de la matrice -- UX-DR-37.
- [x] `front/src/app/commun/compte-courant.ts`, `coquille/coquille.ts` -- utiliser `codeErreur` et `messageErreur` ; tests existants inchangés et verts.
- [x] `front/src/app/commun/bandeau-annuler/` (`bandeau-annuler.ts` service `afficher(message, annuler)`, composant du snackbar, `.scss`, `.spec.ts`) -- minuterie propre, pause au survol et au focus, un seul à la fois -- UX-DR-13.
- [x] `front/src/app/commun/bandeau-erreur/` (`bandeau-erreur.ts`, `.scss`, `.spec.ts`) -- entrée `message`, sorties `reessayer` et `fermer` -- UX-DR-14.
- [x] `front/src/app/commun/dialogue-confirmation/` (`dialogue-confirmation.ts` service `confirmer({ titre, phrase, libelleConfirmer }): Promise<boolean>`, composant, `.scss`, `.spec.ts`) -- focus initial sur « Annuler ».
- [x] `front/src/app/commun/squelette/` (`squelette.ts`, `.scss`, `.spec.ts`) -- entrées `forme` (`carte` | `ligne` | `texte`) et `nombre` -- UX-DR-22.
- [x] `front/src/app/commun/icones.ts`, `front/src/styles/_jetons.scss`, `front/src/styles.scss` -- icônes `alerte`, `fermer` ; jetons et surcharges Material des surcouches.

**Acceptance Criteria:**
- Given chaque composant, when `npm test` s'exécute, then ses tests de composant couvrent la matrice et passent, `verifier-jetons` compris.
- Given le Bandeau « Annuler » ou le Bandeau d'erreur affiché, when un lecteur d'écran est actif, then le message est annoncé (`LiveAnnouncer` ou `role="alert"`).
- Given le Dialogue de confirmation ouvert, when l'enseignant presse Entrée sans rien toucher, then le dialogue se ferme par un refus (focus sur « Annuler »).

## Implementation Notes

- Durée de 8 s : constante `DUREE_BANDEAU_ANNULER_MS` dans `bandeau-annuler.ts` (comportement lu par la minuterie), non dupliquée en jeton CSS ; `_jetons.scss` ne porte que les jetons de style (largeur du dialogue, hauteurs, pulsation et opacité des squelettes).
- Bandeau « Annuler » : minuterie propre (la `duration` du snackbar ne se suspend pas), reprise avec le temps restant ; un seul à la fois par le comportement natif de `MatSnackBar` ; annonce par `LiveAnnouncer` (`politeness: 'off'` sur le snackbar pour ne pas annoncer deux fois). `afficher` ne rend rien.
- Dialogue de confirmation : `autoFocus` par sélecteur CSS sur « Annuler » (le mode `first-tabbable` repose sur la géométrie, absente sous jsdom) ; `role="alertdialog"`.
- Coquille : message « compte non chargé » exporté par `message-erreur.ts` (`MESSAGE_COMPTE_NON_CHARGE`), le message « compte inactif » lu dans `MESSAGES_PAR_CODE`. `estCompteInactif` ne teste plus le statut `403`, seulement le `code`.
- Squelette : `nombre` par défaut 3, `forme` par défaut `ligne` ; dernier bloc `texte` raccourci quand il y en a plusieurs.

## Spec Change Log

## Review Triage Log

Passe 1 (Blind Hunter = BH, Edge Case Hunter = EC, Verification Gap = VG).

| # | Source | Constat | Verdict | Preuve | Route |
|---|--------|---------|---------|--------|-------|
| 1 | VG, BH | `politeness: 'off'` du snackbar jamais vérifié : double annonce possible sans test rouge | low | Le spec simule `LiveAnnouncer` et ne lit pas `aria-live` du conteneur | patch |
| 2 | BH, EC | Opération inverse qui lève une exception : bandeau ouvert pour toujours, « Annuler » mort | medium | `termine` et `suspendre()` passent avant `donnees.annuler()` ; `dismissWithAction()` jamais atteint | patch (`try/finally`) |
| 3 | EC | Opération inverse asynchrone rejetée : rejet non traité, bandeau fermé comme si l'annulation avait réussi | low | Signaler l'échec revient à l'appelant (Bandeau d'erreur) ; correctif = nouvelle branche | rejeté |
| 4 | BH | Bandeau « Annuler » peu atteignable au clavier (EXPERIENCE.md : « atteignable au clavier ») | low | La surcouche suit l'application dans l'ordre de tabulation et le focus suspend le décompte ; un raccourci serait une fonctionnalité nouvelle | rejeté |
| 5 | BH, EC | Corps d'erreur `Blob` ou texte (téléchargements) : `code` perdu, message tiré du statut | low | Aucun appel `responseType: 'blob'` aujourd'hui ; à traiter avec les exports (Epic 4) | defer |
| 6 | BH, EC | `alertdialog` sans `aria-describedby` : la phrase peut ne pas être lue | medium | `MatDialog` ne relie que le titre | patch |
| 7 | BH | « Réessayer » affiché même quand réessayer ne sert à rien | false | DESIGN.md et EXPERIENCE.md prévoient toujours « Réessayer » ; l'appelant choisit d'afficher le bandeau | rejeté |
| 8 | BH | `role="alert"` englobe les boutons : « Réessayer Fermer » annoncé | low | Vérifié dans le gabarit ; correctif direct | patch |
| 9 | BH | Test « saisie intacte » sans portée | low | Le composant ne peut pas toucher la saisie ; test sans risque | rejeté |
| 10 | BH | `panelClass` mort ; surcharges du snackbar et du dialogue globales | low | Classe sans style : supprimée ; global voulu, DESIGN.md donne le même traitement à tous les dialogues et le seul snackbar est le Bandeau « Annuler » | patch (classe supprimée) |
| 11 | BH | Liste des codes du back recopiée dans le test : dérive possible | low | Report existant (spec 1.3) : typer `ProblemeDto.code` dans le contrat OpenAPI | rejeté |
| 12 | BH, EC | Région `role="status"` du squelette insérée déjà remplie : « Chargement » peut ne pas être annoncé ; régions multiples | maybe-false | Dépend du lecteur d'écran ; à vérifier avec NVDA au premier usage (1.5) | defer |
| 13 | BH | Raccourcissement du dernier bloc `texte` lié à l'ordre du DOM, non testé | low | Purement visuel | rejeté |
| 14 | BH | Focus perdu quand un second bandeau remplace un premier focalisé ; minuterie lancée avant l'animation | low | Cas rare ; ~150 ms sur 8 s | rejeté |
| 15 | BH | Message 401 « votre saisie est conservée » sans mécanisme qui la conserve | medium | Depuis 1.3, session expirée → Connexion → rechargement de la page : la saisie est perdue | defer |
| 16 | BH | `restoreFocus: true` redondant ; commentaire « 403 du back » | low | Cosmétique ; le commentaire reste vrai | rejeté |
| 17 | EC | Survol du rembourrage de la surface hors de l'hôte ; pointeur immobile à l'ouverture | low | Cas marginaux ; correctif = écouteurs sur l'ancêtre | rejeté |
| 18 | EC | Nouvel échec de « Réessayer » avec le même message : pas de nouvelle annonce | low | Correctif = compteur ou annonce explicite, à décider avec le premier écran (1.5) | rejeté |
| 19 | EC | `nombre` infini ou très grand | false | Valeur fixée par le développeur dans un gabarit | rejeté |
| 20 | EC | `focusout` au déplacement du contenu par le snackbar (~150 ms) | maybe-false | Confiance faible ; au pire le décompte reprend, sans effet grave | rejeté |

## Verification

**Commands:**
- `cd front && npm test -- --watch=false` -- expected: tests verts, `verifier-jetons` passé.
- `cd front && npm run build` -- expected: build sans erreur ni avertissement de budget.
