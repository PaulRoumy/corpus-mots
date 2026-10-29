---
title: DESIGN — corpus-mots
status: draft
created: 2026-10-28
updated: 2026-10-28
sources:
  - docs/prd/prd-corpus-mots-2026-10-27/prd.md
  - docs/prd/prd-corpus-mots-2026-10-27/addendum.md
  - docs/briefs/brief-corpus-mots-2026-10-25/brief.md
  - docs/brainstorming/brainstorm-app-vocabulaire-maternelle-2026-10-25/brainstorm.html
  - docs/ux-designs/ux-corpus-mots-2026-10-28/.memlog.md
  - docs/ux-designs/ux-corpus-mots-2026-10-28/.working/directions-1.html
  - docs/ux-designs/ux-corpus-mots-2026-10-28/.working/color-themes-1.html
  - docs/ux-designs/ux-corpus-mots-2026-10-28/.working/ia-2026-10-28.excalidraw
  - docs/ux-designs/ux-corpus-mots-2026-10-28/reconcile-prd.md
  - docs/ux-designs/ux-corpus-mots-2026-10-28/reconcile-brief-brainstorm.md
  - docs/ux-designs/ux-corpus-mots-2026-10-28/review-rubric.md
name: corpus-mots — Cahier Material
description: Interface Material 3 tonale tirée de la palette de classe du brainstorm (papier crème, encre, couleurs d'école) ; Nunito pour l'interface, cursive réservée aux mots de vocabulaire. Mode clair par défaut, jetons sombres « Repères » prêts.
colors:
  # --- Rôles Material 3 — clair (direction 3 « Cahier Material », variante « Repères ») ---
  background: '#fbf5e6'
  surface-container-low: '#f7eedb'
  surface-container: '#f2e7cf'
  surface-container-high: '#ecdfc3'
  surface: '#fffdf6'
  on-surface: '#2a2733'
  on-surface-variant: '#625b6b'
  outline: '#8a8070'
  outline-variant: '#e3d6b8'
  primary: '#2c6bd1'
  on-primary: '#ffffff'
  primary-container: '#dde8fb'
  on-primary-container: '#123a7a'
  secondary-container: '#fdf0c8'
  on-secondary-container: '#5a4300'
  tertiary-container: '#dcf0e2'
  on-tertiary-container: '#1d5f37'
  error: '#b3261e'
  on-error: '#ffffff'
  error-container: '#fbe1d9'
  on-error-container: '#7a1a12'
  # --- Sections (repère = forme + couleur + libellé ; fond carte, texte encre) ---
  section-ps: '#d9472f'
  section-ms: '#b07d00'
  section-gs: '#8455c2'
  # --- Types d'image (couleur de bordure ; + icône + style de bordure) ---
  image-libre: '#2f8f55'
  image-photo: '#0b7a86'
  image-album: '#c2456f'
  image-inconnu: '#8a8070'
  # --- États ---
  etat-a-illustrer-bg: '#fdf0c8'
  etat-a-illustrer-fg: '#5a4300'
  etat-a-illustrer-border: '#ad820f'
  etat-retiree-bg: '#fbe1d9'
  etat-retiree-fg: '#7a1a12'
  etat-versee-bg: '#dcf0e2'
  etat-versee-fg: '#1d5f37'
  # --- Page d'export (document, blanche dans les deux modes) ---
  page-export: '#ffffff'
  # --- Rôles Material 3 — sombre « Repères » (nuit d'encre) ---
  background-dark: '#1a1922'
  surface-container-low-dark: '#1f1e28'
  surface-container-dark: '#25232f'
  surface-container-high-dark: '#2e2c3a'
  surface-dark: '#2a2835'
  on-surface-dark: '#f3f0e8'
  on-surface-variant-dark: '#c3bdcc'
  outline-dark: '#8e879a'
  outline-variant-dark: '#423f50'
  primary-dark: '#9ec0ff'
  on-primary-dark: '#0b2a5c'
  primary-container-dark: '#233a6a'
  on-primary-container-dark: '#d8e4ff'
  secondary-container-dark: '#463a18'
  on-secondary-container-dark: '#ffe08a'
  tertiary-container-dark: '#1f3d2e'
  on-tertiary-container-dark: '#a5e3bd'
  error-dark: '#ffb4a6'
  on-error-dark: '#690005'
  error-container-dark: '#5c2219'
  on-error-container-dark: '#ffdad3'
  section-ps-dark: '#ff8a73'
  section-ms-dark: '#ffd25e'
  section-gs-dark: '#c5a3f5'
  image-libre-dark: '#73d39a'
  image-photo-dark: '#5fd0db'
  image-album-dark: '#ff9ec0'
  image-inconnu-dark: '#8e879a'
  etat-a-illustrer-bg-dark: '#463a18'
  etat-a-illustrer-fg-dark: '#ffe08a'
  etat-a-illustrer-border-dark: '#ffd25e'
  etat-retiree-bg-dark: '#5c2219'
  etat-retiree-fg-dark: '#ffdad3'
  etat-versee-bg-dark: '#1f3d2e'
  etat-versee-fg-dark: '#a5e3bd'
  page-export-dark: '#ffffff'
typography:
  headline:
    fontFamily: Nunito
    fontSize: 28px
    fontWeight: '900'
    lineHeight: '1.2'
  title:
    fontFamily: Nunito
    fontSize: 16px
    fontWeight: '800'
    lineHeight: '1.3'
  body:
    fontFamily: Nunito
    fontSize: 14.5px
    fontWeight: '400'
    lineHeight: '1.45'
  body-sm:
    fontFamily: Nunito
    fontSize: 13px
    fontWeight: '600'
    lineHeight: '1.4'
  label:
    fontFamily: Nunito
    fontSize: 14px
    fontWeight: '800'
    lineHeight: '1.2'
  label-sm:
    fontFamily: Nunito
    fontSize: 12px
    fontWeight: '800'
    lineHeight: '1.2'
  input:
    fontFamily: Nunito
    fontSize: 18px
    fontWeight: '700'
    lineHeight: '1.3'
  word-cursive:
    fontFamily: "'Segoe Script', 'Playwrite FR Moderne', cursive"
    fontSize: 20px
    fontWeight: '400'
    lineHeight: '1.3'
    note: 'Provisoire — police cursive scolaire reportée avec PRD Q-5, à trancher par Paul avant le développement des exports ; repli Playwrite FR Moderne (OFL) auto-hébergée, hors Windows'
  word-cursive-lg:
    fontFamily: "'Segoe Script', 'Playwrite FR Moderne', cursive"
    fontSize: 24px
    fontWeight: '400'
    lineHeight: '1.3'
rounded:
  sm: 8px
  md: 12px
  lg: 16px
  button: 20px
  xl: 24px
  full: 9999px
spacing:
  '1': 4px
  '2': 8px
  '3': 12px
  '4': 16px
  '5': 24px
  '6': 32px
  page-min-width: 1280px
  mobile-gutter: 16px
  mobile-breakpoint: 600px
  sidebar-width: 248px
  side-panel-width: 400px
  grid-card-min-width: 120px
elevation:
  '1': '0 1px 2px rgba(70,50,20,.14), 0 1px 3px 1px rgba(70,50,20,.08)'
  '2': '0 1px 2px rgba(70,50,20,.16), 0 3px 8px 2px rgba(70,50,20,.10)'
components:
  barre-superieure: { background: '{colors.background}', search: '{components.champ-recherche}' }
  navigation-rubriques: { background: '{colors.surface-container-low}', width: '{spacing.sidebar-width}', item-height: 48px, item-radius: '{rounded.xl}', item-active-background: '{colors.secondary-container}', item-active-foreground: '{colors.on-secondary-container}' }
  champ-recherche: { background: '{colors.surface-container}', foreground: '{colors.on-surface-variant}', height: 44px, radius: '{rounded.full}' }
  bouton-plus: { background: '{colors.primary}', foreground: '{colors.on-primary}', height: 48px, radius: '{rounded.xl}' }
  bouton-plein: { background: '{colors.primary}', foreground: '{colors.on-primary}', typography: '{typography.label}', height: 40px, radius: '{rounded.button}', shadow: '{elevation.1}', focus-ring: '2px solid {colors.primary}', focus-ring-offset: 2px }
  bouton-tonal: { background: '{colors.primary-container}', foreground: '{colors.on-primary-container}', typography: '{typography.label}', height: 40px, radius: '{rounded.button}' }
  bouton-texte: { background: 'transparent', foreground: '{colors.primary}', typography: '{typography.label}', height: 40px }
  champ-saisie-rapide: { background: '{colors.surface-container-high}', indicator: '{colors.primary}', typography: '{typography.input}', radius: '{rounded.md} {rounded.md} 0 0' }
  panneau-detection: { background: '{colors.surface}', radius: '{rounded.lg}', shadow: '{elevation.2}' }
  creation-sens: { background: '{colors.surface-container-low}', label-typography: '{typography.label-sm}', radius: '{rounded.md}' }
  selecteur-categorie-grammaticale: { note: 'Menu déroulant Material 3 standard, sans écart', typography: '{typography.body}', height: 40px }
  en-tete-preparation: { background: '{colors.surface-container-low}', title: '{typography.headline}', counter: '{typography.body-sm}', padding: '{spacing.5}', radius: '{rounded.xl}', action: '{components.bouton-plein}' }
  grille-cartes-mot: { gap: '{spacing.3}', column-min-width: '{spacing.grid-card-min-width}' }
  encart-mots-deja-illustres: { background: '{colors.tertiary-container}', foreground: '{colors.on-tertiary-container}', radius: '{rounded.lg}' }
  carte-mot: { background: '{colors.surface}', word: '{typography.word-cursive}', radius: '{rounded.lg}', shadow: '{elevation.1}' }
  carte-a-illustrer: { background: '{colors.etat-a-illustrer-bg}', foreground: '{colors.etat-a-illustrer-fg}', border: '2px dashed {colors.etat-a-illustrer-border}', radius: '{rounded.lg}' }
  panneau-choix-image: { background: '{colors.surface}', width: '{spacing.side-panel-width}', radius: '{rounded.lg}', shadow: '{elevation.2}' }
  case-selection: { size: 18px, target: 40px, background: '{colors.surface}', border: '2px solid {colors.outline}', checked-background: '{colors.primary}', checked-foreground: '{colors.on-primary}', selected-card-ring: '2px solid {colors.primary}', selected-card-background: '{colors.primary-container}' }
  repere-section: { background: '{colors.surface}', foreground: '{colors.on-surface}', typography: '{typography.label-sm}', height: 22px, radius: '{rounded.sm}' }
  badge-type-image: { background: '{colors.surface}', foreground: '{colors.on-surface}', typography: '{typography.label-sm}', height: 22px, radius: '{rounded.sm}' }
  badge-etat:
    typography: '{typography.label-sm}'
    height: 22px
    radius: '{rounded.sm}'
    a-illustrer: { background: '{colors.etat-a-illustrer-bg}', foreground: '{colors.etat-a-illustrer-fg}' }
    retiree: { background: '{colors.etat-retiree-bg}', foreground: '{colors.etat-retiree-fg}' }
    supprimee: { background: '{colors.etat-retiree-bg}', foreground: '{colors.etat-retiree-fg}' }
    versee: { background: '{colors.etat-versee-bg}', foreground: '{colors.etat-versee-fg}' }
  puce-filtre: { background: '{colors.surface}', border: '1px solid {colors.outline-variant}', selected-background: '{colors.secondary-container}', selected-foreground: '{colors.on-secondary-container}', height: 32px, radius: '{rounded.sm}' }
  champ-etiquettes: { note: 'Champ à puces d''entrée Material 3', chip-background: '{colors.secondary-container}', chip-foreground: '{colors.on-secondary-container}', chip-radius: '{rounded.sm}' }
  selecteur-licence: { note: 'Menu déroulant Material 3 standard, liste fermée', typography: '{typography.body}', height: 40px, unshareable-foreground: '{colors.on-surface-variant}' }
  vignette-image: { background: '{colors.surface-container-low}', radius: '{rounded.md}' }
  panneau-carte-identite: { background: '{colors.surface}', width: '{spacing.side-panel-width}', radius: '{rounded.lg}', shadow: '{elevation.2}' }
  bandeau-annuler: { background: '{colors.on-surface}', foreground: '{colors.background}', action: '{colors.primary-container}', radius: '{rounded.sm}', duration: 8s }
  bandeau-erreur: { background: '{colors.error-container}', foreground: '{colors.on-error-container}', action: '{colors.error}', typography: '{typography.body-sm}', radius: '{rounded.md}' }
  dialogue-confirmation: { background: '{colors.surface}', radius: '{rounded.xl}', shadow: '{elevation.2}', confirm-background: '{colors.error}', confirm-foreground: '{colors.on-error}' }
  dialogue-retrait: { background: '{colors.surface}', radius: '{rounded.xl}', shadow: '{elevation.2}', confirm-background: '{colors.error}', confirm-foreground: '{colors.on-error}' }
  zone-depot-import: { background: '{colors.surface-container-low}', border: '2px dashed {colors.outline}', active-background: '{colors.primary-container}', active-border: '2px dashed {colors.primary}', radius: '{rounded.lg}' }
  carte-verification-import: { background: '{colors.surface}', problem-background: '{colors.error-container}', problem-foreground: '{colors.on-error-container}', radius: '{rounded.lg}' }
  barre-actions-lot: { background: '{colors.surface-container-high}', radius: '{rounded.lg}' }
  reglages-fiche: { background: '{colors.surface-container-low}', radius: '{rounded.lg}' }
  apercu-fiche: { background: '{colors.surface}', page: '{colors.page-export}', radius: '{rounded.lg}', shadow: '{elevation.1}' }
  ligne-historique-fiche: { background: '{colors.surface}', typography: '{typography.body}', height: 56px, radius: '{rounded.md}' }
  carte-preparation: { background: '{colors.surface}', radius: '{rounded.lg}', shadow: '{elevation.1}' }
  encart-import: { background: '{colors.primary-container}', foreground: '{colors.on-primary-container}', radius: '{rounded.lg}' }
  etat-vide: { background: '{colors.surface}', illustration: '{colors.tertiary-container}', radius: '{rounded.lg}' }
  selecteur-sections: { height: 40px, radius: '{rounded.md}' }
  bouton-enregistrer-mobile: { background: '{colors.primary}', foreground: '{colors.on-primary}', height: 52px, radius: '{rounded.full}' }
  notifications: { badge: '{colors.error}', panel-background: '{colors.surface}' }
  menu-profil: { background: '{colors.surface-container}', radius: '{rounded.sm}' }
  dialogue-nouvelle-preparation: { background: '{colors.surface}', radius: '{rounded.xl}', shadow: '{elevation.2}' }
  marque-deja-utilisee: { background: '{colors.tertiary-container}', foreground: '{colors.on-tertiary-container}', typography: '{typography.label-sm}', height: 22px, radius: '{rounded.sm}' }
  repere-qualite: { foreground: '{colors.on-surface-variant}', typography: '{typography.body-sm}' }
  carte-import-en-cours: { background: '{colors.primary-container}', foreground: '{colors.on-primary-container}', radius: '{rounded.lg}' }
  bouton-ajouter-photo: { background: '{colors.primary}', foreground: '{colors.on-primary}', typography: '{typography.title}', height: 96px, radius: '{rounded.xl}' }
  rappel-prise-de-vue: { background: '{colors.surface-container}', foreground: '{colors.on-surface}', typography: '{typography.body-sm}', radius: '{rounded.sm}' }
---

# corpus-mots — DESIGN

> Références visuelles : [.working/directions-1.html](.working/directions-1.html) (direction 3 « Cahier Material », retenue), [.working/color-themes-1.html](.working/color-themes-1.html) (variante 4 « Repères », retenue). **Ce document et EXPERIENCE.md priment en cas de conflit avec une maquette** (par exemple : les maquettes montrent encore « Mes mots » et « Banque de l'école » en deux entrées de navigation, GS en vert, une bordure « à illustrer » plus claire, une photo personnelle bleue et une colonne d'aperçu dans la Préparation ; ce n'est plus la décision). Maquettes fidèles à produire pour cinq écrans : accueil, Préparation (à partir de la direction 3, écarts ci-dessus annotés), Génération de Fiche, vérification de l'Import, Banque + Panneau Carte d'identité ; les autres écrans se construisent depuis ces deux documents.

## Brand & Style

corpus-mots est un outil de travail pour enseignants de maternelle, utilisé le soir sur ordinateur personnel, jamais devant les enfants. La règle directrice est **une application simple, aux fonctionnalités rapidement accessibles**.

Le style naît du brainstorm ([brainstorm.html](../../brainstorming/brainstorm-app-vocabulaire-maternelle-2026-10-25/brainstorm.html)) : papier crème, encre violette-noire, couleurs d'école. Il est passé au registre **Material 3** (« un peu plus Material ») : boutons, champs, menus et textes d'interface **standard et reconnaissables**. Le caractère « classe » tient en trois choses seulement : la palette crème, la cursive des mots de vocabulaire, les repères de Section.

**Frontière interface / documents générés.** Tout ce qui précède s'applique à l'interface. Les **Fiches** exportées (Word, PowerPoint) suivent leurs propres principes, ci-dessous. L'Aperçu de Fiche montre le document tel qu'il sera exporté, pas l'interface.

### Fiches (documents générés)

Seul support vu par les enfants (3 à 6 ans) et par l'ATSEM, qui n'a pas de compte : le papier ou la projection est leur interface.

| Principe | Règle |
|---|---|
| Image grande et seule | Une Image par carte, qui domine la carte ; le Mot dessous, dans les Écritures choisies ; aucun décor. |
| Peu de texte | Le titre (toutes les Fiches), la consigne (fiche d'activité), les Mots (article seulement sur demande, FR-28) et les mentions ; rien d'autre. |
| Images simples | Simples, claires, peu de détails (FR-16) : critère de choix en amont, partout où l'on ajoute une Image. |
| Progression PS → GS | Du concret à l'abstrait : en PS, une image concrète et contextualisée (souvent celle de l'album) ; en GS, des planches variées, plusieurs représentations d'un même mot pour catégoriser. |
| Couleur | Autorisée : impression principalement en couleur. Les jetons de l'interface ne s'appliquent pas ; page blanche `{colors.page-export}`. |
| Mentions | Crédits des licences et référence d'Album (titre, auteur) automatiques : pied de page en Word, diapositive finale de crédits en PowerPoint (FR-29). |
| Écritures | Capitales, script, cursive, Arial, sans texte (FR-28). Polices de la cursive scolaire, du script et des capitales **reportées avec Q-5 du PRD** : Segoe Script provisoire, à trancher par Paul avant le développement des exports. |

## Colors

Rôles Material 3 dérivés de la palette du brainstorm. Chaque rôle a une valeur claire et une valeur sombre (suffixe `-dark`). **Le mode sombre est défini ici mais son implémentation n'est pas obligatoire en V1.**

- **Papier (`{colors.background}` #fbf5e6 / #1a1922)** et l'échelle tonale `surface-container-low` → `-high` : la hiérarchie se fait par tons de crème, pas par traits. `{colors.surface}` (#fffdf6) porte les cartes.
- **Encre (`{colors.on-surface}` #2a2733 / #f3f0e8)** : tout le texte. `on-surface-variant` pour les métadonnées.
- **Bleu (`{colors.primary}` #2c6bd1 / #9ec0ff)** : la seule couleur d'action — bouton plein, champ actif, sélection, liens, anneau de focus. `primary-container` pour les boutons tonaux et le fond d'une carte sélectionnée.
- **Jaune (`secondary-container` #fdf0c8)** : élément de navigation actif, puces sélectionnées, étiquettes de Thème.
- **Vert (`tertiary-container` #dcf0e2)** : bonne nouvelle — mots déjà illustrés, « versée ».
- **Rouge (`{colors.error}` #b3261e / #ffb4a6, texte posé dessus `{colors.on-error}` #ffffff / #690005)** : erreurs, bouton de confirmation destructif, image retirée/supprimée uniquement.
- **Sections** — forme + couleur + libellé, jamais la couleur seule ; pas de couple rouge/vert :

| Section | Forme | Clair | Sombre |
|---|---|---|---|
| PS | ● rond | `{colors.section-ps}` #d9472f | #ff8a73 |
| MS | ▲ triangle | `{colors.section-ms}` #b07d00 | #ffd25e |
| GS | ■ carré | `{colors.section-gs}` #8455c2 | #c5a3f5 |

- **Types d'image** — icône + style de bordure + couleur de bordure, libellé sur fond carte à l'encre. La photo personnelle est **bleu-vert**, distincte de `primary` (réservé à la sélection) :

| Type d'image | Icône | Bordure | Clair | Sombre |
|---|---|---|---|---|
| image libre | globe | pleine 2px | `{colors.image-libre}` #2f8f55 | #73d39a |
| photo personnelle | appareil photo | double 3px | `{colors.image-photo}` #0b7a86 | #5fd0db |
| image d'album | livre ouvert | tirets 2px | `{colors.image-album}` #c2456f | #ff9ec0 |
| inconnu | point d'interrogation | pointillés 2px | `{colors.image-inconnu}` #8a8070 | #8e879a |

- **États** : « à illustrer » (crayon, jaune, bordure tirets `{colors.etat-a-illustrer-border}` #ad820f), « image retirée de la banque » (triangle d'alerte, rouge pâle), « versée » (coche, vert pâle) ; marque « déjà utilisée » (historique, vert pâle `tertiary-container`). « image supprimée, à remplacer » `[ASSUMPTION: même traitement visuel que « retirée de la banque »]`. Correspondance par badge : `{components.badge-etat}`.

**Contrastes des paires porteuses** (WCAG 2.x ; calculés dans color-themes-1.html, nouvelles paires recalculées ; cibles 4,5:1 texte, 3:1 non-texte) :

| Paire | Clair | Sombre |
|---|---|---|
| Texte / fond | 13,4 | 15,3 |
| Texte secondaire / carte | 6,4 | 7,9 |
| Bouton plein | 5,1 | 7,6 |
| Bouton tonal | 8,9 | 8,7 |
| Bouton destructif (`on-error` / `error`) | 6,5 | 7,7 |
| Primaire / fond (liens, anneau de focus) | 4,7 | 9,5 |
| Case de sélection cochée, anneau de sélection / carte | 5,0 | 7,9 |
| Erreur / fond | 6,0 | 10,2 |
| Contour / carte (non-texte) | 3,8 | 4,2 |
| Libellé Section ou type / carte | 14,4 | 12,7 |
| Repère PS / MS / GS sur carte | 4,2 / 3,6 / 5,1 | 6,3 / 10,1 / 6,8 |
| Bordure type libre / photo / album / inconnu | 4,0 / 5,0 / 4,7 / 3,8 | 7,9 / 7,9 / 7,5 / 4,2 |
| « à illustrer » / « retirée » / « versée » (texte) | 8,3 / 8,5 / 6,4 | 8,7 / 9,6 / 8,1 |
| Bordure « à illustrer » / carte `surface` · / fond « à illustrer » | 3,4 · 3,1 (#ad820f, foncée depuis #c99512) | 10,1 |

## Typography

- **Nunito partout dans l'interface**, auto-hébergée (aucun CDN tiers, PRD §6.3) : `{typography.headline}` (titre de Préparation, de rubrique), `{typography.title}` (titres de panneau et de carte), `{typography.body}`, `{typography.body-sm}` (métadonnées), `{typography.label}` (boutons), `{typography.label-sm}` (étiquettes de champ, badges), `{typography.input}` (champ de saisie rapide).
- **Cursive uniquement pour les mots de vocabulaire** (`{typography.word-cursive}`, `{typography.word-cursive-lg}`) : cartes de Mot, panneau de détection, aperçus. Jamais pour un bouton, un titre ou un message.
- La police cursive (Segoe Script) est **provisoire** : la cursive scolaire, comme les polices script et capitales des Fiches, est reportée avec Q-5 du PRD, à trancher par Paul avant le développement des exports. Hors Windows, pile de repli : Playwrite FR Moderne (OFL, auto-hébergée), puis `cursive`. L'Aperçu de Fiche utilise toujours la police de l'export.
- Pas de police manuscrite (Segoe Print) dans l'interface.

## Layout & Spacing

- Échelle 4 px : `{spacing.1}` à `{spacing.6}` (4 → 32 px), relevée sur la maquette direction 3. Marges de page `{spacing.5}`, écarts de grille `{spacing.3}`.
- **Ordinateur d'abord** : conçu pour 13 pouces minimum (`{spacing.page-min-width}`, ~1280 px) ; au-delà, les grilles gagnent des colonnes (largeur minimale de carte `{spacing.grid-card-min-width}`), la structure ne change pas.
- **Navigation des rubriques en barre latérale gauche**, largeur fixe `{spacing.sidebar-width}` ; barre supérieure au-dessus du contenu.
- **Écran Préparation**, une seule colonne de contenu, de haut en bas : En-tête de Préparation → Champ de saisie rapide (et Panneau de détection) → Encart « mots déjà illustrés » tant qu'il en reste → Grille de Cartes de Mot. **Pas de colonne d'aperçu permanente.** Le Panneau de choix d'Image s'ouvre à droite (`{spacing.side-panel-width}`) sans masquer la grille.
- Écran de génération de Fiche : réglages à gauche, aperçu de page à droite.
- Banque : grille d'images regroupée par Mot et Sens ; la Carte d'identité s'ouvre en panneau latéral (`{spacing.side-panel-width}`) sans masquer la grille.
- Téléphone (largeur < `{spacing.mobile-breakpoint}`) : seuls l'accueil mobile (Bouton « Ajouter une photo ») et l'ajout de photo sont mis en page pour mobile, une colonne, gouttière `{spacing.mobile-gutter}` ; les autres pages restent lisibles sans optimisation.

## Elevation & Depth

Élévation douce Material 3, teintée de brun (pas de noir pur), au lieu des bordures d'encre et ombres décalées du brainstorm :

- **Élévation 1** — `{elevation.1}` : cartes de Mot, cartes de Préparation, bouton plein, aperçu.
- **Élévation 2** — `{elevation.2}` : panneau de détection, panneaux latéraux, dialogues.
- Le reste de la profondeur vient des tons de surface (`surface-container-low` → `-high`). En sombre, les surfaces s'éclaircissent avec le niveau ; pas d'ombre visible requise.

## Shapes

- `{rounded.sm}` 8 px : puces, badges, repères de Section, étiquettes.
- `{rounded.md}` 12 px : vignettes d'image, champs (coins hauts seulement pour le champ rempli Material), bandeau d'erreur, lignes d'historique.
- `{rounded.lg}` 16 px : cartes et panneaux — la forme signature.
- `{rounded.button}` 20 px : boutons (hauteur 40 px, donc pilule).
- `{rounded.xl}` 24 px : En-tête de Préparation, éléments de navigation, dialogues.
- `{rounded.full}` : champ de recherche, avatar, bouton mobile.
- Aucune rotation, aucun bord irrégulier : les formes sont celles de Material.

## Components

Noms identiques à EXPERIENCE.md › Component Patterns. « Material 3 standard, sans écart » : le composant Material s'applique tel quel avec les jetons de couleur et de typographie ci-dessus.

**Structure et navigation**

- **Barre supérieure** — fond papier ; Champ de recherche, bouton « + », notifications, menu de profil, toujours visibles.
- **Navigation des rubriques** — barre latérale gauche permanente (`{spacing.sidebar-width}`) : Préparations, Banque, Fiches ; éléments 48 px, pilule `{rounded.xl}`, actif en `secondary-container`.
- **Champ de recherche** — pilule `surface-container`, icône loupe, 44 px.
- **Bouton « + »** — bouton plein agrandi (48 px) ; ouvre un menu Material standard.
- **Bouton plein** — action principale de l'écran (une seule par zone) ; focus : anneau `primary` 2 px **décalé de 2 px** sur le fond, visible sur le bouton plein lui-même. **Bouton tonal** — action secondaire (« Tout reprendre », « Créer une fiche avec cette sélection »). **Bouton texte** — action tertiaire (« Autre image », « Nouveau sens »).
- **Menu de profil** — menu Material : Mon compte, Mes données, Administration (admin seulement), Déconnexion. L'entrée Thème clair / sombre reste masquée tant que le mode sombre n'est pas développé.
- **Notifications** — icône cloche dans la barre supérieure, pastille `error` quand non lues ; menu déroulant `surface` sous la cloche.

**Préparation**

- **Dialogue « Nouvelle préparation »** — petite fenêtre Material : Album (recherche + « Créer l'album »), Section, Module, Thème par défaut (facultatif, Champ à étiquettes) ; un bouton plein « Créer ».
- **En-tête de Préparation** — bandeau `surface-container-low`, `{rounded.xl}`, marge interne `{spacing.5}`. À gauche : titre de l'Album en `headline`, Repère de Section (● ▲ ■), Module modifiable (menu), Thème par défaut ; dessous, compteur `body-sm` « N mots, M déjà illustrés » ; champ facultatif « Temps passé ». À droite : Bouton plein « Générer une fiche ».
- **Champ de saisie rapide** — champ rempli Material, `surface-container-high`, indicateur bas 2 px `primary`, valeur en `{typography.input}`, aide « Entrée pour ajouter » à droite.
- **Panneau de détection** — carte élévation 2 sous le champ ; le Mot en cursive `primary`, une ligne d'état, Images proposées en vignettes (première proposition : fond `primary-container` + anneau 2 px `primary`) avec repères de Section, album d'origine, auteur et, le cas échéant, Marque « déjà utilisée ».
- **Création de Sens** — formulaire en ligne, déplié **dans** le panneau qui l'appelle (Panneau de détection, Panneau Carte d'identité), fond `surface-container-low` : libellé court du Sens, Sélecteur de catégorie grammaticale, bouton tonal « Créer le sens ». Jamais un dialogue.
- **Sélecteur de catégorie grammaticale** — menu déroulant Material 3 standard, sans écart ; liste fermée.
- **Encart « mots déjà illustrés »** — `tertiary-container`, rangée de vignettes 56 px, bouton « Tout reprendre ».
- **Grille de Cartes de Mot** — grille à remplissage automatique (colonnes ≥ `{spacing.grid-card-min-width}`, écart `{spacing.3}`), Cartes de Mot et Cartes « à illustrer » dans l'ordre de saisie.
- **Carte de Mot** — `surface`, vignette en haut, Mot en cursive dessous, élévation 1, Case de sélection en haut à gauche ; une Image retirée s'affiche grisée (opacité ≈ 0,4) avec badge d'état rouge.
- **Carte « à illustrer »** — fond et bordure tirets « à illustrer », vignette vide avec « + », suggestions ARASAAC en ligne.
- **Panneau de choix d'Image** — panneau latéral droit, `{spacing.side-panel-width}`, élévation 2 : en tête le Mot en cursive et son Sens ; Repère de qualité ; Images proposées en vignettes dans l'ordre de détection (même rendu que le Panneau de détection) ; bouton texte « Ajouter une image ».
- **Marque « déjà utilisée »** — badge 22 px `tertiary-container`, icône historique + libellé « déjà utilisée », sous la vignette.
- **Repère de qualité** — une ligne `body-sm` en `on-surface-variant` au-dessus de toute liste d'images à choisir : « simple, claire, peu de détails ».

**Images et Banque**

- **Vignette d'Image** — `{rounded.md}`, fond `surface-container-low`, l'image d'abord ; Case de sélection en haut à gauche ; badges sous la vignette.
- **Case de sélection** — case à cocher Material 18 px (cible 40 px) en haut à gauche d'une carte ou vignette ; cochée en `primary` / `on-primary` ; carte sélectionnée : fond `primary-container` + anneau 2 px `primary`. Même rendu dans Préparation, Banque et Import.
- **Barre d'actions en lot** — en haut de la grille, `surface-container-high` : nombre d'éléments sélectionnés, « Tout sélectionner », actions, fermeture (désélectionner).
- **Repère de Section** — badge 22 px, fond carte, texte encre, bordure et forme (● ▲ ■) à la couleur de la Section, libellé PS/MS/GS toujours écrit.
- **Badge de type d'image** — badge 22 px, icône 14 px + libellé, style et couleur de bordure du type.
- **Badge d'état** — badge 22 px, icône + libellé, couleurs de l'état (`a-illustrer`, `retiree`, `supprimee`, `versee` dans `{components.badge-etat}`).
- **Puce de filtre** — puce Material 32 px ; sélectionnée en `secondary-container` avec coche. Sert aussi au filtre de provenance (Mes mots / Banque de l'école / Tout) et aux Écritures.
- **Champ à étiquettes** — champ à puces d'entrée Material 3 (Thèmes) : puces `secondary-container`, `{rounded.sm}` ; suggestions de Thèmes existants en menu sous le champ.
- **Sélecteur de licence** — menu déroulant Material 3 standard, liste fermée ; les licences non versables (Pixabay, autre / inconnue) portent la mention « non partageable » en `on-surface-variant`.
- **Panneau Carte d'identité** — panneau latéral droit, `{spacing.side-panel-width}`, élévation 2 : vignette, puis champs dans l'ordre du Glossaire (Mot, Sens, catégorie grammaticale, Sections, album d'origine, Module, Thèmes, type, source, licence, auteur, propriétaire) ; actions en pied de panneau. Disposition fine fixée par la maquette fidèle « Banque + Panneau Carte d'identité ».

**Retours et dialogues**

- **Bandeau « Annuler »** — snackbar Material : fond encre, texte papier, action « Annuler » en couleur claire.
- **Bandeau d'erreur** — bannière en tête de la zone concernée, `error-container` / `on-error-container`, icône d'alerte, action texte « Réessayer » en `error` ; distincte du Bandeau « Annuler » (reste affichée jusqu'à résolution).
- **Dialogue de confirmation** — dialogue Material ; bouton de confirmation `error` / `on-error` pour une action destructive.
- **Dialogue de retrait** — dialogue Material : boutons radio des quatre motifs de FR-30 (licence non conforme · image d'album · image inadaptée · autre, avec champ texte), bouton « Retirer de la banque » `error` / `on-error`, actif dès qu'un motif est choisi.

**Import**

- **Zone de dépôt de l'Import** — grande zone `surface-container-low`, bordure tirets 2 px `outline`, icône + « Déposer des fichiers .docx ou .pptx » + bouton tonal « Choisir des fichiers » ; survol de dépôt : `primary-container`, bordure `primary`.
- **Carte de vérification d'Import** — une carte par paire ; carte à problème en `error-container` avec libellé (« mot manquant »).

**Fiches**

- **Réglages de Fiche** — colonne gauche : titre, consigne (fiche d'activité seulement), filtres (Thème, Section, catégorie grammaticale) pour une Fiche thématique, modèle, Écritures (puces), interrupteur « Afficher l'article », tri, cartes par page.
- **Aperçu de Fiche** — page `{colors.page-export}` fidèle à l'export ; c'est un document, pas de l'interface (voir Fiches). Crédits et référence d'Album visibles en pied de page (Word) ou en vignette de diapositive finale de crédits (PowerPoint).
- **Ligne d'historique des Fiches** — ligne 56 px `surface` : titre, modèle, source (Préparation ou filtres), date ; bouton tonal « Refaire » à droite.

**Accueil**

- **Carte de Préparation** — accueil : couverture ou vignette, titre de l'Album, repère de Section, compte « n mots · n à illustrer » ; forme définitive fixée par la maquette fidèle de l'accueil.
- **Encart Import** — accueil, `primary-container`, visible tant que la banque de l'enseignant est vide.
- **Carte « Import en cours »** — accueil, `primary-container`, en tête des cartes : nom des fichiers, « n paires à vérifier », bouton tonal « Reprendre ».
- **État vide** — carte `surface`, pictogramme dans un cercle `tertiary-container`, phrase courte, un bouton plein.

**Téléphone**

- **Bouton « Ajouter une photo »** — accueil mobile, pleine largeur, 96 px, icône appareil photo + libellé `title`.
- **Rappel de prise de vue** — une ligne `surface-container` sur l'écran de prise de vue : « Pas d'enfant identifiable · un seul objet, fond uni », suivie du Repère de qualité.
- **Sélecteur de Sections** — trois boutons à bascule 40 px PS/MS/GS, coche quand actif, forme + libellé.
- **Bouton Enregistrer mobile** — pleine largeur, 52 px, pilule.

## Do's and Don'ts

| Faire | Ne pas faire |
|---|---|
| Boutons, champs, menus Material 3 standard | Inventer des contrôles « faits main », boutons à bord d'encre décalé |
| Nunito auto-hébergée pour toute l'interface | Cursive ou manuscrit dans un bouton, un titre, un message ; police servie par un CDN tiers |
| Cursive pour les seuls mots de vocabulaire | Rotations, bords irréguliers, effet papier découpé (piste 1 écartée) |
| Section = forme + couleur + libellé | Distinguer PS/MS/GS par la couleur seule, ou opposer rouge et vert |
| Type d'image = icône + style de bordure | Un type d'image signalé par la seule couleur, ou dans la teinte de `primary` |
| `primary` réservé à l'action, à la sélection et au focus | Bleu décoratif |
| Image d'abord, peu de texte | Paragraphes d'explication dans les écrans |
| Laisser aux Fiches leurs Écritures et leurs couleurs | Appliquer les règles de l'interface aux documents générés |
| Fiche : image grande et seule, peu de texte | Décor, encadrés, consignes longues sur les Fiches |
| Définir chaque jeton en clair et en sombre ; référencer les jetons dans les composants | Ajouter une couleur sans valeur sombre ; une valeur littérale dans un composant |
