---
title: 'Story 1.7, partie 2 : page « Données personnelles »'
type: 'feature'
created: '2026-11-05'
status: 'done'
baseline_commit: '04041a2b374264e74f24f1a992e8200075fc17cc'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/realisation/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** l'enseignant ne peut lire nulle part ce que l'application garde sur lui, ni avant de se connecter (une invitée crée son mot de passe sans l'avoir vu), ni ensuite : `/mes-donnees` affiche « Cette page arrive bientôt. » (FR-3, NFR-12, UX-DR-39).

**Approach:** une page publique `/donnees-personnelles`, hors de la coquille et sans connexion, et le même texte dans Mes données ; un lien « Données personnelles » au pied de toutes les pages Keycloak ; un test qui interdit toute ressource tierce (NFR-13).

## Boundaries & Constraints

**Always:**
- Le texte dit : quelles données (compte : nom affiché, e-mail, prénom et nom saisis à l'activation, mot de passe protégé, rôle, statut, date de création ; cookies de session Keycloak, aucun autre cookie ; journaux techniques sans e-mail), pourquoi, combien de temps (dont « jusqu'à 14 jours dans les sauvegardes » après une suppression), comment demander l'effacement, et qu'il n'y a ni publicité, ni traceur, ni mesure d'audience, ni donnée d'élève.
- Un seul composant de contenu, affiché sous deux routes : `/donnees-personnelles` (publique, en-tête minimal et lien « Ouvrir corpus-mots ») et `/mes-donnees` (dans la coquille).
- Sur `/donnees-personnelles`, aucun appel à Keycloak ni à `/api` ; partout ailleurs la connexion reste exigée au démarrage, comme aujourd'hui.
- Lien Keycloak relatif (`/donnees-personnelles`, même origine) : il marche en développement comme en production, sans variable.
- Textes en français, au vouvoiement ; page lisible à 360 px, au clavier, titres hiérarchisés.
- Décisions de Paul :
  - Effacement : « Demandez-le à l'administrateur de l'école », sans autre contact.
  - Conservation des comptes : tant que le compte existe ; un compte sans connexion depuis un an est signalé à l'administrateur pour suppression ; « durée en cours de validation avec le délégué à la protection des données » (Q-3).
  - Périmètre : celui de la V1. En plus du compte : Images avec leur auteur, Préparations, historique des Fiches, notifications, mois d'activité. Une entrée de `deferred-work.md` demande de relire la page à la story 6.8.

**Never:**
- Pas de bouton « Exporter mes images » (story 6.7) ni de demande d'effacement en ligne (story 6.4).
- Pas de copie du `template.ftl` de keycloak.v2 ; pas de modification du realm JSON (importé une seule fois).
- Aucune ressource externe, police ou script tiers, dans le front comme dans le thème Keycloak.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Public | Visiteur sans session ouvre `/donnees-personnelles` | Page affichée, aucune redirection, aucune requête `/api` ni `/auth` | N/A |
| Public, déjà connecté | Session Keycloak ouverte | Même page publique, sans coquille | N/A |
| Vers l'application | Clic sur « Ouvrir corpus-mots » | Chargement complet de `/` : Connexion si besoin, puis Préparations | N/A |
| Mes données | Enseignant connecté, Menu de profil › Mes données | Même texte dans la coquille, titre « Mes données » | N/A |
| Keycloak | Connexion, Créer mon mot de passe, Mot de passe oublié, lien expiré | Lien « Données personnelles » au pied de la carte | N/A |
| Autre route | Visiteur sans session ouvre `/preparations` | Connexion exigée (inchangé) | N/A |

</frozen-after-approval>

## Code Map

- `front/src/app/app.config.ts:13` -- `provideAppInitializer` appelle `Authentification.demarrer()` avant toute route.
- `front/src/app/commun/authentification/authentification.ts:20-26` -- `demarrer()` : `init({onLoad:'login-required'…})`. Ne pas appeler `init` quand `window.location.pathname` est la page publique. `authentification.spec.ts:41-43` vérifie l'appel exact : ajouter le cas public.
- `front/src/app/app.routes.ts` -- toutes les routes sont des enfants de `Coquille`. Ajouter `donnees-personnelles` au premier niveau, avant `''` et `**` (`loadComponent`). Dans `mes-donnees`, remplacer `PageBientot`.
- `front/src/app/compte/page-bientot.ts` -- utilisé seulement par `/mes-donnees` : le supprimer.
- `front/src/app/coquille/coquille.ts:208-210` -- `CompteCourant.charger()` appelle `/api/mon-compte` : c'est pourquoi la page publique doit rester hors de la coquille.
- `front/src/app/commun/page-rubrique.scss`, `commun/etat-vide`, `coquille/coquille.scss` -- styles et jetons `--cm-*` à reprendre pour l'en-tête minimal.
- `front/src/app/app.spec.ts:95-105` -- teste la page d'attente sur `/mes-donnees` : à adapter. Le second `describe` (avec `appConfig.providers`) sert de modèle pour le cas public.
- `deploiement/keycloak/themes/corpus-mots/login/` -- `theme.properties` (`parent=keycloak.v2`), `messages/messages_fr.properties`. keycloak.v2 26.8 prévoit la surcharge de `footer.ftl` (`<#macro content>`), appelé par `template.ftl` sur toutes les pages de connexion. Les thèmes sont montés en bind (`compose.yaml:202`, `compose.dev.yaml:291`) et s'appliquent sans réimport.
- `.github/workflows/ci.yml:61-66` -- un grep de `dist/` refuse déjà les `href`/`src`/`url()` externes. L'étendre à `deploiement/keycloak/themes/`.
- Faits pour le texte :
  - Durées de session dans `realm-corpus-mots.json:12-19` : 10 h, 30 jours avec « Rester connecté ».
  - Événements Keycloak désactivés.
  - Les journaux du back ne contiennent que l'identifiant interne (`ReconciliationComptes`, `InvitationService`).
  - Les sauvegardes (`deploiement/sauvegarde.sh`) contiennent les deux bases et sont gardées 14 jours (`.env.exemple:351`).
  - Le code est sous licence AGPL-3.0 (`LICENSE`).

## Tasks & Acceptance

**Execution:**
- [x] `front/src/app/compte/donnees-personnelles.ts` (+ spec) -- composant du texte, et page publique qui l'enveloppe (en-tête, lien `href="/"`).
- [x] `front/src/app/commun/authentification/authentification.ts` (+ spec) -- pas d'`init` sur la page publique.
- [x] `front/src/app/app.routes.ts`, supprimer `compte/page-bientot.ts`, `app.spec.ts` -- deux routes, et tests de la matrice (aucune requête `/api` sur la page publique).
- [x] `deploiement/keycloak/themes/corpus-mots/login/footer.ftl`, `messages/messages_fr.properties` -- lien « Données personnelles ».
- [x] `.github/workflows/ci.yml` -- contrôle des ressources externes étendu au thème Keycloak.
- [x] `docs/realisation/deferred-work.md` -- marquer comme faites les entrées des lignes 32 et 65 ; ajouter « relire la page Données personnelles à la story 6.8 (périmètre réel, réponse à Q-3) ».

**Acceptance Criteria:**
- Given le front construit et le thème Keycloak, when la CI les inspecte, then aucune URL externe, aucun traceur ni aucune mesure d'audience n'y figure (NFR-13).
- Given la page publique ouverte sur un écran de 360 px, when on la parcourt au clavier, then le texte se lit sans défilement horizontal et le lien vers l'application est atteint.

## Implementation Notes

- Un fichier `compte/donnees-personnelles.ts`, trois composants : `TexteDonneesPersonnelles` (le texte, titres à partir du niveau 2), `MesDonnees` (coquille) et `PageDonneesPersonnelles` (publique). `PageBientot` supprimée.
- `PAGE_PUBLIQUE` (`authentification.ts`) sert à la fois à la garde de `demarrer()` et au chemin de la route ; une barre finale au plus.
- Lien Keycloak ouvert dans un nouvel onglet (revue, constat 1). Vu à la main sur Keycloak 26.8 : Connexion, Mot de passe oublié, lien d'action invalide.
- NFR-13 côté back : aucune dépendance de télémétrie ou d'APM dans `back/pom.xml` (revue, constat 9).
- Le texte ajoute, au-delà des décisions : les Images versées restent à l'école, attribuées à « ancien membre de l'équipe » (PRD FR-32, `[ASSUMPTION]`), et la mention du stockage local de keycloak-js (constat 7). Aucune durée n'est donnée pour les journaux : aucune n'est configurée.
- Vérifié après revue : `npm test` 159 tests verts ; `npm run build` sans avertissement (paquet initial 578 kB, `donnees-personnelles` 8 kB) ; les deux recherches de la CI, lancées à la main sur `front/dist/` et le thème, ne trouvent rien.

## Spec Change Log

## Review Triage Log

Passe 1 (Blind Hunter = BH, Edge Case Hunter = EC, Verification Gap = VG).

| # | Source | Constat | Verdict | Preuve | Route |
|---|--------|---------|---------|--------|-------|
| 1 | EC, BH | Lien du pied Keycloak dans le même onglet : l'invitée quitte « Créer mon mot de passe » et « Ouvrir corpus-mots » la mène à la Connexion sans mot de passe | medium | `footer.ftl` : `href` sans `target` ; la page d'action vient du lien de l'e-mail | patch (`target="_blank" rel="noopener"`) |
| 2 | EC | `/donnees-personnelles//` passe la garde, pas la route : coquille sans Keycloak initialisé | low | `replace(/\/+$/, '')` retire toutes les barres finales | patch (une barre au plus, test) |
| 3 | EC | `jeton()` appelé alors que Keycloak n'est pas initialisé | false | La page publique n'a qu'un `href="/"` (rechargement) ; seul le constat 2 menait à la coquille sans `init` | rejeté |
| 4 | EC, BH | Recherche de traceurs : `plausible`, `amplitude` (mots courants, insensible à la casse) feront échouer la CI à tort ; traceurs courants absents | low | `ci.yml` : motifs nus sur tout `dist/` | patch (motifs ancrés sur domaines et scripts) |
| 5 | EC, BH | Ressources externes : guillemets simples non reconnus, alors que le thème Freemarker est désormais inspecté | low | Motifs `href="` et `src="` seulement | patch (`["']`) |
| 6 | EC, BH | Bundles `*.js` non inspectés pour des URL externes | low | Antérieur à la story (grep de `dist/` depuis 1.4) ; les bundles contiennent des URL de documentation Angular, un grep naïf échouerait | defer |
| 7 | BH | « Aucun autre cookie » passe sous silence l'état de connexion que keycloak-js garde dans le stockage local | low | keycloak-js 26 range l'état du rappel (`kc-callback-*`) dans `localStorage` | patch (phrase reformulée) |
| 8 | BH | Prénom et nom gardés dans Keycloak : contraire à FR-3, qui limite le compte à nom affiché, e-mail, mot de passe et rôle | low | Antérieur (story 1.3, profil Keycloak) ; la page le dit honnêtement | defer (décision PRD) |
| 9 | BH | Le back n'est vérifié par aucun contrôle de traceur (critère « le front et le back ») | low | Inspection : aucune dépendance de télémétrie ou d'APM dans `back/pom.xml` ni réglage dans `application.properties` ; le seul appel sortant prévu est ARASAAC (AD-9). Une garde de plus n'apporte rien aujourd'hui | rejeté |
| 10 | BH | « 14 jours » fixé dans le texte alors que `SAUVEGARDE_JOURS` est réglable | false | `.env.exemple:48` : « Ne pas dépasser 14 : la page « Données personnelles » promet 14 jours au plus » | rejeté |
| 11 | BH | « Hébergée dans l'Union européenne » sans source | false | PRD §6.3 et AD-21 : hébergement dans l'UE exigé | rejeté |
| 12 | BH | Lignes de la matrice sans test (« déjà connecté », requête `/auth`) | low | `demarrer()` ne lit pas la session : même chemin avec ou sans connexion ; sans `init`, keycloak-js n'émet aucune requête (test `init` non appelé) | rejeté |
| 13 | VG, BH | Aucun test automatique ne rend une page Keycloak avec le lien | medium | Seule une vérification à la main (Keycloak 26.8 jetable : Connexion, Mot de passe oublié, lien expiré) ; une montée de version pourrait le perdre en silence | defer |
| 14 | VG | Rien ne confirme que keycloak.v2 appelle `footer.ftl` et définit `kcLoginMainFooterBand` | false | `template.ftl` de keycloak-themes 26.8.1 : `<#import "footer.ftl" as loginFooter>` et `<@loginFooter.content/>`, classe utilisée l.272 ; rendu vu à la main | rejeté |
| 15 | BH | Comparaison sensible à la casse et au `<base href>` | false | L'application est servie à la racine (Caddy) ; `/Donnees-Personnelles` démarre la Connexion, comme toute autre adresse | rejeté |
| 16 | BH | `PAGE_PUBLIQUE` défini dans `authentification.ts` et utilisé comme chemin de route | low | Une seule constante partagée, pas de divergence possible | rejeté |
| 17 | BH | Mes données sans lien vers Mon compte | low | Texte commun aux deux pages ; un lien n'aurait de sens que dans la coquille, il faudrait une variante | rejeté |
| 18 | BH | Clé `donneesPersonnelles` définie en français seulement | low | `locales=fr` dans `theme.properties` et le realm | rejeté |
| 19 | BH | Entrée 1.3 de `deferred-work.md` : liste de pages incomplète ; entrée 6.8 sans FR-3 ni hébergement | low | Texte de suivi ; FR-3 suivi par le constat 8 | rejeté |

## Verification

**Commands:**
- `cd front && npm test -- --watch=false && npm run build` -- expected: verts, sans avertissement de budget.
- Contrôle de la CI (`ci.yml`) lancé à la main sur `front/dist/` et le thème -- expected: aucune ressource externe.

**Manual checks (if no CLI):**
- En local (`compose.dev.yaml`, `npm start`) : la page Connexion de Keycloak montre le lien. Il ouvre la page sans redirection. L'onglet Réseau ne montre aucune requête vers un autre domaine.
