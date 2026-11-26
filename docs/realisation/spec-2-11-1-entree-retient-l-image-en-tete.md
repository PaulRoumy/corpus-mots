---
title: 'Story 2.11, partie 1 : Entrée retient l''Image en tête, et la liste d''albums ne se rouvre plus'
type: 'feature'
created: '2026-11-26'
status: 'done'
baseline_commit: '6de3a744a11c6d2e0884075fd6e92fcf6bcc3b01'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/realisation/epic-2-context.md'
  - '{project-root}/docs/sprint-change-proposal-2026-11-26.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problème :** aujourd'hui, un Mot qui a déjà une Image arrive « à illustrer » si l'enseignante valide par Entrée sans choisir d'Image au clavier (↓). Elle doit refaire un geste pour ce qui existe déjà. C'est contraire à la décision UX D-1 et à FR-9 (« Dans la saisie en série, valider le Mot retient la première Image proposée »). Par ailleurs, après « Créer l'album » dans le dialogue « Nouvelle préparation », la liste « Aucun album trouvé » se rouvre sous le champ Album.

**Approche :** c'est le back qui décide, à l'ajout du Mot : sans Image choisie, `ajouterMot` lie la première Image proposée pour ce Mot, avec le même classement que la détection (FR-9). Le résultat ne dépend donc ni de la vitesse de frappe ni d'une détection encore en attente. Le Panneau de détection met en avant exactement l'Image que l'Entrée retiendra. Après la création d'un Album, le champ Album reprend le focus sans rouvrir l'autocomplete.

## Boundaries & Constraints

**Toujours :**
- Les Images sont proposées et classées par `DetectionMots.propositions`, qui passe par `VisibiliteImages.proposable` (AD-2). L'Image est liée sans copie, origine `reutilisee`, par `Usages` (AD-5, AD-14).
- L'Image retenue devient le Sens retenu du Mot (invariant « Sens de l'Image = Sens retenu »). Avec un Sens choisi dans les puces, on prend la première Image de ce Sens. Avec un nouveau Sens, on prend la première Image de ce Sens s'il en a une.
- **Décision de Paul (2026-11-26) : seul le Mot exact compte.** L'Entrée seule n'illustre d'office que le Mot exactement tapé, celui que donnerait `Lexique.normaliser` puis la `forme_cle`, accents compris (AD-10). Le Panneau ne met en avant que l'Image que l'Entrée retiendra.
- Le choix explicite reste prioritaire : ↓ ↑ + Entrée ou un clic passent toujours par `reutiliserImage`.
- Si l'Image devient indisponible entre le classement et le verrou, le Mot arrive « à illustrer », sans refus (`lierImageSiPossible`).
- Une seule transaction, Préparation verrouillée. Les refus existants ne changent pas (`409 preparation.mot_deja_present`, etc.) et rien n'est écrit en cas de refus.

**Jamais :**
- Pas de nouvelle route ni de nouveau code d'erreur. Pas de migration.
- Le Panneau de détection ne reclasse jamais les Images.
- On ne touche pas à la Carte « à illustrer », à la Section héritée ni aux pictogrammes ARASAAC (parties 2 et 3).
- On ne touche pas à l'Encart « mots déjà illustrés ».

## I/O & Edge-Case Matrix

| Scénario | Entrée / État | Résultat attendu | Erreur |
|---|---|---|---|
| Mot illustré, Entrée seule | « farine », 2 Images proposables | Le Mot est ajouté avec la 1ʳᵉ Image (ordre FR-9), en `reutilisee`, et son Sens est retenu. Annonce : « « farine » ajouté avec son image. » | — |
| Frappe rapide | Entrée avant la réponse de la détection | Même résultat : c'est le back qui décide | — |
| Choix explicite | ↓ ↓ + Entrée sur la 2ᵉ Image | La 2ᵉ Image est retenue (comportement actuel) | — |
| Sens choisi | Puce « animal » choisie, Entrée | 1ʳᵉ Image du Sens « animal » ; s'il n'en a aucune, Mot ajouté avec ce Sens, « à illustrer » | — |
| Mot tapé sans ses accents | « cote » ; la détection propose « côte » et « côté », illustrés | Le Mot exact « cote » est ajouté, « à illustrer » s'il n'a pas d'Image ; rien n'est mis en avant pour « côte » ni « côté », qui restent au clic ou par ↓ | — |
| Mot sans Image visible | Mot nouveau, ou Images seulement privées d'un collègue | « à illustrer », comme avant | — |
| Image devenue indisponible | Image retirée entre le classement et le verrou | Mot ajouté « à illustrer » | Aucun refus |
| Mot déjà présent | Le Mot est déjà dans la Préparation | Rien n'est écrit | `409`, message actuel |
| Album créé | « Créer l'album » réussi dans « Nouvelle préparation » | L'Album est choisi, le focus est sur le champ Album, aucune liste ouverte | — |

</frozen-after-approval>

## Code Map

- `back/src/main/java/fr/corpusmots/preparations/service/PreparationsService.java` :
  - `ajouterMot` (l. 307 à 340) : après le choix du Mot et du `sensId`, appeler `detectionMots.propositions(mot.id(), albumId, section, sensId)`. S'il y a une première Image, retenir son Sens au lieu de `sensId`, puis appeler `usages.lierImageSiPossible(... REUTILISEE)` et renvoyer `vue(ligne, mot, sens, image)`.
  - Modèle à suivre : `reutiliserImage` (l. 434) et `retablirMot`.
  - Mettre à jour la Javadoc.
- `back/src/main/java/fr/corpusmots/vocabulaire/service/DetectionMots.java` : `propositions` (l. 113) et `ImageDetecteeVue.sens()` donnent le Sens de chaque Image. `detecter` marque le Mot de même `forme_cle` que la saisie normalisée (`Lexique.cle`). Ajouter un champ booléen à `MotDetecteVue`, puis `DetectionMotDto.formeSaisie` dans `preparations/api/`.
- `back/src/test/java/fr/corpusmots/preparations/api/MotsPreparationResourceTest.java`, `SensPreparationResourceTest.java`, `DetectionPreparationResourceTest.java` : ajouter les cas de la matrice. Vérifier les tests existants qui attendent un ajout « à illustrer » alors qu'une Image existe.
- `front/openapi/` : régénérer avec `./mvnw package -DskipTests` et versionner.
- `front/src/app/preparations/panneau-detection.ts` :
  - `premiereImageId` (l. 395) : première Image du Mot `formeSaisie`, dans le Sens choisi s'il y en a un.
  - Doc l. 120 à 125 : « Aucune n'est choisie d'emblée… Entrée ajoute « à illustrer » ».
  - `choix` reste le choix explicite.
- `front/src/app/preparations/preparation.ts` : `ajouterMot` (l. 1185) inchangé sur le fond. L'annonce de `envoyerAjout` (l. 1290) dit « ajouté avec son image » quand la réponse porte une Image, pour l'ajout sans choix aussi. Mettre la Javadoc à jour.
- `front/src/app/preparations/nouvelle-preparation-dialogue.ts` :
  - `creerAlbum` → `choisirAlbumProche` → `fermerVolet` (l. 740) remet le focus sur `champAlbum`, ce qui rouvre le `mat-autocomplete` avec `aucunAlbum()` encore vrai.
  - Fermer le panneau ou vider `suggestions` et `aucunAlbum` au choix d'un Album.
  - `televerser-image-dialogue.ts` n'a pas « Créer l'album » : ne pas y toucher.
- Specs front : `panneau-detection.spec.ts`, `preparation.spec.ts`, `nouvelle-preparation-dialogue.spec.ts`.

## Tasks & Acceptance

**Exécution :**
- [x] `back/.../PreparationsService.java`, `DetectionMots`, `MotDetecteVue`, `DetectionMotDto` : illustrer d'office à l'ajout et marquer le Mot de même forme.
- [x] `back/src/test/...` : une ligne de test par ligne back de la matrice, dont « rien n'est écrit » sur `409`.
- [x] `front/openapi/` : régénérer et versionner.
- [x] `front/src/app/preparations/panneau-detection.ts` et sa spec : mise en avant égale à ce que fait Entrée.
- [x] `front/src/app/preparations/preparation.ts` et sa spec : annonce et ajout illustré sans choix.
- [x] `front/src/app/preparations/nouvelle-preparation-dialogue.ts` et sa spec : aucune liste ouverte après « Créer l'album ».

**Critères d'acceptation :**
- Étant donné UJ-1 étape 5, quand l'enseignante tape « farine » puis Entrée, alors la Carte arrive illustrée par l'Image mise en avant dans le Panneau.
- Étant donné un Mot illustré tapé puis validé en moins de 250 ms, quand la réponse arrive, alors le Mot est illustré.

## Implementation Notes

- Back : `ajouterMot` appelle `DetectionMots.propositions(mot, album, section, sensId)` après avoir fixé le Mot et le `sensId` (choisi ou nouveau), retient le Sens de la première Image s'il y en a une, puis la lie par `lierImageSiPossible` (`reutilisee`). `MotDetecteVue.formeSaisie` vaut `forme_cle == Lexique.cle(saisie normalisée)` dans `detecter`, et toujours vrai dans `propositions` ; exposé en `DetectionMotDto.formeSaisie`.
- Front : `premiereImageId` met en avant la première Image du Mot dont un Sens est choisi (c'est ce Mot que l'Entrée envoie avec `sensId`), sinon du Mot `formeSaisie` ; rien tant qu'une détection est attendue. L'annonce dit « ajouté avec son image » dès que la réponse porte une Image, et `annonceAjoutAvecSens` dit « ajouté avec son image (chute, nom) ».
- Dialogue : `choisirAlbumProche` (création réussie ou « Choisir cet album ») ferme l'autocomplete après le focus rendu au champ Album (`MatAutocompleteTrigger.closePanel`), sans vider les suggestions : retaper le même texte les montre de nouveau.
- Test existant ajusté : `ReprisesPreparationResourceTest.toutReprendreAjoute…` (« galette » saisie arrive désormais illustrée).
- « Image devenue indisponible entre le classement et le verrou » : couverte par `MotsPreparationResourceTest.uneImageDevenueIndisponibleAvantSonVerrouLaisseLeMotAIllustrer`, avec un classement périmé (`QuarkusMock` de `DetectionMots`) qui propose une Image privée d'une collègue : le verrou la refuse, le Mot arrive « à illustrer » avec le Sens proposé, sans lien.
- Vérification locale du back : les `@QuarkusTest` tournent contre un PostgreSQL lancé à la main (`podman run … -p 5434:5432 postgres:18.6`, puis `-Dquarkus.datasource.devservices.enabled=false` et l'URL JDBC), le pipe Docker de Podman étant absent. `./mvnw verify` : 807 tests verts.

## Spec Change Log

## Review Triage Log

Revue 1 (Blind Hunter BH, Edge Case Hunter EC, Verification Gap VG).

| # | Constat | Verdict | Preuve | Suite |
|---|---------|---------|--------|-------|
| 1 | BH-4, EC-1, EC-4 : `premiereImageId` met en avant l'Image d'un Mot `dejaDansLaPreparation`, alors que l'Entrée reçoit `409` | medium | `motsIllustres().find(...)` ne regarde pas `dejaDansLaPreparation` ; le back refuse avant tout lien | patch |
| 2 | VG-1, BH-11 : la garde « détection attendue » de `premiereImageId` n'est couverte par aucun test (mutation `if (false)` : 296 tests verts) | medium | Prouvé par mutation du relecteur | patch (test) |
| 3 | BH-2 : `formeSaisie` documenté « accents compris » sans dire que la casse est ignorée (`Lexique.cle` met en minuscules) | low | « Côté » marque « côté » dans le test ; correction de texte directe | patch |
| 4 | BH-3 : `formeSaisie` toujours vrai sur les propositions, sans le dire dans le schéma | low | `propositions` passe `cleSaisie = null` ; correction de texte directe | patch |
| 5 | BH-13 : paragraphe de Javadoc de `PanneauDetection` mal recoupé | low | Ligne coupée après « dans » | patch |
| 6 | VG autre : titre de test `preparation.spec.ts` « Entrée ajoute alors « à illustrer » » périmé | low | Le back illustre désormais ; correction directe du titre | patch |
| 7 | BH-1, EC-2 : après un lien refusé au verrou, le Mot garde le Sens de l'Image non liée | low | Course de quelques millisecondes ; le Sens reste un Sens du Mot, vu dans la détection juste avant ; la corriger ajoute une branche et une seconde écriture du Sens retenu | rejeté |
| 8 | BH-5 : `propositions` calculé à chaque ajout, même pour un Mot ou un Sens tout juste créé | low | Requêtes sur un Mot sans Image : aucun coût mesuré ; l'éviter ajoute des branches | rejeté |
| 9 | BH-6 : aucun test que front et back retiennent la même Image | false | `detecter` et `propositions` passent par le même `detectes` (même classement) ; seul le filtre de Sens diffère, couvert par `SensPreparationResourceTest` | rejeté |
| 10 | BH-7 : pas de test d'intégration front de l'Entrée avec Sens choisi revenue illustrée | low | Annonce couverte par `annonceAjoutAvecSens`, lien par les tests back ; aucun défaut montré | rejeté |
| 11 | BH-8, BH-9 : l'annonce « ajouté avec son image. » ne nomme pas le Sens de l'Image retenue | low | Même annonce qu'un choix explicite depuis la story 2.7 ; la logique de l'annonce est juste | rejeté |
| 12 | BH-10 : la liste peut s'ouvrir un instant avant `closePanel` | maybe-false | Il faudrait observer un rendu intermédiaire dans le navigateur ; ne serait que cosmétique | rejeté |
| 13 | EC-3 : « Annuler » dans le volet rend le focus au champ Album, qui rouvre la liste de la recherche | false | Après Annuler, l'enseignante revient à sa recherche : la liste (avec « Créer l'album « … » ») est attendue ; l'écart E-2 visait l'après-création | rejeté |
| 14 | BH-12 : SQL concaténé dans `SensPreparationResourceTest` | low | Valeurs UUID produites par le test, aucun dommage nommé | rejeté |

## Verification

**Commandes :**
- `cd back && ./mvnw verify` : tests verts, `front/openapi/openapi.json` à jour.
- `cd front && npm test -- --watch=false && npm run build` : tests verts, paquet initial ≤ 600 kB.

**Vérifications manuelles :**
- Dans une Préparation, taper un Mot illustré puis Entrée : il arrive illustré. Créer un Album depuis « Nouvelle préparation » : aucune liste ne se rouvre.

Vérification à la clôture (après les correctifs de la revue 1) : back `./mvnw verify` 808 tests verts, `@QuarkusTest` compris (PostgreSQL de test lancé à la main) ; front 44 fichiers de tests verts ; `npm run build` réussi, paquet initial 599,78 kB.
