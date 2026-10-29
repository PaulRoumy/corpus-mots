---
title: Réconciliation PRD → spines UX — corpus-mots
created: 2026-10-28
source: docs/prd/prd-corpus-mots-2026-10-27/prd.md
spines:
  - docs/ux-designs/ux-corpus-mots-2026-10-28/DESIGN.md
  - docs/ux-designs/ux-corpus-mots-2026-10-28/EXPERIENCE.md
---

# Réconciliation PRD → DESIGN.md / EXPERIENCE.md

Ce document ne liste que les écarts : ce que le PRD implique côté UX et que les spines omettent, affaiblissent ou contredisent. Les éléments repris fidèlement n'y figurent pas. La fusion de Mes mots et de la Banque de l'école en une seule vue Banque avec un filtre de provenance est une décision assumée (memlog). Elle n'est pas traitée comme un écart, sauf quand une règle de confidentialité ou un terme du Glossaire en pâtit (écarts 6 et 7).

Aucune contradiction franche avec une décision du PRD n'a été trouvée. Les écarts sont des omissions ou des affaiblissements.

## Synthèse

| # | Écart | Sévérité |
|---|---|---|
| 1 | Référence de l'Album obligatoire pour une image d'album : absente de « Ajouter une image » et de l'Import | haute |
| 2 | Licence inconnue ou qui interdit la redistribution (Pixabay) : absente des raisons de « Verser indisponible » | haute |
| 3 | Crédits et référence d'Album dans les exports : absents de l'Aperçu de Fiche ; diapositive finale PowerPoint ignorée | moyenne |
| 4 | Rappel « pas d'enfant identifiable » : microcopie prévue, mais rattachée à aucune étape du parcours photo | moyenne |
| 5 | Téléphone : point d'entrée « Ajouter une photo » et première connexion mobile non résolus (UJ-3, FR-2) | moyenne |
| 6 | Glossaire : « Mes images » et « École » remplacent « Mes mots » et « Banque de l'école » dans l'interface | moyenne |
| 7 | Confidentialité de la Banque fusionnée (vues Toutes / École, recherche, filtre propriétaire) : non énoncée | moyenne |
| 8 | Réversibilité : l'export complet de Mes mots n'a aucune surface | moyenne |
| 9 | Catégorie grammaticale : aucun endroit pour la saisir, alors que le tri de UJ-4 en dépend | moyenne |
| 10 | Page d'information RGPD inaccessible avant la création du mot de passe | moyenne |
| 11 | Suppression par le propriétaire d'une Image réutilisée (FR-20) : comportement et message absents | basse |
| 12 | Verser en lot avec une sélection mixte (images d'album, types inconnus) : non spécifié | basse |
| 13 | Gestion des Thèmes, des Modules et correction d'un Album (FR-4, FR-5) : surfaces incomplètes | basse |
| 14 | Valeurs par défaut modifiables mot par mot (FR-6) : aucune surface | basse |
| 15 | Filtres FR-15 : règle Section propre à Mes mots, filtre propriétaire | basse |
| 16 | Réglage « afficher l'article » (FR-28) et Module comme source de Fiche (FR-26) : absents | basse |
| 17 | UJ-4 : « refaire avec hiver » ne tient pas en un clic depuis l'historique | basse |
| 18 | Administration : compte inactif signalé, dernier administrateur, indicateurs sans classement nominatif | basse |
| 19 | Changer le Sens d'une Image réutilisée (FR-14) et modification qui s'applique partout | basse |
| 20 | Import rattaché à une Préparation (FR-25) ; repère qualité sur mobile et à l'Import (FR-16) | basse |

---

## 1. Référence de l'Album obligatoire pour une image d'album — haute

**PRD.** FR-13 : « Une image d'album exige la référence de l'Album (titre, auteur). » §6.1 : « Une image d'album reste toujours dans Mes mots : jamais versée, stockée en basse résolution et toujours accompagnée de la référence de l'Album, y compris sur les exports. »

**Spines.** EXPERIENCE › Surfaces, « Ajouter une image » ne cite que « type, source, licence ». La Carte de vérification d'Import et la Barre d'actions en lot complètent « Album » comme un rattachement pédagogique. Elles n'exigent nulle part la référence de l'Album quand le type est « image d'album ». Dans UJ-2, étape 5, Claire marque les scans « image d'album » en lot. Rien n'impose qu'un Album leur soit rattaché, alors que seuls les fichiers de *Loup* reçoivent un Album à l'étape 4.

**Correctif proposé.** Dans State Patterns, pour « Ajouter une image » et « Import » : quand le type est « image d'album », le champ Album devient obligatoire, et l'enregistrement ou la validation reste bloqué tant qu'il est vide, avec un libellé court comme « Album d'origine requis ». Ajouter ce cas aux cartes à problème de l'Import. Mentionner la basse résolution comme un fait dans la Carte d'identité, sans paragraphe d'explication.

## 2. Licence inconnue ou qui interdit la redistribution (Pixabay) — haute

**PRD.** FR-13 : « Une Image dont la licence est inconnue ou interdit la redistribution (par exemple Pixabay, voir Q-2) reste dans Mes mots et ne peut pas être versée. » §6.1 : « Les images Pixabay ne peuvent pas être versées tant que Q-2 ne l'a pas confirmé. »

**Spines.** Les raisons de « Verser indisponible » sont, dans EXPERIENCE › Component Patterns › Panneau Carte d'identité et dans State Patterns › Carte d'identité : « image d'album, inconnu, sans licence ». Les licences qui interdisent la redistribution (Pixabay) ne figurent pas dans cette liste. Rien ne dit non plus comment la licence est saisie : une liste fermée qui permettrait de repérer ces cas, ou un texte libre.

**Correctif proposé.** Ajouter une quatrième raison : « licence non partageable (ex. Pixabay) ». Préciser que la licence se choisit dans une liste fermée qui contient « Pixabay » et « autre / inconnue », pour que la règle soit applicable. Appliquer la même règle dans la Barre d'actions en lot (voir écart 12).

## 3. Crédits et référence d'Album dans les exports — moyenne

**PRD.** FR-29 : « Chaque export comprend automatiquement les mentions d'attribution […] ainsi que le titre et l'auteur de l'Album pour toute image d'album. Ces mentions apparaissent en bas de page (Word) ou sur une diapositive finale (PowerPoint). »

**Spines.** UJ-4, étape 5, cite les crédits ARASAAC en bas de page Word. L'Aperçu de Fiche, qui « montre la page telle qu'exportée », ne mentionne ni les crédits ni la référence d'Album. La diapositive finale PowerPoint n'apparaît nulle part (UJ-1, étape 8 exporte pourtant en PowerPoint). DESIGN › Aperçu de Fiche ne prévoit aucune zone de crédits.

**Correctif proposé.** Aperçu de Fiche : afficher la zone de crédits en pied de page (Word) et une vignette « diapositive de crédits » (PowerPoint), en lecture seule et non désactivable. Ajouter une ligne à la règle de comportement de l'Aperçu de Fiche.

## 4. Rappel « pas d'enfant identifiable » — moyenne

**PRD.** FR-17 : « Un rappel indique de ne pas photographier d'enfant identifiable. » §6.2 reprend la règle.

**Spines.** La microcopie existe dans Voice and Tone (« Pas d'enfant reconnaissable sur la photo. »). Mais l'Ajout de photo (Surfaces, State Patterns, UJ-3) ne dit pas où ni quand ce rappel apparaît. Le libellé dit aussi « reconnaissable » là où le PRD dit « identifiable ».

**Correctif proposé.** Dans UJ-3, étape 1, et dans State Patterns › Ajout de photo : rappel permanent d'une ligne sur l'écran de prise de vue, ou sous l'aperçu de la photo, sans bloquer l'enregistrement. Aligner le mot sur le PRD (« identifiable ») ou assumer « reconnaissable » comme reformulation.

## 5. Téléphone : point d'entrée et première connexion — moyenne

**PRD.** UJ-3 : « il touche « Ajouter une photo » ». FR-2 : connexion et réinitialisation « sur ordinateur comme sur téléphone » ; session longue sur téléphone.

**Spines.** Le point d'entrée « Ajouter une photo » sur téléphone reste ouvert (Questions ouvertes 4). La Foundation dit que seul l'ajout de photo est optimisé pour le téléphone. Or la Connexion, et Créer mon mot de passe si l'invitation est ouverte sur téléphone, sont nécessaires avant toute photo, et rien ne dit qu'elles fonctionnent sur mobile. UJ-3 compte 4 étapes, dont Enregistrer, pour un point culminant « en trois gestes ».

**Correctif proposé.** Décider d'un accueil mobile réduit à « Ajouter une photo » plus un lien vers l'ordinateur. Ajouter Connexion, Mot de passe oublié et Créer mon mot de passe à la liste des écrans utilisables sur téléphone (Responsive & Platform). Préciser que les trois gestes sont photo, Mot et Sections, Enregistrer étant la validation.

## 6. Termes du Glossaire non repris tels quels — moyenne

**PRD.** §0 : les termes du Glossaire sont « employés tels quels ailleurs ». Glossaire : « Mes mots », « Banque de l'école ». UJ-2 : « ses 80 mots illustrés sont dans « Mes mots » ». UJ-5 et FR-30 : « L'Image retourne dans Mes mots de son propriétaire ».

**Spines.** Le filtre de provenance s'intitule « Mes images / École / Toutes ». Aucun libellé d'interface ne dit « Mes mots » ni « Banque de l'école ». Les notifications de FR-30 (« retourne dans Mes mots ») renverraient donc à un espace que l'utilisateur ne voit nommé nulle part. « Fiche thématique » apparaît aussi comme un terme nouveau, absent du Glossaire.

**Correctif proposé.** Soit libeller le filtre « Mes mots / Banque de l'école / Toutes », soit documenter l'équivalence dans EXPERIENCE et rédiger notifications et messages avec les libellés de l'interface (« Retournée dans Mes images »). Dans les deux cas, signaler l'écart au PRD pour mettre le Glossaire à jour. Faire de même pour « Fiche thématique » : l'ajouter au Glossaire, ou la définir comme une Fiche générée depuis un filtre.

## 7. Confidentialité dans la Banque fusionnée — moyenne

**PRD.** FR-8 : « les Images non versées d'un collègue, et les Albums où il a utilisé le Mot uniquement dans Mes mots, ne sont jamais montrés. Un Mot qui n'existe que dans Mes mots d'un collègue est présenté comme nouveau. » Glossaire : Mes mots, « Seul lui le voit ».

**Spines.** La règle n'est rappelée que pour le Panneau de détection. Pour la vue Banque (provenance « Toutes » et « École »), la Recherche de mot de la barre, l'encart « mots déjà illustrés » et le filtre par propriétaire, rien ne dit que les Images non versées des collègues et leurs Mots privés sont exclus. Puisque la fusion repose sur un filtre, c'est l'endroit où une fuite est le plus probable.

**Correctif proposé.** Ajouter une règle transversale dans Component Patterns › Puce de filtre / Vignette d'Image : « Toutes » = mes Images (versées ou non) + Images versées des collègues, jamais les Images non versées d'un collègue. La recherche et le filtre propriétaire obéissent à la même règle. Un Mot présent seulement dans Mes mots d'un collègue donne « Aucune image ».

## 8. Réversibilité : export de Mes mots — moyenne

**PRD.** §5 Réversibilité : « un enseignant peut exporter tout Mes mots (Images et Cartes d'identité) dans un format ouvert » `[ASSUMPTION]`.

**Spines.** Aucune surface. L'export est seulement listé en Questions ouvertes 8.

**Correctif proposé.** L'héberger dans Menu de profil › Mes données (à côté de la page d'information RGPD) : bouton « Exporter mes images », progression, puis téléchargement d'une archive. Ajouter les états correspondants dans State Patterns.

## 9. Saisie de la catégorie grammaticale — moyenne

**PRD.** FR-10 : « La catégorie grammaticale est saisie au niveau du Sens. Elle est proposée par défaut quand le Mot existe déjà. » UJ-4 trie par catégorie grammaticale, et FR-15 filtre sur elle.

**Spines.** Ni la saisie rapide, ni « Nouveau sens », ni la Carte d'identité ne disent où la catégorie se saisit, ni ce qui se passe pour un Mot nouveau. Sans valeur saisie, le tri de UJ-4 ne fonctionne pas.

**Correctif proposé.** Panneau de détection et création de Sens : sélecteur compact de catégorie (nom, verbe, adjectif…), prérempli quand le Mot existe déjà, facultatif à la saisie et modifiable dans la Carte d'identité. Indiquer dans l'Aperçu de Fiche où vont les Mots sans catégorie quand on trie par catégorie (par exemple un groupe « autres »).

## 10. Page d'information RGPD avant la création du compte — moyenne

**PRD.** FR-3 : « Une page d'information explique quelles données sont conservées, pourquoi, combien de temps et comment en demander l'effacement. » §6.2 renvoie au DPD.

**Spines.** La page n'est accessible que par Menu de profil › Mes données, donc après connexion. L'invitée crée son mot de passe (UJ-5, étape 2) sans avoir vu cette information.

**Correctif proposé.** Ajouter un lien « Données personnelles » sur les écrans Connexion et Créer mon mot de passe, qui renvoie à la même page.

## 11. Suppression par le propriétaire d'une Image réutilisée — basse

**PRD.** FR-20 : si l'Image est réutilisée par un collègue, « elle n'est pas supprimée. Elle est retirée de la banque et disparaît de Mes mots du propriétaire, mais reste visible pour les collègues qui l'utilisent ».

**Spines.** Le Dialogue de confirmation couvre « Supprimer une Image » sans distinguer ce cas. Le propriétaire n'est pas prévenu que l'Image restera visible chez ses collègues.

**Correctif proposé.** Prévoir une variante du dialogue : « Utilisée par 2 collègues : elle disparaîtra de vos images et restera dans leurs préparations, marquée « retirée de la banque ». »

## 12. Verser en lot avec une sélection mixte — basse

**PRD.** FR-19 : « On peut verser plusieurs Images à la fois, par exemple toutes les images libres d'une Préparation », avec les interdits sur l'image d'album, le type inconnu et l'image sans licence.

**Spines.** La Barre d'actions en lot « Verse en lot » sans dire ce qui arrive aux Images non versables présentes dans la sélection.

**Correctif proposé.** Verser les Images versables, puis afficher un résumé : « 4 versées · 2 non versables (image d'album) ». Ne pas bloquer toute l'action.

## 13. Gestion des Thèmes, des Modules et correction d'un Album — basse

**PRD.** FR-4 : « Le créateur et l'administrateur peuvent corriger un Album. » FR-5 : renommer ou supprimer un Module ou un Thème (créateur et administrateur) ; « Un Thème utilisé ne peut pas être supprimé sans réaffecter ses Images. »

**Spines.** Seuls la création (champ à étiquettes, en-tête de Préparation) et la fusion d'Albums (Administration) sont prévues. Rien n'est prévu pour corriger un Album, renommer ou supprimer un Thème ou un Module, ni pour bloquer la suppression d'un Thème utilisé.

**Correctif proposé.** Ajouter « Albums et Thèmes » à l'Administration (corriger, renommer, supprimer avec réaffectation). Ajouter un menu de Module dans l'en-tête de Préparation, réservé au créateur et à l'administrateur.

## 14. Valeurs par défaut modifiables mot par mot — basse

**PRD.** FR-6 : « L'Album, le Module et le Thème choisis s'appliquent par défaut à chaque Mot saisi, et peuvent être modifiés mot par mot. »

**Spines.** Le clic sur une Carte de Mot sert à « changer d'Image ». Aucune surface ne permet de modifier le Module ou le Thème d'un Mot.

**Correctif proposé.** Ajouter « Module, Thème » au menu de la Carte de Mot, ou passer par le Panneau Carte d'identité ouvert depuis la Préparation.

## 15. Filtres FR-15 — basse

**PRD.** FR-15 : filtre « propriétaire » ; « Dans Mes mots, le filtre Section retient aussi les Images utilisées dans une Préparation de cette Section, même si l'Image ne la coche pas. »

**Spines.** Les filtres sont cités en bloc (« Filtres combinables (FR-15) »). La règle Section propre à Mes mots se perd avec la fusion : elle ne s'applique qu'à la provenance « Mes images ».

**Correctif proposé.** Écrire la règle dans Component Patterns › Puce de filtre : avec la provenance Mes images, la Section inclut aussi l'usage dans une Préparation. Le filtre propriétaire ne liste que les collègues qui ont versé des Images (voir écart 7).

## 16. Réglages de Fiche incomplets — basse

**PRD.** FR-28 : « L'article est masqué par défaut et peut être affiché sur demande. » FR-26 : une Fiche peut se générer « à partir d'une Préparation, d'un Module ou du résultat d'un filtre ». FR-27 : nombre de cartes par page réglable.

**Spines.** Les Réglages de Fiche couvrent modèle, Écritures, tri et cartes par page, mais pas l'article. Le Module comme source n'a pas de point d'entrée : la Génération de Fiche part d'une Préparation, des Fiches ou d'un filtre de la Banque.

**Correctif proposé.** Ajouter un interrupteur « Afficher l'article » (désactivé par défaut) dans les Réglages de Fiche. Proposer « Générer une fiche » depuis le menu de Module de l'en-tête de Préparation, ou un filtre Module dans « Fiche thématique ».

## 17. UJ-4 : « refaire avec hiver » en un clic — basse

**PRD.** UJ-4 : « il refait une planche « hiver » : ses réglages ont été gardés, un clic suffit. »

**Spines.** UJ-4, étape 6 : « Fiches → historique → refaire avec « hiver » ». Refaire depuis l'historique rejoue le filtre « automne ». Le passage à « hiver » demande de changer de filtre, et cette étape n'est pas décrite.

**Correctif proposé.** Préciser que « Fiche thématique » reprend les derniers réglages (modèle, Écritures, tri) et que seul le filtre change. Ou permettre de « refaire en changeant le filtre » depuis l'historique.

## 18. Administration : comptes et indicateurs — basse

**PRD.** FR-32 : réactiver un compte ; « Un compte inactif depuis plus d'un an est signalé à l'administrateur » ; « Il y a toujours au moins un administrateur ». FR-34 : « aucun classement nominatif des collègues n'est affiché ».

**Spines.** La réactivation, le signalement des comptes inactifs, le blocage du retrait du dernier administrateur et la règle d'affichage non nominative du Tableau de bord sont absents.

**Correctif proposé.** Administration › Comptes : badge « inactif depuis plus d'un an », action « Réactiver », action désactivée et expliquée sur le dernier administrateur. Tableau de bord : chiffres agrégés seulement, sans tableau trié par enseignant.

## 19. Modifier une Image réutilisée par un collègue — basse

**PRD.** FR-14 : « Une modification de la Carte d'identité s'applique partout où l'Image est utilisée […]. Changer le Sens d'une Image réutilisée par un collègue est impossible : le propriétaire doit ajouter une nouvelle Image. »

**Spines.** Le Panneau Carte d'identité est « modifiable seulement par le propriétaire ». Le propriétaire n'est pas prévenu que sa modification touche les Préparations des collègues, et le champ Sens n'est pas verrouillé en cas de réutilisation.

**Correctif proposé.** Dans la Carte d'identité du propriétaire : mention « utilisée dans n préparations », champ Sens en lecture seule si l'Image est réutilisée par un collègue, avec l'action « Ajouter une nouvelle image ».

## 20. Import rattaché à une Préparation ; repère de qualité — basse

**PRD.** FR-25 : les paires validées sont rattachées « éventuellement à une Préparation ». FR-16 : repère « simple, claire, peu de détails » « À l'ajout d'une Image ».

**Spines.** La Barre d'actions en lot de l'Import ne propose pas de rattacher à une Préparation. Le repère de qualité n'apparaît que dans « Ajouter une image », ni dans l'ajout de photo mobile ni dans l'Import.

**Correctif proposé.** Ajouter « Préparation » aux champs de la Barre d'actions en lot de l'Import. Afficher le repère de qualité en une ligne sur l'écran de prise de vue mobile, à côté du rappel de l'écart 4.
