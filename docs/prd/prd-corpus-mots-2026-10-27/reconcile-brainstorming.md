---
title: "Réconciliation : brainstorming du 2026-10-25 → PRD corpus-mots"
created: 2026-10-27
sources:
  - docs/brainstorming/brainstorm-app-vocabulaire-maternelle-2026-10-25/brainstorm-intent.md
  - docs/brainstorming/brainstorm-app-vocabulaire-maternelle-2026-10-25/brainstorm.html
cible:
  - docs/prd/prd-corpus-mots-2026-10-27/prd.md
  - docs/prd/prd-corpus-mots-2026-10-27/addendum.md
---

# Réconciliation : brainstorming → PRD

Seuls les écarts sont listés : éléments manquants, affaiblis, contredits ou abandonnés sans le dire. Les éléments fidèlement repris (polysémie, deux espaces, verser volontaire, pas d'écrasement, import Word/PowerPoint, photo en trois gestes, fiches thématiques, tri par catégorie grammaticale, non commercial, réservé aux enseignants, report en V2 des parents et des vidéos, « c'est mon travail », « la cohérence aide les enfants ») ne sont pas repris ici.

Synthèse : 2 écarts de sévérité haute, 4 de sévérité moyenne, 5 de sévérité basse.

---

## G-1. La détection anti-doublons ne montre plus le travail des collègues (haute)

- **Source :** « alerte immédiate s'il existe déjà, avec la liste des albums où il apparaît » ; « afficher toutes les images déjà utilisées pour ce mot, **les miennes et celles des collègues** » (One Feature Only, « la fonctionnalité phare »). Douleur n°1 : « ne pas savoir si un mot existe déjà dans un autre album ».
- **PRD :** FR-7 limite la détection à Mes mots et à la Banque de l'école. « Les Images non versées d'un collègue ne sont jamais visibles » et `[ASSUMPTION]` : les Albums où un collègue a utilisé le Mot dans Mes mots ne sont pas montrés. Si le collègue n'a rien versé, la fonctionnalité phare répond donc « n'existe pas » alors que le mot a déjà été travaillé dans un autre album de l'école.
- **Pourquoi c'est important :** le respect de l'espace personnel vient du brainstorming (Claire), mais il entre ici en conflit avec le cœur du produit, et l'arbitrage n'a pas été tranché avec Paul. Il est seulement posé en hypothèse.
- **Correction proposée :** en faire une question ouverte explicite (Q-7), ou adopter un compromis. Par exemple, signaler « déjà travaillé par un collègue dans *Album X* » sans montrer l'image non versée, avec une option « demander à le verser ». Ajuster SM-3 si la portée de la détection change.

## G-2. Le flux de suggestions est réduit à ARASAAC pour les mots sans image (haute)

- **Source :** « Saisir, une seule fois : l'enseignant tape, l'appli propose » : « l'appli propose **des images pour chaque mot** » ET « l'appli propose **des mots déjà illustrés** (réutilisation, doublons détectés) » ; « taper les mots, l'album, un module, un thème, **et l'appli fait le reste** ».
- **PRD :**
  - Images : FR-10 ne propose ARASAAC automatiquement que « pour un Mot sans Image ». Si le Mot existe mais qu'aucune image existante ne convient (autre Section, autre Sens), rien n'est proposé : il faut lancer la recherche à la main.
  - Mots : la proposition de mots déjà illustrés n'existe que sous forme réactive (FR-7, sur le mot tapé). Aucune suggestion proactive : par exemple les mots déjà illustrés du même Album ou Module (préparés par un collègue l'an dernier), ou du Thème choisi, que l'enseignant pourrait retenir sans les taper. Dans UJ-1, Claire retape les 14 mots alors que l'Album et ses trois Modules existent déjà.
- **Correction proposée :** ajouter une FR « Suggestions » : (a) à l'ouverture d'un Album/Module/Thème, lister les Mots déjà illustrés qui s'y rattachent (Banque de l'école et Mes mots), à cocher en lot ; (b) proposer des images ARASAAC pour chaque Mot, y compris quand des Images existent déjà, en les classant après les Images existantes. Intégrer ce flux à UJ-1.

## G-3. Les critères d'une bonne image (« simple, claire, peu de détails ») ne pèsent sur rien (moyenne)

- **Source :** « Qu'est-ce qui fait une bonne image pour un enfant de 3 à 5 ans ? Simple, claire, peu de détails » (réponse trouvée en séance) ; pire idée « des images compliquées » → « des images simples, claires, avec peu de détails ».
- **PRD :** seule mention en passant dans la Vision (« trouver des images simples et claires »). « Peu de détails » a disparu. Aucune FR, aucun critère UX, aucun guide pour l'enseignant ou la modération, aucun indicateur (SM-C3 vérifie seulement l'adéquation à la Section).
- **Correction proposée :** inscrire ces critères dans le §5 ou dans une note de conception UX (rappel discret lors du choix ou du versement d'une image, et exemples dans l'aide). L'ajouter à la question de bilan de SM-C3 (« les images étaient-elles simples, claires, peu détaillées ? ») et en faire un motif type de retrait (FR-28).

## G-4. « Fiches imprimées en un clic » devient un parcours en plusieurs étapes via Word (moyenne)

- **Source :** « fiches imprimées **en un clic** (images + mots) pour l'ATSEM » ; pire idée « impossible d'imprimer » → « des fiches imprimées en un clic ».
- **PRD :** FR-22 à FR-25 : choisir une source, trier, choisir un Modèle, des Écritures, exporter en .docx, puis imprimer depuis Word (UJ-4 : « ajuste un titre et l'imprime »). Aucune impression ni PDF directs, et aucun préréglage mémorisé. Le choix de déléguer la mise en page à Word se défend (§7), mais l'écart avec le « un clic » n'est pas assumé.
- **Correction proposée :** soit ajouter une impression ou un PDF directs avec les derniers réglages mémorisés (« réimprimer cette fiche »), soit acter dans le PRD que le « un clic » est abandonné au profit de l'export modifiable, et l'expliquer.

## G-5. « Fiches d'activité » n'est pas défini (moyenne)

- **Source :** job « créer des fiches d'activité à partir des associations mot-image » ; priorité n°3 : « cartes de vocabulaire, fiches d'activité, fiches thématiques ».
- **PRD :** trois Modèles (cartes, liste illustrée, planche). Le terme « fiche d'activité » disparaît, et on ne sait pas si l'un des Modèles le couvre (le §7 exclut les exercices interactifs, pas les fiches d'activité papier).
- **Correction proposée :** demander à Paul ce qu'est une fiche d'activité (par exemple : mots à associer, image et mot à relier, intrus à trouver, loto, mémory) puis soit ajouter un Modèle, soit indiquer explicitement que les trois Modèles en tiennent lieu en V1.

## G-6. La progression du concret à l'abstrait n'est pas modélisée (moyenne)

- **Source :** « En PS, l'image tirée de l'album (concrète, contextualisée). En GS, plusieurs exemples variés **ou une représentation plus abstraite** » ; axe « concret, contextualisé → abstrait » (exemple : *biscuit*). C'est la friction qui a fait naître les images multiples par Section.
- **PRD :** la Vision affirme que la Carte d'identité « gère la progression de la PS à la GS », mais seules les Sections la portent. La « représentation plus abstraite » n'apparaît nulle part (seule la planche de catégorisation est reprise). De plus, l'image de référence de la PS (l'image d'album) est la plus contrainte (jamais versée, Q-1) : le palier PS de la progression repose sur l'élément le plus fragile, ce que Q-1 ne dit qu'en partie.
- **Correction proposée :** préciser au §4.4 comment la progression s'exprime (Section seule, ou un niveau « concret / exemples / abstrait »). Dans FR-8, classer les Images proposées en tenant compte de la Section de la Préparation. Dans Q-1, donner une solution de repli pour la PS (photo personnelle de l'objet, pictogramme) si l'image d'album disparaît.

## G-7. « L'image d'abord, peu de texte » reste un principe non vérifiable (basse)

- **Source :** pire idée « beaucoup trop de texte » → « **l'image d'abord**, et des messages courts et simples » ; contrainte « simple à utiliser, peu de texte, images faciles à imprimer ».
- **PRD :** le §5 « Simplicité » le dit en une phrase. Aucune FR ne l'applique (par exemple, le bandeau de FR-7 présente-t-il d'abord les images ou une liste textuelle d'Albums et de Sens ?). Aucun critère d'acceptation.
- **Correction proposée :** ajouter dans FR-7, FR-8 et FR-13 que les résultats sont présentés d'abord en vignettes, et transmettre ce principe explicitement à la conception UX (DESIGN.md / EXPERIENCE.md).

## G-8. Les Modules sont « définis collectivement », le PRD les fait créer individuellement (basse)

- **Source :** « un module est un découpage pédagogique d'un album, comme un chapitre, **défini collectivement par l'équipe enseignante** ».
- **PRD :** FR-5 : n'importe quel enseignant crée les Modules, et seuls le créateur et l'administrateur les modifient. Le découpage d'un Album appartient donc de fait au premier qui l'a saisi.
- **Correction proposée :** soit l'assumer (le premier propose, l'équipe s'aligne hors de l'application), soit permettre à tout enseignant de proposer un ajustement, ou laisser les Modules modifiables par tous avec un historique.

## G-9. La modération « supprimer des utilisateurs » est remplacée par une désactivation (basse)

- **Source :** « un rôle administrateur peut **supprimer** des éléments **ou des utilisateurs** ».
- **PRD :** FR-27 ne prévoit que désactiver et réactiver un compte. Rien sur la suppression définitive d'un compte ni sur le devenir de ses données (Mes mots, Préparations), ce qui touche aussi le RGPD (droit à l'effacement d'un enseignant qui quitte l'école).
- **Correction proposée :** ajouter la suppression d'un compte, ses effets sur les Images versées et non versées, et le lien avec l'export de réversibilité (§5).

## G-10. Les images existantes affichent leur Section : ce n'est pas explicite (basse)

- **Source :** « Chaque image affiche son sens (pour les mots polysémiques), **la section visée (PS / MS / GS)** et son album d'origine » dans la vue d'un mot existant.
- **PRD :** FR-7 affiche les Sens, les Albums et les Images, et la Carte d'identité se consulte (FR-12). L'affichage direct de la Section et de l'album d'origine sur chaque vignette n'est pas exigé, alors que c'est ce qui permet de choisir vite.
- **Correction proposée :** ajouter à FR-7 : « chaque Image proposée affiche son Sens, ses Sections et son Album d'origine ».

## G-11. Des insights de persona et des nuances des questions ouvertes ont disparu (basse)

- **Source :** Léo : « mémoriser par le mime », « revoir la vidéo plusieurs fois dans la semaine (répétition espacée) » ; Sophie : « fréquence limitée… le vendredi », « sans compte ni installation ». Question ouverte sur les droits d'auteur : banque partagée « **puis avec les parents** ».
- **PRD :** la V2 est mentionnée (§8.2 : envoi du vendredi, vidéos de moins de 30 s), ce qui est suffisant pour le périmètre. En revanche, la justification pédagogique (mime, répétition), les contraintes d'envoi aux parents (sans compte, un clic, fréquence limitée) et la dimension « parents » de la question des droits (Q-1) ne sont conservées nulle part. L'addendum cite les personas Léo et Sophie sans leurs insights.
- **Correction proposée :** compléter la section « Éléments qualitatifs du brainstorming » de l'addendum avec ces insights V2, et ajouter à Q-1 « … et, en V2, l'envoi aux parents ».
