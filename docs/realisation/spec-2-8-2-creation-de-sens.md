---
title: 'Story 2.8, partie 2 : Création de Sens'
type: 'feature'
created: '2026-11-20'
status: 'done'
baseline_commit: '722c049d0689a0f16ff272aa9d20bf5acdf4c824'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/realisation/epic-2-context.md'
  - '{project-root}/docs/realisation/spec-2-8-sens-dans-le-panneau-de-choix.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Un enseignant ne peut choisir qu'un Sens qui existe déjà : il ne peut pas distinguer « étalé (chute) » de « étalé (cuisine) » si le second n'existe pas, ni sortir un Mot ou une Image du Sens « à compléter » (FR-10).

**Approach:** « Nouveau sens », à côté du champ Sens du Panneau de choix d'Image et de celui de la Carte d'identité (propriétaire, Sens modifiable), déplie sur place la Création de Sens : libellé court, Sélecteur de catégorie grammaticale, « Créer le sens » (UX-DR-19, UX-DR-20). Le Sens est obtenu ou créé par `Lexique.obtenirOuCreerSens` puis sélectionné : Sens retenu du Mot dans le Panneau de choix, Sens de l'Image dans la Carte d'identité.

Décisions :
- Catégories (décision de Paul) : liste fermée de cinq valeurs, `nom`, `verbe`, `adjectif`, `adverbe`, `autre`, énumération du back lue par le front dans le client généré ; affichées « nom », « verbe », « adjectif », « adverbe », « autre ».
- Catégorie obligatoire (décision de Paul) : libellé et catégorie sont requis ; seul le Sens par défaut « à compléter » reste sans catégorie. Préremplie avec la catégorie du Sens actuel (Sens retenu, ou Sens de l'Image) s'il en a une, sinon vide.
- Libellé court : de 1 à 40 caractères une fois nettoyé ; message sous le champ « Le libellé du sens est obligatoire (40 caractères au plus). ». Le libellé « à compléter » est refusé (réservé au Sens par défaut).
- Libellé déjà connu pour ce Mot (même forme normalisée) : ce Sens est réutilisé sans erreur, avec sa catégorie (AD-19).
- Entrée dans le formulaire ou « Créer le sens » crée et sélectionne ; Échap replie sans rien créer, sans fermer le panneau, et rend le focus à « Nouveau sens ». Après création, le formulaire se replie et le focus va au champ Sens.
- Panneau de choix : le nouveau Sens devient le Sens retenu, comme un choix dans le champ (story 2.8, partie 1) : l'Image d'un autre Sens est déliée, la Carte est mise à jour, la liste se limite à ce Sens (souvent « Aucune image pour ce mot. » et « Ajouter une image »).
- Carte d'identité : « Nouveau sens » n'existe que pour le propriétaire tant que l'Image n'est liée nulle part (même règle que le champ Sens, story 2.6, partie 4).

## Boundaries & Constraints

**Always:**
- `POST /preparations/{id}/mots/{motPreparationId}/sens`, corps `{ libelle, categorie }`, `200` avec le `MotPreparationDto` : Préparation verrouillée, `obtenirOuCreerSens`, puis `Usages` retient ce Sens (délie l'Image d'un autre Sens). Le Sens tapé par l'enseignant n'a pas à être « visible » (AD-2 ne s'applique qu'aux Sens qu'on lui montre).
- `POST /images/{id}/sens`, corps `{ libelle, categorie }`, réponse de la Carte d'identité : propriétaire seul (`403` sinon, administrateur compris), Image verrouillée, refus `409 image.sens_non_modifiable` si elle a un lien ; `obtenirOuCreerSens` puis Sens de l'Image changé.
- Refus communs : libellé vide, de plus de 40 caractères ou égal à « à compléter » `400 sens.libelle_invalide` (nouveau code, traduit dans `MESSAGES_PAR_CODE`) ; catégorie absente ou hors liste `400 requete.invalide` ; Préparation, Mot de Préparation ou Image introuvables `404 ressource.introuvable`. Tout refus annule tout, y compris la création du Sens.
- Énumération de catégorie au nom unique dans tout le back (AD-16) ; aucune migration (colonne `sens.categorie` en texte, valeurs actuelles nulles).
- Formulaire en ligne (`surface-container-low`), jamais un dialogue ; composant partagé par les deux panneaux ; champs nommés « Libellé du sens » et « Catégorie grammaticale ».
- Paquet initial sous 600 kB (Panneau de choix chargé à la demande ; la Carte d'identité ne doit pas grossir le paquet initial).

**Never:**
- Pas de Sens dans le Panneau de détection (partie 3) ; pas de renommage ni de changement de catégorie d'un Sens existant (AD-19).
- Aucun appel HTTP écrit à la main ; ne pas modifier `front/src/app/api/`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Créer depuis le Panneau de choix | « étalé », retenu « cuisine » lié à X ; « chute », `nom` | Sens « chute (nom) » créé, retenu ; lien vers X supprimé, X intacte | N/A |
| Libellé déjà connu | « étalé » a « chute (nom) » ; saisie « Chute », `verbe` | Sens existant réutilisé (catégorie `nom`), aucun nouveau Sens | N/A |
| Créer depuis la Carte d'identité | Image de Paul sans lien, Sens « à compléter » ; « fruit », `nom` | Sens créé, Sens de l'Image changé | N/A |
| Image liée | Image de Paul liée | Rien | 409 `image.sens_non_modifiable` |
| Image d'un collègue | Image versée de Zoé | Rien | 403 |
| Libellé vide ou trop long | « » ou 41 caractères | Aucun Sens créé | 400 `sens.libelle_invalide` |
| Libellé réservé | « à compléter » | Aucun Sens créé | 400 `sens.libelle_invalide` |
| Catégorie hors liste | `pronom` | Aucun Sens créé | 400 `requete.invalide` |
| Préparation d'un collègue | `id` de Zoé | Aucun Sens créé | 404 |
| Front, déplier | « Nouveau sens » | Formulaire sur place, focus sur le libellé, catégorie préremplie | N/A |
| Front, Entrée | Libellé et catégorie remplis | Créé, sélectionné, formulaire replié, focus sur le champ Sens | N/A |
| Front, Échap | Formulaire ouvert | Replié sans requête, panneau ouvert, focus sur « Nouveau sens » | N/A |
| Front, invalide | Libellé vide | Message sous le champ, aucune requête | N/A |

</frozen-after-approval>

## Code Map

- `back/src/main/java/fr/corpusmots/vocabulaire/service/Lexique.java` l.101 -- `obtenirOuCreerSens(motId, libelle, categorie)`, `nettoyer`, `cle` : réutiliser tel quel ; la catégorie passe en valeur de l'énumération.
- `back/src/main/java/fr/corpusmots/vocabulaire/service/Usages.java` -- `changerSens` (partie 1, validation « Sens visible ») et `retenu.changerSens`, `liens.supprimerDe` : variante sans contrôle de visibilité pour un Sens que l'enseignant vient de taper.
- `back/src/main/java/fr/corpusmots/vocabulaire/service/Images.java` -- `changerSens` (story 2.6.4 : propriétaire, verrou, `409 image.sens_non_modifiable`, Carte renvoyée) : modèle et réutilisation pour la Carte d'identité.
- `back/src/main/java/fr/corpusmots/vocabulaire/api/` -- ressource des Images (`PUT /images/{id}/sens`, `SensImageDto`) : ajouter `POST /images/{id}/sens` et son DTO.
- `back/src/main/java/fr/corpusmots/preparations/service/PreparationsService.java` et `api/PreparationsResource.java` -- `changerSens` / `PUT …/sens` (partie 1) : modèles ; ajouter `POST …/sens` et son DTO (nom unique, AD-16).
- `back/src/test/java/fr/corpusmots/preparations/api/SensPreparationResourceTest.java`, `back/src/test/java/fr/corpusmots/vocabulaire/api/SensImageResourceTest.java` -- fixtures et assertions « rien n'est écrit » (compter les lignes `sens`).
- `front/src/app/preparations/panneau-choix-image.ts` -- champ Sens (partie 1), `choisirSens`, `sensChange` : « Nouveau sens » et sélection du Sens créé.
- `front/src/app/commun/carte-identite/carte-identite.ts` l.277-380 -- champ Sens du propriétaire, `sensModifiable`, file d'enregistrement : « Nouveau sens ».
- `front/src/app/commun/` -- nouveau composant partagé de Création de Sens (libellé, `mat-select` de catégorie, bouton tonal) ; `libelles-images.ts` pour les libellés des catégories ; `erreurs/message-erreur.ts` pour `sens.libelle_invalide`.

## Tasks & Acceptance

**Execution:**
- [x] `back/.../vocabulaire/` -- énumération de catégorie, création et sélection pour une Image, variante d'`Usages` pour un Sens tapé.
- [x] `back/.../preparations/` -- route `POST …/sens`, DTO.
- [x] `back/src/test/...` -- une ligne de test par ligne back de la matrice, dont « aucun Sens créé » après chaque refus.
- [x] `front/openapi/` -- régénérer et versionner.
- [x] `front/src/app/commun/` (+ specs) -- composant de Création de Sens, libellés des catégories, message de `sens.libelle_invalide`.
- [x] `front/src/app/preparations/panneau-choix-image.ts`, `front/src/app/commun/carte-identite/carte-identite.ts` (+ specs) -- « Nouveau sens » et sélection ; une ligne de test par ligne front de la matrice.

**Acceptance Criteria:**
- Given un Sens créé dans le Panneau de choix, when la Carte de Mot est mise à jour, then son alternative montre « Mot, nouveau Sens ».
- Given la Carte d'identité d'une Image liée ou d'un collègue, when elle s'affiche, then « Nouveau sens » n'apparaît pas.

## Implementation Notes

- Back : énumération `vocabulaire.service.CategorieGrammaticale` (`valeur()`, `deValeur`), exposée en chaîne par `@Schema(enumeration = …)` dans `NouveauSensMotPreparationDto` et `NouveauSensImageDto`, comme `TypeImage`. `Lexique.obtenirOuCreerSensSaisi(motId, libelle, categorie)` porte la règle du libellé (nettoyé, 1 à 40 caractères, autre que « à compléter » comparé par `cle`) et lève `400 sens.libelle_invalide`, puis appelle `obtenirOuCreerSens` (signature inchangée, catégorie passée par `valeur()`). `Usages.creerSens(CreerSensCommande)` : Sens obtenu ou créé pour le Mot du Sens retenu, sans contrôle de visibilité, puis même écriture que `changerSens` (méthode privée `retenir` partagée) ; Sens déjà retenu → rien n'est écrit. `Images.creerSens` : propriétaire et verrou comme `changerSens`, `409` vérifié avant toute création de Sens. Catégorie absente ou hors liste refusée dans les ressources (`400 requete.invalide`). Tests : 6 dans `SensPreparationResourceTest`, 6 dans `SensImageResourceTest` (nombre de lignes `sens` comparé après chaque refus).
- Front : composant partagé `commun/creation-sens` (`CreationSens`) : bouton « Nouveau sens », formulaire en ligne, `envoyer` fourni par le panneau (promesse rejetée → message dans le formulaire, sous le libellé pour `sens.libelle_invalide`), `creee` émis après succès ; Échap ferme d'abord la liste des catégories, sinon replie et arrête la propagation. Libellés et liste des catégories dans `libelles-images.ts` (type tiré de `NouveauSensImageDto`). Panneau de choix : `creerSens` suit le patron de `choisirSens` (numéro d'envoi, `sensChange`, relecture filtrée) ; « Nouveau sens » sous le champ ou le texte du Sens, désactivé pendant un envoi. Carte d'identité : `creerSens` passe par la file des enregistrements ; `409` passe le Sens en lecture avec le Bandeau. Paquet initial : 598,86 kB.

## Spec Change Log

## Review Triage Log

Revue 1 (Blind Hunter BH, Edge Case Hunter EC, Verification Gap VG).

| # | Constat | Verdict | Preuve | Suite |
|---|---------|---------|--------|-------|
| 1 | BH-1, BH-2, EC-2, EC-3, EC-4 : la Carte d'identité résout la création sans rien créer (409, carte non modifiable, lecture périmée) | medium | `CreationSens` se replie, émet `creee` et le focus tombe sur `body` ; requête vouée à l'échec envoyée après un premier 409 | patch |
| 2 | BH-3 : Création de Sens active pendant un changement de Sens en file dans la Carte | low | Deux changements contradictoires en file ; liaison directe de `desactive` | patch |
| 3 | VG-1, BH-14 : refus du libellé et échec réseau non testés dans la Carte | medium | Avaler l'erreur ne ferait échouer aucun test | patch (test) |
| 4 | BH-4, EC-5 : formulaire gardé au changement de Mot dans le Panneau de choix | medium | Libellé et catégorie de l'ancien Mot créés sur le nouveau ; repli trompeur | patch |
| 5 | BH-9, EC-6, BH-10, BH-15, EC-7 : nettoyage du libellé différent du back, « à compléter » refusé par le back seul, champs modifiables pendant l'envoi | low | Corrections directes dans `creation-sens.ts` | patch |
| 6 | BH-5 : catégorie choisie remplacée par celle du Sens existant | false | Décision de la spec (AD-19) ; la catégorie retenue s'affiche dans le champ Sens | rejeté |
| 7 | BH-6 : réutiliser révèle un Sens non visible | low | Décision de la spec : un Sens tapé n'a pas à être visible ; seul ce que l'enseignant a tapé est révélé | rejeté |
| 8 | BH-7 : Sens orphelins ou fautifs jamais supprimés | low | Conséquence d'AD-19 (Lexique partagé, non modifiable) ; hors de cette partie | rejeté |
| 9 | BH-8, EC-1 : `Images.creerSens` sur une Image liée avec le libellé de son Sens actuel, branche sans écriture non testée | low | Formulaire absent pour une Image liée ; seulement par l'API | rejeté |
| 10 | BH-11 : cinq valeurs recopiées à quatre endroits | low | Même convention que `TypeImage` | rejeté |
| 11 | BH-12 : deux DTO identiques | false | AD-16 impose un nom unique par DTO exposé, un par module | rejeté |
| 12 | BH-13 : pas d'annonce après création dans la Carte | low | Le focus va au champ Sens qui montre le nouveau Sens | rejeté |
| 13 | BH-16 : message recopié dans une spec | low | Sans effet sur le produit | rejeté |

## Verification

**Commands:**
- `cd back && ./mvnw -q verify` (JAVA_HOME JDK 25, DOCKER_HOST `npipe:////./pipe/docker_engine`) -- expected: tous les tests passent, ArchUnit compris, `front/openapi/` à jour.
- `cd front && npm test -- --watch=false && npm run build` -- expected: tests et `verifier-jetons` au vert, paquet initial sous 600 kB.
