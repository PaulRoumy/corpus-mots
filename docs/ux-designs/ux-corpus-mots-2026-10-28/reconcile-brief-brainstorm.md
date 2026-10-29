---
title: Réconciliation — brief + brainstorming → DESIGN.md / EXPERIENCE.md
created: 2026-10-28
focus: idées qualitatives (ton, ressenti, principes, cadrage émotionnel)
sources:
  - docs/briefs/brief-corpus-mots-2026-10-25/brief.md
  - docs/brainstorming/brainstorm-app-vocabulaire-maternelle-2026-10-25/brainstorm-intent.md
  - docs/brainstorming/brainstorm-app-vocabulaire-maternelle-2026-10-25/brainstorm.html
spines:
  - docs/ux-designs/ux-corpus-mots-2026-10-28/DESIGN.md
  - docs/ux-designs/ux-corpus-mots-2026-10-28/EXPERIENCE.md
arbitrage: .memlog.md prime sur les sources (Material plus standard, voix neutre et factuelle, une seule Banque avec filtre de provenance : choix voulus, non signalés comme écarts)
---

# Réconciliation brief + brainstorming → spines UX

Seuls les **écarts** sont listés. Ce qui est fidèlement repris n'apparaît pas : « peu de texte, l'image d'abord » (Voice, Do's), « le papier est son interface » (UJ-4), saisie rapide au clavier, encart Import comme déclencheur de bascule, photos prises hors de la classe, Fiches libres de leurs Écritures.

Synthèse :

| # | Écart | Gravité |
|---|---|---|
| 1 | « C'est mon travail » : le filtre de provenance par défaut et le moment Verser ne protègent pas le sentiment de propriété de Claire | haute |
| 2 | Les Fiches, seul support vu par les enfants et l'ATSEM, n'ont aucun principe de design | haute |
| 3 | « La cohérence aide les enfants » : la raison d'être de la réutilisation est absente | moyenne |
| 4 | Word « seulement pour ajuster » : sans titre ni consigne dans l'application, chaque Fiche repasse par Word | moyenne |
| 5 | Progression PS → GS, du concret à l'abstrait : réduite à un code couleur | moyenne |
| 6 | « Trois gestes » sur téléphone : le parcours en compte cinq | moyenne |
| 7 | « Simple, claire, peu de détails » : repère limité à l'écran Ajouter une image | moyenne |
| 8 | Autonomie « sans l'aide de Paul » : aucune découvrabilité prévue | basse |
| 9 | Polysémie traitée en cas limite | basse |
| 10 | Chaleur du brainstorm : rien ne la porte dans les moments clés | basse |

---

## 1. « C'est mon travail » : partager avec prudence

**Source.** brainstorm.html, parcours de Claire, « une collègue enseignante · partage, avec prudence » :
> « Risque : L'import mélange ses mots et images avec ceux des autres : elle perd ses repères et le sentiment que c'est son travail. »

brainstorm-intent.md : « Le partage n'est adopté que s'il est sûr : personne ne peut casser ni polluer le travail d'un autre enseignant. » Synthèse : « Un partage en confiance ».

**Ce que font les spines.** La décision d'avoir une seule Banque avec un filtre de provenance est légitime (memlog), mais elle reprend précisément le risque nommé par Claire, sans contrepartie :
- la **valeur par défaut** du filtre de provenance (Mes images / École / Toutes) n'est indiquée nulle part ; seul le point culminant d'UJ-2 la suppose sur « Mes images » ;
- le geste **Verser** (UJ-1 étape 9, UJ-3 étape 6) n'a ni microcopie ni retour : rien ne dit à l'enseignante que l'image reste la sienne, que personne ne peut la modifier ni l'écraser, ni si le versement est réversible ;
- « Un partage en confiance » n'apparaît pas comme principe d'expérience, alors que c'est la condition d'adoption.

**Gravité : haute.** C'est la condition d'adoption, et la décision « une seule Banque » le rend plus fragile.

**Correction proposée.**
- EXPERIENCE › Component Patterns › Puce de filtre : « provenance par défaut = Mes images ; le choix est mémorisé ». 
- Ajouter à Interaction Primitives : **« Mon travail reste à moi »**, avec la propriété toujours visible (déjà FR-18), rien n'est écrasé, et Verser partage sans céder.
- Voice and Tone : ajouter une ligne pour Verser, par exemple « Versée dans la Banque de l'école · elle reste à vous, personne ne peut la modifier », et préciser si « Retirer de la banque » est possible pour l'auteur.

## 2. Les Fiches, seul support que voient les enfants et l'ATSEM

**Source.** brainstorm.html : « Pas de compte pour Nadia : le papier est son interface. » ; « Qu'est-ce qui fait une bonne image pour un enfant de 3 à 5 ans ? Simple · Claire · Peu de détails ». Brief : « Destinataires indirects : l'ATSEM […] et les enfants de 3 à 6 ans, qui voient les images projetées ou imprimées ». Contraintes (intent) : « images faciles à imprimer ».

**Ce que font les spines.** DESIGN › Brand & Style exclut à juste titre les Fiches des règles de l'interface (« elles gardent leur liberté »), mais ne leur donne **aucun principe en échange**. Or c'est le seul endroit où le produit touche les enfants, et donc là où la chaleur du brainstorm et le critère « simple, claire, peu de détails » comptent le plus. Rien n'est dit sur la place de l'image par rapport au mot, sur la taille et l'aération des cartes, sur la lisibilité pour un adulte qui anime un atelier sans contexte (Nadia), ni sur l'usage de la couleur à l'impression.

**Gravité : haute.** Toute la valeur produite atterrit sur ce papier ou cette projection.

**Correction proposée.** Ajouter à DESIGN.md une courte section « Fiches (documents générés) » : l'image domine la carte et le mot vient dessous ; une image par carte, sans décor ; marges généreuses pour le découpage ; couleur autorisée mais jamais nécessaire à la compréhension. Pour les supports destinés à l'ATSEM, prévoir un titre et une consigne courte lisibles sans l'enseignant (voir écart 4). Les repères de Section n'apparaissent pas sur les cartes destinées aux enfants `[à confirmer]`.

## 3. « La cohérence aide les enfants »

**Source.** brainstorm.html, Job to Be Done : « Principe directeur : réutiliser au maximum la même image pour un mot d'un album à l'autre. La cohérence aide les enfants. » Intent : « Réutiliser la même image pour un mot d'un album à l'autre (cohérence) ».

**Ce que font les spines.** La réutilisation est très bien outillée (encart, ↓ + Entrée, « Tout reprendre »), mais justifiée uniquement par le **gain de temps**. La raison pédagogique est absente : le mot « cohérence » n'apparaît dans aucune des deux spines. En conséquence, rien n'oriente l'enseignant vers **son** image déjà utilisée pour ce Mot plutôt que vers une autre image disponible : l'ordre FR-9 met en avant la Section, pas « l'image que vos élèves connaissent déjà ».

**Gravité : moyenne.**

**Correction proposée.** EXPERIENCE › Foundation : ajouter un second principe, « Même mot, même image : la cohérence aide les enfants ». Panneau de détection : quand l'enseignant a déjà utilisé une Image pour ce Mot et ce Sens, la placer en première position avec le libellé « déjà utilisée avec vos élèves · *album* ». Dans ce cas, « Autre image » reste un bouton texte, un choix délibéré.

## 4. Word « seulement pour ajuster le résultat final »

**Source.** Brief, critères de réussite : « ils ne reviennent plus à Word pour préparer un album (Word ne sert plus qu'à ajuster le résultat final) ». Brief, solution : « Export en Word et PowerPoint, pour garder la main sur la mise en forme finale. »

**Ce que font les spines.** Les Réglages de Fiche se limitent au modèle, aux Écritures, au tri et au nombre de cartes par page. Il n'y a **ni titre ni consigne**. UJ-4 étape 5 en fait un passage normal : « il ajuste le titre dans Word et imprime ». Chaque Fiche passe donc par Word pour une information de base, ce qui transforme l'ajustement en étape obligatoire et fragilise le critère de réussite.

**Gravité : moyenne.**

**Correction proposée.** Ajouter « Titre » (prérempli : Album · Module, ou Thème) et « Consigne (facultatif) » aux Réglages de Fiche, gardés avec les derniers réglages (FR-29). Réécrire UJ-4 étape 5 : « Export Word ; il imprime directement. Word reste disponible pour un ajustement de mise en page. »

## 5. Progression PS → GS, du concret à l'abstrait

**Source.** brainstorm.html : « une seule image par mot ne convient pas à toutes les sections […] du plus concret au plus abstrait », avec trois cas : « PS · L'image de l'album, concrète et contextualisée » ; « GS · Plusieurs exemples variés, pour travailler la catégorisation » ; « GS · Une représentation plus abstraite, l'idée du mot ». Le brief cite Eduscol : « plusieurs représentations d'un même mot ».

**Ce que font les spines.** La Section est un repère (forme et couleur) et un critère de tri (« Images de votre section en premier »). La Banque regroupe par Mot et Sens, mais **ne montre jamais la progression d'un mot** : les images d'un même Sens, rangées de PS à GS, ne sont pas présentées comme une gradation, alors que c'est l'idée pédagogique forte. Seule la « planche de catégorisation » d'UJ-4 en garde la trace. L'ordre visuel des repères (rouge, jaune, violet) ne suggère pas non plus une progression.

**Gravité : moyenne.**

**Correction proposée.** Banque, groupe Mot + Sens : ordonner les vignettes PS → MS → GS, ce qui rend la gradation visible. Ajouter à la Carte d'identité une ligne « Autres représentations de ce sens » rangée par Section. Dans le Panneau de détection, pour un enseignant de GS, proposer aussi « plusieurs exemples » (sélection multiple d'images pour un même Mot) `[à confirmer avec le modèle de données du PRD]`.

## 6. « Ajout en trois gestes » sur téléphone

**Source.** Intent : « Ajout en 3 gestes : prendre la photo, taper le mot, cocher les sections. » brainstorm.html : « Ajouter depuis le téléphone, en trois gestes ».

**Ce que font les spines.** UJ-3 affirme « photo enregistrée en trois gestes », mais le parcours décrit en compte au moins cinq : ouvrir « Ajouter une photo » (point d'entrée non tranché, Question ouverte 4), photo, Mot, « rattacher au Sens proposé », Sections, Enregistrer. La promesse est reprise comme slogan sans servir de contrainte de conception.

**Gravité : moyenne.**

**Correction proposée.** Faire de « trois gestes » une contrainte écrite d'EXPERIENCE › Responsive & Platform › Téléphone : l'appareil photo s'ouvre dès l'arrivée sur la page mobile, le Sens est rattaché automatiquement quand il est unique, les Sections sont préremplies avec celle de l'enseignant et Enregistrer est le seul bouton. Corriger le point culminant d'UJ-3 pour qu'il corresponde au parcours, ou l'inverse.

## 7. « Simple, claire, peu de détails », partout où l'on choisit une image

**Source.** brainstorm.html (Worst Possible Idea) : « Des images compliquées → Des images simples, claires, avec peu de détails. » Brief : « les illustrer par une image simple et claire ».

**Ce que font les spines.** Le repère (FR-16) n'existe que sur la surface **Ajouter une image**. Or on choisit des images aussi, et plus souvent, dans la carte « à illustrer » (suggestions ARASAAC en ligne), dans le Panneau de détection (Mot nouveau), à l'écran de vérification de l'Import et en prenant une photo sur téléphone. Pour la photo, il n'y a aucun conseil de prise de vue (un seul objet, fond uni).

**Gravité : moyenne.**

**Correction proposée.** Faire du repère « simple, claire, peu de détails » un élément partagé : une ligne discrète au-dessus de toute liste de suggestions d'images. Sur l'écran photo mobile, avant la prise : « Un seul objet, fond uni ». Ajouter « Image d'abord : simple, claire, peu de détails » aux Interaction Primitives.

## 8. Autonomie : « volontairement et en autonomie, sans l'aide de Paul »

**Source.** Brief, critères de réussite : « les 6 enseignants utilisent l'application, volontairement et en autonomie, sans avoir besoin de l'aide de Paul ».

**Ce que font les spines.** La saisie repose sur des gestes clavier invisibles (Entrée garde le focus, ↑ ↓ + Entrée choisit une Image). Le seul indice est « Entrée pour ajouter ». La première utilisation (UJ-5 étape 2) mène à un accueil vide avec l'encart Import, sans rien qui fasse découvrir la Préparation.

**Gravité : basse.** Le principe « simple, rapidement accessible » couvre l'essentiel.

**Correction proposée.** Panneau de détection : afficher un indice discret « ↓ pour choisir » lors des premières utilisations. L'état vide de l'accueil propose les deux portes d'entrée (Importer ou Nouvelle préparation), avec une phrase chacune.

## 9. Polysémie

**Source.** brainstorm.html : bloc dédié « Un mot, plusieurs sens », « étalé · la chute ≠ étalé · la cuisine ». Brief : « Deux complications rendent une simple liste de mots insuffisante : la polysémie… ».

**Ce que font les spines.** Elle est traitée comme un **cas limite** d'UJ-1, avec « Nouveau sens » en bouton texte tertiaire. Sur téléphone, seul « rattacher au Sens proposé » est prévu : on ne peut pas créer de nouveau Sens. C'est fonctionnel, mais l'outil ne met pas en avant ce que les sources présentent comme un apport pédagogique (Eduscol).

**Gravité : basse.**

**Correction proposée.** Panneau de détection : quand un Mot a plusieurs Sens, les afficher côte à côte, comme dans le brainstorm (« étalé · cuisine ≠ étalé · chute »), plutôt qu'en liste. Téléphone : ajouter le choix « Autre sens » à l'étape de rattachement.

## 10. Chaleur du style brainstorm

**Source.** brainstorm.html dans son ensemble : cadrage en « livre » et en « classe » (« portemanteaux », « bons points », « l'étagère vide », « coin des bêtises », « La fin… et le début »).

**Ce que font les spines.** Le passage à Material et à une voix neutre et factuelle est une **décision** (memlog), donc ce n'est pas un écart en soi. Mais la chaleur ne tient plus qu'à trois éléments : la palette crème, la cursive et les repères de Section. Les moments forts, c'est-à-dire les points culminants des parcours (« 10 déjà illustrés », « le travail de trois collègues »), n'ont aucun traitement, et l'État vide utilise un « pictogramme dans un cercle » générique.

**Gravité : basse.** La décision est assumée. Il s'agit seulement de ne pas perdre le peu de chaleur qui reste.

**Correction proposée.** Sans revenir sur la voix neutre, garder pour les états vides et l'encart « mots déjà illustrés » le vocabulaire concret de la classe, comme « l'étagère vide » pour l'accueil avant Import, dans une phrase factuelle. Donner aux pictogrammes d'état vide les couleurs d'école. Quand des Mots déjà illustrés viennent de collègues, afficher dans l'encart « déjà illustrés par l'équipe » avec leurs noms, ce qui rend visible le travail collectif.
