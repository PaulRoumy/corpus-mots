---
title: 'Story 1.4 : Coquille de l''application et système de design (coquille et thème)'
type: 'feature'
created: '2026-11-03'
status: 'done'
baseline_commit: '201edad9eee3c9b3c5f3ef87d6853defaedfca27'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/realisation/epic-1-context.md'
  - '{project-root}/docs/ux-designs/ux-corpus-mots-2026-10-28/DESIGN.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** après connexion, l'enseignant arrive sur un Accueil provisoire au thème Material par défaut, sans navigation, sans menu de profil et sans la police Nunito (UX-DR-1, 2, 3, 5, 6, 36).

**Approach:** traduire les jetons de DESIGN.md en thème Angular Material 3 et en propriétés CSS, auto-héberger Nunito et Playwrite FR Moderne, puis remplacer l'Accueil par une coquille (barre supérieure, navigation des rubriques, Menu de profil, Bouton « + », Notifications) qui entoure les pages Préparations, Banque et Fiches, chacune en État vide.

## Boundaries & Constraints

**Always:**
- Toute couleur, arrondi, espacement, ombre ou typographie d'un composant passe par un jeton (`--mat-sys-*` ou `--cm-*`) ; seuls les fichiers de jetons contiennent des valeurs littérales. Chaque jeton de couleur a sa valeur sombre, définie sous un sélecteur jamais appliqué ; aucune entrée ne permet de choisir le thème.
- Polices installées par npm et servies par l'application ; aucune URL externe dans le build (vérification CI existante).
- Le rôle administrateur vient de `GET /api/mon-compte` (`administrateur`, lu par le back dans le jeton) ; `/administration` sans ce rôle → retour à l'accueil.
- Ordre de tabulation = ordre de lecture : lien d'évitement « Aller au contenu », marque, barre supérieure (recherche, « + », Notifications, Menu de profil), rubriques, contenu. Anneau de focus `primary` 2 px décalé de 2 px sur tout élément focalisable ; Échap ferme les menus (comportement `mat-menu`).
- Textes en français, vouvoiement, verbes à l'infinitif, ni point d'exclamation ni émoji.

**Décisions (Paul, 2026-11-03) :**
- Story découpée : cette spec couvre thème, polices et coquille ; les composants partagés et la traduction des codes forment la seconde partie (`deferred-work.md`), à livrer avant la 1.5. Spec gardée entière (~2 400 tokens).
- Mon compte, Mes données et Administration ouvrent leur route (`/mon-compte`, `/mes-donnees`, `/administration`), qui affiche un État vide « Cette page arrive bientôt. » avec « Retour aux préparations ».
- Bouton « + » visible mais désactivé (`aria-label` « Ajouter ») tant qu'aucun de ses trois choix n'est livré ; il s'active avec le premier.
- États vides des rubriques : la phrase seule (« Pas encore de préparation. Choisissez un album : les mots déjà illustrés par l'équipe arrivent tout seuls. », « Aucune image. », « Pas encore de fiche. ») ; l'action arrive avec son epic.

**Never:**
- Pas de Bandeau « Annuler », Bandeau d'erreur, Dialogue de confirmation, squelettes ni service de traduction des codes (seconde partie de la 1.4, `deferred-work.md`).
- Pas de recherche réelle (Epic 3), de contenu de Notifications (Epic 3), de pages Mon compte, Mes données (1.7) ni Administration (1.5, 1.6), d'accueil mobile « Ajouter une photo » (Epic 5).
- Pas de changement du back ni du contrat OpenAPI ; pas de police d'icônes : icônes SVG reprises de la maquette `key-accueil.html`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Enseignant | `mon-compte` → `administrateur: false` | Coquille ; Menu de profil : Mon compte, Mes données, Déconnexion | N/A |
| Administrateur | `administrateur: true` | Menu de profil avec Administration (avant Déconnexion) | N/A |
| URL directe `/administration` | non administrateur | Redirection vers `/preparations` | N/A |
| Recherche | « galette » + Entrée | `/banque?mot=galette`, entrée Banque mise en évidence | Champ vide : rien |
| Compte inactif | `403 compte.inconnu_ou_inactif` | Page sans coquille : « Votre compte n'est pas actif. Adressez-vous à l'administrateur de l'école. » + « Se déconnecter » | N/A |
| Autre échec de `mon-compte` | `500`, réseau | Page sans coquille : « Votre compte n'a pas pu être chargé. Rechargez la page. » | N/A |
| Écran < 600 px | téléphone | Navigation repliée, ouverte par un bouton « Rubriques » de la barre supérieure | N/A |

</frozen-after-approval>

## Code Map

- `front/src/styles.scss` -- thème provisoire `mat.theme` (azure) : à remplacer ; `body` utilise déjà `--mat-sys-*`.
- `front/src/app/app.routes.ts`, `app.ts` -- route unique `''` → `Accueil` ; `App` = `<router-outlet />`.
- `front/src/app/accueil/` -- Accueil provisoire (salutation, messages 403/erreur, « Se déconnecter ») : supprimé ; ses deux messages d'erreur et le test du code `compte.inconnu_ou_inactif` passent à la coquille.
- `front/src/app/app.spec.ts` -- tests de l'Accueil (motif `whenStable` + `setTimeout` après `flush`, double `Authentification`) : à réécrire pour la coquille.
- `front/src/app/commun/authentification/authentification.ts` -- `deconnecter()` à réutiliser ; ne pas modifier.
- `front/src/app/api/fn/mon-compte-resource/lire-mon-compte` -- appel généré `lireMonCompte` (`MonCompteDto` : `id`, `nomAffiche`, `administrateur`), via `Api.invoke`.
- `docs/ux-designs/ux-corpus-mots-2026-10-28/.working/key-accueil.html` l. 179-192 -- symboles SVG (`i-prep`, `i-banque`, `i-fiche`, `i-search`, `i-plus`, `i-bell`, `i-img`, `i-import`) ; trait `stroke-width: 2`, `fill: none` ; marque « corpus·mots » au-dessus de la navigation, avatar = initiale sur `tertiary-container`.
- `node_modules/@angular/material/_index.scss` -- `mat.theme`, `mat.theme-overrides` disponibles (Material 22.2).
- `.github/workflows/` job `front` -- refuse déjà toute URL externe dans `dist/` ; y ajouter le contrôle des jetons.
- npm : `@fontsource-variable/nunito` 5.3.0 et `@fontsource/playwrite-fr-moderne` 5.3.0 (OFL-1.1).

## Tasks & Acceptance

**Execution:**
- [x] `front/package.json` -- ajouter les deux polices en version exacte ; script `jetons` (`node scripts/verifier-jetons.mjs`) lancé par `pretest` après `api` -- polices servies par l'application, contrôle en CI.
- [x] `front/src/styles/_jetons.scss` -- rôles clairs par `mat.theme-overrides`, rôles sombres sous `.theme-sombre` ; `--cm-*` pour Sections, types d'image, états, `rounded`, `spacing`, `elevation`, typographies DESIGN (`headline`… `word-cursive-lg`) -- UX-DR-1, 2.
- [x] `front/src/styles.scss` -- polices, `mat.theme` (Nunito, densité 0), jetons, `color-scheme: light`, anneau `:focus-visible` global -- un seul point d'entrée.
- [x] `front/scripts/verifier-jetons.mjs` -- échoue si un `.scss`/`.ts` de `src/app` (hors `api/`) contient une couleur (`#…`, `rgb(`), une ombre ou une longueur en `px`/`rem` littérale -- garde de la règle « aucune valeur en dur ».
- [x] `front/src/app/commun/icones.ts` -- enregistre les SVG de la maquette dans `MatIconRegistry` -- icônes sans police.
- [x] `front/src/app/commun/compte-courant.ts` -- service à signals : charge `lireMonCompte` une fois ; état `compte` / `inactif` / `erreur` -- source du nom et du rôle.
- [x] `front/src/app/coquille/coquille.ts` (+ `.scss`) -- grille marque/barre supérieure/navigation/contenu ; recherche (Entrée → `/banque?mot=`), « + », Notifications (« Aucune notification »), Menu de profil (avatar initiale, nom affiché), `routerLinkActive` ; < 600 px : navigation en `mat-sidenav` `over` -- UX-DR-3, 5, 6.
- [x] `front/src/app/commun/etat-vide/etat-vide.ts` -- carte `surface`, pictogramme dans un cercle `tertiary-container`, phrase, action facultative -- réutilisé par les rubriques.
- [x] `front/src/app/preparations/`, `banque/`, `fiches/`, `compte/` -- pages en État vide (rubriques : phrase seule ; Mon compte, Mes données, Administration : « Cette page arrive bientôt. » + « Retour aux préparations »).
- [x] `front/src/app/app.routes.ts`, `app.ts` -- coquille parente des rubriques, `''` → `preparations`, garde `canMatch` administrateur ; supprimer `accueil/`.
- [x] `front/src/app/coquille/coquille.spec.ts`, `commun/compte-courant.spec.ts`, `app.spec.ts` -- matrice I/O, entrée active, Échap ferme le Menu de profil, ordre DOM des éléments focalisables.
- [x] `.github/workflows/ci.yml` (job `front`) -- vérifier la présence de fichiers `.woff2` dans `dist/` -- preuve d'auto-hébergement.

**Acceptance Criteria:**
- Given le build de production, when on liste `dist/`, then les polices Nunito et Playwrite FR Moderne y sont et aucune URL externe n'apparaît.
- Given un composant de `src/app`, when `npm test` s'exécute, then `verifier-jetons` passe (aucune valeur littérale).
- Given la coquille à 1280 px, when une rubrique s'affiche, then barre supérieure fixe et navigation de 248 px, entrée courante en `secondary-container`.
- Given un menu ouvert, when l'enseignant presse Échap, then il se ferme et le focus revient sur son bouton.

## Implementation Notes

- Écarts assumés : entrée « Se déconnecter » (et non « Déconnexion ») pour la règle des verbes à l'infinitif ; Bouton « + » désactivé mais focalisable (`disabledInteractive`), conforme à l'ordre de tabulation figé ; budgets d'avertissement relevés (initial 500 → 600 kB pour `mat-sidenav` et `mat-menu`, styles de composant 4 → 6 kB pour `coquille.scss`), limites d'erreur inchangées.
- Polices : `.woff2` dans `dist/front/browser/media/` (Nunito par sous-ensembles `unicode-range`, Playwrite FR Moderne latin 400).
- Node local 24.20.0 (le projet vise 26, la CI l'utilise).

## Spec Change Log

## Review Triage Log

Passe 1 (Blind Hunter = BH, Edge Case Hunter = EC, Verification Gap = VG).

| # | Source | Constat | Verdict | Preuve | Route |
|---|--------|---------|---------|--------|-------|
| 1 | VG | `appConfig` réel jamais monté par un test : retirer `withComponentInputBinding()` ou `provideIcones()` casse la prod (NG0950, icônes absentes) sans test rouge | medium | `app.spec.ts` et `coquille.spec.ts` déclarent leurs propres fournisseurs ; `appConfig` n'est importé que par `main.ts` | patch |
| 2 | VG, EC, BH | `verifier-jetons` laisse passer graisses, interlignes, `z-index`, `em`/`vh`, couleurs nommées, `color-mix()`, fichiers `.html`/`.css`, et lit les commentaires | medium | Motifs l. 225-236 et extensions l. 247 ; `font-weight: 900` et `z-index: 2` déjà présents dans `coquille.scss` sans échec | patch (règles étendues, commentaires ignorés, littéraux déplacés en jetons) |
| 3 | VG, BH | Fermeture du tiroir après choix d'une rubrique sur téléphone non testée | low | Seul test mobile : ouverture par « Rubriques » | patch |
| 4 | EC, BH | Page vide pendant le chargement de `mon-compte` (aucun repère, rien d'annoncé) | low | `@switch` sans `@case ('chargement')` | patch (`main` `aria-busy`) |
| 5 | EC | Échec du premier chargement mis en cache pour la session | false | Voulu : la page d'erreur dit « Rechargez la page », qui recharge le service | rejeté |
| 6 | EC, BH | Avatar vide ou demi-caractère pour un nom vide, accent décomposé ou hors plan de base | low | Un `Enseignant` actif a toujours un nom (contrainte SQL, prénom et nom requis par Keycloak) ; correctif = normalisation et repli | rejeté |
| 7 | EC | Raccourci `--mat-sys-body-medium` resté à 0,875rem/1,25rem | low | Vérifié dans `dist/` ; correctif direct : une clé de plus | patch |
| 8 | EC, BH | Rôles Material non listés (secondary, tertiary, surface-dim, shadow, *-fixed…) gardent leur valeur claire sous `.theme-sombre` | low | `theme-sombre` n'émet que `theme-overrides($roles-sombres)` ; mode sombre jamais appliqué | patch (thème sombre généré puis surchargé) |
| 9 | EC | En clair, rôles non listés dérivés d'azure, hors DESIGN.md | false | DESIGN.md ne définit pas ces rôles ; aucun composant de la coquille ne les utilise | rejeté |
| 10 | EC | Page « compte non chargé » sans « Se déconnecter » | low | L'ancien Accueil le proposait ; correctif direct | patch |
| 11 | BH | Pile cursive : Segoe Script avant Playwrite FR Moderne | false | Ordre imposé par DESIGN.md › typography `word-cursive` (Segoe Script provisoire, repli Playwrite hors Windows) | rejeté |
| 12 | BH | Menus hors motif ARIA : `<p>` dans `role="menu"`, menu Notifications sans entrée | medium | Vérifié dans le gabarit de `coquille.ts` | patch (entrée désactivée, nom `aria-hidden`) |
| 13 | BH | `?mot=` sans effet ; « Aucune image. » se lit comme un résultat ; champ non resynchronisé | low | Recherche réelle exclue par l'intention (Epic 3) | rejeté |
| 14 | BH | `deferred-work.md` en `source_spec: none` ; suivi `in-progress` contre spec `in-review` | false | Format prescrit pour un découpage décidé à l'étape 1 ; le suivi passe à `review` à la présentation | rejeté |
| 15 | BH | Budgets relevés sans explication ; sous-ensembles Nunito tous copiés | low | Les sous-ensembles sont chargés par `unicode-range`, non transférés ; correctif = édition de la spec | rejeté |
| 16 | BH | Largeur, couleur, barre fixe et Échap sur Notifications non testés | low | jsdom ne calcule pas la mise en page ; même `mat-menu` que le Menu de profil, testé ; contrôle manuel prévu | rejeté |
| 17 | BH | Anneau de focus retiré de `<main>` après le lien d'évitement | low | `main` `tabindex="-1"`, hors tabulation ; un anneau autour de tout le contenu gênerait la lecture | rejeté |
| 18 | BH | Pages « bientôt » toutes avec le pictogramme Préparation | low | Pages provisoires (1.5, 1.7) ; correctif = icône par route | rejeté |

## Design Notes

Jetons en deux couches : `mat.theme-overrides((primary: #2c6bd1, surface: #fffdf6, …))` fixe les `--mat-sys-*` (les composants Material suivent sans réglage), et `--cm-*` porte ce que Material ne connaît pas. `.theme-sombre` redéfinit les deux couches ; aucune classe ne l'applique.

```scss
.coquille__navigation { width: var(--cm-largeur-navigation); background: var(--mat-sys-surface-container-low); }
```

## Verification

**Commands:**
- `cd front && npm test -- --watch=false` -- expected: tests verts, `verifier-jetons` passé.
- `cd front && npm run build && find dist -name '*.woff2' | head` -- expected: build OK, fichiers de police présents.

**Manual checks:**
- `compose.dev.yaml` + `quarkus:dev` + `npm start` : coquille à 1280 px et à 360 px, parcours au clavier (Tab, Échap), onglet Réseau sans requête hors `localhost`.
