---
title: EXPERIENCE — corpus-mots
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
---

# corpus-mots — EXPERIENCE

> Les termes en majuscule (Mot, Sens, Image, Préparation, Mes mots, Banque de l'école, Verser, Réutiliser, Import, Fiche, Écriture…) sont ceux du Glossaire du PRD (§3). Les exigences sont citées par leur identifiant FR-n, sans être répétées. **DESIGN.md et ce document priment en cas de conflit avec une maquette ou un schéma de `.working/`.**

## Foundation

| Point | Décision |
|---|---|
| Forme | Application web, **ordinateur d'abord** : écrans 13 à 24 pouces, conçue pour 13 pouces minimum (`{spacing.page-min-width}`). |
| Téléphone | Navigateur mobile, **pour l'ajout de photo** (FR-17, UJ-3) : accueil mobile réduit au Bouton « Ajouter une photo ». Les autres pages restent lisibles sans optimisation. |
| Système d'interface | **Material 3** comme référence de comportement et de composants ; ce document ne précise que l'écart. |
| Identité visuelle | DESIGN.md (direction « Cahier Material », couleurs « Repères » ; principes propres aux Fiches). |
| Contexte d'usage | Préparation le soir, sur ordinateur personnel. **L'application n'est jamais ouverte devant les enfants** : pas de contrainte de lecture à distance ; la projection passe par l'export PowerPoint (FR-29). |
| Principe directeur | Une application simple, aux fonctionnalités rapidement accessibles. |
| Même mot, même image | **La cohérence aide les enfants** : l'Image déjà utilisée par l'enseignant pour un Sens est mise en avant (Marque « déjà utilisée »). |
| Mon travail reste à moi | Mes mots par défaut ; la propriété est toujours visible (FR-18) ; Verser partage sans céder ; rien n'est écrasé. |

## Information Architecture

→ Schéma : [.working/ia-2026-10-28.excalidraw](.working/ia-2026-10-28.excalidraw). Il ne montre ni la Fusion d'Albums, ni la Carte « Import en cours », ni l'export de Mes mots : ce document fait foi.

**Structure.** Trois rubriques : **Préparations** (accueil), **Banque**, **Fiches**, dans une **barre latérale gauche** permanente. Une **barre supérieure permanente** sur toutes les pages ordinateur après connexion :

| Élément de la barre | Contenu |
|---|---|
| Champ de recherche | Toujours visible ; ouvre la Banque filtrée sur le Mot tapé (FR-15). |
| Bouton « + » | Nouvelle préparation · Ajouter une image · Importer des fichiers |
| Notifications | Cloche ; menu déroulant (FR-33) |
| Menu de profil | Mon compte · Mes données (page d'information RGPD + export de Mes mots, FR-3, PRD §5) · Administration *(admin seulement)* · Déconnexion. Thème clair / sombre masqué tant que le mode sombre n'est pas développé. |

**Une seule Banque.** Mes mots et la Banque de l'école ne sont pas deux onglets : une seule vue **Banque** avec un **filtre de provenance** libellé selon le Glossaire : **Mes mots / Banque de l'école / Tout**, **Mes mots par défaut**. Les concepts du PRD (Mes mots privé, Verser) restent inchangés ; FR-18 est réalisé par ce filtre.

**Confidentialité (toutes les vues de la Banque, le Champ de recherche, le filtre propriétaire, le Panneau de détection, le Panneau de choix d'Image, l'Encart « mots déjà illustrés »)** — FR-8 :

| Vue | Montre | Ne montre jamais |
|---|---|---|
| Mes mots | Mes Images, versées ou non | — |
| Banque de l'école | Images versées, de tous | Images non versées d'un collègue |
| Tout | Mes Images + Images versées des collègues | Images non versées d'un collègue ; Albums où un collègue n'a utilisé le Mot que dans Mes mots |
| Champ de recherche, filtre propriétaire | Même règle que Tout ; le filtre propriétaire ne liste que les collègues qui ont versé | Un Mot présent seulement dans Mes mots d'un collègue : « Aucune image » (présenté comme nouveau en Préparation) |

**Référentiels sans écran dédié.**

| Référentiel | Où il se gère |
|---|---|
| Album (FR-4) | Choisi ou créé dans le Dialogue « Nouvelle préparation » : recherche + « Créer l'album », titres proches signalés. **Obligatoire pour une image d'album** (FR-13), y compris en lot à l'Import. Correction : créateur depuis l'En-tête de Préparation ; administrateur et fusion des doublons : Administration › Fusion d'Albums. |
| Module (FR-5) | Dialogue « Nouvelle préparation » ; ensuite depuis l'En-tête de Préparation. Renommer / supprimer : créateur ou administrateur, même menu. |
| Thème (FR-5) | Champ à étiquettes (Thème par défaut du Dialogue « Nouvelle préparation », En-tête de Préparation, Carte d'identité, Import). Renommer / supprimer : créateur ou administrateur, menu de l'étiquette ; Thème utilisé : suppression refusée tant que ses Images ne sont pas réaffectées. |
| Catégorie grammaticale (FR-10) | Saisie avec le Sens : Sélecteur de catégorie grammaticale dans le Panneau de détection et la Création de Sens, prérempli quand le Mot existe ; modifiable dans la Carte d'identité. |
| Licence (FR-13) | Sélecteur de licence, **liste fermée** : ARASAAC (CC BY-NC-SA) · Sclera (CC BY-NC) · Mulberry (CC BY-SA) · domaine public / CC0 · Pixabay · autre / inconnue. Pixabay et autre / inconnue : non versables (Q-2). |

**Surfaces.**

| Surface | Atteinte depuis | Rôle | FR | UJ |
|---|---|---|---|---|
| Connexion · Créer mon mot de passe · Mot de passe oublié | Lien d'invitation, URL | Entrer dans l'application fermée ; lien « Données personnelles » vers la page d'information RGPD ; utilisables sur téléphone | FR-1, FR-2, FR-3 | UJ-5 |
| Préparations (accueil) | Connexion, navigation | Préparations en cours ; Carte « Import en cours » ; Encart Import tant que la banque de l'enseignant est vide | FR-11, FR-23, FR-25 | UJ-1, UJ-2 |
| Dialogue « Nouvelle préparation » | « + », accueil | Album (recherche/création), Section, Module, Thème par défaut facultatif, puis ouverture de la Préparation | FR-4, FR-6 | UJ-1 |
| Préparation | Accueil, Banque (« Utiliser dans une préparation ») | En-tête de Préparation, saisie rapide + détection, Encart « mots déjà illustrés », Grille de Cartes de Mot (« à illustrer » comprises), Panneau de choix d'Image, Verser en lot ; pas de colonne d'aperçu | FR-5, FR-6 à FR-10, FR-12, FR-19 | UJ-1 |
| Banque | Navigation, Champ de recherche | Grille d'images regroupées par Mot et Sens, filtre de provenance (Mes mots par défaut), filtres ; sélection → « Créer une fiche avec cette sélection » | FR-15, FR-18, FR-26 | UJ-4 |
| Carte d'identité (panneau latéral) | Clic sur une Image | Consulter / modifier (enregistrement automatique) ; Verser / Ne plus verser (propriétaire) ; Retirer de la banque (motif) (administrateur) ; Supprimer ; Utiliser dans une préparation | FR-14, FR-19, FR-20, FR-21, FR-30 | UJ-3, UJ-5 |
| Ajouter une image | « + », carte « à illustrer », Panneau de choix d'Image | Recherche ARASAAC, Téléverser ; type, source, Sélecteur de licence, Album si image d'album ; Repère de qualité | FR-12, FR-13, FR-16 | UJ-1 |
| Import : dépôt → vérification → validation | « + », Encart Import, Carte « Import en cours » | Zone de dépôt de l'Import (.docx/.pptx), vérifier et compléter en lot, valider | FR-23 à FR-25 | UJ-2 |
| Fiches | Navigation | Historique (Lignes d'historique des Fiches, « Refaire » en un clic) ; bouton « Fiche thématique » → Génération de Fiche avec ses filtres | FR-26, FR-29 | UJ-4 |
| Génération de Fiche | Préparation (« Générer une fiche »), Fiches (« Fiche thématique », « Refaire »), Banque (« Créer une fiche avec cette sélection ») | Réglages à gauche (titre, consigne, filtres de Fiche thématique…), aperçu à droite avec crédits, export Word / PowerPoint | FR-26 à FR-29 | UJ-1, UJ-4 |
| Notifications | Barre supérieure | Menu déroulant : Image retirée (avec motif) / supprimée, Image Réutilisée retirée | FR-33 | UJ-5 |
| Mon compte · Mes données | Menu de profil ; « Données personnelles » depuis la Connexion | Données de compte ; page d'information RGPD ; « Exporter mes images » (archive de Mes mots) | FR-3 | — |
| Administration : Comptes · Modération · Tableau de bord · Fusion d'Albums | Menu de profil *(admin)* | Inviter, désactiver, réactiver, supprimer, rôle (au moins un administrateur gardé), comptes inactifs signalés ; retrait avec motif, suppression ; correction et fusion d'Albums ; indicateurs | FR-1, FR-4, FR-30 à FR-32, FR-34 | UJ-5 |
| Accueil mobile | Navigateur de largeur < `{spacing.mobile-breakpoint}`, session active | Bouton « Ajouter une photo » seul | FR-2, FR-17 | UJ-3 |
| Ajout de photo (téléphone) | Accueil mobile | Appareil photo direct (ou galerie) → Mot → Sections → Enregistrer ; Rappel de prise de vue | FR-16, FR-17 | UJ-3 |

→ Compositions de référence : [.working/directions-1.html](.working/directions-1.html) (direction 3 : écran Préparation, ajout photo mobile, état vide de l'accueil). Maquettes fidèles à produire (5) : accueil, Préparation, Génération de Fiche, vérification de l'Import, Banque + Panneau Carte d'identité ; les autres écrans se construisent depuis les tableaux de ce document.

## Voice and Tone

Microcopie. Le registre visuel est dans DESIGN.md › Brand & Style. **Vouvoiement, neutre et factuel, peu de texte, l'image d'abord.**

| Faire | Éviter |
|---|---|
| « 9 mots déjà illustrés pour cet album » | « Super ! On a trouvé des mots pour vous ! » |
| « farine — existe déjà · 2 images, dans 1 album » | « Ce mot semble déjà exister dans notre base de données. » |
| « Images de votre section en premier. » · « déjà utilisée » | « Astuce : nous avons trié les images selon votre section. » |
| « Entrée pour ajouter » | « Appuyez sur la touche Entrée de votre clavier pour valider » |
| « Pas encore de préparation. Choisissez un album : les mots déjà illustrés par l'équipe arrivent tout seuls. » | « Bienvenue ! Commencez votre aventure ! » |
| « Pas d'enfant identifiable sur la photo. » (FR-17) | « Attention !! RGPD ! » |
| « simple, claire, peu de détails » (FR-16) | Un paragraphe sur la qualité des images |
| Verser : « L'image reste la vôtre. Les collègues peuvent l'utiliser, personne ne peut la modifier. » | « Êtes-vous sûr de vouloir partager ? » |
| Verser indisponible : « image d'album » · « type inconnu » · « licence à préciser » · « licence non partageable » | « Action impossible. » |
| « Ne plus verser » (propriétaire) · « Retirer de la banque » (administrateur, avec motif) | « Retirer » pour les deux actions |
| « Album d'origine requis » | « Champ obligatoire manquant » |
| « Session expirée. Reconnectez-vous : votre saisie est conservée. » | « Erreur 401 » |
| « image retirée de la banque » · « image supprimée, à remplacer » · « mot manquant » · « à illustrer » · « à compléter » | Codes d'erreur, jargon technique |
| Libellés d'action : verbe à l'infinitif (« Reprendre », « Verser », « Générer une fiche ») | Tutoiement, points d'exclamation, émojis dans l'interface |

## Component Patterns

Comportement. Le visuel est dans DESIGN.md › Components (mêmes noms). « Material 3 standard, sans écart » : comportement Material par défaut.

| Composant | Où | Règles de comportement |
|---|---|---|
| Barre supérieure | Toutes les pages ordinateur | Toujours visible ; ne défile pas. |
| Navigation des rubriques | Barre latérale gauche, toutes les pages ordinateur | Trois entrées ; l'entrée active suit la rubrique de la page. |
| Champ de recherche | Barre supérieure | Recherche par Mot, tolérante casse / accents / article comme FR-8 ; Entrée ouvre la Banque filtrée sur ce Mot. Règle de Confidentialité (§ Information Architecture). |
| Bouton « + » | Barre supérieure | Ouvre un menu de trois choix ; chaque choix ouvre son parcours. |
| Menu de profil | Barre supérieure | Entrée Administration seulement pour un administrateur ; Thème clair / sombre masqué tant que le mode sombre n'est pas développé. |
| Notifications | Barre supérieure | Pastille quand non lues ; menu déroulant sous la cloche ; marquées lues à l'ouverture (FR-33). |
| Bouton plein | Partout | Une seule action principale par zone. |
| Bouton tonal | Partout | Action secondaire (« Tout reprendre », « Créer une fiche avec cette sélection »). |
| Bouton texte | Partout | Action tertiaire (« Autre image », « Nouveau sens »). |
| Dialogue « Nouvelle préparation » | « + », accueil | Album, Section (celle de la dernière Préparation, FR-6), Module, Thème par défaut facultatif (Champ à étiquettes) appliqué à chaque Mot saisi (FR-6) ; « Créer » ouvre la Préparation. Album introuvable : « Créer l'album ». |
| En-tête de Préparation | Haut de la Préparation | Module modifiable sur place (menu, « Nouveau module ») ; Thème par défaut modifiable, appliqué aux Mots saisis ensuite ; compteur « N mots, M déjà illustrés » mis à jour à chaque ajout ; « Temps passé » facultatif (SM-3) ; menu de l'Album : corriger (créateur, FR-4) ; « Générer une fiche » ouvre la Génération de Fiche sur cette Préparation. |
| Champ de saisie rapide | Préparation | Entrée ajoute le Mot et **garde le focus** ; détection pendant la frappe (< 1 s, FR-8) ; un Mot sans Image est accepté et devient « à illustrer » (FR-6). |
| Panneau de détection | Sous le champ de saisie rapide | Mot existant : Sens, Albums, Images ordonnées selon FR-9 — Section d'abord ; à Section égale, l'Image déjà utilisée pour ce Sens en premier avec la Marque « déjà utilisée » ; mes Images avant celles des collègues. Mot nouveau : suggestions ARASAAC (FR-12). Catégorie grammaticale avec le Sens (FR-10). Flèches + Entrée pour choisir ; « Nouveau sens » déplie la Création de Sens. Règle de Confidentialité (§ Information Architecture). |
| Création de Sens | Panneau de détection, Panneau Carte d'identité | Dépliée sur place, jamais en dialogue ; libellé court obligatoire ; Sélecteur de catégorie grammaticale prérempli si le Mot existe (FR-10) ; Entrée ou « Créer le sens » crée et sélectionne le Sens ; Échap replie sans rien créer. |
| Sélecteur de catégorie grammaticale | Création de Sens, Panneau de détection, Panneau Carte d'identité | Material 3 standard, sans écart ; liste fermée ; prérempli avec la catégorie du Sens existant (FR-10). |
| Encart « mots déjà illustrés » | Haut de la Préparation, sous le champ | Apparaît à la création (FR-7), reste tant qu'il reste des Mots à reprendre ; « Tout reprendre » ou choix un par un ; écarter un Mot = geste annulable. |
| Grille de Cartes de Mot | Préparation | Ordre de saisie ; chaque Mot ajouté arrive en fin de grille sans prendre le focus du champ ; Case de sélection sur chaque carte ; actions en lot : Verser, retirer de la Préparation. |
| Carte de Mot | Préparation | Clic ou Entrée : ouvre le Panneau de choix d'Image ; retirer de la Préparation sans confirmation, avec Bandeau « Annuler ». |
| Carte « à illustrer » | Préparation | Suggestions ARASAAC en ligne, « Téléverser » ; choisir une Image fait sortir le Mot de l'état. |
| Panneau de choix d'Image | Préparation (clic sur une Carte de Mot) | Panneau latéral, la grille reste visible ; Images ordonnées comme le Panneau de détection (FR-9), Sens modifiable ; ↑ ↓ + Entrée ou clic choisit et ferme ; « Ajouter une image » ouvre l'ajout pour ce Mot ; Échap ferme sans rien changer. Règle de Confidentialité (§ Information Architecture). |
| Marque « déjà utilisée » | Panneau de détection, Panneau de choix d'Image, Encart « mots déjà illustrés », carte « à illustrer » | Lecture seule ; posée sur l'Image que l'enseignant a déjà utilisée pour ce Sens, à Section égale. Raison : la cohérence aide les enfants. |
| Repère de qualité | Partout où l'on ajoute une Image : Ajouter une image, carte « à illustrer », Panneau de détection (Mot nouveau), Panneau de choix d'Image, Import, ajout de photo | Une ligne « simple, claire, peu de détails » (FR-16) ; jamais bloquant. |
| Vignette d'Image | Banque, détection, Import | Clic : ouvre le panneau Carte d'identité ; la propriété est toujours visible (FR-18). |
| Case de sélection | Cartes de Mot, Vignettes d'Image, Cartes de vérification d'Import | Apparaît au survol et au focus de la carte ; toutes les cases visibles dès qu'une sélection existe ; clic sur la case ou Espace coche sans ouvrir la carte (le clic sur la carte garde son action) ; Maj+clic : plage ; « Tout sélectionner » dans la Barre d'actions en lot ; Échap désélectionne tout. Identique dans Préparation, Banque et Import. |
| Barre d'actions en lot | Import, Préparation, Banque | En haut de la grille dès qu'une sélection existe : nombre sélectionné, « Tout sélectionner », actions. Import : Album, Module, Thème, Sections, type, source, licence (FR-24) ; type « image d'album » : Album exigé pour toute la sélection. Préparation et Banque : Verser en lot (FR-19), les Images non versables restent hors du lot avec leur raison. Banque : « Créer une fiche avec cette sélection ». |
| Repère de Section | Partout où une Section s'affiche | Lecture seule ; en filtre, devient une Puce de filtre. |
| Badge de type d'image | Vignettes, panneau, Import | Lecture seule ; le type se modifie dans la Carte d'identité ou en lot à l'Import. |
| Badge d'état | Cartes de Mot, vignettes | « à illustrer », « image retirée de la banque », « image supprimée, à remplacer », « versée ». |
| Puce de filtre | Banque, Réglages de Fiche | Filtres combinables (FR-15) ; provenance = choix unique **Mes mots / Banque de l'école / Tout**, **Mes mots par défaut** ; avec Mes mots, la Section retient aussi l'usage dans une Préparation (FR-15) ; Écritures : « sans texte » exclut les autres (FR-28). |
| Champ à étiquettes | Dialogue « Nouvelle préparation », En-tête de Préparation, Panneau Carte d'identité, Barre d'actions en lot (Import) | Material 3 standard : frappe → Thèmes existants proposés ; Entrée ajoute ; Thème inconnu : « Créer le thème « … » », visible de tous (FR-5) ; Retour arrière retire la dernière étiquette ; menu de l'étiquette (créateur, administrateur) : renommer, supprimer — refusé si le Thème est utilisé (FR-5). |
| Sélecteur de licence | Ajouter une image, Panneau Carte d'identité, Barre d'actions en lot (Import) | Material 3 standard, liste fermée (§ Information Architecture), aucune saisie libre ; licence non versable marquée « non partageable » et reprise comme raison de Verser indisponible. |
| Panneau Carte d'identité | Banque, Préparation | Panneau latéral, la grille reste visible ; modifiable seulement par le propriétaire (FR-14) ; **enregistrement automatique à la sortie de chaque champ**, sans bouton « Enregistrer » ; Album requis si image d'album ; Verser indisponible avec sa raison exacte (State Patterns) ; Verser confirmé par le message de Voice and Tone ; « Ne plus verser » (propriétaire) et « Retirer de la banque (motif) » (administrateur) : règles en Interaction Primitives. |
| Bandeau « Annuler » | Partout | Gestes courants sans confirmation ; « Annuler » disponible **8 s**, décompte suspendu tant que le pointeur le survole ou que le focus y est ; un seul bandeau à la fois. |
| Bandeau d'erreur | Toutes surfaces (chargement, enregistrement, envoi) | Reste affiché jusqu'au succès de « Réessayer » ou sa fermeture ; la saisie en cours est conservée ; annoncé aux lecteurs d'écran. Différent du Bandeau « Annuler ». |
| Dialogue de confirmation | Actions graves | Supprimer une Image, une Préparation, un compte ; « Ne plus verser » une Image Réutilisée par des collègues. Bouton par défaut = annuler. |
| Dialogue de retrait | Panneau Carte d'identité *(administrateur)* | « Retirer de la banque » exige un motif FR-30 : licence non conforme · image d'album · image inadaptée · autre (texte obligatoire) ; ce dialogue vaut confirmation, pas d'annulation ensuite ; notification au propriétaire avec le motif (FR-33). |
| Zone de dépôt de l'Import | Import | Glisser-déposer ou « Choisir des fichiers » ; plusieurs .docx / .pptx à la fois ; .doc / .ppt : carte de problème du fichier (FR-23). |
| Carte de vérification d'Import | Écran de vérification | Une carte par paire ; Mot corrigeable sur place ; détection FR-8 par carte ; carte à problème bloquante tant qu'elle n'est pas corrigée ou écartée (FR-24), y compris « Album d'origine requis » pour une image d'album. |
| Réglages de Fiche | Génération de Fiche | Titre (toutes les Fiches), consigne (fiche d'activité) ; Fiche thématique : filtres Thème, Section, catégorie grammaticale, provenance (FR-26) ; modèle, Écritures, « Afficher l'article » (désactivé par défaut, FR-28), tri, cartes par page ; chaque changement met l'aperçu à jour ; derniers réglages gardés (FR-29). Word ne sert plus qu'à ajuster. |
| Aperçu de Fiche | Génération de Fiche | Montre la page telle qu'exportée, titre et consigne compris ; Mots désélectionnables avant export (FR-26) ; crédits et référence d'Album visibles, en lecture seule : pied de page (Word), diapositive finale de crédits (PowerPoint). |
| Ligne d'historique des Fiches | Fiches | Une ligne par Fiche exportée ; « Refaire » rouvre la Génération de Fiche avec la même source (Préparation ou filtres) et les mêmes réglages, en un clic (FR-29). |
| Carte de Préparation | Accueil | Ouvre la Préparation ; menu : renommer, dupliquer (choix de la nouvelle Section), supprimer (FR-11). |
| Encart Import | Accueil | Visible tant que la banque de l'enseignant est vide ; ouvre l'Import. |
| Carte « Import en cours » | Accueil | Visible tant qu'un Import interrompu n'est pas validé ; « Reprendre » rouvre la vérification avec les corrections (FR-25). |
| État vide | Toutes surfaces | Une phrase + une action principale. |
| Bouton « Ajouter une photo » | Accueil mobile | Ouvre directement l'appareil photo du téléphone ; appareil photo refusé ou indisponible : « Choisir dans la galerie ». |
| Rappel de prise de vue | Ajout de photo (téléphone) | Une ligne permanente sur l'écran de prise de vue (« Pas d'enfant identifiable »), avec le Repère de qualité ; ne bloque pas. |
| Sélecteur de Sections | Ajout de photo (téléphone) | Cases multiples PS/MS/GS (FR-17). |
| Bouton Enregistrer mobile | Ajout de photo (téléphone) | Actif dès que photo, Mot et au moins une Section sont présents ; le Sens n'est jamais exigé (Mot nouveau : Sens « à compléter » ; Mot à plusieurs Sens : le plus utilisé présélectionné). |

## State Patterns

`[ASSUMPTION: les traitements de chargement et d'erreur génériques ci-dessous suivent les composants Material 3 par défaut ; ils n'ont pas été discutés en séance]` Pas de mode hors connexion : ni file d'attente locale, ni cache d'écriture. « Bandeau d'erreur » = composant du même nom, avec « Réessayer ».

| Surface | Vide | Chargement | Erreur / réseau | États propres |
|---|---|---|---|---|
| Toutes (session expirée) | — | — | Ordinateur : page de Connexion puis retour à la même page, Mot en cours de saisie conservé dans le champ. Téléphone : Connexion puis retour direct à l'ajout de photo. | Session longue sur téléphone (FR-2) |
| Préparations (accueil) | « Pas encore de préparation » + « Nouvelle préparation » ; Encart Import si banque vide | Cartes squelettes | Bandeau d'erreur | Carte « Import en cours » si un Import est interrompu |
| Dialogue « Nouvelle préparation » | Album introuvable : « Créer l'album » | Recherche d'Album pendant la frappe | Message dans le dialogue + « Réessayer » | Titres proches signalés à la création (FR-4) ; Section = celle de la dernière Préparation (FR-6) |
| Préparation | Pas de Mot : champ de saisie rapide au focus | Détection < 1 s (FR-8) ; pas d'indicateur bloquant | Mot saisi conservé dans le champ ; message sous le champ | « à illustrer » (`{colors.etat-a-illustrer-bg}`) ; « image retirée de la banque » et « image supprimée, à remplacer » (vignette grisée, `{colors.etat-retiree-bg}`, choisir une autre Image dans le Panneau de choix d'Image) ; Image Réutilisée non modifiable (FR-21) ; sélection active : Barre d'actions en lot |
| Banque | Filtre sans résultat : « Aucune image » + « Effacer les filtres » ; Mes mots vide : lien vers Import | 500 Images < 2 s (PRD §5) ; vignettes squelettes | Bandeau d'erreur | Ouverte sur Mes mots ; « versée » (`{colors.etat-versee-bg}`) sur ses Images ; propriétaire visible ; sélection active : Barre d'actions en lot |
| Carte d'identité | — | Panneau squelette | Enregistrement à la sortie du champ échoué : valeur gardée et signalée sur le champ + Bandeau d'erreur | Lecture seule si non-propriétaire ; image d'album : basse résolution indiquée, référence d'Album affichée ; Sens « à compléter » mis en avant. **Verser indisponible**, raison exacte : « image d'album » · « type inconnu » · « licence à préciser » (aucune licence) · « licence non partageable » (Pixabay, autre / inconnue) |
| Ajouter une image | Pas de résultat ARASAAC : proposer « Téléverser » | Résultats ARASAAC progressifs | ARASAAC indisponible : message + « Téléverser » | Repère de qualité ; type « image d'album » : Album obligatoire, enregistrement bloqué avec « Album d'origine requis » |
| Import | Aucun fichier déposé : Zone de dépôt de l'Import | Extraction : progression par fichier ; validation : progression par paire | Fichier illisible ou format .doc/.ppt : carte de problème par fichier ; validation partielle : paires créées gardées, les autres restent en vérification + Bandeau d'erreur | Cartes à problème : « mot manquant », image manquante, « Album d'origine requis » (`{components.carte-verification-import}`) ; Mot créé entre-temps par un collègue : rattaché au Mot existant, signalé sur la carte ; Import interrompu repris depuis la Carte « Import en cours » (FR-25) |
| Fiches | Pas encore de Fiche : bouton « Fiche thématique » | Liste squelette | Bandeau d'erreur | — |
| Génération de Fiche | Sélection vide ou filtre sans résultat : « Aucune image » + « Effacer les filtres », export désactivé | Export < 10 s (FR-29) avec progression | Échec d'export : Bandeau d'erreur, réglages conservés | Crédits et référence d'Album toujours présents dans l'aperçu |
| Notifications | « Aucune notification » | — | — | Non lue / lue (lue à l'ouverture du menu) ; retrait : motif affiché |
| Mon compte · Mes données | — | Export de Mes mots : progression puis téléchargement de l'archive | Bandeau d'erreur | Aucun champ permettant une donnée d'élève (FR-3) |
| Administration | Pas d'autre compte : « Inviter » | Squelettes | Bandeau d'erreur | **Admin seulement** : un non-administrateur ne voit pas l'entrée du menu ; accès direct par URL → retour à l'accueil. Compte désactivé : « Réactiver » ; dernier administrateur : retrait du rôle et suppression refusés ; comptes inactifs depuis plus d'un an signalés (FR-32) |
| Ajout de photo (téléphone) | — | Envoi avec progression | Envoi échoué : la photo et la saisie restent à l'écran + « Réessayer » ; appareil photo refusé, indisponible ou capture directe non prise en charge : « Choisir dans la galerie » | Rappel de prise de vue ; « Ce mot existe déjà » : Sens le plus utilisé présélectionné, changement facultatif (FR-17) ; Mot nouveau : Sens par défaut « à compléter », catégorie grammaticale complétée plus tard sur ordinateur |
| Connexion | — | — | Identifiants refusés ; lien d'invitation expiré (FR-1) | Compte désactivé (FR-32) ; lien « Données personnelles » ; session expirée : retour à la page d'origine après connexion |

## Interaction Primitives

- **Saisie rapide au clavier** : Entrée ajoute le Mot et garde le focus ; détection pendant la frappe ; ↑ ↓ + Entrée choisit une Image proposée.
- **Même mot, même image** : l'Image déjà utilisée pour ce Sens est proposée en premier à Section égale, marquée « déjà utilisée » ; « Autre image » reste un choix délibéré.
- **Mon travail reste à moi** : Banque ouverte sur Mes mots ; Verser affiche « L'image reste la vôtre… » ; aucune vue ne montre les Images non versées d'un collègue.
- **Image d'abord : simple, claire, peu de détails** : le Repère de qualité accompagne tout ajout d'Image.
- **Enregistrement automatique** : Carte d'identité et champs d'En-tête de Préparation enregistrés à la sortie de chaque champ ; aucun bouton « Enregistrer » sur ordinateur.
- **Annuler plutôt que confirmer** : retirer un Mot d'une Préparation, écarter une Image ou une paire d'Import, « Ne plus verser » une Image que personne ne Réutilise → sans confirmation, Bandeau « Annuler » 8 s (`{components.bandeau-annuler}`).
- **Confirmer les actions graves** : supprimer une Image, une Préparation, un compte ; « Ne plus verser » une Image Réutilisée par des collègues (Dialogue de confirmation : leurs Préparations afficheront « image retirée de la banque ») ; « Retirer de la banque (motif) » par l'administrateur (Dialogue de retrait).
- **Panneau latéral** pour le détail (Panneau Carte d'identité, Panneau de choix d'Image) : la grille reste visible et utilisable ; Échap ferme le panneau.
- **Sélection puis action en lot** (Préparation, Banque, Import) : Case de sélection au survol ou au focus, Maj+clic pour une plage, « Tout sélectionner » ; la Barre d'actions en lot n'apparaît qu'avec une sélection.
- **Un clic pour refaire** : Fiche refaite depuis la Ligne d'historique des Fiches avec sa source et ses réglages.
- **Interdits** : dialogue sur dialogue (la Création de Sens se déplie sur place) ; confirmation pour un geste annulable ; information portée par la couleur seule ; glisser-déposer comme seul moyen d'une action (la Zone de dépôt de l'Import a aussi « Choisir des fichiers »).

## Accessibility Floor

Comportement. Les contrastes visuels sont dans DESIGN.md › Colors. Socle standard ; aucun besoin particulier signalé dans l'équipe.

- **Clavier complet** : toute action est faisable au clavier ; ordre de tabulation = ordre de lecture ; Échap ferme panneau, menu ou dialogue ; Espace coche une Case de sélection.
- **Focus visible** : anneau `{colors.primary}` 2 px décalé de 2 px sur le fond, visible aussi sur un Bouton plein (`{components.bouton-plein}`).
- **Contrastes AA** : 4,5:1 pour le texte, 3:1 pour les éléments non textuels (y compris la bordure « à illustrer », `{colors.etat-a-illustrer-border}`).
- **Jamais la couleur seule** : Section = forme + couleur + libellé ; type d'image = icône + style de bordure + libellé ; états et Marque « déjà utilisée » = icône + libellé ; sélection = case cochée + anneau.
- Vignettes : texte alternatif = Mot + Sens.
- Bandeau « Annuler » annoncé aux lecteurs d'écran, atteignable au clavier ; décompte de 8 s suspendu au survol et au focus (WCAG 2.2.1).
- Résultats de détection annoncés (`aria-live` poli) sans voler le focus du champ.

## Responsive & Platform

| Contexte | Comportement |
|---|---|
| Ordinateur ≥ ~1280 px | Mise en page de référence : barre latérale gauche + barre supérieure. |
| Grand écran (jusqu'à 24″) | Les grilles (Banque, Préparation, Import) gagnent des colonnes ; barre latérale et panneaux latéraux à largeur fixe. |
| Téléphone (largeur < `{spacing.mobile-breakpoint}`) | Accueil mobile = Bouton « Ajouter une photo », qui ouvre directement l'appareil photo (galerie si refusé ou indisponible) ; **trois gestes** : photo, Mot (Sens présélectionné, changement facultatif), Sections — Enregistrer valide. Connexion, Créer mon mot de passe, Mot de passe oublié utilisables. Autres pages lisibles sans optimisation. Session longue (FR-2). |
| Projection en classe | Hors application : export PowerPoint (FR-29), diapositive finale de crédits. |
| Impression | Hors application : export Word, impression surtout en couleur. |
| Mode sombre | Jetons définis dans DESIGN.md ; non développé en V1, option masquée dans le menu de profil. |

## Inspiration & Anti-patterns

- **Origine :** [brainstorm.html](../../brainstorming/brainstorm-app-vocabulaire-maternelle-2026-10-25/brainstorm.html) — papier crème, encre, couleurs d'école, typographie arrondie, cursive des mots.
- **Retenu :** direction 3 « Cahier Material » ([.working/directions-1.html](.working/directions-1.html)) et couleurs « Repères » ([.working/color-themes-1.html](.working/color-themes-1.html)).
- **Écarté — piste 1 « Cahier d'écolier » :** écriture manuscrite et légères rotations dans l'interface, contraires à « standard et reconnaissable ».
- **Écarté — couleurs « Ardoise » :** Sections en aplats rouge/jaune/vert, la distinction rouge/vert reposant sur la seule teinte.
- **Écarté — deux onglets « Mes mots » / « Banque de l'école » :** remplacés par une seule Banque avec filtre de provenance aux mêmes libellés.
- **Écarté — colonne d'aperçu permanente dans la Préparation :** remplacée par le Panneau de choix d'Image à la demande.
- **Écarté — confirmation systématique :** remplacée par le bandeau « Annuler » pour les gestes courants.
- **Écarté — file d'attente hors connexion** pour la photo : « Réessayer » suffit.

## Key Flows

### UJ-1. Claire prépare *Roule galette* en une soirée au lieu d'un week-end.

Claire, enseignante de MS, sur son ordinateur, déjà connectée — elle part de l'accueil Préparations.

1. « + » → Dialogue « Nouvelle préparation » : elle cherche « Roule galette », l'Album existe avec ses trois Modules ; Section MS proposée par défaut (FR-6) ; Thème « cuisine » par défaut ; « Créer ».
2. La Préparation s'ouvre sous son En-tête de Préparation ; l'Encart « mots déjà illustrés » montre 9 Mots, Images MS en premier (FR-7, FR-9).
3. « Tout reprendre », puis elle écarte un Mot → Bandeau « Annuler ». Un clic sur la Carte de Mot « renard » ouvre le Panneau de choix d'Image : elle préfère l'Image d'une collègue.
4. Champ de saisie rapide : *four*, Entrée, *farine*, Entrée, *rouler*… le focus reste dans le champ ; les cartes s'ajoutent à la Grille de Cartes de Mot.
5. « farine » : le Panneau de détection montre l'Image de Paul ; ↓ + Entrée, elle la retient en un geste. « galette » : son Image de l'an dernier arrive en premier, marquée « déjà utilisée ».
6. « four » : rien n'existe ; suggestions ARASAAC directes sous le Repère de qualité, elle en choisit une.
7. **Point culminant :** l'En-tête de Préparation affiche « 14 mots, 10 déjà illustrés » — elle n'en a cherché que 4.
8. « Générer une fiche » : titre prérempli, modèle cartes, Écritures script + cursive, article masqué ; l'aperçu montre la diapositive de crédits ; export PowerPoint puis Word.
9. Case de sélection sur ses 4 pictogrammes (Maj+clic pour la plage) → Barre d'actions en lot → Verser : « L'image reste la vôtre. Les collègues peuvent l'utiliser, personne ne peut la modifier. »

Cas limite : « étalé » existe au sens cuisine → « Nouveau sens » déplie la Création de Sens : « étalé (chute) », catégorie « adjectif », avec sa propre Image (FR-10).
Échec : ARASAAC indisponible → « Téléverser » reste proposé ; le Mot reste « à illustrer » sinon. Session expirée → connexion, retour à la Préparation, Mot en cours conservé.

### UJ-2. Claire fait entrer ses anciens imagiers dans l'application.

Claire, première utilisation, sur ordinateur.

1. L'accueil est vide : Encart Import → Zone de dépôt de l'Import : *Imagier automne.docx* et *Loup.pptx*.
2. Extraction ; Écran de vérification en grille de Cartes de vérification d'Import.
3. Elle corrige deux Mots mal lus directement sur les cartes.
4. Case de sélection sur la première carte de *Loup*, Maj+clic sur la dernière → Barre d'actions en lot → Album « C'est moi le plus fort ».
5. « Tout sélectionner » → Section, Thème (Champ à étiquettes), type d'image (« image libre, ARASAAC » ; « image d'album » pour les scans, qui exigent leur Album), licence dans le Sélecteur de licence.
6. Valider : progression par paire.
7. **Point culminant :** Banque, ouverte sur Mes mots : ses 80 Mots illustrés, rangés, filtrables, séparés de ceux des collègues.

Cas limite : une carte signalée « mot manquant » ou « Album d'origine requis » → elle complète ou écarte la paire (bandeau « Annuler »).
Échec : Import interrompu → Carte « Import en cours » sur l'accueil, « Reprendre » sans perte des corrections (FR-25) ; validation partielle → paires créées gardées, Bandeau d'erreur « Réessayer » pour les autres. Les images d'album ne proposent jamais Verser.

### UJ-3. Paul ajoute une photo de citrouille depuis le marché.

Paul, enseignant de GS et administrateur, sur son téléphone, session active.

1. Accueil mobile → Bouton « Ajouter une photo » : l'appareil photo s'ouvre directement ; Rappel de prise de vue « Pas d'enfant identifiable ». **Geste 1 :** il prend la citrouille.
2. **Geste 2 :** Mot « citrouille » → « Ce mot existe déjà » : le Sens le plus utilisé est présélectionné, rien à changer.
3. **Geste 3 :** Sélecteur de Sections : PS, MS, GS.
4. Bouton Enregistrer mobile valide.
5. **Point culminant :** photo enregistrée en trois gestes, type « photo personnelle », Paul auteur.
6. Le soir, sur ordinateur : Banque (Mes mots) → Vignette → Panneau Carte d'identité → Thème « automne » (enregistré à la sortie du champ) → Verser.

Cas limite : Mot nouveau → Sens par défaut « à compléter », catégorie grammaticale complétée le soir dans la Carte d'identité.
Échec : envoi impossible faute de réseau → la photo et la saisie restent à l'écran avec « Réessayer » ; pas de file hors connexion. Appareil photo refusé → « Choisir dans la galerie ». Session expirée → connexion puis retour direct à l'ajout de photo.

### UJ-4. Paul imprime une planche « automne » pour l'atelier de Nadia.

Paul, sur ordinateur ; Nadia, l'ATSEM, n'a pas de compte : le papier est son interface.

1. Fiches → « Fiche thématique » : la Génération de Fiche s'ouvre ; dans les Réglages de Fiche, filtres Thème « automne » + Section GS, provenance Tout, tous Albums.
2. Réglages de Fiche : modèle « planche de catégorisation », tri par catégorie grammaticale, Écriture « script + cursive », titre « L'automne », consigne pour Nadia.
3. L'Aperçu de Fiche montre des Mots venus de quatre Albums, crédits ARASAAC en pied de page.
4. **Point culminant :** la planche réunit le travail de trois collègues, sans aucune recherche.
5. Export Word ; il imprime directement. Word reste disponible pour un ajustement de mise en page.
6. La semaine suivante : Fiches → Ligne d'historique des Fiches → « Refaire », Thème changé en « hiver » ; réglages gardés.

Variante : depuis la Banque filtrée, sélection → Barre d'actions en lot → « Créer une fiche avec cette sélection ».
Échec : filtre sans résultat → État vide « Aucune image » + « Effacer les filtres » ; export désactivé.

### UJ-5. Paul accueille une collègue et retire une image versée par erreur.

Paul, administrateur.

1. Menu de profil → Administration → Comptes → Inviter (e-mail).
2. La collègue ouvre le lien → Créer mon mot de passe (lien « Données personnelles » disponible) → accueil vide avec Encart Import.
3. Paul repère dans la Banque une Image sous licence non compatible → Panneau Carte d'identité → « Retirer de la banque » → Dialogue de retrait, motif « licence non conforme ».
4. L'Image retourne dans Mes mots de son auteur ; Notifications : pastille et motif à sa prochaine connexion.
5. **Point culminant :** les Préparations concernées affichent « image retirée de la banque » ; chacun choisit une autre Image, les Fiches déjà exportées ne bougent pas (FR-21).

Échec : lien d'invitation expiré → la collègue voit un message ; Paul renvoie une invitation.

## Questions ouvertes

| # | Point | Statut |
|---|---|---|
| 1 | **Polices des Fiches** (cursive scolaire, script, capitales — PRD Q-5) | Reporté : Segoe Script provisoire, repli Playwrite FR Moderne ; à trancher par **Paul**, avant le développement des exports. |
| 2 | **Chargement et erreurs génériques** : défauts Material 3 non discutés | `[ASSUMPTION]` à valider sur les maquettes fidèles. |
| 3 | **« image supprimée, à remplacer »** : même traitement visuel que « retirée de la banque » ? | `[ASSUMPTION]` (DESIGN.md › Colors). |
| 4 | **Licences Pixabay** (PRD Q-2) : versables si confirmées ? | Non versables tant que Q-2 n'est pas tranchée. |
| 5 | **Largeur des panneaux latéraux** (`{spacing.side-panel-width}`, 400 px) et disposition du Panneau Carte d'identité | À confirmer sur la maquette fidèle Banque + Panneau Carte d'identité. |
