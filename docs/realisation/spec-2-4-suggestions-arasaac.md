---
title: 'Story 2.4, partie 1 : Suggestions ARASAAC dans la Carte « à illustrer »'
type: 'feature'
created: '2026-11-11'
status: 'done'
baseline_commit: '8844daf52f172feb47d68695a0d4d73d5d714f33'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/realisation/epic-2-context.md'
  - '{project-root}/docs/realisation/spec-2-3-3-theme-de-chaque-mot.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Une Carte « à illustrer » ne propose aucune image. L'enseignant ne voit pas les pictogrammes ARASAAC qui pourraient illustrer son Mot (FR-12, FR-16, story 2.4).

**Approach:** `vocabulaire` sert de proxy à ARASAAC (AD-9). Il propose une recherche de pictogrammes par Mot et sert le fichier PNG d'un pictogramme. La Carte « à illustrer » s'élargit comme dans la maquette (`key-preparation.html` › `.todo`) et montre jusqu'à trois suggestions sous la ligne « Suggestions ARASAAC · simple, claire, peu de détails ». Les images passent par une nouvelle directive `commun/image-securisee` (blob, jamais de jeton dans l'URL). Rien n'est enregistré, et les suggestions ne sont pas encore cliquables.

Partie 1 de la story 2.4, découpée par Paul. Choisir un pictogramme, avec création et liaison de l'Image, est la partie 2, reportée dans `deferred-work.md`. « Téléverser » arrive avec la story 2.5.

Décisions de Paul :
- Préalable Q-2 : on avance, car cette partie ne copie aucun pictogramme et s'appuie sur la licence CC BY-NC-SA confirmée. Q-2 reste ouvert et bloquant pour la partie 2, qui stocke des copies.
- Crédit : la ligne de la maquette (« Suggestions ARASAAC · simple, claire, peu de détails ») suffit ici. Le crédit complet viendra avec les Fiches et la Carte d'identité.

## Boundaries & Constraints

**Always:**
- Le navigateur n'appelle jamais ARASAAC. Aucun appel sortant n'a lieu dans une transaction (AD-9, AD-17).
- Les deux appels sont réservés aux enseignants connectés. ARASAAC injoignable, en erreur ou trop lent (3 s) donne `503 arasaac.indisponible`, et le Mot reste « à illustrer ». Une recherche sans résultat donne une liste vide.
- Les URL d'ARASAAC viennent de la configuration (`corpusmots.arasaac.*`, avec les valeurs publiques par défaut) ; les tests remplacent la source ARASAAC par une fausse.
- Chaque nouveau `code` d'erreur est traduit dans `MESSAGES_PAR_CODE`.

**Never:**
- Aucune copie d'un pictogramme en base ni sur disque dans cette partie.
- Pas de clic actif sur une suggestion, pas de « Téléverser », pas de Panneau de détection.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Suggestions | `GET /api/arasaac/suggestions?mot=citrouille` | 200, au plus 3 `{idArasaac, motCle}` dans l'ordre d'ARASAAC | — |
| Sans résultat | ARASAAC ne trouve rien (404 ou liste vide) | 200 `[]` ; la Carte affiche « Aucun pictogramme ARASAAC pour ce mot. » | — |
| Indisponible | ARASAAC injoignable, 5xx ou au-delà de 3 s | 503 `arasaac.indisponible` ; la Carte affiche « ARASAAC ne répond pas pour l'instant. » | — |
| Mot invalide | `mot` absent, vide, ou de plus de 100 caractères | 400 `requete.invalide` | — |
| Pictogramme | `GET /api/arasaac/pictogrammes/{idArasaac}` | 200 `image/png`, `Cache-Control: private, max-age=86400` | ARASAAC 404 : 404 `ressource.introuvable` ; autre échec : 503 `arasaac.indisponible` |
| Non connecté | appel sans jeton | 401 | — |

</frozen-after-approval>

## Code Map

- `back/pom.xml` -- aucune dépendance HTTP cliente ; utiliser `java.net.http.HttpClient` (JDK) plutôt que d'en ajouter une.
- `back/src/main/java/fr/corpusmots/vocabulaire/{service,api}/` -- `Lexique`, `Usages` déjà là ; `api/` ne contient que `package-info.java`. Modèle d'exception : `commun` `ErreurMetier(status, code, detail)`.
- `back/src/main/resources/application.properties` -- conventions `corpusmots.*` et profils `%dev`, `%prod`.
- `back/src/test/java/fr/corpusmots/architecture/ReglesArchitecture.java` -- règles AD-1 ; le nouveau code doit les respecter.
- `front/src/app/preparations/carte-mot.ts` (+ `.scss`) -- Carte « à illustrer » (classe hôte `carte-mot--a-illustrer`), Grille `repeat(auto-fill, minmax(var(--cm-largeur-carte-min), 1fr))` dans `preparation.scss`.
- `docs/ux-designs/ux-corpus-mots-2026-10-28/.working/key-preparation.html` lignes 177-186 et 346-357 -- `.todo` sur 3 colonnes, partie gauche de 120 px, suggestions de 60 px, ligne `.q`.
- `front/src/app/commun/` -- composants partagés (`squelette`, `bandeau-erreur`) ; `front/src/app/api/` généré (ne pas éditer).

## Tasks & Acceptance

**Execution:**
- [x] `back/src/main/java/fr/corpusmots/vocabulaire/service/` -- `SourceArasaac` (interface : `rechercher(texte)`, `pictogramme(id)`), `SourceArasaacHttp` (`HttpClient`, délai de 3 s, recherche `{api-url}/v1/pictograms/fr/search/{texte encodé}`, fichier `{static-url}/pictograms/{id}/{id}_300.png`), `SuggestionsArasaac` (au plus 3, premier mot-clé français comme `motCle`, erreurs métier).
- [x] `back/src/main/java/fr/corpusmots/vocabulaire/api/ArasaacResource.java` -- les deux opérations (`suggestionsArasaac`, `pictogrammeArasaac` en `image/png`), DTO `SuggestionArasaacDto`.
- [x] `back/src/main/resources/application.properties` -- `corpusmots.arasaac.api-url=https://api.arasaac.org`, `corpusmots.arasaac.static-url=https://static.arasaac.org`.
- [x] `back/src/test/java/fr/corpusmots/vocabulaire/api/ArasaacResourceTest.java` -- une ligne de test par ligne de la matrice, avec une fausse `SourceArasaac` installée par `QuarkusMock`.
- [x] `front/openapi/` -- régénérer et versionner.
- [x] `front/src/app/commun/image-securisee/` (+ spec) -- directive sur `<img>` qui reçoit une fonction de chargement de `Blob`, pose une URL `blob:` et la révoque au changement et à la destruction.
- [x] `front/src/app/preparations/suggestions-arasaac.ts` (+ spec) -- ligne « Suggestions ARASAAC · simple, claire, peu de détails », squelette pendant le chargement, trois vignettes de 60 px (alternative : le `motCle`), messages des cas vide et indisponible.
- [x] `front/src/app/preparations/carte-mot.ts` (+ `.scss`, spec) -- la Carte « à illustrer » s'étend sur 3 colonnes (toute la ligne si la Grille en a moins) : partie gauche existante et suggestions à droite, avec les jetons existants ou de nouveaux jetons (`verifier-jetons`).
- [x] `front/src/app/commun/erreurs/message-erreur.ts` + spec -- `arasaac.indisponible` « ARASAAC ne répond pas pour l'instant. ».

**Acceptance Criteria:**
- Given une Carte « citrouille » à illustrer, when elle s'affiche, then jusqu'à trois pictogrammes ARASAAC apparaissent sous le Repère de qualité, chargés par le back seul.
- Given ARASAAC indisponible ou sans résultat, then la Carte affiche un message court et reste « à illustrer ».
- Given les outils de développement du navigateur, then aucune requête ne part vers un domaine ARASAAC et aucune URL d'image ne porte de jeton.

## Implementation Notes

- Back : `SourceArasaac` lève `ArasaacIndisponible` (injoignable, statut autre que 200 ou 404, JSON illisible, délai de 3 s en connexion comme en réponse) ; `SuggestionsArasaac` la traduit en `503 arasaac.indisponible` et normalise le `mot` par `Lexique.normaliser` (article retiré) avant la recherche ; un pictogramme sans mot-clé prend la forme cherchée comme `motCle`. Ni `@Transactional` ni écriture. En test, les URL ARASAAC pointent vers `127.0.0.1:9` (garde-fou). `QuarkusMock` exige une instance de la classe du bean : la fausse source de `ArasaacResourceTest` étend donc `SourceArasaacHttp` (sans jamais appeler le réseau). `SourceArasaacHttpTest` éprouve la source HTTP contre un faux serveur local (URL, lecture, 404, 5xx, JSON illisible, délai, port fermé).
- Front : `image-securisee` pose et retire `src` par `Renderer2`, car une liaison `[attr.src]` à `null` posait `src=""`. Un pictogramme dont le fichier échoue laisse voir son `motCle` dans la vignette. La Squelette gagne la forme `vignette` (rangée de carrés de 60 px). La Grille garde toujours au moins trois colonnes (`minmax(min(120px, (100% - 2 gaps) / 3), 1fr)`), et le `li` d'une Carte « à illustrer » porte `mots__element--a-illustrer` (`grid-column: span 3`) : sur une Grille étroite, la Carte occupe toute la ligne. Nouveaux jetons : `--cm-largeur-carte-a-illustrer-gauche`, `--cm-taille-suggestion-arasaac`, `--cm-taille-pictogramme-suggestion`.
- Exploitation : `deploiement/README.md` cite l'accès HTTPS sortant vers ARASAAC parmi les prérequis de l'hôte. La page Données personnelles dit que les Mots des Préparations sont envoyés à ARASAAC, sans nom ni information du compte. Rien n'est stocké : RESTAURATION.md ne change pas.
- Revue 1 : AD-17 étendue à `SourceArasaac` (règle `aucunAppelHttpSortantEnTransaction`, fixture `AppelArasaacEnTransaction`) ; appel ARASAAC borné à 3 s corps compris (`sendAsync(...).orTimeout`) et à 2 Mo ; fichier vide ou non `image/png` = indisponible ; `_id` non entier positif ignoré ; `.` encodé dans le segment ; doublons d'`_id` retirés avant d'en garder 3 ; `idArasaac` ≤ 0 = 404 sans appel ; `echec` aussi sur l'événement `error` de l'image ; messages des Cartes sans `role="status"`.

## Spec Change Log

## Review Triage Log

Revue 1 (Blind Hunter BH, Edge Case Hunter EC, Verification Gap VG).

| # | Constat | Verdict | Preuve | Suite |
|---|---------|---------|--------|-------|
| 1 | VG-1 : la règle ArchUnit d'AD-17 ne couvre que Keycloak, pas `SourceArasaac` | medium | Constat vérifié par la couche VG ; la partie 2 téléchargera dans le flux d'écriture | patch |
| 2 | BH-3, EC-1, EC-2, EC-10 : délai de 3 s limité aux en-têtes, corps sans taille maximale, tout corps 200 servi en `image/png` | medium | `HttpRequest.timeout` s'arrête aux en-têtes (JDK) | patch |
| 3 | EC-3, EC-12 : un blob reçu mais illisible affiche une image cassée au lieu du mot-clé | low | `echec` émis seulement au rejet de la promesse | patch |
| 4 | EC-4, EC-5 : `_id` en double ou non entier positif gardés | low | Correction directe | patch |
| 5 | BH-4, EC-7 : `idArasaac` nul ou négatif appelle ARASAAC | low | Correction directe | patch |
| 6 | EC-6 : « . » ou « .. » changent le chemin de la recherche | low | `URLEncoder` laisse les points ; correction directe | patch |
| 7 | BH-11 : limite de 100 caractères acceptée et caractères spéciaux non testés | low | Constat vérifié par lecture des tests | patch |
| 8 | BH-12 : test du délai sans borne basse, gestionnaire sur le fil du serveur | low | Correction directe | patch |
| 9 | BH-9 : une région `role="status"` par Carte, message répété autant de fois | medium | 20 Cartes, ARASAAC en panne : 20 annonces | patch |
| 10 | BH-7 : la page Données personnelles ne dit pas que les Mots partent vers ARASAAC | medium | Donnée envoyée à un tiers ; AGENTS.md demande la mise à jour | patch |
| 11 | BH-5 (b) : description de `motCle` inexacte quand ARASAAC n'a pas de mot-clé | low | Correction directe | patch |
| 12 | BH-1, EC-8 : aucun cache ni plafond des appels sortants (1 + 3 appels par Carte) | medium | Volume d'une école faible ; un cache de copies dépend des conditions d'ARASAAC (Q-2) | report |
| 13 | BH-8, EC-9, VG-2 : trous dans la Grille quand Cartes illustrées et « à illustrer » se mêlent ; branche `illustre` non testée | low | Impossible avant la partie 2 : tous les Mots sont « à illustrer » | report |
| 14 | BH-2 : un avertissement par appel en panne, sans la cause | low | Journal lisible ; à revoir avec le cache (ligne 12) | rejeté |
| 15 | BH-5 (a) : réponses d'erreur absentes du contrat OpenAPI | low | Convention du back depuis la story 1.x | rejeté |
| 16 | BH-6 : aucun crédit ARASAAC sous les suggestions | false | Décision de Paul, consignée dans l'intention | rejeté |
| 17 | BH-10 : pas de « Réessayer » après « ARASAAC ne répond pas » | low | Recharger la Préparation relance les suggestions | rejeté |
| 18 | BH-13 : spec et contrat absents du diff ; entrée reportée en `source_spec: none` | false | Exclus du fichier de revue ; format prescrit par le découpage à l'étape de cadrage | rejeté |
| 19 | EC-11 : la longueur est contrôlée après retrait de l'article | low | Même règle que l'ajout d'un Mot (story 2.3) | rejeté |

## Design Notes

- La source est une interface : les tests n'appellent jamais Internet, et la partie 2 réutilisera `SourceArasaac.pictogramme` pour télécharger le fichier avant la transaction.
- La recherche porte sur la `forme` du Mot, sans article. Si ARASAAC répond 404 parce qu'il n'a rien trouvé, c'est une liste vide, pas une panne.
- `image-securisee` est générique (une fonction qui rend un `Blob`). La partie 2 l'utilisera pour les vignettes d'Image avec `?taille=miniature`.

## Verification

**Commands:**
- `cd back && ./mvnw verify` -- expected : vert, ArchUnit compris ; `front/openapi/` réécrit.
- `cd front && npm test -- --watch=false && npm run build` -- expected : vert, `verifier-jetons` compris, paquet initial sous 600 kB.

**Manual checks (if no CLI):**
- Avec `compose.dev.yaml`, `quarkus:dev` et `npm start` : taper « citrouille », « four » et un mot inventé ; couper le réseau pour voir le message d'indisponibilité.

