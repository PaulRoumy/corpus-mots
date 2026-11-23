# Epic 3 Context: Partager dans la Banque de l'école et réutiliser le travail des collègues

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Ouvrir le travail de chaque enseignant à l'équipe sans le lui faire céder. L'enseignant parcourt une Banque unique et filtrable, ouverte sur Mes mots. Il verse ses Images, une à une ou en lot, et sait pourquoi certaines ne peuvent pas l'être. Il réutilise par lien celles des collègues, retrouve un Mot depuis la barre de recherche et peut ne plus verser une Image. Il supprime ses Images sans casser les Préparations des autres. Il est notifié quand une Image qu'il réutilise est retirée de la Banque. L'epic introduit les états `versee` et `abandonnee`, la règle de versabilité, le module `notifications` et l'état « à remplacer » calculé à la lecture. Les prédicats de visibilité existent depuis l'Epic 2 : détection, Encart et classement s'élargissent d'eux-mêmes à la Banque, sans nouveau code de visibilité. Le principe directeur est « mon travail reste à moi » : la propriété est toujours visible et rien n'est écrasé.

## Stories

- Story 3.1 : Parcourir la Banque, ouverte sur Mes mots
- Story 3.2 : Filtrer la Banque et rechercher un Mot
- Story 3.3 : Verser ses Images dans la Banque
- Story 3.4 : Réutiliser l'Image d'un collègue
- Story 3.5 : Notifications et « Ne plus verser »
- Story 3.6 : Supprimer ses Images sans casser le travail des autres

## Requirements & Constraints

- **Provenance** (choix unique, « Mes mots » par défaut) :
  - Mes mots : toutes mes Images, versées ou non, avec le badge « versée ».
  - Banque de l'école : les Images versées de tous.
  - Tout : mes Images plus les Images versées des collègues.
  - Une Image non versée d'un collègue n'apparaît jamais, et un test le vérifie. Le propriétaire est visible sur chaque vignette.
- **Performance** : une page de 500 Images s'affiche en moins de 2 s, avec miniatures, squelettes et pagination `?page=&taille=`. Jeux de test à la volumétrie cible (≈ 5 000 Images, 10 enseignants).
- **Filtres combinables** (ET logique), en paramètres de requête nommés comme les champs : Mot, Sens, Section, Album, Module, Thème, catégorie grammaticale, type d'image, propriétaire.
  - Avec Mes mots, le filtre Section retient aussi les Images utilisées dans une de mes Préparations de cette Section.
  - Le filtre propriétaire ne liste que moi et les collègues qui ont versé au moins une Image.
  - Sans résultat : « Aucune image » et « Effacer les filtres ».
- **Champ de recherche** de la barre supérieure : Entrée ouvre la Banque filtrée sur le Mot, avec la tolérance de la détection (casse, accents, article). Un Mot qui n'existe que dans Mes mots d'un collègue donne « Aucune image ».
- **Versabilité** :
  - Une Image est versable si elle est une `image_libre` avec une source non vide et une licence parmi ARASAAC, Sclera, Mulberry et CC0, ou une `photo_personnelle`.
  - Une `image_album` n'est jamais versable.
  - Raisons affichées : « image d'album », « type inconnu », « licence à préciser », « licence non partageable » (Pixabay, autre / inconnue). Une image libre sans source est refusée.
  - Codes stables couverts par des tests dédiés : `image.versement.image_album`, `.type_inconnu`, `.licence_non_versable`, `.source_manquante`, `.retrait_admin`. Un `retrait_admin_motif` renseigné bloque le versement jusqu'à une modification de la Carte d'identité.
  - Message après versement : « L'image reste la vôtre. Les collègues peuvent l'utiliser, personne ne peut la modifier. »
- **Lot** : verser une sélection mixte verse les Images versables ; les autres restent hors du lot, avec leur raison.
- **Réutilisation** : l'Image est liée en `reutilisee`, jamais copiée, avec sa Carte d'identité en lecture seule. « Utiliser dans une préparation » depuis la Carte d'identité crée au besoin le Mot et le Sens retenus. Ajouter une Image à un Sens n'altère jamais les Images ni les liens existants.
- **Ne plus verser** :
  - Sans réutilisation par un collègue : retour à `privee` sans confirmation, Bandeau « Annuler » de 8 s.
  - Avec réutilisation : Dialogue de confirmation, puis une Notification par enseignant distinct qui a un lien vers l'Image.
  - Chez le collègue, l'Image reste visible dans sa Préparation, et seulement là, grisée avec le badge « image retirée de la banque ». Elle n'est plus proposée nulle part (`reutilisable = false`) et le Panneau de choix permet d'en choisir une autre.
- **Suppression par le propriétaire** (après confirmation) :
  - Sans lien de collègue : l'Image est effacée avec ses fichiers, mes propres liens sont supprimés dans la même transaction et les Mots concernés redeviennent « à illustrer ».
  - Avec un lien de collègue : l'Image passe à `abandonnee`. Elle disparaît de Mes mots et de la Banque, mes liens sont supprimés et les collègues sont notifiés. Elle est effacée quand son dernier lien disparaît.
- **Écriture refusée** : toute écriture sur l'Image ou la Préparation d'un autre enseignant répond `403` (verser, modifier, supprimer), vérifié par un test API par ressource d'écriture.
- **Notifications** : uniquement dans l'application. Pastille sur la cloche quand il y en a de non lues ; menu déroulant ; marquées lues à l'ouverture ; « Aucune notification » sans notification.
- **Commun** : accessibilité AA, vouvoiement, ni émoji ni point d'exclamation. Chaque nouveau `code` d'erreur est traduit dans `MESSAGES_PAR_CODE`.

## Technical Decisions

- **Propriétaires** : la Banque, les filtres, le versement et la suppression vivent dans `vocabulaire`. Les Notifications sont stockées dans `notifications` (module encore vide), mais créées uniquement par `vocabulaire.service` (sens `vocabulaire` → `notifications`). La réutilisation passe par `preparations` → `vocabulaire.Usages`.
- **Visibilité** : `VisibiliteImages` reste le seul arbitre. `proposable` pour la Banque, les filtres, la recherche et les propositions ; `consultable` pour une Image liée, montrée seulement dans la Préparation qui la lie. Un lien ne rend jamais proposable, et le rôle `admin` n'élargit rien. Aucun filtrage d'Images ailleurs, front compris.
- **Cycle de vie** :
  - Seul `vocabulaire.service` change `etat`, par une méthode par transition, avec un `Acteur` explicite (`Proprietaire(id)` dans cet epic).
  - `vocabulaire.api` n'expose que les actions du propriétaire ; celles de l'administrateur arrivent par `moderation` en Epic 6.
  - Toute transition prend `SELECT … FOR UPDATE` sur `image` (et `image` porte `@Version`) : un lien et une suppression simultanés donnent soit un lien refusé, soit `abandonnee`.
- **Lien de collègue** : un lien dont l'enseignant n'est pas le propriétaire de l'Image. Un lien `reutilisee` peut viser une Image de l'enseignant lui-même (duplication, reprise) : tout calcul « réutilisée par des collègues » (notifications, protection de la suppression) filtre `lien_image.enseignant_id <> image.proprietaire_id`.
- **Notifications** :
  - Créées dans la transaction de la transition (`versee → privee`, `→ abandonnee`).
  - Instantané : `type`, `image_id`, `mot_forme`, `sens_libelle`, `motif`, `texte_motif`, `cree_le`, `lue_le` ; jamais le fichier ni le nom de l'acteur.
  - `@Observes` synchrone si un événement sert, jamais `@ObservesAsync`, `REQUIRES_NEW` ni `AFTER_*`.
- **`aRemplacer`** vaut encore `null` partout : il faut le calculer dans `vocabulaire.service` (vue d'Image). Valeurs : `retiree` si l'Image liée n'est plus `versee` et que le lecteur n'en est pas propriétaire, `supprimee`. Calculé à la lecture, jamais copié. `reutilisable` est calculé de même.
- **Carte d'identité d'une Image versée** : `modifierDescription` ignore aujourd'hui l'`etat`. Passer une Image versée en licence non partageable, en `photo_personnelle`, en `image_album` ou en type inconnu doit appliquer la règle du versement : refuser, ou retirer l'Image de la Banque (à trancher).
- **REST** :
  - Toute représentation d'Image porte `id`, `proprietaireId`, `etat`, `aRemplacer` et `reutilisable`.
  - Noms de DTO uniques (par exemple `BanqueImageDto`). Attention aux énumérations ou records homonymes : la règle ArchUnit ne les voit pas encore, et deux homonymes feraient deux schémas OpenAPI en conflit.
  - Pagination `{ elements, total }`, taille 100 au plus.
  - Le propriétaire est renvoyé par identifiant ; le front résout le nom par `commun/annuaire` (`GET /api/enseignants`, déjà livré).
- **Codes d'erreur** : depuis la rétrospective de l'Epic 2, `404 image.indisponible` désigne une Image non proposable et `400 image.sens_different` une Image d'un autre Sens ou d'un autre Mot. Le front n'a qu'une liste partagée, `commun/erreurs/codes-image-indisponible.ts`. Réutiliser ces codes pour les nouveaux cas (`versee`/`abandonnee`) plutôt que d'en créer d'autres. Les codes ne figurent pas dans le contrat OpenAPI.
- **Écarts connus entre la spine et le code** (action 6 non retenue) :
  - `Usages` n'a ni `delierImage` ni `changerContextePreparation`.
  - `TypeImage`, `Licence` et `OrigineLien` traversent les frontières entre modules.
  - Le Panneau de détection filtre les Images par Sens dans le front.
  - Ne pas les « corriger » au passage sans décision.
- **Performance** : `Images.sensVisibles` charge toutes les Images des Sens d'un Mot. Il faut le mesurer quand la Banque grossit, et le remplacer au besoin par une projection filtrée par `proposable`.
- **Migrations** : `V<AAAAMMJJHHMM>__notifications_notification.sql` et migrations `vocabulaire` séparées. Aucune clé étrangère entre modules.
- **Front** :
  - Dossier `src/app/banque/` (aujourd'hui une simple page), chargé en différé : le paquet initial est à ≈ 599 kB pour un budget de 600 kB.
  - Images par `commun/image-securisee` (`?taille=miniature`).
  - Réutiliser le Panneau Carte d'identité de `commun/carte-identite` (1 564 lignes, à découper si on le touche) et les helpers d'erreur existants (`erreurPassagere`).

## UX & Interaction Patterns

- **Banque** :
  - Une seule vue, sans onglets, dont la grille est regroupée par Mot et par Sens.
  - Puces de filtre de 32 px (`secondary-container` une fois sélectionnées) et puce de provenance.
  - État vide de Mes mots : « Ajouter une image ».
  - Une vignette ouvre le Panneau Carte d'identité de 400 px sans masquer la grille : modifiable par le propriétaire, en lecture seule sinon.
- **Actions du panneau** : Verser / « Ne plus verser » (propriétaire), Supprimer, « Utiliser dans une préparation ». Verser indisponible affiche la raison exacte. « Ne plus verser » est distinct de « Retirer de la banque », réservé à l'administrateur en Epic 6.
- **Case de sélection et Barre d'actions en lot**, identiques dans la Préparation et la Banque :
  - La case apparaît au survol et au focus, puis toutes les cases dès qu'une sélection existe.
  - Espace coche sans ouvrir la carte ; Maj+clic sélectionne une plage ; « Tout sélectionner » ; Échap désélectionne.
  - La barre affiche le nombre sélectionné et les actions : Verser en lot partout ; « Retirer de la Préparation » (annulable) dans une Préparation.
  - Carte sélectionnée : fond `primary-container` et anneau `primary` de 2 px.
- **Badges d'état** (icône et libellé, jamais la couleur seule) :
  - « versée » : coche, vert pâle.
  - « image retirée de la banque » : triangle d'alerte, rouge pâle, vignette grisée à 0,4.
  - « image supprimée, à remplacer » : même traitement, à confirmer.
- **Gestes** : « Annuler » plutôt que confirmer pour « Ne plus verser » une Image que personne ne réutilise. Dialogue de confirmation (bouton par défaut « annuler », bouton `error`) pour supprimer une Image et pour « Ne plus verser » une Image réutilisée. Le Bandeau « Annuler » se ferme désormais à la navigation, sans annuler.
- **Cloche** dans la barre supérieure : pastille `error`, menu `surface` sous la cloche. Le bouton « Créer une fiche avec cette sélection » de la Banque relève de l'Epic 4.

## Cross-Story Dependencies

- 3.1 pose la lecture paginée de la Banque, la provenance et l'ouverture de la Carte d'identité ; 3.2 y ajoute filtres et recherche.
- 3.3 pose la transition `privee → versee`, la règle de versabilité et ses codes, et la Case de sélection avec la Barre d'actions en lot (réutilisées par l'Import en Epic 5). Elle précède 3.4, qui a besoin d'Images versées de collègues.
- 3.5 crée le module `notifications`, la cloche, le calcul de `aRemplacer` et `reutilisable` ; 3.6 réutilise les Notifications, `aRemplacer` et le filtre « lien de collègue ».
- **Héritage de l'Epic 2** : `VisibiliteImages`, `Usages` (`lierImage` sous verrou), classement par `vocabulaire.service`, Panneau de choix d'Image, Encart, détection et Carte d'identité, que l'Epic 3 élargit sans les réécrire. Les actions 1 à 3 de la rétrospective sont faites : état de la Grille dans `GrilleMots`, annonces par `Annonces`, codes unifiés.
- **Avec les epics suivants** : l'Epic 4 lit `consultable` et `proposable` pour les Fiches et part d'une sélection de la Banque. L'Epic 6 ajoute l'acteur Administrateur (motif, `supprimee`, `moderable`) sur les mêmes transitions et notifications.
- **Exploitation** : la suppression par le propriétaire (3.6) tient enfin le droit d'effacement d'une Image. Relire la page Données personnelles (`front/src/app/compte/donnees-personnelles.ts`) pour les Notifications, les Images versées, ainsi que les Albums, Modules et Thèmes créés, qu'elle ne déclare toujours pas. Relire aussi `deploiement/README.md` et `RESTAURATION.md` si les données conservées changent.
- **Questions encore ouvertes** : préremplir la Carte d'identité (Section, Module, Thème) d'une Image créée depuis une Préparation, entrée sans destination. Une revue `bmad-review` du diff cumulé en milieu d'epic a fait ses preuves à l'Epic 2.
