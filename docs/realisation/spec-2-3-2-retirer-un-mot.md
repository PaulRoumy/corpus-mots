---
title: 'Story 2.3, partie 2 : Retirer un Mot de la Préparation'
type: 'feature'
created: '2026-11-11'
status: 'done'
baseline_commit: 'e8049c47e76ad0446c794e51f7c636318ad70611'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/realisation/epic-2-context.md'
  - '{project-root}/docs/realisation/spec-2-3-saisir-des-mots-en-serie.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Un Mot ajouté par erreur à une Préparation ne peut plus en sortir (story 2.3, UX-DR-28).

**Approach:** Chaque Carte de Mot propose « Retirer ». La Carte disparaît sans confirmation ; `preparations` supprime la ligne et libère le Mot par `Usages.libererPreparationMot` dans la même transaction. Un Bandeau « Annuler » de 8 s permet de rétablir le Mot avec son Sens, à sa place.

Partie 2 de la story 2.3, découpée par Paul ; le Thème de chaque Mot (partie 3) reste dans `deferred-work.md`.

## Boundaries & Constraints

**Always:**
- Seul le propriétaire retire ou rétablit un Mot de sa Préparation (`404 ressource.introuvable` sinon, y compris pour un Mot de Préparation d'une autre Préparation).
- Retirer supprime `preparation_mot` et son `sens_retenu` dans une seule transaction ; le Mot et ses Sens restent dans le Lexique.
- Rétablir reprend le Mot et le Sens qu'il avait, à sa place d'origine si elle est libre, sinon en fin ; le Sens doit appartenir à ce Mot (`400 preparation.sens_invalide`) ; un Mot revenu entre-temps donne `409 preparation.mot_deja_present`.
- Chaque nouveau `code` d'erreur est traduit dans `MESSAGES_PAR_CODE`.

**Never:**
- Pas de retrait en lot, de sélection ni de Barre d'actions (plus tard) ; pas de Dialogue de confirmation.
- `vocabulaire` n'appelle jamais `preparations`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Retirer | `DELETE /api/preparations/{id}/mots/{motPreparationId}` | 200 avec `motId`, `forme`, Sens et `ordre` du Mot retiré ; plus de `preparation_mot` ni de `sens_retenu` ; `nombreMots` − 1 | — |
| Rétablir | `POST /api/preparations/{id}/mots/retablissement {motId, sensId, ordre}` | 201 Mot de Préparation avec ce Sens, à cet `ordre` | — |
| Place prise | `ordre` déjà occupé | 201, Mot placé en fin | — |
| Sens étranger | `sensId` d'un autre Mot, ou inconnu | 400 `preparation.sens_invalide`, rien n'est ajouté | — |
| Mot revenu | le Mot est de nouveau dans la Préparation | 409 `preparation.mot_deja_present`, rien n'est ajouté | — |
| Introuvable | Préparation d'un collègue, Mot de Préparation inconnu ou d'une autre Préparation, Mot inconnu | 404 `ressource.introuvable`, rien n'est modifié | — |

</frozen-after-approval>

## Code Map

- `back/src/main/java/fr/corpusmots/preparations/service/PreparationsService.java` -- `ajouterMot` (verrou `PreparationRepository.verrouillee`, ordre de refus 404 → 400 → 409, `usages.retenirSens`), `motsDe`, `nombreMots` : modèles de `retirerMot` et `retablirMot`.
- `back/src/main/java/fr/corpusmots/preparations/persistance/{PreparationMot,PreparationMotRepository}.java` -- `dernierOrdre`, `contient`, unique `(preparation_id, ordre)`.
- `back/src/main/java/fr/corpusmots/vocabulaire/service/{Usages,Lexique,RetenirSensCommande}.java`, `persistance/SensRetenuRepository.java` -- `retenirSens` choisit le Sens lui-même ; `Lexique.mots`, `sensRetenus`.
- `back/src/main/java/fr/corpusmots/preparations/api/{PreparationsResource,MotPreparationDto}.java`, `test/.../preparations/api/MotsPreparationResourceTest.java` -- Resource et tests à étendre.
- `front/src/app/preparations/{carte-mot,preparation}.ts` -- Carte (`mot` en entrée, état « à illustrer »), Grille, compteur, file d'ajouts, Bandeaux d'erreur.
- `front/src/app/commun/bandeau-annuler/bandeau-annuler.ts` -- `BandeauAnnuler.afficher(message, annuler)` : 8 s, pause au survol et au focus, annonce, un seul à la fois (un nouveau ferme le précédent sans l'annuler).

## Tasks & Acceptance

**Execution:**
- [x] `back/src/main/java/fr/corpusmots/vocabulaire/service/{Usages,RetenirSensCommande}.java` + `SensRetenuRepository` -- `libererPreparationMot(preparationMotId)` (supprime son `sens_retenu`) ; `retenirSens` accepte un `sensId` imposé, vérifié comme Sens de ce Mot (sinon exception métier `400 preparation.sens_invalide` levée par `preparations` à partir d'une vérification exposée par `Lexique`).
- [x] `back/src/main/java/fr/corpusmots/preparations/{service,persistance,api}/` -- `retirerMot(id, motPreparationId)` et `retablirMot(id, commande)` sous le verrou de la Préparation ; `DELETE /preparations/{id}/mots/{motPreparationId}` (`retirerMotPreparation`) et `POST /preparations/{id}/mots/retablissement` (`retablirMotPreparation`, corps nul → `requete.invalide`).
- [x] `back/src/test/java/fr/corpusmots/preparations/api/MotsPreparationResourceTest.java` -- une ligne de test par ligne de la matrice, avec relecture en base de `preparation_mot` et `sens_retenu` ; retirer puis rétablir rend la liste identique (ordre et Sens).
- [x] `front/openapi/` -- régénérer et versionner.
- [x] `front/src/app/preparations/carte-mot.ts` (+ `.scss`, spec) -- bouton icône « Retirer « forme » de la préparation » (croix), toujours visible, sortie `retirer`.
- [x] `front/src/app/preparations/preparation.ts` (+ spec) -- retrait : la Carte disparaît aussitôt, le compteur suit, le focus passe au bouton « Retirer » de la Carte suivante, sinon de la précédente, sinon au Champ de saisie rapide ; `BandeauAnnuler` « « forme » retiré de la préparation. » dont « Annuler » rétablit le Mot à sa place dans la Grille. Échec du retrait : la Carte revient à sa place et un Bandeau d'erreur propose « Réessayer » ; échec du rétablissement : Bandeau d'erreur avec « Réessayer » (sauf 409, message seul).
- [x] `front/src/app/commun/erreurs/message-erreur.ts` + spec -- `preparation.sens_invalide` « Ce sens n'appartient pas à ce mot. ».

**Acceptance Criteria:**
- Given une Carte « citrouille », when l'enseignant choisit « Retirer », then elle disparaît sans confirmation, le compteur baisse et le Bandeau « Annuler » s'affiche 8 s.
- Given ce Bandeau, when l'enseignant choisit « Annuler », then « citrouille » revient à sa place avec son Sens, et y reste après rechargement.
- Given le clavier seul, then on retire une Carte et on l'annule sans souris, et le focus ne se perd jamais.

## Implementation Notes

- Ordre des refus de `POST …/mots/retablissement` : 404 (Préparation verrouillée, puis Mot inconnu ou `motId` absent), 400 `preparation.sens_invalide` (Sens inconnu, d'un autre Mot ou absent), 409. `ordre` absent ou inférieur à 1 vaut place prise : le Mot va en fin. Les places ne sont jamais renumérotées : le trou laissé par un retrait est la place que reprend le rétablissement.
- `DELETE` renvoie un `MotPreparationDto` (même forme que l'ajout). `Lexique.sensDuMot(motId, sensId)` sert la vérification de `preparations` ; `Usages.retenirSens` lève `IllegalArgumentException` si on lui impose malgré tout un Sens étranger. `RetenirSensCommande` garde un constructeur sans `sensId` pour l'ajout.
- Front : `BandeauErreur` reçoit une entrée `reessayable` (vrai par défaut) pour le 409 du rétablissement, message seul. Le rétablissement part vers la Préparation du retrait même si l'enseignant en a ouvert une autre entre-temps ; la page n'en écrit alors rien. Après un échec du rétablissement, si le focus est perdu (Bandeau « Annuler » ou « Réessayer » disparu), il revient au Champ de saisie rapide.

## Spec Change Log

## Review Triage Log

Revue 1 (Blind Hunter BH, Edge Case Hunter EC, Verification Gap VG).

| # | Constat | Verdict | Preuve | Suite |
|---|---------|---------|--------|-------|
| 1 | VG autre, BH-13 : « Annuler » cliqué après l'ouverture d'une autre Préparation insère le Mot rétabli dans la Grille de celle-ci | medium | `retablirMot` lit le numéro de chargement au clic, pas au retrait | patch |
| 2 | VG-1 : gardes de page d'un retrait en échec et d'un rétablissement après changement de Préparation non testées | medium | Constat vérifié par la couche VG | patch |
| 3 | VG-2 : plusieurs retraits en échec et « Réessayer » groupé non testés | medium | Constat vérifié par la couche VG | patch |
| 4 | VG-3, BH-15a : repli du focus après un rétablissement en échec jamais exercé | medium | Constat vérifié par la couche VG | patch |
| 5 | VG-4, BH-6 : `ordre` absent ou inférieur à 1 au rétablissement non testé | medium | Constat vérifié par la couche VG | patch |
| 6 | BH-7, EC-2 : le client peut imposer n'importe quel Sens du Mot | false | Choix consigné dans les Design Notes et approuvé : les identifiants de Sens des collègues ne sont jamais montrés (AD-2) | rejeté |
| 7 | EC-1 : `ordre` démesuré au rétablissement, débordement à l'ajout suivant | low | Seulement par une requête forgée, sur sa propre Préparation | rejeté |
| 8 | BH-2, EC-3 : un retrait répondu 404 remet la Carte et « Réessayer » échoue toujours | low | Deux onglets sur la même Préparation ; recharger rétablit la Grille | rejeté |
| 9 | BH-1, EC-4 : « Réessayer » proposé après un 404 ou un 400 de rétablissement | low | Refus inatteignables depuis l'interface avant 2.10 | rejeté |
| 10 | BH-3 : deux retraits de suite, seul le dernier peut être annulé | false | Un seul Bandeau « Annuler » à la fois (EXPERIENCE.md, composant partagé) | rejeté |
| 11 | BH-4, EC-6 : doublon dans la liste des retraits en échec | low | Il faut retirer de nouveau une Carte remise au lieu de « Réessayer », puis échouer encore | rejeté |
| 12 | BH-5 : `motId` absent donne 404, `sensId` absent 400 | low | Requête forgée ; sans effet pour l'enseignant | rejeté |
| 13 | BH-8 : `retirerMot` ne garde pas un Sens retenu absent | false | Chaque `preparation_mot` reçoit son `sens_retenu` dans la même transaction | rejeté |
| 14 | BH-9 : Sens vérifié deux fois | low | Sans effet pour l'enseignant | rejeté |
| 15 | BH-10 : `libererPreparationMot` ne vérifie rien | low | Méthode de service appelée par `preparations` après sa propre vérification, comme `retenirSens` | rejeté |
| 16 | BH-11 : l'extension de `libererPreparationMot` aux liens d'Image n'est promise que par un commentaire | low | À inscrire pour la story 2.4 | report |
| 17 | BH-12 : spec et contrat absents du diff relu | false | Exclus du fichier de revue, présents et versionnés | rejeté |
| 18 | BH-14 : le bouton « Retirer » peut couvrir le Mot sur une Carte étroite | low | Largeur minimale de Carte fixée par les jetons | rejeté |
| 19 | BH-15b,c,d : tests de retrait en erreur métier, pluriel du message | low | Couverts par la ligne 3 | rejeté |
| 20 | EC-5 : un second rétablissement en échec remplace le premier Bandeau | low | Un seul Bandeau « Annuler » à la fois : deux échecs de rétablissement simultanés sont improbables | rejeté |
| 21 | EC-7, EC-8 : focus sur `body` après « Fermer » d'un Bandeau d'erreur ou pendant un rétablissement | low | Comportement des Bandeaux d'erreur existants depuis la story 1.4 | rejeté |

## Design Notes

- Le Sens rétabli est celui que renvoie le retrait ; le back vérifie seulement qu'il appartient au Mot. Les identifiants de Sens des collègues ne sont jamais montrés à l'enseignant (AD-2), donc il ne peut pas en imposer un.
- Retirer libère d'abord (`libererPreparationMot`) puis supprime la ligne, dans la transaction de `preparations` (AD-14) ; dès la story 2.4, `libererPreparationMot` supprimera aussi le `lien_image`.

## Verification

**Commands:**
- `cd back && ./mvnw verify` -- expected : vert, ArchUnit compris ; `front/openapi/` réécrit.
- `cd front && npm test -- --watch=false && npm run build` -- expected : vert, `verifier-jetons` compris, paquet initial sous 600 kB.

**Manual checks (if no CLI):**
- Avec `compose.dev.yaml`, `quarkus:dev` et `npm start` : retirer un Mot au milieu de la Grille, « Annuler », recharger : même ordre.
