---
title: 'Story 2.4, partie 2 : Choisir un pictogramme ARASAAC'
type: 'feature'
created: '2026-11-22'
status: 'done'
baseline_commit: '16a83cd0b3a10ba7d95a3984666366f6a2297f87'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/realisation/epic-2-context.md'
  - '{project-root}/docs/realisation/spec-2-4-suggestions-arasaac.md'
  - '{project-root}/docs/realisation/spec-2-5-televerser-depuis-la-carte.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Une Carte « à illustrer » montre jusqu'à trois pictogrammes ARASAAC, mais aucun ne se laisse choisir. Pour illustrer un nouveau Mot, l'enseignant doit donc téléverser un fichier (FR-12).

**Approach:** Chaque suggestion devient un bouton. Un clic illustre le Mot :
1. Le back télécharge le PNG par le proxy, hors transaction (AD-9, AD-17), puis le réduit par `ReductionImages`.
2. Dans une transaction, il crée l'Image avec la règle de téléversement de la story 2.5 (Préparation verrouillée, puis Image) et la lie au Mot par `Usages.lierImage`, avec l'origine `nouvelle`.
3. La Carte passe à l'état illustré et affiche sa vignette, sans rechargement.

Décisions :
- Image créée : état `privee`, type `image_libre`, licence `arasaac_cc_by_nc_sa`, Sens retenu du Mot. La source est « ARASAAC (https://arasaac.org), pictogramme n° 2349 ». L'auteur est « Sergio Palao, propriété du Gouvernement d'Aragon ». Ce sont les mentions qu'exige la licence ARASAAC ; la Carte d'identité les affiche déjà.
- Le pictogramme est demandé à ARASAAC, et non repris d'un fichier envoyé par le navigateur : seul l'identifiant `idArasaac` traverse l'API.
- Choix d'un pictogramme : les trois boutons sont désactivés et un indicateur s'affiche sur le pictogramme choisi. En cas de succès, la Carte illustrée remplace la Carte « à illustrer », comme après un téléversement (story 2.5) : même focus (bouton « Retirer » de la Carte), même compteur « M déjà illustrés », annonce « « renard » illustré. ».
- Échec :
  - ARASAAC indisponible (`503 arasaac.indisponible`) ou pictogramme introuvable : message court dans la Carte, Mot toujours « à illustrer », boutons de nouveau actifs, « Téléverser » toujours proposé.
  - Échec réseau : même message, avec « Réessayer ».
  - `409 preparation.mot_deja_illustre` (Mot illustré entre-temps, par exemple dans un autre onglet) : message traduit, puis rechargement de la Préparation.
- Nom accessible de chaque bouton : « Illustrer « renard » avec le pictogramme « renard » » (mot-clé d'ARASAAC).

## Boundaries & Constraints

**Always:**
- Route : `POST /preparations/{id}/mots/{motPreparationId}/pictogramme { idArasaac }`. Elle renvoie `201` avec le Mot de Préparation illustré, comme le téléversement.
  - Préparation ou Mot d'un collègue : `404 ressource.introuvable`, sans appel à ARASAAC si cela peut se vérifier d'abord (lecture sans verrou).
  - `idArasaac` absent ou ≤ 0 : `400 requete.invalide`.
  - ARASAAC injoignable, en erreur, lent ou pictogramme inexistant : `503 arasaac.indisponible`, sans aucune écriture.
  - Mot déjà illustré : `409 preparation.mot_deja_illustre`.
- Téléchargement et réduction hors de toute transaction ; aucun appel HTTP sortant dans une transaction ouverte (AD-17). L'écriture reprend `PreparationsService.televerserImage` (ou sa partie commune) sans copie.
- Octets servis uniquement par `FichiersImages.lire`, vignettes en `blob` par `commun/image-securisee` avec `?taille=miniature` (AD-23), déjà en place. La visibilité passe par `VisibiliteImages` (AD-2) ; aucune règle nouvelle.
- Le navigateur n'appelle jamais ARASAAC (AD-9).

**Never:**
- Ni fichier reçu du navigateur, ni réutilisation d'une Image ARASAAC existante : chaque choix crée sa propre Image (dédoublonnage hors périmètre).
- Aucun appel HTTP écrit à la main ; ne pas modifier `front/src/app/api/` ; aucune migration.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Choisir | Mot « renard » à illustrer, `idArasaac` 2349 | Image `privee`, `image_libre`, `arasaac_cc_by_nc_sa`, source et auteur ARASAAC, Sens retenu, fichier réduit (miniature ≤ 256 px) ; lien `nouvelle` ; 201 | N/A |
| ARASAAC indisponible | Source en erreur ou trop lente | Aucune ligne `image`, `image_fichier` ni `lien_image` | 503 `arasaac.indisponible` |
| Pictogramme inexistant | ARASAAC répond 404 | Rien | 503 `arasaac.indisponible` |
| Déjà illustré | Mot qui a déjà une Image | Rien | 409 `preparation.mot_deja_illustre` |
| Préparation d'un collègue | Route appelée sur sa Préparation | Rien, ARASAAC non appelé | 404 `ressource.introuvable` |
| Identifiant invalide | `idArasaac` absent, 0 ou négatif | Rien | 400 `requete.invalide` |
| Front, clic | Clic sur une suggestion | Requête avec `idArasaac`, boutons désactivés, puis Carte illustrée, focus sur « Retirer », compteur suivi, annonce | N/A |
| Front, 503 | Refus ARASAAC | Message dans la Carte, Mot à illustrer, boutons réactivés | N/A |
| Front, échec réseau | Pas de réponse | Message avec « Réessayer », qui renvoie la même requête | N/A |
| Front, 409 | Mot illustré entre-temps | Message traduit, Préparation rechargée | N/A |

</frozen-after-approval>

## Code Map

- `back/src/main/java/fr/corpusmots/preparations/api/PreparationsResource.java` -- `televerserImage` (l.290) : préparation du fichier hors transaction, puis appel au service ; modèle de la nouvelle route.
- `back/src/main/java/fr/corpusmots/preparations/service/PreparationsService.java` -- `televerserImage` (l.561) : création et lien dans une transaction ; à réutiliser.
- `back/src/main/java/fr/corpusmots/vocabulaire/service/SuggestionsArasaac.java` -- `pictogramme(idArasaac)` (téléchargement, `ArasaacIndisponible`), `ReductionImages`, `TypeImage`, `Licence`.
- `back/src/test/java/fr/corpusmots/` -- tests ARASAAC existants (source simulée) et tests du téléversement : fixtures et assertions « rien n'est écrit ».
- `front/src/app/preparations/suggestions-arasaac.ts` -- vignettes devenues boutons, sortie du Mot illustré ou de l'échec.
- `front/src/app/preparations/carte-mot.ts`, `preparation.ts` -- remplacement de la Carte après téléversement (story 2.5) : même chemin pour le pictogramme.

## Tasks & Acceptance

**Execution:**
- [x] `back/...` -- route, téléchargement hors transaction, création et lien.
- [x] `back/src/test/...` -- une ligne de test par ligne back de la matrice, dont « rien n'est écrit » après chaque refus.
- [x] `front/openapi/` -- régénérer et versionner.
- [x] `front/src/app/preparations/` (+ specs) -- suggestions cliquables et Carte illustrée ; une ligne de test par ligne front de la matrice.

**Acceptance Criteria:**
- Given une Carte « renard » à illustrer avec trois suggestions, when l'enseignant clique sur la première, then la Carte affiche sa vignette et la Carte d'identité de l'Image montre la licence ARASAAC, la source et l'auteur.
- Given ARASAAC indisponible, when l'enseignant clique sur une suggestion, then un message court s'affiche, « Téléverser » reste proposé et le Mot reste « à illustrer ».

## Implementation Notes

- Back : `SuggestionsArasaac.telecharger(idArasaac)` (vocabulaire) télécharge par `SourceArasaac.pictogramme` et réduit par `ReductionImages` (`image_libre`), sans transaction ; pictogramme inconnu ou fichier illisible = `503 arasaac.indisponible`. Il rend un `PictogrammeTelechargeVue` (fichier, type, licence `arasaac_cc_by_nc_sa`, source « ARASAAC (https://arasaac.org), pictogramme n° N », auteur « Sergio Palao, propriété du Gouvernement d'Aragon »).
- Route `choisirPictogrammeMotPreparation` (`PreparationsResource.choisirPictogramme`, DTO `PictogrammeMotPreparationDto`) : `idArasaac` absent ou ≤ 0 = 400 sans appel ; `PreparationsService.verifierMot` (lecture sans verrou) donne le 404 avant tout appel à ARASAAC ; l'écriture reprend `PreparationsService.televerserImage` telle quelle (verrou Préparation, `Images.televerser`, `Usages.lierImage`, origine `nouvelle`), le 409 vient de `lierImage`.
- Front : `SuggestionsArasaac` reçoit `preparationId` et `motPreparationId`, facultatifs : sans eux (Panneau de détection, Mot pas encore ajouté), les vignettes restent inertes comme avant. Boutons désactivés par `aria-disabled` (le focus reste sur le pictogramme choisi), liste `aria-busy`, indicateur = anneau `primary` et pulsation (coupée sous `prefers-reduced-motion`). Échec : message `role="alert"` sous les suggestions ; « Réessayer » seulement pour un statut 0, qui remet le focus sur le pictogramme et renvoie la même requête. 409 : sortie `dejaIllustre` ; la page affiche le message dans un Bandeau d'erreur sans « Réessayer » (`erreur-pictogramme`) et relit les Mots de la Préparation (`chargerMots`, pas toute la page : la saisie en cours est gardée), puis focus sur « Retirer » de la Carte.
- Exploitation : `deploiement/README.md` (accès sortant ARASAAC : téléchargement du pictogramme choisi, copie sauvegardée comme les autres Images) et page Données personnelles (pictogramme choisi enregistré comme une Image de l'enseignant) mis à jour ; RESTAURATION.md inchangé (les Images y sont déjà).
- Paquet initial : 598,97 kB, identique à la base (marge de 1 kB sous le budget de 600 kB, déjà avant cette story).

## Spec Change Log

## Review Triage Log

Revue 1 (Blind Hunter BH, Edge Case Hunter EC, Verification Gap VG).

| # | Constat | Verdict | Preuve | Suite |
|---|---------|---------|--------|-------|
| 1 | BH-1, BH-2, EC-1 : Mot déjà illustré refusé seulement après le téléchargement et la réduction | medium | Appel sortant et décodage inutiles à chaque 409 | patch |
| 2 | BH-3, BH-4, EC-6 : pictogramme inconnu présenté comme une panne ; erreur de réduction en 500 ; minimum absent du contrat | low | Message et journal faux, code instable | patch (`arasaac.pictogramme_introuvable`, `minimum = 1`) |
| 3 | BH-7, EC-2 : boutons désactivés pour de bon si la Carte reste | low | `choixEnCours` jamais remis à zéro | patch |
| 4 | BH-6, EC-3 : 404 (Mot retiré ailleurs) sans rechargement | medium | Chaque clic renvoie 404 | patch |
| 5 | EC-4, EC-5, BH-9, BH-8 : annonce pour un Mot absent, liste plus ancienne qui écrase une illustration, bandeau périmé, 503 non testé au niveau de la page | medium | Carte qui redevient « à illustrer » | patch |
| 6 | VG-1 : vignettes inertes du Panneau de détection (valeur par défaut) non testées | medium | Passer une seule entrée les rendrait cliquables | patch |
| 7 | BH-14 : phrase coupée dans un commentaire | low | Correction directe | patch |
| 8 | VG-2 : fermeture du bandeau non testée | low | Même schéma que les bandeaux voisins | rejeté |
| 9 | BH-12 : aucune annonce « en cours » | low | `aria-busy` présent ; résultat annoncé | rejeté |
| 10 | BH-5 : contrôle `idArasaac` en double | low | Garde du service sans coût | rejeté |
| 11 | BH-11 : RESTAURATION.md non modifié | false | Les Images, pictogrammes compris, sont des copies locales déjà restaurées avec la base | rejeté |
| 12 | BH-13 : mention complète de licence | false | Licence, source et auteur sont trois champs affichés ensemble par la Carte d'identité ; les Fiches viennent avec l'Epic 4 | rejeté |
| 13 | BH-10 : diff sans contrat ni spec | false | Exclusion voulue | rejeté |
| 14 | EC-7, EC-8 : message réseau différent, seuls les Mots rechargés | low | Choix assumés : message réseau commun, saisie en cours gardée | rejeté |

## Verification

**Commands:**
- `cd back && ./mvnw -q verify` (JAVA_HOME JDK 25, DOCKER_HOST `npipe:////./pipe/docker_engine`) -- expected: tous les tests passent, ArchUnit compris, `front/openapi/` à jour.
- `cd front && npm test -- --watch=false && npm run build` -- expected: tests et `verifier-jetons` au vert, paquet initial sous 600 kB.
