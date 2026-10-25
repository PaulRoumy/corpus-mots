---
title: "Product Brief : application de vocabulaire en maternelle"
status: final
created: 2026-10-25
updated: 2026-10-25
---

# Product Brief : application de vocabulaire en maternelle

## Résumé

En maternelle, préparer le vocabulaire d'un album (choisir les mots, trouver des images simples et claires, monter des fiches) prend environ 6 heures, et ce travail est refait sans cesse : dans Word et PowerPoint, retrouver ce qu'on a déjà fait prend plus de temps que de le refaire. Comme les enseignants d'une même école étudient souvent les mêmes albums, chacun refait aussi le travail de ses collègues.

L'application est un outil web gratuit, réservé aux enseignants, qui rend **la réutilisation plus rapide que la refaite**. Une banque mot-image partagée à l'échelle de l'école signale immédiatement si un mot existe déjà et propose les images déjà utilisées. Chaque image porte son sens, sa section (PS/MS/GS) et son album. À partir de cette banque, l'enseignant génère ses fiches et ses cartes, exportées en Word et PowerPoint.

La V1 vise le confort de 6 enseignants dans une école pilote. Une fois la banque remplie, la V2 permettra ce qu'aucun enseignant ne peut faire aujourd'hui à la main : vérifier la couverture d'un corpus de référence, comme la liste de Boisseau, et choisir les albums qui comblent les manques.

## Le problème

En maternelle, chaque album étudié en classe demande de préparer son vocabulaire : repérer les mots nécessaires à la compréhension, les illustrer par une image simple et claire, puis les projeter, les imprimer et les intégrer à des fiches d'activité.

Aujourd'hui, ce travail se fait dans Word et PowerPoint et coûte environ **6 heures par album**, soit **une trentaine d'heures par an** pour environ 5 albums :

| Étape | Temps estimé |
|---|---|
| Choisir les mots dans l'album | ~1 h |
| Trouver les images (libres de droits ou photos personnelles) | ~2 h 30, le poste le plus long |
| Monter la fiche pédagogique | ~2 h 30, presque autant |

Le cœur du problème n'est pas la recherche elle-même, mais le fait qu'elle est **refaite sans cesse**. Les associations mot-image sont dispersées dans des fichiers par album : retrouver une image déjà choisie pour un mot (et savoir si ce mot a déjà été travaillé dans un autre album) prend plus de temps que d'en chercher une nouvelle. Résultat : chacun refait un travail déjà fait, le sien comme celui de ses collègues qui étudient les mêmes albums.

Deux complications rendent une simple liste de mots insuffisante :

- **la polysémie** : un même mot peut appeler plusieurs images selon le sens (« étalé » après une chute ou en cuisine) ;
- **l'âge** : un même mot ne s'illustre pas de la même façon en PS (l'image de l'album, concrète) et en GS (plusieurs exemples variés ou une représentation plus abstraite).

## La solution

Une application web réservée aux enseignants, qui rend **la réutilisation plus rapide que la refaite**. Elle s'utilise sur ordinateur pour préparer, sur téléphone pour ajouter des photos, et se projette en classe.

- **Une banque mot-image centralisée.** À la saisie d'un mot, l'enseignant voit immédiatement s'il existe déjà, dans quels albums, et quelles images ont déjà été utilisées (les siennes et celles des collègues). Il en réutilise une ou en ajoute une nouvelle, qui coexiste avec les autres.
- **Une carte d'identité par image** : mot, sens, section (PS/MS/GS), album d'origine, module, thème, catégorie grammaticale. C'est elle qui gère la polysémie et la progression par âge, et qui permet de filtrer.
- **Un partage à l'échelle de l'école.** Chaque enseignant a son espace « Mes mots » et choisit ce qu'il verse dans la « Banque de l'école ». Rien n'est écrasé ; un administrateur modère. Les images tirées des albums restent dans « Mes mots » : seules les images libres de droits et les photos personnelles peuvent être versées dans la « Banque de l'école ».
- **Des fiches générées depuis la banque** : fiches d'activité, fiches thématiques (tous les mots « automne », tous albums confondus), cartes à projeter ou à imprimer, supports pour l'ATSEM. Chaque fiche imprimable associe une image au mot, avec **quatre possibilités d'écriture : cursive, script, Arial, ou sans texte**, combinables sur une même fiche (par exemple script et cursive sous la même image). Export en **Word et PowerPoint**, pour garder la main sur la mise en forme finale.

## Pour qui

- **Utilisateurs : les enseignants de maternelle** d'une école (6 dans l'école pilote), qui étudient souvent les mêmes albums. Ce sont les seuls à avoir un compte.
- **Destinataires indirects** : l'ATSEM, qui anime des ateliers de vocabulaire à partir des fiches imprimées, et les enfants de 3 à 6 ans, qui voient les images projetées ou imprimées. Ni l'une ni les autres n'accèdent à l'application.

## Ce qui rend le projet différent

Aucun outil existant ne réunit banque partagée, détection des doublons et organisation par album :

- les imagiers maison sous Word sont éparpillés et refaits par chacun ;
- Picto Selector (pictogrammes ARASAAC) est un logiciel local, orienté communication alternative, sans organisation par album ;
- Digipad permet de collaborer, mais sans structure mot-image ni génération de fiches.

L'approche suit les recommandations d'Eduscol : plusieurs représentations d'un même mot, travail de la polysémie et de la catégorisation. Enfin, l'outil est conçu par un enseignant, à partir de sa pratique réelle. Il n'y a pas d'avantage technique à revendiquer ; l'atout est l'adéquation au terrain.

## Critères de réussite

Pour la V1, après une année dans l'école pilote, le critère principal est **le confort et la facilité d'usage**, constaté ainsi :

- les 6 enseignants utilisent l'application, **volontairement et en autonomie**, sans avoir besoin de l'aide de Paul, enseignant de l'école et porteur du projet ;
- ils **ne reviennent plus à Word pour préparer un album** (Word ne sert plus qu'à ajuster le résultat final) ;
- chaque nouvel album demande moins de préparation que le précédent, grâce aux mots et images déjà présents.

## Périmètre

**Dans la V1 : la banque et les fiches.**

- saisie rapide des mots d'un album (album, module, thème) ;
- détection des mots existants et réutilisation des images ;
- carte d'identité des images, avec filtres ;
- espaces « Mes mots » et « Banque de l'école », partage volontaire, modération par un administrateur ;
- import des fichiers Word et PowerPoint existants, pour que la banque ne démarre pas à vide ;
- ajout d'images depuis un téléphone (photos personnelles) et depuis des sources libres de droits ;
- génération de fiches et de cartes (image + mot en cursive, script, Arial ou sans texte), avec export Word et PowerPoint.

**Hors V1 :**

- **V2 : le pilotage du corpus.** Importer une liste de référence par section (par exemple la liste de Boisseau), voir quels mots sont couverts et lesquels manquent, et obtenir des combinaisons d'albums déjà saisis qui couvrent le corpus.
- Pistes pour une version ultérieure : envoi hebdomadaire aux parents et vidéos courtes pour les verbes d'action.
- Ouverture à d'autres écoles.
- Tout modèle commercial : l'outil est gratuit et sans publicité.

## Vision

Après une année, la « Banque de l'école » contient les albums étudiés par toute l'équipe. Elle devient alors la base d'un véritable **pilotage de la progression du vocabulaire** de la PS à la GS : savoir ce qui a été travaillé, ce qui manque par rapport au corpus de référence, et quels albums choisir pour combler les manques. Si l'expérience réussit, d'autres écoles pourraient en bénéficier.

## Questions ouvertes

- **Droits des illustrations d'albums.** Décision pour la V1 : l'image tirée de l'album, utile en PS, est autorisée **uniquement dans « Mes mots »** et n'est jamais versée dans la « Banque de l'école ». Reste à vérifier, par exemple auprès de la circonscription, que son stockage en ligne, même dans un espace personnel, relève de l'exception pédagogique.
- **Licences des images libres.** Il faut conserver la source, la licence et l'auteur de chaque image. Points de vigilance : l'attribution exigée par ARASAAC, et l'interdiction faite par Pixabay de redistribuer ses images comme une banque.
- **RGPD.** Les comptes enseignants sont des données personnelles : il faudra se rapprocher du DPD académique.
- **Hébergement et administration.** Où héberger l'application (de préférence dans l'UE), et qui administre l'instance de l'école ?
