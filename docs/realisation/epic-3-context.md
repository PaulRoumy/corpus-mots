# Epic 3 Context: Partager dans la Banque de l'école et réutiliser le travail des collègues

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Ouvrir le travail de chaque enseignant à l'équipe sans le lui faire céder. L'enseignant parcourt une Banque unique et filtrable, ouverte sur Mes mots, et retrouve par Album tout ce qu'il y a utilisé. Il verse ses Images, une à une ou en lot, et sait pourquoi certaines ne peuvent pas l'être. Il réutilise par lien celles des collègues, retrouve un Mot depuis la barre de recherche et peut ne plus verser une Image. Il supprime ses Images sans casser les Préparations des autres, et il est notifié quand une Image qu'il réutilise est retirée de la Banque. L'epic introduit les états `versee` et `abandonnee`, la règle de versabilité, le module `notifications` et l'état « à remplacer » calculé à la lecture. Les prédicats de visibilité existent depuis l'Epic 2 : détection, Encart et classement s'élargissent d'eux-mêmes à la Banque, sans nouveau code de visibilité. Le principe directeur est « mon travail reste à moi » : la propriété est toujours visible et rien n'est écrasé. La démo du 25 novembre a ajouté la Story 3.7 (filtre Album par usage, Annuler en lot, finitions), à réaliser avant la 3.4.

## Stories

- Story 3.1 : Parcourir la Banque, ouverte sur Mes mots (livrée)
- Story 3.2 : Filtrer la Banque et rechercher un Mot (livrée)
- Story 3.3 : Verser ses Images dans la Banque (livrée)
- Story 3.7 : Filtre Album par usage, Annuler en lot et finitions de la Banque (avant 3.4)
- Story 3.4 : Réutiliser l'Image d'un collègue
- Story 3.5 : Notifications et « Ne plus verser »
- Story 3.6 : Supprimer ses Images sans casser le travail des autres

## Requirements & Constraints

- **Provenance** (choix unique, « Mes mots » par défaut) : Mes mots = toutes mes Images, versées ou non, avec le badge « versée » ; Banque de l'école = les Images versées de tous ; Tout = mes Images plus les Images versées des collègues. Une Image non versée d'un collègue n'apparaît jamais (test). Le propriétaire est visible sur chaque vignette.
- **Performance** : une page de 500 Images en moins de 2 s, avec miniatures, squelettes et pagination `?page=&taille=`. Jeux de test à la volumétrie cible (≈ 5 000 Images, 10 enseignants).
- **Filtres combinables** (ET logique), en paramètres de requête nommés comme les champs : Mot, Sens, Section, Album, Module, Thème, catégorie grammaticale, type d'image, propriétaire.
  - Avec Mes mots, le filtre Section retient aussi les Images utilisées dans une de mes Préparations de cette Section.
  - Le filtre Album retient les images d'album dont c'est l'album d'origine **et** les Images liées dans une Préparation de l'enseignant pour cet Album, quelle que soit la provenance. Le lien d'un collègue ne compte jamais (comme pour Section).
  - Le filtre propriétaire ne liste que moi et les collègues qui ont versé au moins une Image. Sans résultat : « Aucune image » et « Effacer les filtres ».
- **Champ de recherche** de la barre supérieure : Entrée ouvre la Banque filtrée sur le Mot, avec la tolérance de la détection (casse, accents, article). Un Mot qui n'existe que dans Mes mots d'un collègue donne « Aucune image ».
- **Versabilité** :
  - Versable : `image_libre` avec source non vide et licence parmi ARASAAC, Sclera, Mulberry, CC0 ; ou `photo_personnelle`. Une `image_album` ne l'est jamais.
  - Raisons affichées : « image d'album », « type inconnu », « licence à préciser », « licence non partageable » (Pixabay, autre / inconnue) ; image libre sans source refusée. Codes stables testés : `image.versement.image_album`, `.type_inconnu`, `.licence_non_versable`, `.source_manquante`, `.retrait_admin` (un `retrait_admin_motif` bloque jusqu'à une modification de la Carte d'identité).
  - Un Sens « à compléter » ne bloque pas le versement (test dédié) ; il reste mis en avant dans la Carte d'identité.
  - Message après versement : « L'image reste la vôtre. Les collègues peuvent l'utiliser, personne ne peut la modifier. » En lot, les Images non versables restent hors du lot avec leur raison.
- **Réutilisation** : lien `reutilisee`, jamais de copie, Carte d'identité en lecture seule. « Utiliser dans une préparation » crée au besoin le Mot et le Sens retenus. Ajouter une Image à un Sens n'altère jamais les Images ni les liens existants.
- **Ne plus verser** : sans réutilisation par un collègue, retour à `privee` sans confirmation et Bandeau « Annuler » de 8 s ; avec réutilisation, Dialogue de confirmation puis une Notification par enseignant distinct qui a un lien. Chez le collègue, l'Image reste visible dans sa Préparation seulement, grisée avec « image retirée de la banque », n'est plus proposée (`reutilisable = false`) et le Panneau de choix permet d'en choisir une autre.
- **Suppression par le propriétaire** (après confirmation) : sans lien de collègue, effacement avec fichiers et suppression de mes liens dans la même transaction, Mots redevenus « à illustrer » ; avec un lien de collègue, passage à `abandonnee` (disparaît de Mes mots et de la Banque, mes liens supprimés, collègues notifiés), effacée au dernier lien supprimé.
- **Écriture refusée** : toute écriture sur l'Image ou la Préparation d'un autre enseignant répond `403`, vérifié par un test API par ressource d'écriture.
- **Notifications** : uniquement dans l'application ; pastille sur la cloche, menu déroulant, marquées lues à l'ouverture, « Aucune notification » sinon.
- **Commun** : accessibilité AA, vouvoiement, ni émoji ni point d'exclamation ; chaque nouveau `code` d'erreur traduit dans `MESSAGES_PAR_CODE`.

## Technical Decisions

- **Propriétaires** : Banque, filtres, versement et suppression vivent dans `vocabulaire`. Les Notifications sont stockées dans `notifications` mais créées uniquement par `vocabulaire.service` (sens `vocabulaire` → `notifications`). La réutilisation passe par `preparations` → `vocabulaire.Usages`.
- **Visibilité** : `VisibiliteImages` reste le seul arbitre. `proposable` pour la Banque, les filtres, la recherche et les propositions ; `consultable` pour une Image liée, montrée seulement dans la Préparation qui la lie. Un lien ne rend jamais proposable ; le rôle `admin` n'élargit rien. Aucun filtrage d'Images ailleurs, front compris.
- **Filtre Album élargi** : dans `Images.conditionFiltres`, album d'origine **ou** un `lien_image` de l'enseignant courant dont `album_id` vaut le filtre. Aucun changement d'AD ni de contrat de front.
- **Cycle de vie** : seul `vocabulaire.service` change `etat`, une méthode par transition, avec un `Acteur` explicite (`Proprietaire(id)` ici ; l'administrateur arrive par `moderation` en Epic 6). Toute transition prend `SELECT … FOR UPDATE` sur `image` (qui porte `@Version`) : lien et suppression simultanés donnent soit un lien refusé, soit `abandonnee`.
- **Lien de collègue** : un lien dont l'enseignant n'est pas le propriétaire. Un lien `reutilisee` peut viser une Image de l'enseignant lui-même (duplication, reprise, Entrée de la saisie rapide, pictogramme déjà possédé) : tout calcul « réutilisée par des collègues » filtre `lien_image.enseignant_id <> image.proprietaire_id`.
- **Notifications** : créées dans la transaction de la transition (`versee → privee`, `→ abandonnee`). Instantané `type`, `image_id`, `mot_forme`, `sens_libelle`, `motif`, `texte_motif`, `cree_le`, `lue_le` ; jamais le fichier ni le nom de l'acteur. `@Observes` synchrone si un événement sert, jamais `@ObservesAsync`, `REQUIRES_NEW` ni `AFTER_*`.
- **`aRemplacer`** (encore `null` partout) : calculé dans `vocabulaire.service` à la lecture, jamais copié ; `retiree` si l'Image liée n'est plus `versee` et que le lecteur n'en est pas propriétaire, ou `supprimee`. `reutilisable` calculé de même.
- **Carte d'identité d'une Image versée** : `modifierDescription` ignore l'`etat`. Rendre une Image versée non versable (licence, type) doit appliquer la règle du versement : refuser ou la retirer de la Banque (à trancher).
- **REST** : toute représentation d'Image porte `id`, `proprietaireId`, `etat`, `aRemplacer`, `reutilisable`. Noms de DTO et d'énumérations uniques (homonymes = schémas OpenAPI en conflit, non détectés par ArchUnit). Pagination `{ elements, total }`, taille 100 au plus. Propriétaire par identifiant, nom résolu par `commun/annuaire`. Régénérer et versionner `front/openapi/` après tout changement de contrat.
- **Codes d'erreur** : réutiliser `404 image.indisponible` (Image non proposable) et `400 image.sens_different` pour les cas `versee`/`abandonnee` ; liste partagée front `commun/erreurs/codes-image-indisponible.ts`.
- **Écarts connus spine/code**, à ne pas « corriger » sans décision : `Usages` sans `delierImage` ni `changerContextePreparation` ; `TypeImage`, `Licence`, `OrigineLien` traversent les modules ; le Panneau de détection filtre par Sens dans le front.
- **Performance** : `Images.sensVisibles` charge toutes les Images des Sens d'un Mot ; mesurer quand la Banque grossit, remplacer au besoin par une projection filtrée par `proposable`.
- **Migrations** : `V<AAAAMMJJHHMM>__notifications_notification.sql` et migrations `vocabulaire` séparées ; aucune clé étrangère entre modules.
- **Front** : `src/app/banque/` chargé en différé (paquet initial au bord du budget de 600 kB) ; Images par `commun/image-securisee` ; Panneau Carte d'identité de `commun/carte-identite` (gros composant, à découper si on le touche). Bandeau « Annuler » (`bandeau-annuler.ts`) : ajouter une option sans minuterie pour les gestes en lot.

## UX & Interaction Patterns

- **Banque** : une seule vue sans onglets, grille regroupée par Mot et par Sens ; puces de filtre de 32 px (`secondary-container` sélectionnées) et puce de provenance ; état vide de Mes mots : « Ajouter une image ». Une vignette ouvre le Panneau Carte d'identité de 400 px sans masquer la grille, modifiable par le propriétaire, en lecture seule sinon.
- **Finitions (3.7)** : « Temps passé (facultatif) » lisible en entier ; aucun fond de focus résiduel sur une puce de provenance après un clic, mais focus clavier toujours visible ; cartes avec et sans badge « versée » alignées dans la grille.
- **Actions du panneau** : Verser / « Ne plus verser » (propriétaire), Supprimer, « Utiliser dans une préparation ». Verser indisponible affiche la raison exacte. « Ne plus verser » est distinct de « Retirer de la banque » (administrateur, Epic 6).
- **Case de sélection et Barre d'actions en lot**, identiques dans Préparation, Banque et Import : case au survol et au focus, puis toutes dès qu'une sélection existe ; Espace coche sans ouvrir ; Maj+clic plage ; « Tout sélectionner » ; Échap désélectionne. Barre : nombre sélectionné, Verser en lot, et « Retirer de la Préparation » (annulable) dans une Préparation. Carte sélectionnée : fond `primary-container`, anneau `primary` de 2 px.
- **Bandeau « Annuler »** : un seul à la fois, annoncé aux lecteurs d'écran, « Annuler » appelle l'opération inverse. Geste unitaire : 8 s, décompte suspendu au survol et au focus. Geste en lot : aucune minuterie, reste jusqu'au geste suivant (action qui modifie des données ou autre bandeau) ou jusqu'à sa fermeture. Quitter la page le ferme sans annuler.
- **Badges d'état** (icône et libellé, jamais la couleur seule) : « versée » (coche, vert pâle) ; « image retirée de la banque » (triangle d'alerte, rouge pâle, vignette grisée à 0,4) ; « image supprimée, à remplacer » (même traitement, à confirmer).
- **Gestes** : « Annuler » plutôt que confirmer pour « Ne plus verser » une Image non réutilisée ; Dialogue de confirmation (bouton par défaut « annuler », bouton `error`) pour supprimer une Image et pour « Ne plus verser » une Image réutilisée.
- **Cloche** de la barre supérieure : pastille `error`, menu `surface`. « Créer une fiche avec cette sélection » relève de l'Epic 4.

## Cross-Story Dependencies

- 3.1 à 3.3 sont livrées : lecture paginée, provenance, filtres, recherche, transition `privee → versee`, versabilité et ses codes, Case de sélection et Barre d'actions en lot.
- 3.7 passe avant 3.4 : elle élargit le filtre Album de 3.2 et ajoute le mode lot du Bandeau « Annuler » (composant partagé de la Story 1.4) utilisé par « Retirer de la Préparation » en lot de 3.3.
- 3.4 s'appuie sur la détection et la Carte « à illustrer » modifiées par la Story 2.11 (livrée) : Entrée retient l'Image en tête, Images existantes d'abord avec la Marque « déjà utilisée », pictogramme ARASAAC déjà possédé réutilisé via `arasaac_id`, Section de la Préparation donnée d'office aux Images créées depuis une Préparation. Les Images versées des collègues y entrent par le classement existant (mes Images d'abord à rang égal, auteur affiché).
- 3.5 crée le module `notifications`, la cloche, `aRemplacer` et `reutilisable` ; 3.6 réutilise Notifications, `aRemplacer` et le filtre « lien de collègue ».
- **Héritage de l'Epic 2** : `VisibiliteImages`, `Usages` (`lierImage` sous verrou), classement, Panneau de choix, Encart, détection et Carte d'identité, élargis sans réécriture.
- **Epics suivants** : l'Epic 4 hérite du filtre Album élargi (Fiche par filtre) et part d'une sélection de la Banque ; l'Epic 5 hérite du Bandeau sans minuterie pour écarter des paires en lot ; l'Epic 6 ajoute l'acteur Administrateur (motif, `supprimee`) sur les mêmes transitions et notifications.
- **Exploitation** : la suppression par le propriétaire (3.6) et les Notifications changent les données conservées : relire la page Données personnelles (`front/src/app/compte/donnees-personnelles.ts`), qui ne déclare encore ni Notifications, ni Images versées, ni Albums, Modules et Thèmes créés, ainsi que `deploiement/README.md` et `RESTAURATION.md`.
