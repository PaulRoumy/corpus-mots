# Epic 2 Context: Préparer un album et illustrer ses mots

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Livrer le cœur du produit. Un enseignant crée une Préparation pour un Album et une Section, retrouve les Mots déjà illustrés pour cet Album, tape ses Mots en série avec une détection immédiate, choisit ou crée les Sens, illustre chaque Mot par un pictogramme ARASAAC ou une image téléversée, tient à jour la Carte d'identité de ses Images et gère ses Préparations. L'epic pose le modèle complet de `vocabulaire` (Lexique, visibilité, cycle de vie, types et licences, registre des usages, fichiers, proxy ARASAAC) et les modules `referentiels` et `preparations`, sur lesquels reposent les Epics 3 à 6. Critère principal : une enseignante qui découvre l'application prépare son premier Album sans aide, sans geste de plus pour ce qui existe déjà et sans créer deux fois la même Image. Les stories 2.1 à 2.10 sont livrées. La Story 2.11 a été ajoutée après la démo du 25 novembre : un Mot déjà illustré arrive avec son Image dès la validation, un pictogramme déjà possédé est réutilisé, et une Image créée dans une Préparation porte sa Section. Elle est à réaliser avant la Story 3.4.

## Stories

- Story 2.1 : Créer une Préparation pour un Album
- Story 2.2 : Modules, Thèmes et réglages de la Préparation
- Story 2.3 : Saisir des Mots en série
- Story 2.4 : Illustrer un Mot avec un pictogramme ARASAAC
- Story 2.5 : Téléverser une Image
- Story 2.6 : Carte d'identité d'une Image
- Story 2.7 : Détection immédiate et réutilisation en un geste
- Story 2.8 : Choisir ou créer un Sens
- Story 2.9 : Reprendre les Mots déjà illustrés pour l'Album
- Story 2.10 : Gérer ses Préparations
- Story 2.11 : Saisir des Mots qui arrivent illustrés, sans doublon ni Section à refaire

## Requirements & Constraints

- **Référentiels partagés** : Albums, Modules et Thèmes sont communs à l'école et visibles aussitôt. Les titres d'Album proches sont signalés avant création. Seuls le créateur et l'administrateur corrigent un Album, renomment ou suppriment un Module ou un Thème (`403` pour les autres). Un Thème utilisé ne se supprime pas.
- **Préparation** : Album, Section (préremplie avec celle de la dernière Préparation), Module et Thème par défaut facultatifs, modifiables mot par mot. Un Mot sans Image est accepté (« à illustrer »). La Préparation d'un collègue n'est jamais visible ni modifiable (`403`/`404`). Supprimer ou dupliquer ne supprime ni ne copie aucune Image.
- **Détection** : à partir de 2 caractères, en moins d'une seconde sur 5 000 Images, sans tenir compte de la casse, des accents ni de l'article, sans lemmatisation. Rien n'est créé pendant la détection. Un Mot qui n'existe que dans Mes mots d'un collègue est présenté comme nouveau.
- **Classement des Images proposées** (le même partout : détection, Panneau de choix, Encart, Carte « à illustrer ») : la Section de la Préparation d'abord ; à Section égale, les Images déjà liées à ce Sens dans d'autres Albums, puis mes Images avant celles des collègues. La Marque « déjà utilisée » signale l'Image que l'enseignant a déjà utilisée pour ce Sens.
- **Saisie en série** : valider un Mot retient la première Image proposée. L'enseignant peut en choisir une autre ou la changer ensuite. Seul un Mot sans aucune Image visible arrive « à illustrer ».
- **Pas de doublon ARASAAC** : si l'enseignant possède déjà l'Image d'un pictogramme pour ce Mot et ce Sens, le pictogramme est signalé « déjà utilisée ». Le choisir lie l'Image existante, sans téléchargement ni création, et garde son état, ses Sections et ses Thèmes. Seules les Images de l'enseignant comptent.
- **Section héritée** : une Image créée depuis une Préparation (pictogramme, « Téléverser » depuis la carte, Panneau de choix, « Ajouter une image » ouvert pour un Mot) reçoit la Section de la Préparation. Elle reste modifiable dans la Carte d'identité. Une Image ajoutée par « + › Ajouter une image », sans Préparation, n'en reçoit aucune.
- **Sens** : choisir parmi les Sens visibles ou en créer un (libellé court, catégorie grammaticale préremplie). Un Mot sans Sens visible reçoit le Sens « à compléter ». Changer le Sens retenu délie l'Image qui ne correspond plus.
- **Images** : ARASAAC (licence CC BY-NC-SA, source et auteurs posés automatiquement) ou téléversement de 20 Mo au plus. Une `image_libre` sans source ni licence est enregistrée « à compléter ». Une `image_album` exige son Album (« Album d'origine requis »), est réduite à 400 × 400 px et reçoit la licence `usage_pedagogique_album`. Un fichier non image ou trop lourd est refusé en français, sans rien enregistrer. Le Repère de qualité accompagne tout ajout.
- **Carte d'identité** : consultable par tout enseignant qui voit l'Image, modifiable par le seul propriétaire (l'administrateur la voit en lecture seule, l'API répond `403`). Une modification s'applique partout. Le Sens n'est plus modifiable dès que l'Image a un lien, chez quiconque.
- Accessibilité AA, vouvoiement, ni émoji ni point d'exclamation. Chaque nouveau `code` d'erreur du back est traduit dans le front, avec un code stable par condition.

## Technical Decisions

- **Sens des appels** : `preparations` → `vocabulaire` → `referentiels`, et `preparations` → `referentiels`. Les modules se référencent par UUID et ne se passent que des `record` ; l'enseignant courant vient de `commun.service.EnseignantCourant`. Pour remonter le graphe : interfaces `…Utilisation` des Thèmes, événements `ModuleSupprime` et `PreparationSupprimee`, en `@Observes` synchrone dans la transaction de l'émetteur.
- **Lexique** : une seule normalisation (`Lexique.normaliser`). Mot : `forme`, `forme_cle` unique, `forme_recherche` (`unaccent` + `pg_trgm`). Mots et Sens ne sont créés que par `obtenirOuCreerMot` / `obtenirOuCreerSens`, de façon idempotente et sans fuite.
- **Visibilité** : `VisibiliteImages` (`consultable`, `proposable`, `moderable`) est le seul arbitre, et le rôle `admin` n'élargit rien. Le classement n'est calculé que par `vocabulaire.service`. Le test « Image déjà possédée » d'un pictogramme passe aussi par `VisibiliteImages`.
- **Cycle de vie** : une Image naît `privee`, et seul `vocabulaire.service` change `etat`. `type_image` et `licence` sont des énumérations fermées.
- **Registre des usages** : `sens_retenu` et `lien_image` appartiennent à `vocabulaire` et ne changent que par `Usages`, appelé par `preparations` dans sa transaction. `preparations` ne stocke ni `image_id` ni état d'Image. Réutiliser, c'est lier (origine `reutilisee`), jamais copier ; une Image créée pour la Préparation est liée en `nouvelle`. Invariant : Sens de l'Image = Sens retenu. `lierImage` verrouille l'Image (`SELECT … FOR UPDATE`) puis vérifie `proposable`.
- **Transactions** : ARASAAC est appelé avant d'ouvrir la transaction (télécharger, puis écrire). Jamais `REQUIRES_NEW`. `image` porte `@Version`.
- **Fichiers** : octets en `bytea` dans `image_fichier`, séparée d'`image`. La seule réduction est `ReductionImages` (album ≤ 400 px, autres ≤ 1600 px, miniature ≤ 256 px, EXIF supprimé). Les octets ne sortent que par `FichiersImages.lire`, avec `Cache-Control: private` et `ETag` = version. Toute représentation REST d'une Image contient `id`, `proprietaireId`, `etat`, `aRemplacer` et `reutilisable`.
- **Identifiant ARASAAC** : la Story 2.11 ajoute une colonne nullable `arasaac_id` à `image` par une nouvelle migration `vocabulaire`, remplie pour les Images existantes à partir de leur `source`. Une migration publiée ne se modifie jamais.
- **Front** : les vignettes passent par la directive `commun/image-securisee` (blob, `?taille=miniature` dans les listes, aucun jeton dans une URL). Après un changement d'API, régénérer `front/openapi/` et le client.
- **Écarts connus entre la spine et le code**, à ne pas « corriger » sans décision : `Usages` n'a pas `changerContextePreparation` ni `delierImage` mais d'autres méthodes ; la duplication copie les liens sans verrou ni contrôle `proposable` ; la couche `api` de `preparations` appelle `ReductionImages` et `SuggestionsArasaac` hors transaction ; le Panneau de détection filtre par Sens dans le front.

## UX & Interaction Patterns

- **Champ de saisie rapide** : focus d'emblée, aide « Entrée pour ajouter ». Entrée ajoute le Mot avec l'Image en tête du Panneau de détection et garde le focus ; ↓ ↑ + Entrée ou un clic en retient une autre. L'annonce `aria-live` polie dit si le Mot est arrivé illustré. La nouvelle Carte s'ajoute en fin de grille sans prendre le focus.
- **Panneau de détection** : Mot en cursive, Sens, Albums, Images classées avec Repères de Section, album d'origine et auteur. La première proposition est mise en avant (`primary-container` + anneau). « Nouveau sens » déplie la Création de Sens sur place, jamais en dialogue.
- **Carte « à illustrer »** (bordure tirets) : d'abord les Images existantes classées avec la Marque « déjà utilisée », puis les suggestions ARASAAC (marquées « déjà utilisée » si l'enseignant possède déjà l'Image), puis « Téléverser ». Si ARASAAC est indisponible ou sans résultat : message court et « Téléverser ».
- **Panneaux latéraux de 400 px** (grille visible, Échap ferme) : Panneau de choix d'Image (Sens modifiable, Images classées, « Ajouter une image ») et Panneau Carte d'identité (champs dans l'ordre du Glossaire, « à compléter » mis en avant).
- **Encart « mots déjà illustrés »** : « Tout reprendre » ou un par un ; écarter est annulable ; l'Encart disparaît quand il est vide.
- **Bandeau « Annuler »** : 8 s pour un geste unitaire, décompte suspendu au survol et au focus. Quitter la page le ferme sans annuler. Le mode lot sans minuterie arrive avec la Story 3.7.
- Enregistrement automatique à la sortie du champ ; en cas d'échec, la valeur reste et un Bandeau d'erreur apparaît. Clavier complet, jamais la couleur seule, pas de dialogue sur un dialogue.
- À la création d'une Préparation, après « Créer l'album », la liste « Aucun album trouvé » ne doit pas se rouvrir.

## Cross-Story Dependencies

- La Story 2.11 complète la 2.4 (pictogramme déjà possédé, Section héritée) et remplace un critère de la 2.7 (Entrée seule ajoutait le Mot « à illustrer »). Elle réutilise le classement de la 2.7 pour la Carte « à illustrer » et change le contrat OpenAPI.
- Faire 2.11 et 3.7 avant 3.4 : la réutilisation de l'Image d'un collègue s'appuie sur la détection et la Carte « à illustrer » que 2.11 modifie. Tant que l'Epic 3 n'élargit pas la visibilité, seules les Images de l'enseignant sont proposées ; l'Epic 3 l'élargit à la Banque sans nouveau code de visibilité.
- `PreparationSupprimee` sera observé par `fiches` (Epic 4). L'Epic 5 réutilise le Lexique, la détection, `ReductionImages` et le Repère de qualité. L'Epic 6 ajoute la fusion d'Albums.
- À faire quand ces fichiers sont touchés : fixtures partagées `PreparationsDeTest` et helpers front communs ; ajouter `SuggestionsArasaac` à la règle ArchUnit des appels HTTP sortants.
