---
title: 'Story 2.7, partie 2 : retenir une Image dans le Panneau de détection'
type: 'feature'
created: '2026-11-19'
status: 'done'
baseline_commit: '7f016d7c742563070daeeda2fa0d9e51fe2b6269'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/realisation/epic-2-context.md'
  - '{project-root}/docs/realisation/spec-2-7-detection-pendant-la-frappe.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Le Panneau de détection montre les Images existantes d'un Mot, mais l'enseignant ne peut pas les retenir : il ajoute le Mot « à illustrer » et doit l'illustrer ensuite, au risque de refaire une Image qui existe (FR-9).

**Approach:** Les Images du Panneau de détection deviennent des propositions à choisir au clavier (↑ ↓ puis Entrée, le focus restant dans le champ) ou d'un clic. Retenir une Image ajoute son Mot à la Préparation avec le Sens de l'Image, et la lie par `Usages.lierImage` avec l'origine `reutilisee`, sans copie (AD-5), dans une seule transaction. L'Entrée seule, sans choix, ajoute toujours le Mot « à illustrer ».

Décisions :
- Aucune proposition n'est choisie d'emblée : la première reste seulement mise en avant (partie 1). ↓ choisit la première (EXPERIENCE.md, UJ-1 : « ↓ + Entrée, elle la retient en un geste »), ↓ ↑ parcourent les Images de tous les Mots affichés dans l'ordre, sans boucler ; ↑ sur la première et Échap retirent le choix. Le choix tombe à chaque nouveau résultat.
- Image choisie : fond `primary-container`, anneau `primary` et une coche ou un contour plus épais (jamais la couleur seule, UX-DR) ; la mise en avant de la première disparaît quand une autre est choisie.
- Le Mot ajouté est celui de l'Image (« cote » puis une Image de « côté » ajoute « côté »), avec le Sens de l'Image comme Sens retenu et le Thème par défaut de la Préparation, en fin de grille, comme un ajout par Entrée : champ vidé, focus gardé, panneau masqué, annonce « « farine » ajouté avec son image. ».
- Mot déjà dans la Préparation : retenir l'une de ses Images est refusé comme Entrée aujourd'hui (même message sous le champ, saisie remise).
- Image qui n'est plus proposable ou dont le Sens a changé entre la détection et le choix : rien n'est ajouté ; message sous le champ « Cette image n'est plus disponible. Choisissez-en une autre, ou appuyez sur Entrée pour ajouter le mot sans image. », saisie remise dans le champ (la détection repart). Échec réseau : Bandeau d'échec des ajouts existant, dont « Réessayer » renvoie la même réutilisation.
- Les suggestions ARASAAC du panneau restent en lecture (lien d'un pictogramme : story 2.4, partie 2).

## Boundaries & Constraints

**Always:**
- Nouvelle route `POST /preparations/{id}/mots/reutilisation`, corps `{ motId, imageId }`, `201` avec le `MotPreparationDto` (Image comprise). Une transaction : Préparation verrouillée, puis Mot, Sens retenu = Sens de l'Image, `Usages.lierImage` (verrou de l'Image, `proposable`, Sens), origine `reutilisee`. Tout refus annule tout : aucune ligne `preparation_mot`, `sens_retenu` ni `lien_image` ne reste.
- Codes : Préparation d'un collègue ou absente `404 ressource.introuvable` ; Mot absent `404 ressource.introuvable` ; Image absente ou non proposable `404 image.indisponible` (nouveau code, traduit dans `MESSAGES_PAR_CODE`) ; Image d'un autre Mot que `motId` `400 preparation.sens_invalide` ; Mot déjà présent `409 preparation.mot_deja_present` ; corps ou champ manquant `400 requete.invalide`.
- La visibilité reste décidée par `VisibiliteImages.proposable`, dans `vocabulaire` ; `preparations` n'obtient le Sens d'une Image que par un service de `vocabulaire` (AD-1, AD-2).
- Accessibilité : motif combobox ARIA 1.2 sur le champ (`role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant` vers l'Image choisie) ; Images en `role="option"` avec `aria-selected`, dans un `role="listbox"` (un `role="group"` nommé par Mot s'il y en a plusieurs) ; nom accessible de chaque option : Mot, Sens, propriétaire. Le focus ne quitte jamais le champ ; la région `aria-live` existante n'est pas élargie.
- Les ajouts, par Entrée ou par réutilisation, passent dans la même file, un à un et dans l'ordre.
- Paquet initial sous 600 kB.

**Never:**
- Aucune copie d'Image, aucune Image créée ; aucune migration.
- Pas de Panneau de choix d'Image, ni de remplacement d'Image (partie 3) ; pas de « Nouveau sens » (story 2.8).
- Aucun filtre d'Image dans `preparations` ou le front ; aucun appel HTTP écrit à la main ; ne pas modifier `front/src/app/api/`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Réutiliser son Image | « farine », Image de Paul (Sens « farine ») | Mot ajouté en fin, Sens retenu = Sens de l'Image, lien `reutilisee` ; aucune Image nouvelle | N/A |
| Image d'un collègue versée | Image versée de Zoé | Liée à la Préparation de Paul, Zoé reste propriétaire | N/A |
| Autre Sens que l'habituel | Paul retient d'habitude « avocat (fruit) » ; Image de « avocat (métier) » | Sens retenu = « avocat (métier) » | N/A |
| Image privée d'un collègue | `imageId` d'une Image privée de Zoé | Rien ajouté | 404 `image.indisponible` |
| Image d'un autre Mot | `motId` « côte », Image de « côté » | Rien ajouté | 400 `preparation.sens_invalide` |
| Mot déjà présent | « farine » déjà dans la Préparation | Rien ajouté | 409 `preparation.mot_deja_present` |
| Préparation d'un collègue | `id` d'une Préparation de Zoé | Rien ajouté | 404 |
| Front, ↓ puis Entrée | Panneau avec 2 Images | La première est retenue ; champ vidé, focus gardé, Carte illustrée en fin de grille | N/A |
| Front, Entrée sans choix | Panneau avec Images, aucune choisie | `ajouterMotPreparation` comme aujourd'hui, Mot « à illustrer » | N/A |
| Front, clic | Clic sur la deuxième Image | Deuxième Image retenue, focus remis au champ | N/A |
| Front, ↑ et Échap | Une Image choisie | ↑ sur la première ou Échap : plus de choix, Entrée ajoute « à illustrer » | N/A |
| Front, nouveau résultat | Image choisie, puis une frappe | Choix retiré | N/A |
| Front, Image indisponible | Réponse 404 `image.indisponible` | Message sous le champ, saisie remise | Pas de Bandeau |

</frozen-after-approval>

## Code Map

- `back/src/main/java/fr/corpusmots/preparations/service/PreparationsService.java` -- `ajouterMot` (l.193) et `retablirMot` (l.248) : modèles exacts (verrou `verrouillee`, `preparationMots.contient`, `PreparationMot.nouveau`, `usages.retenirSens` avec `sensId`, `LierImageCommande`, `OrigineLien.REUTILISEE`, `vue(ligne, mot, sens, image)`). Ajouter `reutiliserImage(id, ReutiliserImageCommande)` ; utiliser `usages.lierImage` (strict), pas `lierImageSiPossible`.
- `back/src/main/java/fr/corpusmots/preparations/api/PreparationsResource.java` -- `retablirMot` (l.136-151) : modèle de route et de DTO (`RetablissementMotPreparationDto.enCommande`). Nouveau `ReutilisationImageMotPreparationDto` (nom unique, AD-16).
- `back/src/main/java/fr/corpusmots/vocabulaire/service/Usages.java` -- `lierImage` (l.112 ; codes 404/400/409), `imageProposable` (privée, l.143), `retenirSens` (lève `IllegalArgumentException` si le Sens n'est pas du Mot : vérifier avant par `Lexique.sensDuMot`). Ajouter une lecture sans verrou du Sens d'une Image proposable (par ex. `Optional<UUID> sensDImageProposable(UUID imageId)`) ; `lierImage` revérifie tout sous verrou. Le 404 de `lierImage` devient `image.indisponible` seulement pour cette route : lever le code depuis `PreparationsService` quand la lecture du Sens est vide, et laisser `lierImage` inchangé.
- `PreparationsService.java` l.59-61 -- constantes de codes : y déclarer `CODE_IMAGE_INDISPONIBLE = "image.indisponible"`. Course rare (Image rendue privée ou Sens changé entre la lecture et le verrou) : `lierImage` lève alors `404 ressource.introuvable` ou `400 image.sens_different` ; le front traite `image.sens_different` comme `image.indisponible`.
- `back/src/test/java/fr/corpusmots/preparations/api/` -- tests de `ajouterMot`/`retablirMot` et `DetectionPreparationResourceTest` : fixtures Images, Sens, liens (`ImagesDeTest`), Paul et Zoé.
- `front/src/app/commun/erreurs/message-erreur.ts` (+ spec) -- `MESSAGES_PAR_CODE` : ajouter `image.indisponible` avec le message de la décision.
- `front/src/app/preparations/saisie-rapide.ts` -- champ ; ajouter les attributs combobox (entrées pour l'id de la liste, l'id actif, l'état déplié), sorties de navigation (↓, ↑, Échap) ; Entrée émet toujours `ajouter`, la page décide.
- `front/src/app/preparations/panneau-detection.ts` -- vignettes (`vignettes(mot)`, l.124) : options, ids stables, état du choix (signal), `deplacer(+1|-1)`, `annulerChoix()`, `choix()` (motId, imageId, forme), sortie `retenir` au clic ; choix remis à zéro à chaque nouveau résultat.
- `front/src/app/preparations/preparation.ts` -- l.502-507 (hôte), `ajouterMot`/`fileAjouts`/`envoyerAjout` (l.793-852) : la file porte soit une saisie, soit une réutilisation `{ motId, imageId, forme, saisie }` ; Entrée avec un choix envoie la réutilisation ; refus `mot_deja_present`, `image.indisponible` et `image.sens_different` par `saisieRapide.refuser`.
- `front/src/app/preparations/*.spec.ts` -- `panneau-detection.spec.ts`, `saisie-rapide.spec.ts`, `preparation.spec.ts` : modèles existants.

## Tasks & Acceptance

**Execution:**
- [x] `back/.../vocabulaire/service/Usages.java` -- lecture du Sens d'une Image proposable, sans écriture.
- [x] `back/.../preparations/` -- `reutiliserImage`, commande, DTO, route, code `image.indisponible`.
- [x] `back/src/test/...` -- une ligne de test par ligne back de la matrice, dont l'absence de toute ligne écrite après chaque refus.
- [x] `front/openapi/` -- régénérer et versionner.
- [x] `front/src/app/commun/erreurs/message-erreur.ts` (+ spec) -- message de `image.indisponible`.
- [x] `front/src/app/preparations/` (+ specs) -- combobox, choix au clavier et au clic, file d'ajouts, refus ; une ligne de test par ligne front de la matrice.

**Acceptance Criteria:**
- Given une Image choisie par ↓, when l'enseignant appuie sur Entrée, then le focus reste dans le champ et `aria-activedescendant` est retiré.
- Given deux réutilisations puis un Entrée tapés vite, when les réponses arrivent, then les trois Cartes apparaissent dans l'ordre des gestes.

## Implementation Notes

- Back : `Usages.sensDImageProposable(imageId)` lit Sens, propriétaire et état par une projection JPQL (`ImageRepository.sensProprietaireEtat`), sans charger l'entité dans le contexte de persistance : le `SELECT … FOR UPDATE` de `lierImage` relit donc l'Image en base et revérifie tout sous verrou. `PreparationsService.reutiliserImage` : Préparation verrouillée, Mot (404), Sens de l'Image (404 `image.indisponible`), Sens du Mot (400), doublon (409), puis ligne, `retenirSens` avec le Sens de l'Image et `lierImage` en `reutilisee`. Corps ou champ manquant refusé dans la ressource (`400 requete.invalide`). Tests : `ReutilisationImagePreparationResourceTest`.
- Front : `PanneauDetection` porte le choix (`imageChoisie`, `choix()`, `idActif()`, `deplie()`, `naviguer()`, sortie `retenir`), remis à zéro à chaque frappe et à chaque résultat ; options `role="option"` dans un `role="listbox"` (groupe nommé par Mot s'il y en a plusieurs), `mousedown` sans défaut pour garder le focus, coche en plus de l'anneau. `SaisieRapide` : attributs combobox, ↓ ↑ émis seulement liste dépliée, Échap seulement avec un choix (sans remonter), `vider()`. `Preparation` : la file porte `{ saisie, image? }` ; refus `image.indisponible` et `image.sens_different` sous le champ, saisie remise. Nouvelle icône `coche`.

## Spec Change Log

## Review Triage Log

Revue 1 (Blind Hunter BH, Edge Case Hunter EC, Verification Gap VG).

| # | Constat | Verdict | Preuve | Suite |
|---|---------|---------|--------|-------|
| 1 | VG, BH-1, EC-1 : 404 `ressource.introuvable` de la revérification sous verrou → Bandeau et « Réessayer » voué à l'échec | low | `CODES_IMAGE_INDISPONIBLE` ne contient pas ce code ; même défaut que la ligne 2 | patch (groupé avec 2) |
| 2 | BH-2, EC-2 : refus définitif (`preparation.sens_invalide`) d'une réutilisation envoyé au Bandeau | low | Tout refus portant un `code` hors de la liste rejoint `echecAjout` ; correction directe | patch |
| 3 | BH-3 : choix d'une Image du résultat précédent pendant la pause de frappe | medium | La spec du panneau montre `choix()` non nul après `setInput('farines')` ; Entrée ajouterait « farine » | patch |
| 4 | BH-4 : contenu autre que des options dans le `listbox` | medium | En-têtes, lignes Sens/Albums et `app-suggestions-arasaac` dans l'élément `role="listbox"`, interdit en ARIA 1.2 | patch |
| 5 | BH-5 : le nom accessible perd « déjà utilisée », Sections, type, album d'origine | medium | `aria-label` remplace le texte de l'option ; information visible absente pour un lecteur d'écran (AA) | patch (Mot, Sens, propriétaire gardés en tête) |
| 6 | BH-6 : Images d'un Mot déjà présent encore choisissables | false | Décision de la spec : refus comme Entrée | rejeté |
| 7 | BH-7, EC-3 : message « Choisissez-en une autre » quand le champ contient déjà une autre frappe | low | Réponse lente et frappe suivante déjà commencée ; le message reste exact sur l'Image | rejeté |
| 8 | BH-8 : états non proposables de sa propre Image et revérification sous verrou non testés | low | États `abandonnee`, `supprimee` livrés par l'Epic 3 ; la course demande deux transactions entrelacées | rejeté |
| 9 | BH-9 : projection `Object[]` dans `sensProprietaireEtat` | low | Lecture interne, une seule appelante, couverte par les tests | rejeté |
| 10 | BH-10 : seule la réponse 201 documentée dans l'OpenAPI | false | Même convention que `retablirMot` et `ajouterMot` | rejeté |
| 11 | BH-11 : enseignant non authentifié traité comme Image indisponible | false | Route authentifiée : `EnseignantCourant` n'est jamais nul ici | rejeté |
| 12 | BH-12 : diff sans `front/openapi/` ni spec | false | Exclusion voulue (contrat généré, spec réservée au relecteur des cas limites) | rejeté |
| 13 | EC-4 : Sens changé avant la requête accepté avec le nouveau Sens | low | Le propriétaire doit changer le Sens d'une Image non liée dans les secondes du choix ; corriger demande un champ de plus dans la route | rejeté |

## Verification

**Commands:**
- `cd back && ./mvnw -q verify` (JAVA_HOME JDK 25, DOCKER_HOST Podman) -- expected: tous les tests passent, ArchUnit compris, `front/openapi/` à jour.
- `cd front && npm test -- --watch=false && npm run build` -- expected: tests et `verifier-jetons` au vert, paquet initial sous 600 kB.
