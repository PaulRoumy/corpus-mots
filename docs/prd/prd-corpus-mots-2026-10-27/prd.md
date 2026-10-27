---
title: PRD — corpus-mots
status: final
created: 2026-10-27
updated: 2026-10-27
---

# PRD : corpus-mots

*Titre de travail, à confirmer.*

## 0. Objet du document

Ce PRD décrit la V1 de corpus-mots, une application web réservée aux enseignants de maternelle. Elle sert à constituer une banque mot-image partagée à l'échelle d'une école, puis à en tirer des fiches et des cartes de vocabulaire. Ce PRD s'adresse à Paul, porteur du projet, et à ceux qui prendront la suite : conception UX, architecture, découpage en epics et stories.

Il s'appuie, sans les répéter, sur le product brief du 2026-10-25 (`docs/briefs/brief-corpus-mots-2026-10-25/`) et sur le brainstorming du même jour. Les termes du domaine sont définis une seule fois au Glossaire (§3) et employés tels quels ailleurs. Les fonctionnalités (§4) regroupent des exigences numérotées FR-n ; les hypothèses non confirmées sont marquées `[ASSUMPTION]` et récapitulées au §11. Détails techniques et recherche de contexte : `addendum.md`.

## 1. Vision

En maternelle, préparer le vocabulaire d'un album prend environ 6 heures : 1 h pour choisir les mots, 2 h 30 pour trouver des images simples et claires, 2 h 30 pour monter les fiches. Ce travail est refait sans cesse. Dans Word et PowerPoint, retrouver ce qu'on a déjà fait prend plus de temps que de le refaire. Et comme les enseignants d'une même école étudient souvent les mêmes albums, chacun refait aussi le travail de ses collègues.

corpus-mots rend **la réutilisation plus rapide que la refaite**. Quand un enseignant ouvre un album, il retrouve les mots déjà illustrés. Quand il tape un mot, l'application lui dit si ce mot existe déjà, dans quels albums, et quelles images ont déjà servi. Il en réutilise une en un geste ou en ajoute une nouvelle, qui coexiste avec les autres. Chaque image porte une carte d'identité (sens, section, album, thème, catégorie grammaticale), qui gère la polysémie et la progression par âge. À partir de la banque, l'enseignant génère ses fiches et ses cartes, puis les exporte en Word ou en PowerPoint pour garder la main sur la mise en forme.

Deux principes pédagogiques guident le produit. Le premier : **garder la même image pour un même sens, dans une même section, d'un album à l'autre**, car cette cohérence aide les enfants. Le second, recommandé par Eduscol : **multiplier les représentations quand l'enfant grandit**. En PS, on part d'une image concrète, souvent celle de l'album. En GS, on propose plusieurs exemples variés ou une représentation plus abstraite, pour catégoriser. Une bonne image est **simple, claire, avec peu de détails**.

La V1 vise le confort de 6 enseignants d'une école pilote pendant une année scolaire, et se résume en une ligne : **saisir une fois, réutiliser partout**. Une fois la banque remplie, elle préparera la V2 : vérifier la couverture d'un corpus de référence (par exemple la liste de Boisseau) et choisir les albums qui comblent les manques. L'outil est conçu par un enseignant, à partir de sa pratique : son atout n'est pas technique, c'est son adéquation au terrain.

## 2. Utilisateurs

### 2.1 Jobs To Be Done

- **Fonctionnel :** repérer le vocabulaire nécessaire à la compréhension d'un album, illustrer chaque mot par une image adaptée à l'âge, puis réutiliser ces associations toute l'année pour projeter, imprimer et monter des fiches.
- **Fonctionnel :** savoir instantanément si un mot a déjà été travaillé, dans quel album, et avec quelle image.
- **Social :** profiter du travail des collègues sans perdre le sien. Il faut que « c'est mon travail » survive au partage.
- **Émotionnel :** ne plus avoir le sentiment de refaire pour la énième fois ce qui existe déjà quelque part sur le disque.
- **Contextuel :** préparer sur ordinateur, ajouter une photo sur son téléphone en dehors de la classe, projeter en classe, remettre du papier à l'ATSEM.

### 2.2 Non-utilisateurs (V1)

Seuls les enseignants de l'école ont un compte. **L'ATSEM, les enfants et les parents n'accèdent jamais à l'application** : ils reçoivent seulement ce que l'enseignant imprime ou projette. Les pistes du brainstorming qui les concernent (vidéos courtes pour les verbes d'action, récapitulatif hebdomadaire aux parents) sont reportées (§8.2). Les enseignants d'autres écoles ne sont pas visés par la V1.

### 2.3 Parcours utilisateurs clés

- **UJ-1. Claire prépare *Roule galette* en une soirée au lieu d'un week-end.**
  - **Persona et contexte :** Claire, enseignante de MS, commence *Roule galette* lundi. Elle était prudente à l'idée de partager son travail.
  - **État d'entrée :** sur son ordinateur, déjà connectée, depuis « Mes mots ».
  - **Parcours :** elle crée une Préparation pour l'album *Roule galette*, que Paul a créé l'an dernier avec ses trois modules. La Section MS est déjà sélectionnée. L'application affiche aussitôt les 9 mots déjà illustrés pour cet album dans la Banque de l'école. Pour chacun, les images marquées MS sont proposées en premier. Elle reprend les 9 mots en un clic et en écarte un. Puis elle tape ses mots manquants : *four, farine, rouler…* « farine » existe dans un autre album, avec une image de Paul : elle la retient en un geste. Pour « four », rien n'existe : l'application lui propose directement des pictogrammes ARASAAC et elle en choisit un.
  - **Point culminant :** sur 14 mots, 10 avaient déjà une image. Elle n'en a cherché que 4.
  - **Résolution :** elle génère des cartes avec le mot en script et en cursive. Elle les exporte en PowerPoint pour projeter en classe et en Word pour imprimer. Elle verse ses 4 nouveaux pictogrammes dans la Banque de l'école.
  - **Cas limite :** « étalé » existe déjà, mais au sens de la cuisine. Claire ajoute un nouveau Sens, « étalé (chute) », avec sa propre image. Les deux Sens coexistent.

- **UJ-2. Claire fait entrer ses anciens imagiers dans l'application.**
  - **Persona et contexte :** Claire a quatre ans d'imagiers Word et PowerPoint. Si elle doit tout ressaisir, elle ne basculera pas.
  - **État d'entrée :** connectée sur ordinateur, à sa première utilisation.
  - **Parcours :** elle dépose ses fichiers *Imagier automne.docx* et *Loup.pptx*. L'application extrait les paires image + mot et lui présente un écran de vérification. Elle y corrige deux mots mal lus et rattache le fichier *Loup* à l'album *C'est moi le plus fort*. Elle complète en lot la Section, le Thème, le type d'image (« image libre, ARASAAC » pour la plupart, « image d'album » pour les scans) et la licence. Puis elle valide.
  - **Point culminant :** ses 80 mots illustrés sont dans « Mes mots », rangés, filtrables et séparés de ceux des collègues.
  - **Résolution :** les jours suivants, elle verse dans la Banque de l'école quelques images qu'elle juge réussies. Les scans d'albums restent dans « Mes mots » : l'application ne lui propose pas de les verser.
  - **Cas limite :** une page Word contient une image sans mot lisible. L'écran de vérification la signale « mot manquant ». Claire tape le mot ou écarte l'image.

- **UJ-3. Paul ajoute une photo de citrouille depuis le marché.**
  - **Persona et contexte :** Paul, enseignant de GS et administrateur, voit au marché une citrouille parfaite pour le thème de l'automne.
  - **État d'entrée :** sur son téléphone, l'application déjà ouverte dans le navigateur et la session active.
  - **Parcours :** il touche « Ajouter une photo », prend la photo, tape « citrouille » et coche « PS, MS, GS ». « citrouille » existe déjà : l'application lui propose de rattacher la photo à ce Mot.
  - **Point culminant :** la photo est enregistrée en trois gestes, avec « photo personnelle » comme source et Paul comme auteur.
  - **Résolution :** le soir, sur son ordinateur, il complète le Thème « automne » et verse la photo dans la Banque de l'école.

- **UJ-4. Paul imprime une planche « automne » pour l'atelier de Nadia.**
  - **Persona et contexte :** Nadia, l'ATSEM, anime jeudi un atelier de catégorisation en petit groupe de GS. Elle n'a pas de compte : le papier est son interface.
  - **État d'entrée :** Paul, sur son ordinateur.
  - **Parcours :** il filtre la banque sur le Thème « automne » et la Section GS, tous albums confondus. Il génère une Fiche avec le modèle « planche de catégorisation », triée par catégorie grammaticale pour séparer noms et verbes, et l'écriture « script + cursive ».
  - **Point culminant :** la planche réunit des mots venus de quatre albums, préparés par trois collègues, sans aucune recherche.
  - **Résolution :** il exporte la Fiche en Word, ajuste le titre et l'imprime pour Nadia. Les crédits ARASAAC figurent automatiquement en bas de page. La semaine suivante, il refait une planche « hiver » : ses réglages ont été gardés, un clic suffit.

- **UJ-5. Paul accueille une collègue et retire une image versée par erreur.**
  - **Persona et contexte :** une nouvelle collègue arrive en janvier. Paul est administrateur.
  - **Parcours :** il l'invite par e-mail, et elle crée son mot de passe à partir du lien reçu. Le même jour, il remarque dans la Banque de l'école une image visiblement tirée d'un site sous licence non compatible. Il la retire de la banque en indiquant le motif. L'image retourne dans « Mes mots » de son auteur, qui trouve une notification à sa prochaine connexion.
  - **Résolution :** les Préparations où l'image servait signalent « image retirée de la banque », et chacun en choisit une autre.

## 3. Glossaire

- **Enseignant** : utilisateur titulaire d'un compte, membre de l'équipe de l'école. Seul type d'utilisateur.
- **Administrateur** : enseignant doté de droits de gestion des comptes et de modération. Il y en a au moins un par école ; c'est Paul pour l'école pilote.
- **École** : l'unique instance de la V1. Elle regroupe les enseignants, les Albums, les Thèmes et la Banque de l'école.
- **Mot** : forme écrite d'un mot de vocabulaire (par exemple « étalé »), unique dans l'école, avec son article ou son genre quand c'est pertinent. Un Mot a un ou plusieurs Sens.
- **Sens** : signification particulière d'un Mot (« étalé (cuisine) », « étalé (chute) »). Il porte la catégorie grammaticale. Un Sens a zéro ou plusieurs Images.
- **Image** : illustration rattachée à un seul Sens. Elle a un propriétaire (l'enseignant qui l'a ajoutée), un type, une source, une licence et un auteur. Le terme couvre aussi les photos.
- **Type d'image** : *image d'album* (tirée d'un album jeunesse), *image libre* (ARASAAC ou autre source sous licence libre), *photo personnelle* (prise par l'enseignant) ou *inconnu* (type pas encore précisé, notamment après un Import).
- **Carte d'identité** : ensemble des métadonnées d'une Image : Mot, Sens, catégorie grammaticale, Sections, album d'origine, Module, Thèmes, type, source, licence, auteur et propriétaire.
- **Section** : PS, MS ou GS. Une Image vise une ou plusieurs Sections ; une Préparation en vise une seule.
- **Album** : album jeunesse étudié en classe, créé une seule fois pour toute l'école (titre, auteur, éditeur). Un Album contient des Modules ordonnés.
- **Module** : découpage pédagogique d'un Album, comme un chapitre, défini collectivement par l'équipe et partagé dans l'école.
- **Thème** : catégorie transversale (automne, cuisine, émotions…) qui relie des Mots de plusieurs Albums. La liste des Thèmes est commune à l'école.
- **Préparation** : ensemble des Mots qu'un enseignant retient pour un Album (et éventuellement un Module) dans une Section, chacun associé à l'Image ou aux Images choisies. Elle appartient à son auteur.
- **Mes mots** : espace personnel d'un enseignant. Il contient ses Images et ses Préparations. Seul lui le voit.
- **Banque de l'école** : espace partagé, visible par tous les enseignants. Il contient les Images que leurs propriétaires y ont versées.
- **Verser** : action par laquelle le propriétaire d'une Image la rend visible dans la Banque de l'école. Une image d'album ne peut jamais être versée.
- **Réutiliser** : ajouter à sa Préparation une Image existante, la sienne ou une Image de la Banque de l'école, **par lien et non par copie**.
- **Import** : transformation de fichiers Word ou PowerPoint existants en Images rangées dans Mes mots, après un écran de vérification.
- **Fiche** : document généré à partir d'une sélection d'Images (une Préparation ou un filtre), selon un Modèle de fiche et une ou plusieurs Écritures, puis exporté en Word ou en PowerPoint.
- **Modèle de fiche** : mise en page prédéfinie d'une Fiche : cartes, liste illustrée, planche de catégorisation ou fiche d'activité.
- **Fiche d'activité** : Modèle de fiche qui place les Images et les Mots à côté d'une zone de consigne libre, complétée ensuite dans Word.
- **Écriture** : façon d'écrire le Mot sur une Fiche : capitales, script, cursive, Arial ou sans texte. Plusieurs Écritures peuvent être combinées sous une même Image.

## 4. Fonctionnalités

### 4.1 Comptes et rôles

**Description :** l'application est fermée : on n'y entre que sur invitation de l'administrateur, sans inscription libre, puis on se connecte par e-mail et mot de passe. Aucune donnée d'élève n'est jamais saisie. Réalise UJ-5.

#### FR-1 : Invitation par l'administrateur
L'administrateur peut inviter un enseignant en saisissant son e-mail. Réalise UJ-5.
- L'invité reçoit un lien à durée limitée qui lui permet de définir son mot de passe. `[ASSUMPTION: validité de 7 jours]`
- Sans invitation, aucun compte ne peut être créé.

#### FR-2 : Connexion et session
Un enseignant peut se connecter avec son e-mail et son mot de passe, sur ordinateur comme sur téléphone, et réinitialiser son mot de passe par e-mail.
- La session reste active sur le téléphone, pour que l'ajout d'une photo (FR-17) ne commence pas par une connexion. `[ASSUMPTION: session longue sur appareil personnel, environ 30 jours]`

#### FR-3 : Données de compte minimales
Le compte ne contient que le nom affiché, l'e-mail, le mot de passe (protégé) et le rôle.
- L'application ne propose aucun champ qui permettrait de saisir une donnée d'élève (nom, photo identifiée, classe nominative).
- Une page d'information explique quelles données sont conservées, pourquoi, combien de temps et comment en demander l'effacement.

### 4.2 Albums, Modules et Thèmes

**Description :** les Albums, les Modules et les Thèmes sont des référentiels communs à l'école. Tout enseignant crée un Album la première fois qu'il en a besoin ; les autres le retrouvent ensuite avec ses Modules, ce qui évite les doublons du type « Roule galette » / « La galette ». Les Modules sont décidés collectivement par l'équipe ; l'application se contente de les enregistrer et de les partager. Réalise UJ-1, UJ-4.

#### FR-4 : Création et recherche d'Album
Un enseignant peut rechercher un Album par titre et, s'il n'existe pas, le créer (titre, auteur, éditeur facultatif).
- Lors de la création, l'application signale les Albums au titre proche pour éviter un doublon.
- Le créateur et l'administrateur peuvent corriger un Album. L'administrateur peut fusionner deux Albums en doublon.

#### FR-5 : Modules et Thèmes partagés
Un enseignant peut ajouter des Modules ordonnés à un Album et ajouter des Thèmes à la liste commune.
- Un Module ou un Thème créé est immédiatement visible par tous les enseignants.
- Seuls le créateur et l'administrateur peuvent renommer ou supprimer un Module ou un Thème. Un Thème utilisé ne peut pas être supprimé sans réaffecter ses Images.

### 4.3 Préparations, saisie rapide et détection des Mots existants

**Description :** c'est le cœur du produit. L'enseignant crée une Préparation pour un Album et une Section, retrouve les Mots déjà illustrés pour cet Album, puis tape les Mots manquants. Pour chaque Mot, l'application indique aussitôt s'il existe déjà, dans quels Albums, avec quels Sens et quelles Images, et propose de Réutiliser une Image, en commençant par celles de sa Section, ou d'en ajouter une. La saisie reste rapide : le minimum est le Mot, le reste est proposé ou complété plus tard. Réalise UJ-1.

#### FR-6 : Créer une Préparation et saisir en série
Un enseignant peut créer une Préparation en choisissant un Album, une Section et, éventuellement, un Module et un Thème par défaut, puis y taper des Mots les uns après les autres. Réalise UJ-1.
- La Section proposée par défaut est celle de la dernière Préparation de l'enseignant.
- L'Album, le Module et le Thème choisis s'appliquent par défaut à chaque Mot saisi, et peuvent être modifiés mot par mot.
- Un Mot peut être enregistré sans Image et complété plus tard. Il apparaît alors comme « à illustrer ».

#### FR-7 : Mots déjà présents pour l'Album
À la création d'une Préparation, l'application affiche les Mots déjà illustrés pour cet Album dans Mes mots et dans la Banque de l'école. L'enseignant peut les reprendre tous en un clic ou les choisir un par un. Réalise UJ-1.
- Chaque Mot repris arrive avec l'Image proposée selon l'ordre de FR-9. L'enseignant peut la changer.
- Les Mots non retenus sont simplement ignorés et ne sont pas supprimés de la banque.

#### FR-8 : Détection immédiate
Pendant la saisie, l'application indique si le Mot existe déjà dans l'école. Réalise UJ-1.
- Le résultat s'affiche en moins d'une seconde après la frappe, sans valider le formulaire.
- La recherche tolère les variations de casse, d'accents et d'article (« la citrouille » = « citrouille »). `[ASSUMPTION: pas de lemmatisation (pluriels, conjugaisons) en V1 ; « roule » et « rouler » restent distincts]`
- Pour un Mot existant, l'application affiche ses Sens, les Albums où il apparaît et les Images disponibles : les Images de l'enseignant dans Mes mots et celles de la Banque de l'école. Chaque Image proposée montre ses Sections et son album d'origine.
- Confidentialité de Mes mots : les Images non versées d'un collègue, et les Albums où il a utilisé le Mot uniquement dans Mes mots, ne sont jamais montrés. Un Mot qui n'existe que dans Mes mots d'un collègue est présenté comme nouveau.

#### FR-9 : Réutilisation en un geste
Un enseignant peut retenir une Image proposée pour un Mot de sa Préparation en une seule action. Réalise UJ-1.
- L'Image est liée et non copiée (voir FR-21).
- Les Images proposées sont classées dans cet ordre : d'abord celles qui visent la Section de la Préparation, puis, à Section égale, celles déjà utilisées pour ce Sens dans d'autres Albums. C'est l'application du principe « même image pour un même Sens dans une même Section ».

#### FR-10 : Gestion des Sens
Un enseignant peut, pour un Mot existant, choisir l'un de ses Sens ou en créer un nouveau, avec un libellé court. Réalise UJ-1 (cas limite).
- La catégorie grammaticale est saisie au niveau du Sens. Elle est proposée par défaut quand le Mot existe déjà.
- Deux Sens d'un même Mot coexistent, et chacun garde ses propres Images.

#### FR-11 : Gestion des Préparations
Un enseignant peut lister, ouvrir, renommer, dupliquer et supprimer ses Préparations.
- Dupliquer une Préparation permet de la reprendre pour une autre Section ou une autre année, en changeant la Section.
- Supprimer une Préparation ne supprime aucune Image.

### 4.4 Images et Carte d'identité

**Description :** une Image vient de trois sources : la recherche ARASAAC intégrée, un fichier téléversé ou une photo prise au téléphone. Sa Carte d'identité est en grande partie remplie automatiquement à partir du contexte (Mot, Sens, Album, Module, Thème, Section de la Préparation). L'enseignant précise les autres Sections et, pour une image hors ARASAAC, sa source et sa licence. Le critère d'une bonne image est rappelé à l'ajout (FR-16). Réalise UJ-1, UJ-3.

#### FR-12 : Recherche ARASAAC intégrée
Un enseignant peut, depuis un Mot, rechercher et choisir des pictogrammes ARASAAC sans quitter l'application. Réalise UJ-1.
- Pour un Mot sans Image, les résultats ARASAAC sont proposés automatiquement.
- Une Image ARASAAC enregistrée porte automatiquement sa source, sa licence (CC BY-NC-SA) et ses auteurs.

#### FR-13 : Téléversement d'une Image
Un enseignant peut téléverser une Image depuis son ordinateur en indiquant son type, sa source, sa licence et son auteur.
- La source et la licence sont obligatoires pour une image libre.
- Une image d'album exige la référence de l'Album (titre, auteur). Elle est enregistrée en basse résolution, conformément au protocole d'usage pédagogique. `[ASSUMPTION: taille maximale d'environ 400 × 400 px, à confirmer avec Q-1]`
- Une Image dont la licence est inconnue ou interdit la redistribution (par exemple Pixabay, voir Q-2) reste dans Mes mots et ne peut pas être versée.

#### FR-14 : Carte d'identité
Un enseignant peut consulter la Carte d'identité de toute Image visible et modifier celle de ses propres Images.
- Les Sections (PS, MS, GS) se cochent librement : une Image peut viser plusieurs Sections.
- Seul le propriétaire peut modifier la Carte d'identité, à l'exclusion de l'administrateur (qui peut seulement retirer ou supprimer l'Image, voir FR-30 et FR-31).
- Une modification de la Carte d'identité s'applique partout où l'Image est utilisée, puisqu'elle est réutilisée par lien. Changer le Sens d'une Image réutilisée par un collègue est impossible : le propriétaire doit ajouter une nouvelle Image. `[ASSUMPTION]`

#### FR-15 : Filtres
Un enseignant peut filtrer les Images de Mes mots et de la Banque de l'école par Mot, Sens, Section, Album, Module, Thème, catégorie grammaticale, type d'image et propriétaire. Réalise UJ-4.
- Les filtres se combinent (par exemple « automne » + « GS » + « verbe »).
- Dans Mes mots, le filtre Section retient aussi les Images utilisées dans une Préparation de cette Section, même si l'Image ne la coche pas.

#### FR-16 : Repères de qualité
À l'ajout d'une Image, l'application affiche un repère visuel court : « simple, claire, peu de détails ». Le motif « image inadaptée » fait partie des motifs de retrait de FR-30.

#### FR-17 : Photo depuis le téléphone en trois gestes
Un enseignant peut, sur son téléphone, prendre une photo, taper le Mot et cocher les Sections, et l'enregistrer comme photo personnelle. Réalise UJ-3.
- L'ajout tient en trois étapes, sans autre champ obligatoire. Les autres champs de la Carte d'identité se complètent plus tard.
- Si le Mot existe, l'application propose de rattacher la photo à l'un de ses Sens.
- Une photo s'enregistre avec une taille réduite adaptée à l'impression et à la projection. `[ASSUMPTION]`
- Un rappel indique de ne pas photographier d'enfant identifiable.

### 4.5 Mes mots et Banque de l'école

**Description :** le partage n'est adopté que s'il est sûr. Chaque enseignant travaille dans Mes mots et choisit seul ce qu'il verse dans la Banque de l'école. Rien n'est jamais écrasé : plusieurs Images d'un même Sens coexistent, et Réutiliser crée un lien qui préserve l'auteur et la Carte d'identité de l'Image d'origine. Réalise UJ-1, UJ-2, UJ-5.

#### FR-18 : Deux espaces distincts
Un enseignant peut basculer entre Mes mots et la Banque de l'école, et voit toujours à qui appartient chaque Image.
- Ses Images, qu'elles soient versées ou non, restent visibles dans Mes mots, avec la mention « versée » le cas échéant.

#### FR-19 : Verser
Le propriétaire d'une Image peut la verser dans la Banque de l'école, ou en retirer une qu'il y a versée. Réalise UJ-1, UJ-2.
- Une image d'album ne peut jamais être versée : l'action est indisponible et l'application explique pourquoi.
- Une Image de type inconnu, ou une image libre sans source ni licence, ne peut pas être versée tant que ces champs ne sont pas renseignés.
- On peut verser plusieurs Images à la fois, par exemple toutes les images libres d'une Préparation.

#### FR-20 : Suppression par le propriétaire
Le propriétaire peut supprimer une de ses Images.
- Si l'Image est Réutilisée dans la Préparation d'un collègue, elle n'est pas supprimée. Elle est retirée de la banque et disparaît de Mes mots du propriétaire, mais reste visible pour les collègues qui l'utilisent, avec la mention « retirée de la banque ».
- Sinon, elle est supprimée après confirmation.

#### FR-21 : Réutilisation par lien
Quand un enseignant Réutilise une Image d'un collègue, sa Préparation référence l'Image d'origine.
- L'enseignant ne peut pas modifier cette Image ni sa Carte d'identité.
- Si le propriétaire ou l'administrateur la retire de la banque, l'Image reste visible dans les Préparations qui l'utilisent, avec la mention « retirée de la banque ». Elle ne peut plus être Réutilisée et elle est marquée à remplacer. Les Fiches déjà exportées ne sont pas affectées.

#### FR-22 : Pas d'écrasement
Ajouter une Image à un Sens n'altère jamais les Images existantes, ni celles des autres enseignants.
- Aucune action d'un enseignant ne modifie ni ne supprime une Image ou une Préparation d'un autre enseignant (seule exception : le retrait ou la suppression par l'administrateur, FR-30 et FR-31).

### 4.6 Import des fichiers Word et PowerPoint

**Description :** l'Import déclenche la bascule des collègues et évite que la banque démarre vide. L'application extrait des fichiers les paires image + mot ; l'enseignant les vérifie et les complète en lot avant de valider. Tout ce qui est importé arrive dans Mes mots et peut ensuite être versé si son type et sa licence sont connus. Réalise UJ-2.

#### FR-23 : Dépôt de fichiers
Un enseignant peut déposer un ou plusieurs fichiers .docx et .pptx pour les importer. Réalise UJ-2.
- L'application extrait chaque image et le texte qui l'accompagne (en dessous, à côté ou sur la même diapositive) comme Mot proposé. `[ASSUMPTION: les formats anciens .doc et .ppt ne sont pas pris en charge en V1]`

#### FR-24 : Écran de vérification
Avant toute création, l'enseignant voit les paires extraites. Il peut corriger le Mot, écarter une paire et compléter en lot l'Album, le Module, le Thème, les Sections, le type d'image, la source et la licence. Réalise UJ-2.
- Les paires sans Mot lisible ou sans image sont signalées et ne sont pas importées sans correction.
- Pour chaque Mot proposé qui existe déjà, la détection de FR-8 s'applique.
- Le type d'image est « inconnu » par défaut, tant que l'enseignant ne l'a pas précisé, en lot ou image par image.

#### FR-25 : Validation de l'Import
Une fois validées, les paires deviennent des Images dans Mes mots, rattachées aux Mots et aux Sens, et éventuellement à une Préparation.
- Un Import interrompu peut être repris sans perdre les corrections déjà faites. `[ASSUMPTION]`
- Rien n'est versé automatiquement dans la Banque de l'école.

### 4.7 Fiches et exports

**Description :** l'enseignant produit ses supports à partir de la banque, pas l'inverse. Une Fiche se génère depuis une Préparation (les mots d'un Album ou d'un Module) ou depuis un filtre (par exemple tous les mots « automne », tous Albums confondus). Il choisit un Modèle de fiche et une ou plusieurs Écritures, puis exporte en Word pour imprimer ou en PowerPoint pour projeter ; la mise en forme fine se fait ensuite dans ces logiciels (§7). Réalise UJ-1, UJ-4.

#### FR-26 : Sources d'une Fiche
Un enseignant peut générer une Fiche à partir d'une Préparation, d'un Module ou du résultat d'un filtre (FR-15). Réalise UJ-1, UJ-4.
- Il peut trier les Mots par ordre alphabétique, par ordre de saisie ou par catégorie grammaticale.
- Il peut désélectionner des Mots avant la génération.

#### FR-27 : Modèles de fiche
L'application propose quatre Modèles de fiche :
- **cartes** : une Image et son Mot par carte, 4 cartes par page A4 par défaut, pour la projection, le mur des mots ou les jeux (loto, memory) ;
- **liste illustrée** : plusieurs Mots par page, chacun avec une Image, comme support d'atelier pour l'ATSEM ;
- **planche de catégorisation** : les Images d'une sélection réunies sur une page, avec plusieurs Images par Sens quand elles existent, pour trier et catégoriser en GS ;
- **fiche d'activité** : Images et Mots à côté d'une zone de consigne libre, complétée ensuite dans Word.

`[ASSUMPTION: le nombre de cartes par page est réglable (1, 2, 4, 6, 8)]`

#### FR-28 : Écritures combinables
Un enseignant peut choisir pour une Fiche une ou plusieurs Écritures parmi capitales, script, cursive, Arial et sans texte, affichées sous chaque Image. Réalise UJ-4.
- « Sans texte » exclut les autres Écritures.
- L'article est masqué par défaut et peut être affiché sur demande.

#### FR-29 : Export Word et PowerPoint
Un enseignant peut exporter toute Fiche en .docx et en .pptx. Réalise UJ-1, UJ-4.
- Le fichier exporté s'ouvre et se modifie dans Word et PowerPoint (textes et images restent éditables).
- En PowerPoint, le modèle « cartes » donne une carte par diapositive, pour la projection en classe. Les autres modèles donnent une page par diapositive.
- Chaque export comprend automatiquement les mentions d'attribution exigées par les licences des Images utilisées (par exemple ARASAAC : auteur, ARASAAC, Gobierno de Aragón, licence), ainsi que le titre et l'auteur de l'Album pour toute image d'album. Ces mentions apparaissent en bas de page (Word) ou sur une diapositive finale (PowerPoint).
- Les réglages de la dernière Fiche (modèle, Écritures, tri, nombre de cartes par page) sont gardés : refaire une Fiche du même type se fait en un clic.
- L'export d'une Fiche de 30 Mots prend moins de 10 secondes. `[ASSUMPTION]`

### 4.8 Administration, modération et notifications

**Description :** l'administrateur garde la banque saine sans toucher au travail personnel des collègues. Les enseignants concernés sont informés de chaque action qui touche leurs Images. Réalise UJ-5.

#### FR-30 : Retrait d'une Image de la Banque
L'administrateur peut retirer une Image de la Banque de l'école en choisissant un motif : licence non conforme, image d'album, image inadaptée ou autre (texte libre). Réalise UJ-5.
- L'Image retourne dans Mes mots de son propriétaire, qui reçoit une notification avec le motif.
- Les Préparations qui l'utilisaient suivent FR-21.

#### FR-31 : Suppression d'une Image par l'administrateur
L'administrateur peut supprimer définitivement une Image (par exemple pour une licence illicite) après confirmation.
- Le propriétaire en est informé, et les Préparations concernées affichent « image supprimée, à remplacer ».

#### FR-32 : Gestion des comptes
L'administrateur peut inviter, désactiver, réactiver et supprimer un compte, et donner ou retirer le rôle d'administrateur.
- Désactiver un compte bloque la connexion sans rien effacer.
- Supprimer un compte efface les données de compte et les Images non versées. Les Images versées restent dans la Banque de l'école, attribuées à « ancien membre de l'équipe ». `[ASSUMPTION]`
- Un compte inactif depuis plus d'un an est signalé à l'administrateur pour suppression. `[ASSUMPTION: durée de conservation à valider avec le DPD (Q-3)]`
- Il y a toujours au moins un administrateur.

#### FR-33 : Notifications
Un enseignant voit, à sa connexion, les notifications qui le concernent : Image retirée ou supprimée par l'administrateur, Image Réutilisée qui a été retirée de la banque. `[ASSUMPTION: notifications dans l'application uniquement, sans e-mail en V1]`

### 4.9 Indicateurs d'usage

#### FR-34 : Tableau de bord de l'administrateur
L'administrateur peut consulter des indicateurs agrégés : nombre d'enseignants actifs par mois, nombre de Préparations par enseignant, nombre d'Images versées et taux de réutilisation (part des Mots d'une Préparation illustrés par une Image existante plutôt que par une nouvelle). Sert au §9.
- Les indicateurs sont agrégés : aucun classement nominatif des collègues n'est affiché. `[ASSUMPTION]`

## 5. Exigences non fonctionnelles transverses

- **Simplicité :** une enseignante qui n'a jamais vu l'application prépare son premier Album sans aide. Les écrans privilégient l'image et contiennent peu de texte. C'est le critère principal de la V1 (§9).
- **Multi-supports :** préparation sur ordinateur (navigateurs récents), ajout de photo sur téléphone (navigateur mobile, sans installer d'application), projection via l'export PowerPoint. `[ASSUMPTION: une application web adaptée au mobile suffit ; pas d'application native]`
- **Réactivité :** détection d'un Mot existant en moins d'une seconde (FR-8) ; une page de banque de 500 Images s'affiche en moins de 2 secondes.
- **Volumétrie :** dimensionnée pour une école d'environ 10 enseignants, 50 Albums par an et 5 000 Images.
- **Réversibilité :** un enseignant peut exporter tout Mes mots (Images et Cartes d'identité) dans un format ouvert, pour que son travail ne soit jamais prisonnier de l'outil. `[ASSUMPTION]`
- **Sauvegarde :** les données sont sauvegardées au moins une fois par jour, et une restauration a été testée avant le lancement du pilote.
- **Évolutivité du modèle :** le modèle de données conserve la Section, la catégorie grammaticale et l'article pour permettre la couverture d'un corpus de référence en V2. Il ne fige pas l'Image comme seul type de média, pour permettre la vidéo plus tard.

## 6. Contraintes et garde-fous

### 6.1 Droits d'auteur et licences
- Une image d'album reste toujours dans Mes mots : jamais versée, stockée en basse résolution et toujours accompagnée de la référence de l'Album, y compris sur les exports (FR-13, FR-19, FR-29). Son stockage en ligne, même dans un espace personnel, reste à valider (Q-1).
- Chaque Image conserve sa source, sa licence et son auteur. Les licences NC (ARASAAC, Sclera) imposent que l'outil reste gratuit et non commercial.
- Les images Pixabay ne peuvent pas être versées tant que Q-2 ne l'a pas confirmé.

### 6.2 Données personnelles (RGPD)
- Seules des données de compte enseignant sont traitées (FR-3), jamais de données d'élève.
- Les photos personnelles ne doivent pas montrer d'enfant identifiable (FR-17).
- Dans le premier degré, le responsable de traitement est le DASEN. Le traitement doit être présenté au DPD académique et inscrit au registre des traitements avant l'ouverture aux 5 collègues (Q-3).
- Chaque enseignant peut demander l'effacement de son compte (FR-32).

### 6.3 Hébergement et gratuité
- L'hébergement est situé dans l'Union européenne. Par défaut, Paul héberge l'instance chez un hébergeur européen, la paie et la maintient pendant le pilote (Q-4) : l'architecture doit rester légère et peu coûteuse à exploiter par une seule personne non spécialiste. L'outil est gratuit, sans publicité, sans traceur publicitaire et sans mesure d'audience tierce.
- Le code est publié sous licence libre, ce qui laisse ouverte une piste vers apps.education.fr. `[ASSUMPTION]`

## 7. Hors objectifs (explicites)

- **Pas d'accès pour les élèves, l'ATSEM ou les parents :** le papier et la projection sont leur interface.
- **Pas d'exercices interactifs ni de jeux** pour les enfants : l'outil prépare des supports, il ne remplace pas l'atelier.
- **Pas un outil de communication alternative (CAA)** comme Picto Selector.
- **Pas un logiciel de mise en page :** la mise en forme fine se fait dans Word ou PowerPoint après l'export.
- **Pas de mode diaporama intégré :** l'application se projette en classe à travers l'export PowerPoint, pas directement.
- **Pas d'impression directe ni d'export PDF en V1 :** on imprime depuis Word.
- **Pas de modèle commercial**, ni de publicité.

## 8. Périmètre de la V1

### 8.1 Inclus
- Comptes sur invitation, rôles enseignant et administrateur, suppression de compte.
- Albums, Modules et Thèmes partagés.
- Préparations par Section, reprise des Mots déjà illustrés d'un Album, saisie rapide, détection des Mots existants, gestion des Sens, Réutilisation en un geste.
- Images : recherche ARASAAC intégrée, téléversement, photo au téléphone, Carte d'identité, filtres.
- Mes mots et Banque de l'école, Verser, Réutiliser par lien, modération et notifications.
- Import .docx et .pptx avec écran de vérification.
- Fiches (cartes, liste illustrée, planche de catégorisation, fiche d'activité), cinq Écritures combinables, export .docx et .pptx avec crédits et réglages gardés.
- Indicateurs d'usage pour l'administrateur.

### 8.2 Hors V1
- **V2, pilotage du corpus :** importer une liste de référence par Section (Boisseau, repères du programme de 2024), voir la couverture et les manques, proposer des combinaisons d'Albums. Le modèle de données l'anticipe (§5).
- **Version ultérieure :** envoi hebdomadaire aux parents le vendredi (message court, vidéo en un clic, sans compte) ; vidéos de moins de 30 secondes pour les verbes d'action, qui aident l'enfant à mimer le mot.
- **Ouverture à d'autres écoles :** après le bilan du pilote.
- **Recherche intégrée dans d'autres banques** (Sclera, Mulberry, Openclipart) : téléversement manuel en V1.
- **Lemmatisation** (rapprocher pluriels et conjugaisons) dans la détection.
- **Formats anciens .doc et .ppt** à l'Import.

## 9. Critères de réussite

Les critères sont mesurés lors d'un bilan de fin d'année scolaire et à l'aide des indicateurs de FR-34. Pour limiter le biais d'un bilan recueilli par le porteur du projet, le questionnaire est anonyme. `[ASSUMPTION]`

**Principal**
- **SM-1 : adoption volontaire et autonome.** À la fin de l'année, les 6 enseignants utilisent l'application pour préparer leurs albums, sans avoir besoin de l'aide de Paul. Valide FR-6 à FR-11, FR-17 et les exigences de simplicité du §5.

**Secondaires**
- **SM-2 : abandon de Word pour la préparation.** Les 6 enseignants déclarent ne plus utiliser Word ou PowerPoint que pour ajuster le résultat exporté. Valide FR-26 à FR-29.
- **SM-3 : le temps de préparation baisse.** Le temps de préparation déclaré par album passe d'environ 6 h au départ à environ 3 h en moyenne pour les albums du 3ᵉ trimestre. Chaque enseignant note ce temps, approximativement, à la fin de chaque Préparation, et le bilan le confirme. `[ASSUMPTION: saisie facultative du temps dans l'application ou relevé sur papier]` Valide la promesse du §1.
- **SM-4 : la réutilisation progresse.** Le taux de réutilisation (FR-34) augmente d'un Album à l'autre et dépasse 50 % pour les Albums préparés au 3ᵉ trimestre. Valide FR-7, FR-8, FR-9, FR-21.
- **SM-5 : le partage prend.** Chaque enseignant a versé au moins une Image dans la Banque de l'école, et au moins 4 enseignants ont Réutilisé une Image d'un collègue. Valide FR-19, FR-21.
- **SM-6 : l'Import débloque la bascule.** Au moins 4 enseignants ont importé au moins un ancien fichier dans le premier mois. Valide FR-23 à FR-25.

**Contre-indicateurs (à ne pas optimiser)**
- **SM-C1 : volume brut de la banque.** Ne pas chercher à gonfler le nombre d'Images : une banque pléthorique de doublons visuels dégrade la réutilisation. Contrebalance SM-5.
- **SM-C2 : temps passé dans l'application.** Le but est de préparer plus vite : un temps de session qui augmente est un signal d'alerte, pas une réussite. Contrebalance SM-1.
- **SM-C3 : réutilisation forcée.** Un taux de réutilisation élevé ne doit pas se payer d'images mal adaptées à la Section. Le bilan demande si les images réutilisées convenaient. Contrebalance SM-4.

## 10. Questions ouvertes

1. **Q-1 : images d'album.** Le stockage en ligne d'une image d'album, même dans Mes mots, relève-t-il de l'exception pédagogique ? Le protocole limite la mise en ligne à un intranet ou un ENT, exige des œuvres acquises régulièrement et plafonne la résolution (environ 400 × 400 px, 72 dpi, à vérifier). Point à confirmer auprès de la circonscription avant l'ouverture. S'il faut y renoncer, l'image d'album disparaît de la V1, ce qui affaiblit l'usage en PS.
2. **Q-2 : licences.** Confirmer le texte exact d'attribution d'ARASAAC et la portée de sa clause de partage à l'identique (SA) sur les Fiches exportées. Confirmer la licence Sclera (CC BY-NC) et la licence Mulberry (CC BY-SA). Vérifier si Pixabay interdit vraiment une banque partagée interne, et si ses images antérieures au 9 janvier 2019 (CC0) peuvent être versées.
3. **Q-3 : RGPD.** Le DASEN étant responsable de traitement, faut-il une analyse ou un avis du DPD académique avant le pilote, et quelle durée de conservation des comptes retenir ?
4. **Q-4 : hébergement et exploitation.** Position par défaut retenue pour le pilote : celle du §6.3, pour quelques euros par mois. Reste ouvert : une prise en charge par une structure (coopérative scolaire, mairie, circonscription, DRANE) après le pilote.
5. **Q-5 : police cursive.** Quelle police cursive scolaire utiliser, et sa licence permet-elle de l'intégrer aux exports ?
6. **Q-6 : programme 2026.** Le nouveau programme du cycle 1 annoncé pour la rentrée 2026 modifie-t-il les repères de vocabulaire utiles en V2 ?

## 11. Index des hypothèses

- §4.1 FR-1 : lien d'invitation valable 7 jours.
- §4.1 FR-2 : session longue (environ 30 jours) sur le téléphone.
- §4.3 FR-8 : pas de lemmatisation en V1.
- §4.4 FR-13 : image d'album limitée à environ 400 × 400 px.
- §4.4 FR-14 : le Sens d'une Image réutilisée par un collègue ne peut pas être changé.
- §4.4 FR-17 : les photos sont réduites à une taille adaptée.
- §4.6 FR-23 : pas de prise en charge des formats .doc et .ppt.
- §4.6 FR-25 : un Import interrompu peut être repris.
- §4.7 FR-27 : nombre de cartes par page réglable.
- §4.7 FR-29 : export de 30 Mots en moins de 10 secondes.
- §4.8 FR-32 : les Images versées d'un compte supprimé restent dans la banque, attribuées à « ancien membre de l'équipe ».
- §4.8 FR-32 : signalement des comptes inactifs depuis plus d'un an.
- §4.8 FR-33 : notifications dans l'application uniquement.
- §4.9 FR-34 : indicateurs agrégés, sans classement nominatif.
- §5 : application web adaptée au mobile, sans application native.
- §5 : export complet de Mes mots dans un format ouvert.
- §6.3 : code publié sous licence libre.
- §9 : questionnaire de bilan anonyme.
- §9 SM-3 : relevé du temps de préparation, dans l'application ou sur papier.
