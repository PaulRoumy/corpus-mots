---
status: final
stepsCompleted: [step-01-validate-prerequisites, step-02-design-epics, step-03-create-stories, step-04-final-validation]
inputDocuments:
  - docs/prd/prd-corpus-mots-2026-10-27/prd.md
  - docs/prd/prd-corpus-mots-2026-10-27/addendum.md
  - docs/architecture/architecture-corpus-mots-2026-10-29/ARCHITECTURE-SPINE.md
  - docs/ux-designs/ux-corpus-mots-2026-10-28/DESIGN.md
  - docs/ux-designs/ux-corpus-mots-2026-10-28/EXPERIENCE.md
---

# corpus-mots - Découpage en epics

## Vue d'ensemble

Ce document découpe en epics et en stories réalisables les exigences de corpus-mots, issues du PRD, de la conception UX (DESIGN.md + EXPERIENCE.md) et de l'architecture. Les termes du domaine sont ceux du Glossaire du PRD (§3). Les identifiants FR-n reprennent ceux du PRD, et les AD-n ceux de l'architecture.

## Inventaire des exigences

### Exigences fonctionnelles

**Comptes et rôles**

- FR-1 : L'administrateur invite un enseignant en saisissant son e-mail. L'invité reçoit un lien valable 7 jours pour définir son mot de passe. Sans invitation, aucun compte ne peut être créé.
- FR-2 : Un enseignant se connecte par e-mail et mot de passe, sur ordinateur comme sur téléphone, et peut réinitialiser son mot de passe par e-mail. La session reste active environ 30 jours sur le téléphone, pour que l'ajout d'une photo ne commence pas par une connexion.
- FR-3 : Le compte ne contient que le nom affiché, l'e-mail, le mot de passe (protégé) et le rôle. Aucun champ ne permet de saisir une donnée d'élève. Une page d'information explique quelles données sont conservées, pourquoi, combien de temps, et comment en demander l'effacement.

**Albums, Modules et Thèmes**

- FR-4 : Un enseignant recherche un Album par titre et, s'il n'existe pas, le crée (titre, auteur, éditeur facultatif). Les Albums au titre proche sont signalés à la création. Le créateur et l'administrateur peuvent corriger un Album, et l'administrateur peut fusionner deux Albums en doublon.
- FR-5 : Un enseignant ajoute des Modules ordonnés à un Album et des Thèmes à la liste commune. Ils sont aussitôt visibles par tous. Seuls le créateur et l'administrateur peuvent les renommer ou les supprimer. Un Thème utilisé ne peut pas être supprimé tant que ses Images n'ont pas été réaffectées.

**Préparations, saisie rapide et détection**

- FR-6 : Un enseignant crée une Préparation (Album, Section, Module et Thème par défaut facultatifs) puis y tape des Mots en série. La Section proposée par défaut est celle de sa dernière Préparation. L'Album, le Module et le Thème s'appliquent par défaut à chaque Mot et restent modifiables mot par mot. Un Mot sans Image est accepté et apparaît « à illustrer ».
- FR-7 : À la création d'une Préparation, l'application affiche les Mots déjà illustrés pour cet Album, dans Mes mots et dans la Banque de l'école. L'enseignant les reprend tous en un clic ou un par un. Chaque Mot repris arrive avec l'Image proposée selon l'ordre de FR-9, qu'il peut changer. Les Mots non retenus sont ignorés, pas supprimés.
- FR-8 : Pendant la frappe, et en moins d'une seconde, l'application indique si le Mot existe dans l'école, sans tenir compte de la casse, des accents ni de l'article, et sans lemmatisation. Pour un Mot existant, elle montre ses Sens, ses Albums et les Images disponibles (les miennes et celles de la Banque), avec leurs Sections et leur album d'origine. Les Images non versées d'un collègue, et les Albums où il n'a utilisé le Mot que dans Mes mots, ne sont jamais montrés. Un Mot qui n'existe que dans Mes mots d'un collègue est présenté comme nouveau.
- FR-9 : Un enseignant retient en une seule action une Image proposée pour un Mot de sa Préparation. L'Image est liée, pas copiée. Les Images sont classées d'abord par Section de la Préparation, puis, à Section égale, en mettant en tête celles déjà utilisées pour ce Sens dans d'autres Albums.
- FR-10 : Pour un Mot existant, l'enseignant choisit l'un de ses Sens ou en crée un nouveau, avec un libellé court. La catégorie grammaticale est portée par le Sens et préremplie quand le Mot existe. Deux Sens d'un même Mot coexistent, chacun avec ses Images.
- FR-11 : Un enseignant liste, ouvre, renomme, duplique (en changeant de Section) et supprime ses Préparations. Supprimer une Préparation ne supprime aucune Image.

**Images et Carte d'identité**

- FR-12 : Depuis un Mot, l'enseignant recherche et choisit des pictogrammes ARASAAC sans quitter l'application. Pour un Mot sans Image, les résultats sont proposés automatiquement. Une Image ARASAAC porte automatiquement sa source, sa licence (CC BY-NC-SA) et ses auteurs.
- FR-13 : Un enseignant téléverse une Image en indiquant son type, sa source, sa licence et son auteur. La source et la licence sont obligatoires pour une image libre. Une image d'album exige la référence de l'Album et est stockée en basse résolution (≤ 400 × 400 px). Une Image dont la licence est inconnue ou interdit la redistribution (Pixabay) reste dans Mes mots et ne peut pas être versée.
- FR-14 : Un enseignant consulte la Carte d'identité de toute Image visible et modifie celle de ses propres Images, et seulement celles-là (l'administrateur ne peut pas la modifier). Les Sections se cochent librement. Une modification s'applique partout où l'Image est utilisée. Le Sens d'une Image réutilisée ne peut pas être changé.
- FR-15 : Un enseignant filtre les Images de Mes mots et de la Banque par Mot, Sens, Section, Album, Module, Thème, catégorie grammaticale, type d'image et propriétaire. Les filtres se combinent. Dans Mes mots, le filtre Section retient aussi les Images utilisées dans une Préparation de cette Section.
- FR-16 : À l'ajout d'une Image, un repère visuel court rappelle « simple, claire, peu de détails ».
- FR-17 : Sur téléphone, un enseignant prend une photo, tape le Mot, coche les Sections et l'enregistre comme photo personnelle, en trois étapes et sans autre champ obligatoire. Si le Mot existe, l'application propose de rattacher la photo à l'un de ses Sens. La photo est réduite à une taille adaptée. Un rappel indique de ne pas photographier d'enfant identifiable.

**Mes mots et Banque de l'école**

- FR-18 : Un enseignant bascule entre Mes mots et la Banque de l'école et voit toujours à qui appartient chaque Image. Ses Images, versées ou non, restent dans Mes mots, avec la mention « versée » le cas échéant.
- FR-19 : Le propriétaire d'une Image la verse dans la Banque ou l'en retire. Une image d'album ne peut jamais être versée, et l'application dit pourquoi. Une Image de type inconnu, ou une image libre sans source ni licence, ne peut pas être versée tant que ces champs ne sont pas remplis. On peut verser plusieurs Images à la fois.
- FR-20 : Le propriétaire supprime une de ses Images. Si un collègue la Réutilise, elle est retirée de la Banque et disparaît de Mes mots du propriétaire, mais reste visible chez les collègues avec la mention « retirée de la banque ». Sinon, elle est supprimée après confirmation.
- FR-21 : Réutiliser une Image d'un collègue crée une référence vers l'Image d'origine, que l'enseignant ne peut modifier. Si elle est retirée de la Banque, elle reste visible dans les Préparations qui l'utilisent avec la mention « retirée de la banque », ne peut plus être Réutilisée et est marquée à remplacer. Les Fiches déjà exportées ne changent pas.
- FR-22 : Ajouter une Image à un Sens n'altère jamais les Images existantes. Aucune action d'un enseignant ne modifie ni ne supprime une Image ou une Préparation d'un autre enseignant, sauf le retrait ou la suppression par l'administrateur.

**Import Word et PowerPoint**

- FR-23 : Un enseignant dépose un ou plusieurs fichiers .docx et .pptx. L'application extrait chaque image et le texte qui l'accompagne (en dessous, à côté ou sur la même diapositive) comme Mot proposé. Les formats .doc et .ppt ne sont pas pris en charge.
- FR-24 : Avant toute création, un écran de vérification montre les paires extraites. L'enseignant corrige le Mot, écarte une paire et complète en lot l'Album, le Module, le Thème, les Sections, le type, la source et la licence. Les paires sans Mot lisible ou sans image sont signalées et bloquées tant qu'elles ne sont pas corrigées. La détection de FR-8 s'applique à chaque paire. Le type vaut « inconnu » par défaut.
- FR-25 : À la validation, les paires deviennent des Images de Mes mots, rattachées aux Mots et aux Sens, et éventuellement à une Préparation. Un Import interrompu se reprend sans perdre les corrections. Rien n'est versé automatiquement.

**Fiches et exports**

- FR-26 : Un enseignant génère une Fiche à partir d'une Préparation, d'un Module ou d'un filtre (FR-15). Il trie les Mots (ordre alphabétique, ordre de saisie, catégorie grammaticale) et peut en désélectionner avant la génération.
- FR-27 : Quatre Modèles de fiche : cartes (4 par page A4 par défaut, nombre réglable : 1, 2, 4, 6 ou 8), liste illustrée, planche de catégorisation (plusieurs Images par Sens quand elles existent) et fiche d'activité (zone de consigne libre).
- FR-28 : L'enseignant choisit une ou plusieurs Écritures parmi capitales, script, cursive, Arial et sans texte, affichées sous chaque Image. « Sans texte » exclut les autres. L'article est masqué par défaut et peut être affiché.
- FR-29 : Toute Fiche s'exporte en .docx et en .pptx éditables. En PowerPoint, le modèle cartes donne une carte par diapositive, et les autres modèles une page par diapositive. Les mentions d'attribution des licences, ainsi que le titre et l'auteur de l'Album pour toute image d'album, sont ajoutées automatiquement (pied de page en Word, diapositive finale en PowerPoint). Les derniers réglages sont gardés : refaire une Fiche du même type se fait en un clic. L'export de 30 Mots prend moins de 10 s.

**Administration, modération et notifications**

- FR-30 : L'administrateur retire une Image de la Banque avec un motif (licence non conforme, image d'album, image inadaptée, ou autre avec texte libre). L'Image retourne dans Mes mots de son propriétaire, qui est notifié avec le motif. Les Préparations concernées suivent FR-21.
- FR-31 : L'administrateur supprime définitivement une Image après confirmation. Le propriétaire est informé, et les Préparations concernées affichent « image supprimée, à remplacer ».
- FR-32 : L'administrateur invite, désactive, réactive et supprime un compte, et donne ou retire le rôle d'administrateur. Désactiver bloque la connexion sans rien effacer. Supprimer efface les données de compte et les Images non versées ; les Images versées restent, attribuées à « ancien membre de l'équipe ». Un compte inactif depuis plus d'un an est signalé. Il reste toujours au moins un administrateur.
- FR-33 : À sa connexion, un enseignant voit ses notifications, uniquement dans l'application : Image retirée ou supprimée par l'administrateur, Image Réutilisée qui a été retirée de la Banque.

**Indicateurs**

- FR-34 : L'administrateur consulte des indicateurs agrégés, sans aucun classement nominatif : enseignants actifs par mois, Préparations par enseignant, Images versées et taux de réutilisation (part des Mots d'une Préparation illustrés par une Image existante).

### Exigences non fonctionnelles

- NFR-1 Simplicité : une enseignante qui n'a jamais vu l'application prépare son premier Album sans aide. Les écrans privilégient l'image et contiennent peu de texte. C'est le critère principal de la V1 (SM-1).
- NFR-2 Multi-supports : préparation sur ordinateur (navigateurs récents), ajout de photo dans le navigateur du téléphone sans application native, projection via l'export PowerPoint.
- NFR-3 Réactivité de la détection : un Mot existant est détecté en moins d'une seconde après la frappe.
- NFR-4 Réactivité de la Banque : une page de 500 Images s'affiche en moins de 2 secondes.
- NFR-5 Performance des exports : une Fiche de 30 Mots s'exporte en moins de 10 secondes.
- NFR-6 Volumétrie : environ 10 enseignants, 50 Albums par an et 5 000 Images.
- NFR-7 Réversibilité : un enseignant exporte tout Mes mots (Images et Cartes d'identité) dans un format ouvert.
- NFR-8 Sauvegarde : au moins une sauvegarde par jour, et une restauration testée avant le lancement du pilote.
- NFR-9 Évolutivité du modèle : la Section, la catégorie grammaticale et l'article sont conservés pour la V2 (couverture d'un corpus de référence). L'Image n'est pas figée comme seul type de média, pour permettre la vidéo plus tard.
- NFR-10 Droits d'auteur : une image d'album n'est jamais versée, est stockée en basse résolution et est toujours accompagnée de la référence de son Album, y compris dans les exports. Chaque Image conserve sa source, sa licence et son auteur.
- NFR-11 Licences : les licences NC imposent un outil gratuit et non commercial. Les images Pixabay ne sont pas versables tant que Q-2 n'est pas tranchée.
- NFR-12 RGPD : seules des données de compte enseignant sont traitées, jamais de données d'élève. Les photos ne doivent pas montrer d'enfant identifiable. Le traitement est présenté au DPD académique avant l'ouverture aux collègues (Q-3). Chacun peut demander l'effacement de son compte.
- NFR-13 Hébergement et gratuité : hébergement dans l'UE, sur une architecture légère que Paul peut exploiter seul sans être spécialiste. L'outil est gratuit, sans publicité, sans traceur ni mesure d'audience tierce.
- NFR-14 Code ouvert : le code est publié sous licence libre.
- NFR-15 Accessibilité : socle WCAG 2.x AA (contrastes 4,5:1 pour le texte et 3:1 pour le non-texte, clavier complet, focus visible, jamais la couleur seule). Le détail est en UX-DR-36.

### Exigences supplémentaires (Architecture)

**Mise en place du projet (Epic 1, Story 1)**

- Pas de starter tiers : l'architecture fixe un monorepo à créer de zéro, avec `back/` (Quarkus 3.40 LTS, Maven, Java 25), `front/` (Angular 22.2 + Angular Material, composants standalone, état par services à signals, sans NgRx), `deploiement/` (`compose.yaml`, `Caddyfile`, `.env.exemple`, `sauvegarde.sh`, `keycloak/`) et `.github/workflows/`.
- Le back est découpé en dix modules (`commun`, `comptes`, `referentiels`, `vocabulaire`, `notifications`, `preparations`, `importation`, `fiches`, `moderation`, `indicateurs`), chacun en trois couches `api` → `service` → `persistance` (paquetages `fr.corpusmots.<module>.<couche>`).
- Versions de la stack : PostgreSQL 18.6 (+ `unaccent`, `pg_trgm`), Keycloak 26.8.x, Caddy 2.11.x, Apache POI 5.5.1, ng-openapi-gen 1.1.x, Node.js 26 LTS, ArchUnit 1.x, Podman 6.1 (`podman compose`, fournisseur Docker Compose v5).

**Règles structurelles**

- AD-1 : graphe de dépendances entre modules figé par un test ArchUnit. Les modules s'appellent seulement par leur couche `service` et se référencent par UUID, sans relation JPA ni clé étrangère entre modules.
- AD-7 : API REST/JSON sous `/api`. Le document OpenAPI 3.1 est généré par SmallRye, et le client TypeScript par ng-openapi-gen, jamais édité à la main. Aucun appel HTTP écrit à la main dans le front.
- AD-13 : noms du domaine en français sans accents (`Mot`, `Sens`, `Preparation`…), vocabulaire technique en anglais. Le module d'import s'appelle `importation`.
- AD-15 : pour remonter le graphe, interfaces `…Utilisation` ou événements synchrones (`AlbumsFusionnes`, `ModuleSupprime`, `ThemeSupprime`, `PreparationSupprimee`) avec `@Observes` dans la transaction de l'émetteur. Ni `@ObservesAsync` ni `AFTER_*`.
- AD-16 : les frontières entre modules ne laissent passer que des `record` (`…Vue`, `…Commande`). Les octets d'une Image ne sortent que par `FichiersImages.lire(imageId, enseignantId, usage)`. Les noms de DTO REST sont uniques, contrôlés par ArchUnit. Toute représentation REST d'une Image contient `id`, `proprietaireId`, `etat`, `aRemplacer` et `reutilisable`.
- AD-17 : la transaction est ouverte par le service du module qui reçoit la requête, sans `REQUIRES_NEW`. Aucun appel HTTP sortant pendant une transaction (on appelle, on écrit, on compense). `@Version` et `SELECT … FOR UPDATE` sur `image` pour `lierImage` et les transitions d'état.
- AD-22 : migrations Flyway `V<AAAAMMJJHHMM>__<module>_<objet>.sql`, chacune limitée aux tables de son module. Clés étrangères obligatoires dans un module, interdites entre modules. Une migration publiée n'est jamais modifiée.

**Domaine et règles métier**

- AD-2 : `vocabulaire.service.VisibiliteImages` est le seul arbitre de la visibilité, avec trois prédicats : `consultable`, `proposable` et `moderable`. Un lien ne rend jamais une Image proposable, et le rôle admin n'élargit rien. Le classement de FR-9 est calculé uniquement par `vocabulaire.service`. Des tests dédiés sont obligatoires.
- AD-3 : une Image a un état parmi `privee`, `versee`, `abandonnee` et `supprimee` (pierre tombale). Seul `vocabulaire.service` change cet état, avec un `Acteur` explicite. Le motif de retrait admin bloque le versement jusqu'à une modification de la Carte d'identité. L'état « à remplacer » est calculé à la lecture. Les Notifications sont créées dans la transaction de la transition et stockent un instantané.
- AD-4 : énumérations fermées `type_image` (4 valeurs) et `licence` (8 valeurs). Règle de versabilité unique, avec des codes d'erreur stables (`image.versement.image_album`, `.type_inconnu`, `.licence_non_versable`, `.source_manquante`, `.retrait_admin`). Des tests dédiés sont obligatoires.
- AD-5 : Réutiliser, c'est lier. Le Sens d'une Image ne change que si elle n'a aucun lien. Invariant : le Sens de l'Image est égal au Sens retenu dans la Préparation.
- AD-8 : fichiers stockés en `bytea` dans PostgreSQL, en deux tailles (`octets`, `miniature`). `ReductionImages` est l'implémentation unique : image d'album ≤ 400 px, autres ≤ 1600 px, miniature ≤ 256 px, EXIF supprimé.
- AD-9 : recherche ARASAAC par un proxy dans `vocabulaire`, jamais depuis le front. Le pictogramme est téléchargé avant la transaction et copié en base.
- AD-10 : `Lexique.normaliser` est la normalisation unique (espaces, apostrophes, article initial). Chaque Mot stocke `forme`, `forme_cle` (unique, avec accents) et `forme_recherche` (`unaccent`, index `pg_trgm`). Un jeu de tests partagé couvre côte/côté, l'arbre, lapin et des.
- AD-11 : l'Import passe par un `ImportBrouillon` persistant (Apache POI, octets déjà réduits, Sens choisi par paire, « Sens à choisir »). La validation est idempotente (`import_paire_id` unique). Les brouillons sont purgés 30 jours après validation ou abandon.
- AD-12 : les Fiches sont régénérées à la demande, jamais stockées. On ne garde que les réglages et la source. Un composant unique de crédits sert aux deux formats. Une Image `supprimee` devient un cadre vide légendé. `source_disponible = false` quand la Préparation source est supprimée.
- AD-14 : les tables `sens_retenu` et `lien_image` appartiennent à `vocabulaire` et ne se modifient que par `Usages` (`retenirSens`, `lierImage`, `delierImage`, `remplacerImage`, `libererPreparationMot`, `libererPreparation`, `changerContextePreparation`). `origine` vaut `nouvelle` ou `reutilisee`.
- AD-19 : Mots et Sens ne sont créés que par `obtenirOuCreerMot` et `obtenirOuCreerSens`, idempotentes, sans erreur de doublon ni fuite d'information, jamais pendant la détection. Les enseignants ne peuvent pas les modifier en V1 ; une correction passe par l'administrateur.
- AD-24 : `indicateurs` ne lit que des méthodes d'agrégat (`Statistiques…`) qui renvoient des nombres. La table `enseignant_activite(enseignant_id, mois)` est écrite par le filtre de `comptes`.

**Identité et sécurité**

- AD-6 : Keycloak possède l'e-mail, le mot de passe, le rôle `admin`, les sessions, ainsi que les e-mails d'invitation et de réinitialisation. `comptes` possède `Enseignant` (`id` = `sub`, `statut`). Le rôle se lit dans le jeton. La règle « au moins un administrateur » est vérifiée sous `pg_advisory_xact_lock`. Un filtre renvoie `403 compte.inconnu_ou_inactif`. Le back vérifie un bearer OIDC, le front utilise code + PKCE. Les sessions sont révoquées à la désactivation. Un compte est anonymisé, jamais effacé physiquement. La console admin Keycloak n'est jamais exposée.
- AD-18 : une opération de compte ferme d'abord et efface ensuite. Ordre de suppression : Keycloak désactivé, puis purge transactionnelle par module, puis `DELETE` Keycloak. Une invitation échouée est compensée. Une tâche horaire rejoue les étapes Keycloak en échec et nettoie les utilisateurs orphelins.
- AD-20 : le nom affiché n'est stocké que dans `enseignant`. Le front le résout par `GET /api/enseignants`, mis en cache dans `commun/annuaire`. Les exports citent le champ `auteur`, jamais le nom du propriétaire.
- AD-23 : le front charge les images en `blob` par le client généré, via la directive `commun/image-securisee`, sans jamais mettre de jeton dans une URL. Les listes demandent `?taille=miniature`. En-têtes `Cache-Control: private, max-age=86400` et `ETag` égal à la version de l'Image.
- Conventions : chaque ressource est authentifiée, les actions admin exigent le rôle `admin`, et l'enseignant courant vient du jeton, jamais d'un paramètre. Erreurs au format RFC 9457 avec un `code` stable, que le front traduit en français. Pagination `?page=&taille=` (100 au maximum), réponse `{ elements, total }`. Sur un `401`, renouvellement silencieux du jeton et rejeu de la requête. Limites de 20 Mo par fichier et 100 Mo par import, identiques dans Caddy et Quarkus. Aucun CDN ni service tiers appelé depuis le navigateur.

**Déploiement, exploitation et tests**

- AD-21 : hébergement portable. Tout ce qui dépend de la machine est dans `deploiement/.env`. `compose.yaml`, `Caddyfile` et l'export du realm Keycloak (versionné, thème et textes en français) sont identiques partout. Seuls les ports 80 et 443 sont ouverts.
- Topologie : Caddy (Let's Encrypt) route `/` vers le front statique, `/api` vers Quarkus et `/auth` vers Keycloak (sauf `/auth/admin`). Un seul PostgreSQL héberge les bases `corpusmots` et `keycloak`.
- CI/CD : un tag Git déclenche GitHub Actions, qui construit les images `front` et `back` et les publie sur ghcr.io. Sur le mini-PC : `podman compose pull && podman compose up -d`.
- Sauvegarde : `pg_dumpall` chaque nuit vers un disque externe, 14 jours conservés, avec un fichier d'état daté. Une restauration complète est testée avant le pilote.
- Export de Mes mots (NFR-7) : assemblé par `preparations` via `FichiersImages`, sous forme d'archive ZIP (JSON + fichiers).
- Tests : `@QuarkusTest` contre un PostgreSQL de test (Dev Services) ; ArchUnit pour AD-1 et AD-16 ; tests dédiés pour AD-2, AD-3, AD-4 et AD-10 ; tests de composants front pour les écrans clés. Les journaux ne contiennent jamais de contenu d'image ni de jeton.

**Points bloquants reportés (préalables à certaines stories)**

- Relais SMTP à choisir avant la première invitation.
- Conditions d'usage de l'API ARASAAC et texte exact d'attribution (Q-2), avant le développement d'AD-9 et des crédits.
- Polices des Fiches (cursive scolaire, script, capitales, Q-5), avant le développement des exports.
- Images d'album (Q-1) et RGPD (Q-3), avant l'ouverture aux collègues. Si Q-1 interdit le stockage, le type `image_album` est retiré.
- Bibliothèque OIDC du front et réglages de session Keycloak, à choisir au scaffolding.

### Exigences de conception UX

**Fondations visuelles**

- UX-DR-1 : implémenter les jetons de DESIGN.md dans le thème Angular Material 3 : rôles de couleur clairs, rôles sombres « Repères » définis mais non activés, couleurs de Section, de type d'image et d'état, échelles `rounded`, `spacing` et `elevation`. Les composants référencent les jetons, jamais de valeur littérale. L'entrée « Thème clair / sombre » reste masquée.
- UX-DR-2 : typographie. Nunito auto-hébergée pour toute l'interface (headline, title, body, body-sm, label, label-sm, input). Cursive (`word-cursive`, `word-cursive-lg` ; Segoe Script provisoire, repli Playwrite FR Moderne auto-hébergée) réservée aux mots de vocabulaire. Aucune police servie par un CDN.
- UX-DR-3 : coquille ordinateur. Barre supérieure fixe (Champ de recherche, Bouton « + », Notifications, Menu de profil) et navigation latérale gauche de 248 px (Préparations, Banque, Fiches ; élément actif en `secondary-container`). Conçue pour 1280 px minimum ; les grilles gagnent des colonnes sur grand écran.

**Composants partagés**

- UX-DR-4 : Champ de recherche (pilule 44 px), avec la même tolérance que FR-8. Entrée ouvre la Banque filtrée sur le Mot, en respectant la règle de Confidentialité.
- UX-DR-5 : Bouton « + » (48 px), qui ouvre un menu à trois choix : Nouvelle préparation, Ajouter une image, Importer des fichiers.
- UX-DR-6 : Menu de profil avec Mon compte, Mes données, Administration (administrateur seulement) et Déconnexion.
- UX-DR-7 : Notifications. Cloche avec pastille `error` quand il y a des non lues ; menu déroulant ; notifications marquées lues à l'ouverture ; motif affiché ; état vide « Aucune notification ».
- UX-DR-8 : Repère de Section (badge 22 px), qui combine forme (● PS, ▲ MS, ■ GS), couleur de Section et libellé toujours écrit.
- UX-DR-9 : Badge de type d'image, qui combine icône (globe, appareil photo, livre ouvert, point d'interrogation), style de bordure (pleine, double, tirets, pointillés) et couleur du type.
- UX-DR-10 : Badge d'état (« à illustrer », « image retirée de la banque », « image supprimée, à remplacer », « versée ») avec icône et libellé. Marque « déjà utilisée » (icône historique, `tertiary-container`) posée sur l'Image déjà utilisée par l'enseignant pour ce Sens, à Section égale.
- UX-DR-11 : Vignette d'Image (`rounded.md`), avec propriété toujours visible et texte alternatif « Mot + Sens ». Image chargée par la directive `image-securisee` (miniature dans les listes).
- UX-DR-12 : Case de sélection et Barre d'actions en lot, au comportement identique dans Préparation, Banque et Import. Case visible au survol et au focus, puis toutes visibles dès qu'une sélection existe. Espace coche, Maj+clic sélectionne une plage, « Tout sélectionner », Échap désélectionne. La barre affiche le nombre sélectionné et les actions ; les Images non versables restent hors du lot, avec leur raison.
- UX-DR-13 : Bandeau « Annuler » (snackbar). Pas de confirmation pour les gestes courants. Annulation possible pendant 8 s, décompte suspendu au survol et au focus, un seul bandeau à la fois, annoncé aux lecteurs d'écran. « Annuler » appelle l'opération inverse.
- UX-DR-14 : Bandeau d'erreur. Bannière `error-container` avec « Réessayer », affichée jusqu'à résolution. La saisie en cours est conservée, et le bandeau est annoncé aux lecteurs d'écran.
- UX-DR-15 : Dialogue de confirmation pour les actions graves (supprimer une Image, une Préparation ou un compte ; « Ne plus verser » une Image réutilisée par des collègues), avec un bouton `error` et le bouton par défaut sur « annuler ». Dialogue de retrait (administrateur) avec quatre motifs en boutons radio (« autre » exige un texte), bouton « Retirer de la banque » actif dès qu'un motif est choisi.
- UX-DR-16 : Puces de filtre (32 px, combinables) et filtre de provenance à choix unique « Mes mots / Banque de l'école / Tout », sur Mes mots par défaut.
- UX-DR-17 : Champ à étiquettes pour les Thèmes. La frappe propose les Thèmes existants, « Créer le thème « … » » est visible de tous, Retour arrière retire la dernière étiquette. Le menu de l'étiquette permet de renommer ou supprimer (créateur ou administrateur), et la suppression est refusée si le Thème est utilisé.
- UX-DR-18 : Sélecteur de licence en liste fermée (ARASAAC, Sclera, Mulberry, CC0, Pixabay, autre / inconnue). Les licences non versables portent la mention « non partageable ».
- UX-DR-19 : Sélecteur de catégorie grammaticale. Menu Material 3 en liste fermée, prérempli avec la catégorie du Sens existant.
- UX-DR-20 : Création de Sens dépliée sur place (jamais en dialogue) dans le Panneau de détection et dans la Carte d'identité. Libellé obligatoire et catégorie ; Entrée ou « Créer le sens » crée et sélectionne le Sens ; Échap replie.
- UX-DR-21 : Repère de qualité, une ligne « simple, claire, peu de détails » au-dessus de toute liste d'images à choisir, jamais bloquante.
- UX-DR-22 : États génériques. État vide (une phrase et une action principale), squelettes de chargement Material, pas de mode hors connexion.

**Écrans**

- UX-DR-23 : Accueil Préparations. Cartes de Préparation (vignette, titre, repère de Section, « n mots · n à illustrer » ; menu renommer, dupliquer avec choix de la Section, supprimer). Encart Import tant que la banque de l'enseignant est vide. Carte « Import en cours » avec « Reprendre ». État vide « Pas encore de préparation… ».
- UX-DR-24 : Dialogue « Nouvelle préparation » : Album (recherche pendant la frappe, « Créer l'album », titres proches signalés), Section préremplie avec celle de la dernière Préparation, Module, Thème par défaut ; « Créer » ouvre la Préparation.
- UX-DR-25 : En-tête de Préparation : titre de l'Album, repère de Section, Module modifiable (avec « Nouveau module »), Thème par défaut, compteur « N mots, M déjà illustrés » mis à jour à chaque ajout, « Temps passé » facultatif, menu de correction de l'Album (créateur) et bouton plein « Générer une fiche ». Enregistrement automatique à la sortie de chaque champ.
- UX-DR-26 : Champ de saisie rapide et Panneau de détection. Entrée ajoute le Mot et garde le focus ; aide « Entrée pour ajouter » ; détection pendant la frappe, annoncée en `aria-live` poli sans voler le focus. Images ordonnées selon FR-9 (mes Images avant celles des collègues à rang égal), ↑ ↓ + Entrée pour choisir, première proposition mise en avant, suggestions ARASAAC pour un Mot nouveau, « Nouveau sens ».
- UX-DR-27 : Encart « mots déjà illustrés » (`tertiary-container`, vignettes de 56 px), avec « Tout reprendre » ou un choix un par un. Écarter un Mot est annulable. L'encart disparaît quand il ne reste plus rien à reprendre.
- UX-DR-28 : Grille de Cartes de Mot dans l'ordre de saisie. Carte de Mot (vignette et Mot en cursive ; clic ou Entrée ouvre le Panneau de choix d'Image ; Image retirée grisée à 0,4 avec badge rouge ; retrait de la Préparation annulable). Carte « à illustrer » (bordure en tirets, suggestions ARASAAC en ligne, « Téléverser »). Actions en lot : Verser, retirer de la Préparation.
- UX-DR-29 : Panneau de choix d'Image, panneau latéral droit de 400 px qui laisse la grille visible : Mot en cursive et Sens modifiable, Repère de qualité, Images ordonnées comme la détection, ↑ ↓ + Entrée ou clic pour choisir et fermer, « Ajouter une image », Échap pour fermer.
- UX-DR-30 : Banque et Panneau Carte d'identité. Grille regroupée par Mot et Sens, filtres et provenance, état vide « Aucune image » avec « Effacer les filtres ». Panneau latéral avec les champs dans l'ordre du Glossaire, modifiable par le propriétaire seulement et enregistré à la sortie de chaque champ (une erreur est signalée sur le champ). Raison exacte quand Verser est indisponible (« image d'album », « type inconnu », « licence à préciser », « licence non partageable »). Message de versement « L'image reste la vôtre… ». « Ne plus verser » est distinct de « Retirer de la banque ». Actions Supprimer et « Utiliser dans une préparation ». Sélection, puis « Créer une fiche avec cette sélection ».
- UX-DR-31 : Ajouter une image. Recherche ARASAAC aux résultats progressifs, et « Téléverser » si ARASAAC ne donne rien ou est indisponible. Type, source, licence, et Album obligatoire pour une image d'album (blocage « Album d'origine requis »). Repère de qualité.
- UX-DR-32 : Import. Zone de dépôt (glisser-déposer et « Choisir des fichiers », plusieurs fichiers, carte de problème pour un fichier .doc/.ppt ou illisible). Grille de Cartes de vérification (Mot corrigeable sur place, détection par carte, cartes à problème « mot manquant », image manquante, « Album d'origine requis », « Sens à choisir », rattachement signalé quand un Mot a été créé entre-temps). Lots via la Barre d'actions. Progression par fichier à l'extraction et par paire à la validation. En cas de validation partielle, les paires créées sont gardées et un Bandeau d'erreur s'affiche.
- UX-DR-33 : Fiches. Historique en lignes de 56 px (titre, modèle, source, date, « Refaire »), et bouton « Fiche thématique ». Génération de Fiche avec les Réglages à gauche (titre, consigne pour la fiche d'activité, filtres Thème, Section, catégorie et provenance, modèle, Écritures en puces, « Afficher l'article », tri, cartes par page) et l'Aperçu à droite, mis à jour à chaque changement. Export désactivé si la sélection est vide ; progression pendant l'export ; réglages conservés en cas d'échec.
- UX-DR-34 : Aperçu et rendu des Fiches. Page blanche fidèle à l'export, dans la police de l'export. Image grande et seule, peu de texte, aucun décor. Crédits et référence d'Album visibles en lecture seule (pied de page Word, diapositive finale PowerPoint). Les jetons de l'interface ne s'appliquent pas aux Fiches.
- UX-DR-35 : Téléphone (largeur < 600 px). L'accueil mobile se réduit au bouton « Ajouter une photo » (96 px), qui ouvre directement l'appareil photo (« Choisir dans la galerie » en repli). Rappel de prise de vue « Pas d'enfant identifiable · un seul objet, fond uni ». Mot avec Sens le plus utilisé présélectionné, ou « à compléter ». Sélecteur de Sections (bascules 40 px). Bouton Enregistrer (52 px) actif dès que la photo, le Mot et une Section sont présents. Envoi avec progression ; en cas d'échec, la photo et la saisie restent avec « Réessayer ».
- UX-DR-36 : Accessibilité. Clavier complet, tabulation dans l'ordre de lecture, Échap ferme panneaux, menus et dialogues. Anneau de focus `primary` de 2 px décalé de 2 px. Contrastes AA. Jamais la couleur seule (Section, type, état, sélection). Pas de dialogue sur un dialogue, pas de glisser-déposer comme seul moyen.
- UX-DR-37 : Ton et microcopie. Vouvoiement, ton neutre et factuel, verbes à l'infinitif, ni émoji ni point d'exclamation. Chaque `code` d'erreur du back est traduit en message français (par exemple « Session expirée. Reconnectez-vous : votre saisie est conservée. »).
- UX-DR-38 : Session expirée. Sur ordinateur, connexion puis retour à la même page avec le Mot en cours conservé. Sur téléphone, retour direct à l'ajout de photo.
- UX-DR-39 : Connexion, Créer mon mot de passe et Mot de passe oublié (thème Keycloak en français), utilisables sur téléphone, avec un lien « Données personnelles ». Messages : identifiants refusés, lien expiré, compte désactivé.
- UX-DR-40 : Mon compte et Mes données. Page d'information RGPD et « Exporter mes images » (progression, puis téléchargement de l'archive). Aucun champ ne permet de saisir une donnée d'élève.
- UX-DR-41 : Administration (Comptes, Modération, Tableau de bord, Fusion d'Albums), réservée aux administrateurs. Entrée de menu masquée pour les autres ; un accès direct par URL ramène à l'accueil. Comptes : inviter, désactiver, réactiver, supprimer, rôle ; le retrait du rôle et la suppression sont refusés pour le dernier administrateur ; les comptes inactifs sont signalés.

### Carte de couverture des FR

| FR | Epic | Résumé |
|---|---|---|
| FR-1 | Epic 1 | Invitation par l'administrateur |
| FR-2 | Epic 1 | Connexion, session, mot de passe oublié (session longue téléphone exploitée en Epic 5) |
| FR-3 | Epic 1 | Données de compte minimales, page d'information RGPD |
| FR-4 | Epic 2 (recherche, création, correction) · Epic 6 (fusion admin) | Albums |
| FR-5 | Epic 2 | Modules et Thèmes partagés |
| FR-6 | Epic 2 | Créer une Préparation, saisie en série |
| FR-7 | Epic 2 | Mots déjà illustrés pour l'Album (élargi à la Banque par Epic 3 sans nouveau code de visibilité) |
| FR-8 | Epic 2 | Détection immédiate, confidentialité |
| FR-9 | Epic 2 | Réutilisation en un geste, classement |
| FR-10 | Epic 2 | Gestion des Sens |
| FR-11 | Epic 2 | Gestion des Préparations |
| FR-12 | Epic 2 | Recherche ARASAAC intégrée |
| FR-13 | Epic 2 | Téléversement d'une Image |
| FR-14 | Epic 2 | Carte d'identité |
| FR-15 | Epic 3 | Filtres |
| FR-16 | Epic 2 | Repère de qualité (réutilisé en Epic 5) |
| FR-17 | Epic 5 | Photo depuis le téléphone en trois gestes |
| FR-18 | Epic 3 | Mes mots / Banque de l'école |
| FR-19 | Epic 3 | Verser, ne plus verser, en lot |
| FR-20 | Epic 3 | Suppression par le propriétaire |
| FR-21 | Epic 3 | Réutilisation par lien, « retirée de la banque » |
| FR-22 | Epic 3 | Pas d'écrasement |
| FR-23 | Epic 5 | Dépôt de fichiers .docx/.pptx |
| FR-24 | Epic 5 | Écran de vérification |
| FR-25 | Epic 5 | Validation et reprise de l'Import |
| FR-26 | Epic 4 | Sources d'une Fiche |
| FR-27 | Epic 4 | Modèles de fiche |
| FR-28 | Epic 4 | Écritures combinables |
| FR-29 | Epic 4 | Export Word et PowerPoint, crédits, réglages gardés |
| FR-30 | Epic 6 | Retrait admin avec motif |
| FR-31 | Epic 6 | Suppression admin |
| FR-32 | Epic 1 (inviter, désactiver, réactiver, rôle, ≥ 1 admin) · Epic 6 (suppression, comptes inactifs) | Gestion des comptes |
| FR-33 | Epic 3 (socle + retrait par le propriétaire) · Epic 6 (retrait/suppression admin) | Notifications |
| FR-34 | Epic 6 | Tableau de bord |

| NFR | Epic(s) |
|---|---|
| NFR-1 Simplicité, NFR-15 Accessibilité | Toutes (critères d'acceptation des écrans) |
| NFR-2 Multi-supports | Epic 1 (connexion mobile), Epic 4 (projection PPT), Epic 5 (photo) |
| NFR-3 Détection < 1 s | Epic 2 |
| NFR-4 Banque 500 Images < 2 s | Epic 3 |
| NFR-5 Export < 10 s | Epic 4 |
| NFR-6 Volumétrie | Epic 2, Epic 3 (jeux de données de test) |
| NFR-7 Réversibilité | Epic 6 |
| NFR-8 Sauvegarde | Epic 1 (sauvegarde nocturne) · Epic 6 (restauration testée) |
| NFR-9 Évolutivité du modèle | Epic 2 |
| NFR-10, NFR-11 Droits et licences | Epic 2 (types, licences, réduction), Epic 3 (versabilité), Epic 4 (crédits) |
| NFR-12 RGPD | Epic 1 (page d'information), Epic 5 (rappel photo), Epic 6 (effacement) |
| NFR-13, NFR-14 Hébergement, code libre | Epic 1 |

## Liste des epics

### Epic 1 : Entrer dans l'application et constituer l'équipe
Paul installe corpus-mots sur son serveur, invite ses collègues ; chacun crée son mot de passe, se connecte sur ordinateur ou téléphone et arrive dans la coquille de l'application (navigation, barre supérieure, menu de profil, page « Données personnelles »). L'administrateur désactive, réactive un compte et donne ou retire le rôle d'administrateur.
**FRs couverts :** FR-1, FR-2, FR-3, FR-32 (inviter, désactiver, réactiver, rôle, au moins un administrateur)
**Notes :** Story 1.1 = mise en place du monorepo (back Quarkus modulaire + ArchUnit, front Angular Material + jetons UX-DR-1/2, client OpenAPI généré, Keycloak realm français, Compose + Caddy, CI tag → ghcr.io, sauvegarde nocturne). Préalable : relais SMTP choisi. AD-6, AD-7, AD-18 (invitation, désactivation, rôle), AD-20, AD-21 ; UX-DR-1 à 3, 6, 13, 14, 22, 36 à 39, 41 (Comptes).

### Epic 2 : Préparer un album et illustrer ses mots
Un enseignant crée une Préparation pour un Album et une Section, retrouve ses Mots déjà illustrés pour cet Album, tape ses Mots en série avec détection immédiate, gère les Sens, illustre chaque Mot par un pictogramme ARASAAC ou une image téléversée, et tient à jour la Carte d'identité de ses Images. Il gère ses Préparations (renommer, dupliquer, supprimer).
**FRs couverts :** FR-4 (sauf fusion), FR-5, FR-6, FR-7, FR-8, FR-9, FR-10, FR-11, FR-12, FR-13, FR-14, FR-16
**Notes :** cœur du produit et plus gros epic. Pose le modèle `vocabulaire` complet : Lexique (AD-10, AD-19), visibilité (AD-2, prédicats complets dès ici), cycle de vie (AD-3, état `privee`), types et licences (AD-4), lien et registre des usages (AD-5, AD-14), fichiers et réduction (AD-8, AD-23), proxy ARASAAC (AD-9, préalable Q-2 pour le texte d'attribution). Tant que l'Epic 3 n'existe pas, les propositions ne contiennent que les Images de l'enseignant. UX-DR-8 à 11, 17 à 21, 23 à 29, 31.

### Epic 3 : Partager dans la Banque de l'école et réutiliser le travail des collègues
Un enseignant parcourt ses Images et celles de l'école dans une Banque filtrable (provenance Mes mots / Banque de l'école / Tout), verse ses Images en un ou plusieurs gestes sans en céder la propriété, réutilise par lien celles des collègues, retrouve un Mot par la barre de recherche, supprime ses Images sans casser le travail des autres, et reçoit une notification quand une Image qu'il réutilise est retirée.
**FRs couverts :** FR-15, FR-18, FR-19, FR-20, FR-21, FR-22, FR-33 (socle et retrait par le propriétaire)
**Notes :** états `versee` et `abandonnee`, règle de versabilité et codes d'erreur (AD-3, AD-4), module `notifications`, état « à remplacer » calculé (AD-3). Débloque automatiquement FR-7/FR-8/FR-9 sur la Banque. UX-DR-4, 7, 12, 15 (confirmation), 16, 30.

### Epic 4 : Générer des fiches et les exporter en Word et PowerPoint
Un enseignant génère une Fiche depuis une Préparation, un Module, un filtre ou une sélection de la Banque, choisit un Modèle (cartes, liste illustrée, planche de catégorisation, fiche d'activité) et ses Écritures, voit l'aperçu avec les crédits, exporte en .docx et .pptx éditables, puis refait une Fiche en un clic depuis l'historique.
**FRs couverts :** FR-26, FR-27, FR-28, FR-29
**Notes :** module `fiches`, AD-12 (régénération, composant de crédits unique), AD-20 (auteur). Préalables : polices Q-5 et texte d'attribution ARASAAC Q-2. UX-DR-33, 34.

### Epic 5 : Remplir sa banque sans ressaisir : import des anciens imagiers et photo au téléphone
Une enseignante dépose ses anciens fichiers Word et PowerPoint, vérifie et complète en lot les paires extraites, valide ou reprend plus tard un Import interrompu ; un enseignant ajoute depuis son téléphone une photo en trois gestes.
**FRs couverts :** FR-17, FR-23, FR-24, FR-25
**Notes :** module `importation`, AD-11 (brouillon, idempotence, purge), réutilise Lexique, détection et ReductionImages. Accueil mobile et ajout de photo (session longue FR-2). UX-DR-32, 35, et Encart Import / Carte « Import en cours » de UX-DR-23.

### Epic 6 : Garder la banque saine, protéger les données et suivre le pilote
L'administrateur retire (avec motif) ou supprime une Image de la Banque, l'auteur et les collègues concernés en sont notifiés ; il fusionne les Albums en doublon, supprime un compte en effaçant ses données, voit les comptes inactifs et consulte le tableau de bord d'usage. Chaque enseignant exporte tout Mes mots dans une archive ouverte. La restauration de sauvegarde est testée avant l'ouverture du pilote.
**FRs couverts :** FR-4 (fusion), FR-30, FR-31, FR-32 (suppression, comptes inactifs), FR-33 (notifications admin), FR-34
**Notes :** modules `moderation` et `indicateurs`, AD-3 (acteur Administrateur, motif), AD-15 (`AlbumsFusionnes`), AD-18 (suppression complète, tâche horaire), AD-24 ; NFR-7 export ZIP, NFR-8 restauration. Préalables avant ouverture : Q-1, Q-3. UX-DR-15 (retrait), 40, 41 (Modération, Tableau de bord, Fusion d'Albums).

## Epic 1 : Entrer dans l'application et constituer l'équipe

Paul installe corpus-mots sur son serveur et invite ses collègues. Chacun crée son mot de passe, se connecte sur ordinateur ou sur téléphone, et arrive dans la coquille de l'application. L'administrateur peut désactiver ou réactiver un compte, et donner ou retirer le rôle d'administrateur.

### Story 1.1 : Socle de l'application déployable

En tant que Paul, porteur du projet et exploitant du serveur,
Je veux un monorepo organisé selon l'architecture, qu'on construit, teste et déploie en une seule commande,
Afin que toutes les fonctionnalités suivantes s'appuient dès le premier jour sur un socle conforme et livrable.

**Critères d'acceptation :**

**Étant donné** un dépôt vide en dehors de `docs/`
**Quand** le socle est créé
**Alors** il contient `back/` (Quarkus 3.40 LTS, Maven, Java 25), `front/` (Angular 22.2, Angular Material, composants standalone), `deploiement/` (`compose.yaml`, `Caddyfile`, `.env.exemple`, `keycloak/`) et `.github/workflows/`
**Et** le back contient les dix modules `fr.corpusmots.<module>`, chacun avec ses paquetages `api`, `service` et `persistance` (vides si besoin)
**Et** un fichier `LICENSE` place le code sous licence libre (NFR-14)

**Étant donné** le back compilé
**Quand** les tests s'exécutent
**Alors** un test ArchUnit vérifie le graphe de dépendances d'AD-1 (les modules ne s'appellent que par leur couche `service`, aucun n'accède à la `persistance` d'un autre) et l'unicité des noms de DTO REST (AD-16), et il échoue dès qu'une règle n'est pas respectée

**Étant donné** le back démarré
**Quand** le build du front s'exécute
**Alors** SmallRye génère le document OpenAPI 3.1, et ng-openapi-gen régénère le client TypeScript dans `front/src/app/api/`, dossier qu'on ne modifie jamais à la main (AD-7)

**Étant donné** un hôte Linux avec Podman et un fichier `deploiement/.env` rempli (domaine, secrets, relais SMTP)
**Quand** Paul lance `podman compose up -d`
**Alors** Caddy obtient un certificat Let's Encrypt et route `/` vers le front statique, `/api` vers Quarkus et `/auth` vers Keycloak, tandis que `/auth/admin` reste inaccessible depuis l'extérieur
**Et** PostgreSQL 18 héberge deux bases : `corpusmots`, où une migration Flyway nommée selon AD-22 crée les extensions `unaccent` et `pg_trgm`, et `keycloak`
**Et** au démarrage, Keycloak importe le realm versionné dans `deploiement/keycloak/`, avec son thème et ses textes en français

**Étant donné** un tag Git poussé
**Quand** GitHub Actions s'exécute
**Alors** les tests du back et du front passent, puis les images `front` et `back` sont construites et publiées sur ghcr.io
**Et** la commande `podman compose pull && podman compose up -d` met la production à jour

**Étant donné** une requête REST qui échoue
**Quand** le back répond
**Alors** la réponse suit la RFC 9457 (`application/problem+json`) et contient un champ `code` stable
**Et** les limites de taille (20 Mo par fichier, 100 Mo par requête) ont les mêmes valeurs dans Caddy et dans Quarkus

### Story 1.2 : Sauvegarde nocturne de la base

En tant que Paul, exploitant du serveur,
Je veux que toutes les données soient sauvegardées chaque nuit sur le disque externe,
Afin de ne jamais perdre le travail de l'équipe (NFR-8).

**Critères d'acceptation :**

**Étant donné** le chemin du disque externe défini dans `deploiement/.env`
**Quand** `deploiement/sauvegarde.sh` s'exécute, chaque nuit
**Alors** une sauvegarde complète par `pg_dumpall` (bases `corpusmots` et `keycloak`) est écrite sur le disque externe, sous un nom daté
**Et** les sauvegardes de plus de 14 jours sont supprimées
**Et** un fichier d'état daté indique si la sauvegarde a réussi ou échoué, ainsi que sa taille

**Étant donné** un disque externe absent ou plein
**Quand** la sauvegarde s'exécute
**Alors** le fichier d'état indique l'échec et sa cause, et aucune sauvegarde existante n'est supprimée

**Étant donné** la procédure de restauration
**Quand** Paul la consulte
**Alors** il la trouve décrite pas à pas dans `deploiement/` (le test complet de restauration a lieu dans l'Epic 6, avant l'ouverture du pilote)

### Story 1.3 : Premier administrateur et connexion

En tant qu'enseignant,
Je veux me connecter par e-mail et mot de passe, sur ordinateur comme sur téléphone, et pouvoir réinitialiser mon mot de passe,
Afin d'accéder à l'application, réservée à l'école (FR-2).

**Critères d'acceptation :**

**Étant donné** une base sans aucun `Enseignant` et un e-mail d'administrateur initial défini dans `deploiement/.env`
**Quand** le back démarre
**Alors** `comptes.service` invite cet e-mail avec le rôle `admin` par le circuit normal d'invitation : création de l'utilisateur Keycloak, puis de l'`Enseignant` au statut `invite` (AD-6, AD-18)
**Et** aux démarrages suivants, dès qu'un `Enseignant` existe, rien n'est créé

**Étant donné** le lien d'invitation reçu
**Quand** Paul crée son mot de passe sur la page Keycloak « Créer mon mot de passe », en français
**Alors** son `Enseignant` passe au statut `actif` et il se retrouve connecté au front par le flux code + PKCE

**Étant donné** un enseignant actif sur la page de Connexion
**Quand** il saisit des identifiants refusés
**Alors** un message en français le lui signale, sans préciser lequel des deux est faux

**Étant donné** un enseignant qui a oublié son mot de passe
**Quand** il utilise « Mot de passe oublié »
**Alors** il reçoit un e-mail de réinitialisation qui lui permet de définir un nouveau mot de passe

**Étant donné** un jeton valide dont le `sub` ne correspond à aucun `Enseignant` au statut `actif`
**Quand** ce jeton sert à appeler une ressource `/api`
**Alors** le back répond `403` avec le code `compte.inconnu_ou_inactif`
**Et** toute ressource `/api` appelée sans jeton valide répond `401`

**Étant donné** un access token qui expire pendant une saisie
**Quand** le front reçoit un `401`
**Alors** il renouvelle le jeton en silence et rejoue la requête, sans rien perdre de la saisie
**Et** si c'est la session elle-même qui a expiré, l'enseignant passe par la Connexion puis revient à la page d'origine (UX-DR-38)

**Étant donné** une connexion depuis un téléphone
**Quand** l'enseignant revient dans les 30 jours
**Alors** sa session est toujours active, grâce au réglage de session longue de Keycloak (FR-2)
**Et** les pages Connexion, Créer mon mot de passe et Mot de passe oublié restent utilisables sur un écran de 360 px de large, sont en français et affichent les messages identifiants refusés, lien expiré et compte désactivé (UX-DR-39)

**Étant donné** un enseignant connecté
**Quand** il choisit « Déconnexion »
**Alors** sa session Keycloak est fermée et il revient à la page de Connexion

### Story 1.4 : Coquille de l'application et système de design

En tant qu'enseignant connecté,
Je veux une interface claire et constante, avec une navigation toujours au même endroit,
Afin de trouver rapidement chaque fonctionnalité (NFR-1).

**Critères d'acceptation :**

**Étant donné** le thème Angular Material du front
**Quand** il est construit
**Alors** il implémente les jetons de DESIGN.md (rôles de couleur clairs et sombres, couleurs de Section, de type d'image et d'état, `rounded`, `spacing`, `elevation`), et les composants n'utilisent aucune valeur écrite en dur (UX-DR-1)
**Et** le mode sombre n'est pas activé, et aucune entrée de l'interface ne permet de le choisir

**Étant donné** l'interface chargée
**Quand** on inspecte les requêtes du navigateur
**Alors** Nunito et la police cursive de repli sont servies par l'application elle-même, sans aucun appel à un CDN ou à un service tiers (UX-DR-2, NFR-13)

**Étant donné** un enseignant connecté sur ordinateur (écran de 1280 px ou plus)
**Quand** une page s'affiche
**Alors** une barre supérieure fixe montre le Champ de recherche, le Bouton « + », la cloche des Notifications et le Menu de profil, et une navigation latérale gauche de 248 px montre Préparations, Banque et Fiches, avec l'entrée de la page courante mise en évidence (UX-DR-3)
**Et** les rubriques qui n'ont pas encore de contenu affichent un État vide (une phrase, une action)

**Étant donné** le Menu de profil
**Quand** l'enseignant l'ouvre
**Alors** il propose Mon compte, Mes données et Déconnexion, plus Administration si le jeton porte le rôle `admin` (UX-DR-6)

**Étant donné** le Bouton « + » de la barre supérieure
**Quand** l'enseignant le choisit
**Alors** un menu propose « Nouvelle préparation », « Ajouter une image » et « Importer des fichiers » ; chaque choix ouvre son parcours dès que l'epic qui le porte est livré, et reste masqué avant (UX-DR-5)

**Étant donné** les composants partagés du front
**Quand** ils sont livrés
**Alors** `commun/` fournit, avec leurs tests de composant (UX-DR-13, 14, 22) :
- le Bandeau « Annuler » : 8 s, décompte suspendu au survol et au focus, un seul à la fois, annoncé aux lecteurs d'écran ;
- le Bandeau d'erreur : reste affiché, propose « Réessayer », annoncé aux lecteurs d'écran ;
- le Dialogue de confirmation, dont le bouton par défaut est « Annuler » ;
- l'État vide et les squelettes de chargement.
**Et** un service de messages traduit chaque `code` d'erreur du back en message français, au vouvoiement (UX-DR-37)

**Étant donné** la navigation au clavier
**Quand** l'enseignant parcourt la coquille avec la touche Tab
**Alors** l'ordre de passage suit l'ordre de lecture, l'anneau de focus (`primary`, 2 px, décalé de 2 px) est visible partout, et Échap ferme les menus et les dialogues (UX-DR-36, NFR-15)

### Story 1.5 : Inviter un collègue

En tant qu'administrateur,
Je veux inviter un enseignant par son e-mail,
Afin qu'il rejoigne l'équipe sans qu'aucune inscription libre soit possible (FR-1).

**Critères d'acceptation :**

**Étant donné** un administrateur sur Administration › Comptes
**Quand** il saisit un e-mail et choisit « Inviter »
**Alors** Keycloak crée l'utilisateur et envoie l'e-mail d'invitation en français, avec un lien valable 7 jours, puis `comptes.service` crée l'`Enseignant` au statut `invite` (AD-18)
**Et** l'invité apparaît dans la liste des comptes avec le statut « invité »

**Étant donné** un appel Keycloak réussi suivi d'un échec de la transaction en base
**Quand** l'invitation échoue
**Alors** l'utilisateur Keycloak est supprimé pour annuler l'opération, et l'administrateur voit un Bandeau d'erreur

**Étant donné** un e-mail déjà associé à un compte
**Quand** l'administrateur l'invite
**Alors** l'invitation est refusée avec un message qui en donne la raison

**Étant donné** un invité dont le lien a expiré
**Quand** il ouvre ce lien
**Alors** un message l'invite à demander une nouvelle invitation
**Et** l'administrateur peut renvoyer l'invitation depuis la liste des comptes

**Étant donné** un invité qui crée son mot de passe
**Quand** il arrive dans l'application
**Alors** son statut passe à `actif` et l'accueil s'affiche, vide

**Étant donné** un enseignant qui n'est pas administrateur
**Quand** il appelle l'API d'invitation ou ouvre l'URL d'Administration
**Alors** l'API répond `403` et le front le ramène à l'accueil ; l'entrée Administration n'apparaît pas dans son menu (UX-DR-41)
**Et** aucune page ne permet de créer un compte sans invitation

### Story 1.6 : Gérer les comptes de l'équipe

En tant qu'administrateur,
Je veux désactiver ou réactiver un compte, et donner ou retirer le rôle d'administrateur,
Afin de garder la maîtrise des accès sans rien effacer (FR-32).

**Critères d'acceptation :**

**Étant donné** la liste des comptes (nom affiché, e-mail, statut, rôle)
**Quand** l'administrateur désactive un compte
**Alors** Keycloak désactive l'utilisateur et révoque ses sessions, puis le statut passe à `desactive` en base (Keycloak d'abord, base ensuite, AD-18)
**Et** l'enseignant ne peut plus se connecter ni appeler l'API, et aucune de ses données n'est effacée

**Étant donné** un compte désactivé
**Quand** l'administrateur choisit « Réactiver »
**Alors** l'enseignant peut de nouveau se connecter et retrouve toutes ses données

**Étant donné** un enseignant actif
**Quand** l'administrateur lui donne ou lui retire le rôle d'administrateur
**Alors** le rôle est modifié dans Keycloak seulement (il n'est jamais copié en base) et s'applique dès le prochain jeton

**Étant donné** un seul administrateur restant
**Quand** on tente de lui retirer le rôle ou de le désactiver
**Alors** l'action est refusée avec un message qui en donne la raison ; la vérification se fait auprès de Keycloak, sous `pg_advisory_xact_lock` (AD-6)

**Étant donné** une étape Keycloak restée en échec, ou un utilisateur Keycloak sans `Enseignant`
**Quand** la tâche planifiée de `comptes` s'exécute (au démarrage, puis chaque heure)
**Alors** elle rejoue l'étape en échec ou supprime l'utilisateur orphelin (AD-18)

**Étant donné** un enseignant connecté
**Quand** le front a besoin d'afficher le nom d'un enseignant
**Alors** il l'obtient par `GET /api/enseignants` (`id`, `nomAffiche`, `statut`, comptes au statut `invite` exclus), avec une mise en cache dans `commun/annuaire` (AD-20)

### Story 1.7 : Mon compte et page « Données personnelles »

En tant qu'enseignant,
Je veux voir les seules données que l'application conserve sur moi et savoir comment en demander l'effacement,
Afin de pouvoir faire confiance à l'outil (FR-3, NFR-12).

**Critères d'acceptation :**

**Étant donné** un enseignant connecté
**Quand** il ouvre Mon compte
**Alors** il voit seulement son nom affiché, son e-mail et son rôle, et il peut modifier son nom affiché
**Et** aucun champ ne permet de saisir une donnée d'élève (nom, photo, classe)

**Étant donné** la page « Données personnelles »
**Quand** on l'ouvre depuis Mes données, ou sans être connecté depuis le lien de la page de Connexion
**Alors** elle explique quelles données sont conservées, pourquoi, pendant combien de temps (y compris les 14 jours de conservation dans les sauvegardes), et comment demander l'effacement de son compte

**Étant donné** le front et le back
**Quand** on inspecte le trafic réseau et le code
**Alors** on n'y trouve aucun traceur, aucune publicité et aucune mesure d'audience tierce (NFR-13)

## Epic 2 : Préparer un album et illustrer ses mots

Un enseignant crée une Préparation pour un Album et une Section. Il y retrouve ses Mots déjà illustrés pour cet Album, tape de nouveaux Mots en série avec une détection immédiate, choisit ou crée les Sens, et illustre chaque Mot par un pictogramme ARASAAC ou une image téléversée. Il tient à jour la Carte d'identité de ses Images et gère ses Préparations. Tant que l'Epic 3 n'est pas livré, les Images proposées sont uniquement celles de l'enseignant.

### Story 2.1 : Créer une Préparation pour un Album

En tant qu'enseignant,
Je veux créer une Préparation en choisissant un Album, une Section et éventuellement un Module,
Afin de commencer le vocabulaire d'un album sans créer de doublon d'Album (FR-4, FR-6).

**Critères d'acceptation :**

**Étant donné** le Bouton « + » ou l'accueil
**Quand** l'enseignant choisit « Nouvelle préparation »
**Alors** le Dialogue « Nouvelle préparation » s'ouvre. Il contient l'Album (recherche par titre pendant la frappe), la Section, le Module (facultatif) et le Thème par défaut (facultatif) (UX-DR-24)
**Et** la Section est préremplie avec celle de la dernière Préparation de l'enseignant, ou laissée vide s'il n'en a aucune

**Étant donné** un Album introuvable
**Quand** l'enseignant choisit « Créer l'album » et saisit un titre, un auteur et éventuellement un éditeur
**Alors** l'Album est créé dans `referentiels` et devient visible de toute l'école
**Et** si des Albums ont un titre proche (casse, accents, article et similarité trigramme), ils sont signalés avant la création, et l'enseignant peut en choisir un à la place

**Étant donné** un Album choisi qui contient des Modules
**Quand** l'enseignant ouvre la liste des Modules
**Alors** les Modules de cet Album lui sont proposés dans leur ordre

**Étant donné** un dialogue complet
**Quand** l'enseignant choisit « Créer »
**Alors** la Préparation est enregistrée dans `preparations` (Album, Section, Module, Thème par défaut, propriétaire issu du jeton) et s'ouvre
**Et** son En-tête affiche le titre de l'Album, le Repère de Section (UX-DR-8), le Module et le compteur « 0 mots, 0 déjà illustrés »

**Étant donné** l'accueil Préparations
**Quand** l'enseignant a des Préparations
**Alors** chacune est affichée sur une Carte de Préparation (titre de l'Album, Repère de Section, « n mots · n à illustrer »), et un clic ouvre la Préparation (UX-DR-23)
**Et** sans Préparation, l'État vide affiche « Pas encore de préparation. Choisissez un album : les mots déjà illustrés par l'équipe arrivent tout seuls. » avec « Nouvelle préparation »
**Et** l'enseignant ne voit jamais les Préparations d'un collègue

### Story 2.2 : Modules, Thèmes et réglages de la Préparation

En tant qu'enseignant,
Je veux ajouter des Modules à un Album et des Thèmes à la liste commune, puis régler ma Préparation depuis son En-tête,
Afin que toute l'équipe partage le même découpage et les mêmes Thèmes (FR-4, FR-5).

**Critères d'acceptation :**

**Étant donné** l'En-tête de Préparation ou le Dialogue « Nouvelle préparation »
**Quand** l'enseignant choisit « Nouveau module » et saisit un nom
**Alors** le Module est ajouté à la fin des Modules de l'Album, et tous les enseignants le voient aussitôt

**Étant donné** le Champ à étiquettes des Thèmes (UX-DR-17)
**Quand** l'enseignant tape un nom
**Alors** les Thèmes existants lui sont proposés. Si le Thème n'existe pas, « Créer le thème « … » » le crée pour toute l'école
**Et** Entrée ajoute l'étiquette et Retour arrière retire la dernière

**Étant donné** un Module ou un Thème
**Quand** son créateur ou l'administrateur ouvre son menu
**Alors** il peut le renommer ou le supprimer, alors que les autres enseignants ne voient pas ces actions et que l'API leur répond `403`
**Et** la suppression d'un Thème encore utilisé est refusée avec un message explicite. Pour le savoir, `referentiels` interroge les interfaces `…Utilisation` qu'implémentent les modules aval (AD-15)
**Et** la suppression d'un Module émet l'événement synchrone `ModuleSupprime`. Le module `preparations` l'observe et retire ce Module de ses Préparations dans la même transaction

**Étant donné** une Préparation ouverte
**Quand** l'enseignant modifie le Module, le Thème par défaut ou le « Temps passé » dans l'En-tête
**Alors** la valeur est enregistrée dès qu'il quitte le champ, sans bouton « Enregistrer » (UX-DR-25)
**Et** un changement de Module est transmis aux usages par `Usages.changerContextePreparation` (AD-14)
**Et** en cas d'échec de l'enregistrement, la valeur saisie reste affichée et un Bandeau d'erreur apparaît

**Étant donné** l'Album d'une Préparation
**Quand** son créateur ou l'administrateur choisit « Corriger l'album » dans le menu de l'En-tête
**Alors** il peut modifier le titre, l'auteur et l'éditeur, et la correction se voit partout

### Story 2.3 : Saisir des Mots en série

En tant qu'enseignant,
Je veux taper mes Mots les uns après les autres au clavier,
Afin de dresser la liste du vocabulaire de l'album en quelques minutes (FR-6).

**Critères d'acceptation :**

**Étant donné** une Préparation ouverte sans Mot
**Quand** elle s'affiche
**Alors** le Champ de saisie rapide a le focus et affiche l'aide « Entrée pour ajouter » (UX-DR-26)

**Étant donné** le Champ de saisie rapide
**Quand** l'enseignant tape « la citrouille » puis appuie sur Entrée
**Alors** `Lexique.normaliser` réduit les espaces, unifie les apostrophes et retire l'article. Le Mot est ensuite obtenu ou créé par `Lexique.obtenirOuCreerMot` avec les champs `forme` « citrouille », `forme_cle` et `forme_recherche` (AD-10, AD-19)
**Et** l'appel est idempotent : il ne lève jamais d'erreur de doublon et ne révèle rien d'un Mot que l'enseignant ne peut pas voir
**Et** le Mot est ajouté à la Préparation (`preparation_mot`) avec le Sens retenu par `Usages.retenirSens`. Pour un Mot sans Sens visible, ce Sens est créé par défaut avec le libellé « à compléter »
**Et** le champ se vide et garde le focus

**Étant donné** un Mot ajouté
**Quand** la Grille de Cartes de Mot se met à jour
**Alors** une Carte « à illustrer » apparaît en fin de grille, dans l'ordre de saisie, sans prendre le focus du champ (UX-DR-28)
**Et** le compteur de l'En-tête passe à « N mots, M déjà illustrés »

**Étant donné** le jeu de tests partagé du Lexique
**Quand** les tests s'exécutent
**Alors** les cas suivants passent : « côte » et « côté » restent deux Mots distincts, « l’arbre » devient « arbre », « Lapin » et « lapin » donnent le même Mot, et « des » seul n'est pas retiré (AD-10)

**Étant donné** une Carte de Mot
**Quand** l'enseignant la retire de la Préparation
**Alors** elle disparaît sans confirmation, un Bandeau « Annuler » s'affiche pendant 8 s, et le Mot est libéré par `Usages.libererPreparationMot`
**Et** « Annuler » le rétablit avec son Sens

**Étant donné** une Préparation avec un Thème par défaut
**Quand** un Mot est saisi
**Alors** ce Thème lui est appliqué par défaut, et l'enseignant peut le changer pour ce Mot

### Story 2.4 : Illustrer un Mot avec un pictogramme ARASAAC

En tant qu'enseignant,
Je veux que des pictogrammes ARASAAC me soient proposés pour un Mot sans image, et en choisir un sans quitter l'application,
Afin d'illustrer un nouveau Mot en un geste (FR-12, FR-16).

**Critères d'acceptation :**

**Étant donné** une Carte « à illustrer »
**Quand** elle s'affiche
**Alors** des suggestions ARASAAC apparaissent dans la carte, obtenues par le proxy de `vocabulaire`. Le navigateur n'appelle jamais ARASAAC (AD-9)
**Et** le Repère de qualité « simple, claire, peu de détails » accompagne les suggestions (FR-16, UX-DR-21)

**Étant donné** un pictogramme choisi
**Quand** l'enseignant clique dessus
**Alors** le fichier est téléchargé avant d'ouvrir la transaction, réduit par `ReductionImages` (au plus 1600 px, miniature au plus 256 px, EXIF supprimé), puis stocké en `bytea` dans `image_fichier` (AD-8, AD-17)
**Et** l'Image est créée à l'état `privee`, avec le type `image_libre`, la licence `arasaac_cc_by_nc_sa`, la source et les auteurs ARASAAC, le Sens retenu et `type_media` = `image` (AD-4, NFR-9)
**Et** elle est liée au Mot de la Préparation par `Usages.lierImage` avec l'origine `nouvelle`, après un verrou `SELECT … FOR UPDATE` sur l'Image (AD-14, AD-17)
**Et** la carte quitte l'état « à illustrer » et affiche la vignette

**Étant donné** l'affichage d'une vignette
**Quand** le front charge l'image
**Alors** il passe par le client généré en `blob` et la directive `commun/image-securisee`, en demandant `?taille=miniature` dans les listes. Aucun jeton n'apparaît dans une URL (AD-23)
**Et** la réponse porte `Cache-Control: private, max-age=86400` et un `ETag` égal à la version de l'Image
**Et** le texte alternatif de la vignette est « Mot + Sens » (UX-DR-11)

**Étant donné** les règles de visibilité
**Quand** une Image est lue, proposée ou servie
**Alors** la décision passe uniquement par `VisibiliteImages`, avec ses trois prédicats `consultable`, `proposable` et `moderable` couverts par des tests dédiés. Le rôle `admin` n'élargit aucun prédicat, et les octets d'une Image ne sortent que par `FichiersImages.lire` (AD-2, AD-16)
**Et** toute représentation REST d'une Image contient `id`, `proprietaireId`, `etat`, `aRemplacer` et `reutilisable`

**Étant donné** ARASAAC indisponible ou sans résultat
**Quand** des suggestions sont demandées
**Alors** un message court s'affiche et « Téléverser » reste proposé, tandis que le Mot reste « à illustrer »

### Story 2.5 : Téléverser une Image

En tant qu'enseignant,
Je veux téléverser une image depuis mon ordinateur en indiquant son type, sa source, sa licence et son auteur,
Afin d'illustrer un Mot avec une image qui ne vient pas d'ARASAAC, en respectant les droits (FR-13).

**Critères d'acceptation :**

**Étant donné** une Carte « à illustrer », le Panneau de choix d'Image ou « + › Ajouter une image »
**Quand** l'enseignant choisit « Téléverser » et dépose un fichier image d'au plus 20 Mo
**Alors** il renseigne le type d'image, la source, la licence avec le Sélecteur de licence (liste fermée, où Pixabay et « autre / inconnue » sont marqués « non partageable », UX-DR-18) et l'auteur. Le Repère de qualité est affiché (UX-DR-31)
**Et** depuis « + », il saisit aussi le Mot, normalisé comme en Story 2.3, et l'Image est enregistrée dans Mes mots sans lien vers une Préparation

**Étant donné** le type `image_libre`
**Quand** la source ou la licence manque
**Alors** l'Image est enregistrée, mais sa Carte d'identité est marquée « à compléter » (le refus de versement correspondant arrive avec l'Epic 3)

**Étant donné** le type `image_album`
**Quand** aucun Album n'est indiqué
**Alors** l'enregistrement est bloqué avec le message « Album d'origine requis »
**Et** avec un Album, l'Image est réduite à 400 × 400 px au plus et reçoit la licence `usage_pedagogique_album` (AD-4, AD-8, NFR-10)

**Étant donné** un fichier qui n'est pas une image ou qui dépasse 20 Mo
**Quand** il est déposé
**Alors** il est refusé avec un message en français, et rien n'est enregistré

**Étant donné** une Image téléversée depuis une Préparation
**Quand** elle est enregistrée
**Alors** elle est liée au Mot avec l'origine `nouvelle`, et ses badges de type (icône, style de bordure et couleur, UX-DR-9) s'affichent sous la vignette

### Story 2.6 : Carte d'identité d'une Image

En tant qu'enseignant,
Je veux consulter la Carte d'identité de mes Images et la modifier,
Afin que chaque Image porte son sens, ses Sections et son origine (FR-14).

**Critères d'acceptation :**

**Étant donné** une vignette d'Image dans une Préparation
**Quand** l'enseignant clique dessus
**Alors** le Panneau Carte d'identité s'ouvre à droite, sur 400 px, sans masquer la grille. Il affiche, dans l'ordre du Glossaire : Mot, Sens, catégorie grammaticale, Sections, album d'origine, Module, Thèmes, type, source, licence, auteur et propriétaire (UX-DR-30)
**Et** Échap ferme le panneau

**Étant donné** des Images rattachées à des Thèmes et à des Modules
**Quand** `referentiels` demande si un Thème est utilisé ou émet `ModuleSupprime`
**Alors** `vocabulaire` implémente l'interface `…Utilisation` des Thèmes, de sorte que la suppression d'un Thème porté par une Image soit refusée, et observe `ModuleSupprime` pour détacher ce Module de ses Images dans la même transaction (AD-15)

**Étant donné** le propriétaire de l'Image
**Quand** il modifie un champ
**Alors** la modification est enregistrée dès qu'il quitte le champ et s'applique partout où l'Image est utilisée
**Et** les Sections PS, MS et GS se cochent librement
**Et** si l'enregistrement échoue, la valeur saisie reste affichée, le champ est signalé et un Bandeau d'erreur apparaît

**Étant donné** un enseignant qui n'est pas propriétaire de l'Image, administrateur compris
**Quand** il ouvre la Carte d'identité
**Alors** elle est en lecture seule, et toute tentative de modification par l'API répond `403`

**Étant donné** une Image qui a au moins un lien, chez quiconque, propriétaire compris
**Quand** le propriétaire tente de changer son Sens
**Alors** le changement est refusé avec un message qui propose d'ajouter une nouvelle Image (AD-5)

**Étant donné** une Image dont le type passe à `image_album`
**Quand** le propriétaire enregistre ce changement
**Alors** un Album est exigé et l'Image est aussitôt réduite à 400 × 400 px au plus. La mention « basse résolution » et la référence de l'Album s'affichent

**Étant donné** un Mot dont le Sens est « à compléter »
**Quand** la Carte d'identité est ouverte
**Alors** ce champ est mis en avant pour être complété

### Story 2.7 : Détection immédiate et réutilisation en un geste

En tant qu'enseignant,
Je veux savoir pendant la frappe si un Mot existe déjà et retenir une Image existante en un geste,
Afin de ne jamais refaire ce qui existe et de garder la même image pour un même Sens (FR-8, FR-9).

**Critères d'acceptation :**

**Étant donné** le Champ de saisie rapide
**Quand** l'enseignant tape au moins 2 caractères
**Alors** le Panneau de détection affiche en moins d'une seconde, sans validation, si le Mot existe. La recherche porte sur `forme_recherche` (`unaccent`, index `pg_trgm`), sans tenir compte de la casse, des accents ni de l'article (NFR-3)
**Et** « cote » propose à la fois « côte » et « côté »
**Et** aucun Mot ni Sens n'est créé pendant la détection (AD-19)
**Et** le résultat est annoncé par `aria-live` poli, sans prendre le focus du champ (UX-DR-26)

**Étant donné** un Mot existant
**Quand** le Panneau de détection l'affiche
**Alors** il montre le Mot en cursive, ses Sens, ses Albums et les Images `proposable`, chacune avec ses Repères de Section, son album d'origine et son auteur. Exemple : « farine — existe déjà · 2 images, dans 1 album »
**Et** les seuls Albums montrés sont les albums d'origine des Images `proposable` et ceux des Préparations de l'enseignant (AD-2)
**Et** un Mot qui n'existe que dans Mes mots d'un collègue est présenté comme nouveau, avec des suggestions ARASAAC. Un test le vérifie

**Étant donné** les Images proposées
**Quand** elles sont classées par `vocabulaire.service`
**Alors** celles qui visent la Section de la Préparation passent en premier. À Section égale, les Images déjà liées à ce Sens dans d'autres Albums viennent d'abord, puis les Images de l'enseignant avant celles des collègues
**Et** l'Image que l'enseignant a déjà utilisée pour ce Sens porte la Marque « déjà utilisée » (UX-DR-10)
**Et** la première proposition est mise en avant (fond `primary-container` et anneau)

**Étant donné** le Panneau de détection ouvert
**Quand** l'enseignant choisit une Image avec ↑ ↓ puis Entrée, ou d'un clic
**Alors** le Mot est ajouté et l'Image est liée par `Usages.lierImage` avec l'origine `reutilisee`. L'Image n'est jamais copiée (AD-5)
**Et** l'Entrée seule, sans choix, ajoute le Mot « à illustrer »

**Étant donné** une Carte de Mot
**Quand** l'enseignant clique dessus ou appuie sur Entrée
**Alors** le Panneau de choix d'Image s'ouvre à droite sans masquer la grille. Il affiche le Mot et son Sens, le Repère de qualité, les Images classées comme dans la détection et « Ajouter une image » (UX-DR-29)
**Et** choisir une autre Image la remplace par `Usages.remplacerImage`, puis ferme le panneau. Échap ferme sans rien changer

**Étant donné** un jeu de données de 5 000 Images
**Quand** la détection est mesurée
**Alors** elle répond en moins d'une seconde (NFR-3, NFR-6)

### Story 2.8 : Choisir ou créer un Sens

En tant qu'enseignant,
Je veux choisir le Sens d'un Mot existant ou en créer un nouveau avec sa catégorie grammaticale,
Afin que « étalé (cuisine) » et « étalé (chute) » gardent chacun leurs Images (FR-10).

**Critères d'acceptation :**

**Étant donné** un Mot existant qui a plusieurs Sens visibles
**Quand** le Panneau de détection ou le Panneau de choix d'Image l'affiche
**Alors** l'enseignant choisit le Sens, et les Images proposées se limitent à ce Sens

**Étant donné** « Nouveau sens »
**Quand** l'enseignant le choisit
**Alors** la Création de Sens se déplie sur place, jamais dans un dialogue. Elle demande un libellé court obligatoire et une catégorie dans le Sélecteur de catégorie grammaticale, préremplie avec celle du Sens existant (UX-DR-19, UX-DR-20)
**Et** Entrée ou « Créer le sens » crée le Sens par `Lexique.obtenirOuCreerSens` et le sélectionne. Échap replie le formulaire sans rien créer

**Étant donné** un libellé dont la forme normalisée est déjà celle d'un Sens du même Mot
**Quand** l'enseignant crée le Sens
**Alors** le Sens existant est réutilisé sans erreur (AD-19)

**Étant donné** deux Sens d'un même Mot
**Quand** une Image est ajoutée à l'un d'eux
**Alors** les Images de l'autre Sens ne changent pas (FR-22)

**Étant donné** une Image liée dans la Préparation
**Quand** l'enseignant change le Sens retenu pour ce Mot
**Alors** l'Image est déliée si son Sens ne correspond plus, et le Mot redevient « à illustrer » pour le nouveau Sens. Le Sens de l'Image reste toujours le Sens retenu (AD-5)

### Story 2.9 : Reprendre les Mots déjà illustrés pour l'Album

En tant qu'enseignant,
Je veux retrouver dès l'ouverture d'une Préparation les Mots déjà illustrés pour cet Album et les reprendre en un clic,
Afin de ne pas refaire le travail déjà fait (FR-7).

**Critères d'acceptation :**

**Étant donné** une Préparation nouvellement créée pour un Album
**Quand** des Mots de cet Album portent des Images `proposable`
**Alors** l'Encart « mots déjà illustrés » s'affiche sous le champ, par exemple « 9 mots déjà illustrés pour cet album », avec une vignette de 56 px par Mot (UX-DR-27)
**Et** pour chaque Mot, l'Image proposée suit le classement de la Story 2.7

**Étant donné** l'Encart affiché
**Quand** l'enseignant choisit « Tout reprendre »
**Alors** tous les Mots sont ajoutés avec leur Image proposée, liée avec l'origine `reutilisee`, et le compteur se met à jour

**Étant donné** l'Encart affiché
**Quand** l'enseignant reprend un Mot puis en écarte un autre
**Alors** le Mot repris arrive dans la grille, et le Mot écarté disparaît de l'Encart avec un Bandeau « Annuler », sans être supprimé de la banque
**Et** l'Encart disparaît quand il ne reste plus de Mot à reprendre

**Étant donné** un Mot repris
**Quand** l'enseignant ouvre son Panneau de choix d'Image
**Alors** il peut remplacer l'Image proposée

### Story 2.10 : Gérer ses Préparations

En tant qu'enseignant,
Je veux renommer, dupliquer et supprimer mes Préparations,
Afin de reprendre un album pour une autre Section ou une autre année (FR-11).

**Critères d'acceptation :**

**Étant donné** le menu d'une Carte de Préparation
**Quand** l'enseignant choisit « Renommer »
**Alors** il saisit un nouveau nom, qui est enregistré

**Étant donné** le menu d'une Carte de Préparation
**Quand** l'enseignant choisit « Dupliquer » et une nouvelle Section
**Alors** une nouvelle Préparation est créée avec les mêmes Mots et Sens retenus, et ses liens sont copiés avec l'origine `reutilisee` (AD-14)
**Et** aucune Image n'est copiée

**Étant donné** le menu d'une Carte de Préparation
**Quand** l'enseignant choisit « Supprimer » et confirme dans le Dialogue de confirmation
**Alors** la Préparation est supprimée et ses usages sont libérés par `Usages.libererPreparation` dans la même transaction
**Et** l'événement synchrone `PreparationSupprimee` est émis (AD-15)
**Et** aucune Image n'est supprimée

**Étant donné** une Préparation d'un collègue
**Quand** l'enseignant tente de la renommer, de la dupliquer ou de la supprimer par l'API
**Alors** l'API répond `403` ou `404`, et rien n'est modifié (FR-22)

## Epic 3 : Partager dans la Banque de l'école et réutiliser le travail des collègues

Un enseignant parcourt ses Images et celles de l'école dans une Banque qu'il peut filtrer. Il verse ses Images sans en céder la propriété et réutilise celles des collègues par lien. Il retrouve un Mot depuis la barre de recherche et supprime ses Images sans casser le travail des autres. Il est notifié quand une Image qu'il réutilise est retirée de la Banque.

### Story 3.1 : Parcourir la Banque, ouverte sur Mes mots

En tant qu'enseignant,
Je veux voir mes Images et celles de l'école dans une seule Banque, en sachant toujours à qui chacune appartient,
Afin de retrouver mon travail sans le mélanger à celui des collègues (FR-18).

**Critères d'acceptation :**

**Étant donné** la rubrique Banque
**Quand** l'enseignant l'ouvre
**Alors** la grille d'Images, regroupée par Mot et par Sens, est filtrée par défaut sur la provenance « Mes mots » (UX-DR-16, UX-DR-30)
**Et** la puce de provenance propose aussi « Banque de l'école » et « Tout », en choix unique

**Étant donné** chaque provenance
**Quand** la grille s'affiche
**Alors** « Mes mots » montre toutes les Images de l'enseignant, versées ou non, avec le badge « versée » quand c'est le cas
**Et** « Banque de l'école » montre les Images versées de tous les enseignants
**Et** « Tout » montre les Images de l'enseignant plus les Images versées des collègues
**Et** dans les trois vues, chaque vignette indique son propriétaire, résolu par l'annuaire, et une Image non versée d'un collègue n'apparaît jamais. Un test le vérifie (AD-2)

**Étant donné** une page de 500 Images
**Quand** la Banque se charge
**Alors** elle s'affiche en moins de 2 secondes, avec des miniatures, des vignettes squelettes pendant le chargement et une pagination `?page=&taille=` (NFR-4)

**Étant donné** une vignette de la Banque
**Quand** l'enseignant clique dessus
**Alors** le Panneau Carte d'identité de la Story 2.6 s'ouvre sans masquer la grille, modifiable s'il est propriétaire et en lecture seule sinon

**Étant donné** Mes mots vide
**Quand** la Banque s'affiche
**Alors** un État vide propose « Ajouter une image »

### Story 3.2 : Filtrer la Banque et rechercher un Mot

En tant qu'enseignant,
Je veux combiner des filtres et rechercher un Mot depuis n'importe quelle page,
Afin de trouver en quelques secondes, par exemple, tous les verbes « automne » de GS (FR-15).

**Critères d'acceptation :**

**Étant donné** la Banque
**Quand** l'enseignant combine des puces de filtre parmi Mot, Sens, Section, Album, Module, Thème, catégorie grammaticale, type d'image et propriétaire
**Alors** la grille ne garde que les Images qui satisfont tous les filtres, et les filtres sont passés en paramètres de requête nommés comme les champs

**Étant donné** la provenance « Mes mots » et un filtre Section
**Quand** le filtre s'applique
**Alors** il retient aussi les Images utilisées dans une Préparation de cette Section, même si l'Image ne coche pas cette Section

**Étant donné** le filtre propriétaire
**Quand** l'enseignant l'ouvre
**Alors** il ne liste que lui-même et les collègues qui ont versé au moins une Image

**Étant donné** un filtre sans résultat
**Quand** la grille est vide
**Alors** elle affiche « Aucune image » et « Effacer les filtres »

**Étant donné** le Champ de recherche de la barre supérieure
**Quand** l'enseignant tape « la Citrouille » puis appuie sur Entrée
**Alors** la Banque s'ouvre filtrée sur ce Mot, avec la même tolérance que la détection (casse, accents, article) (UX-DR-4)
**Et** un Mot qui n'existe que dans Mes mots d'un collègue donne « Aucune image »

### Story 3.3 : Verser ses Images dans la Banque

En tant qu'enseignant,
Je veux verser une ou plusieurs de mes Images dans la Banque de l'école, en sachant pourquoi certaines ne peuvent pas l'être,
Afin de partager mon travail sans le céder (FR-19).

**Critères d'acceptation :**

**Étant donné** le Panneau Carte d'identité d'une de mes Images versable
**Quand** je choisis « Verser »
**Alors** l'Image passe à l'état `versee` par la seule méthode de versement de `vocabulaire.service`, avec un `Acteur` propriétaire (AD-3)
**Et** le message « L'image reste la vôtre. Les collègues peuvent l'utiliser, personne ne peut la modifier. » s'affiche, puis le badge « versée » apparaît

**Étant donné** la règle de versabilité (AD-4)
**Quand** l'Image n'est pas versable
**Alors** « Verser » est indisponible et la raison exacte s'affiche : « image d'album », « type inconnu », « licence à préciser » (aucune licence) ou « licence non partageable » (Pixabay, autre / inconnue) (NFR-10, NFR-11)
**Et** une image libre sans source est refusée
**Et** l'API renvoie le `code` stable correspondant (`image.versement.image_album`, `.type_inconnu`, `.licence_non_versable`, `.source_manquante`, `.retrait_admin`), couvert par des tests dédiés
**Et** une Image dont le `retrait_admin_motif` est renseigné reste non versable tant que son propriétaire n'a pas modifié sa Carte d'identité

**Étant donné** une Préparation ou la Banque
**Quand** l'enseignant coche des Cases de sélection (au survol ou au focus, Espace, Maj+clic pour une plage, « Tout sélectionner », Échap pour désélectionner)
**Alors** la Barre d'actions en lot apparaît avec le nombre d'éléments sélectionnés et ses actions (UX-DR-12)
**Et** dans une Préparation, la barre propose aussi « Retirer de la Préparation », annulable

**Étant donné** une sélection mixte
**Quand** l'enseignant choisit « Verser » dans la Barre d'actions en lot
**Alors** les Images versables sont versées, et les autres restent hors du lot avec leur raison affichée

**Étant donné** une Image d'un collègue
**Quand** un enseignant tente de la verser par l'API
**Alors** l'API répond `403`

### Story 3.4 : Réutiliser l'Image d'un collègue

En tant qu'enseignant,
Je veux qu'on me propose les Images versées par mes collègues et les retenir en un geste,
Afin de profiter de leur travail sans le modifier (FR-21, FR-22).

**Critères d'acceptation :**

**Étant donné** une Image versée par un collègue
**Quand** je tape son Mot, j'ouvre une Préparation de son Album ou j'ouvre le Panneau de choix d'Image
**Alors** elle m'est proposée dans le classement de la Story 2.7, après mes propres Images à rang égal, avec son auteur

**Étant donné** cette Image retenue
**Quand** je l'ajoute à ma Préparation
**Alors** ma Préparation la référence par un lien d'origine `reutilisee`, sans aucune copie de l'Image ni de sa Carte d'identité (AD-5)
**Et** sa Carte d'identité est en lecture seule pour moi, et toute tentative de modification par l'API répond `403`

**Étant donné** le Panneau Carte d'identité d'une Image visible dans la Banque
**Quand** je choisis « Utiliser dans une préparation » puis une de mes Préparations
**Alors** l'Image est liée au Mot dans cette Préparation, avec le Mot et le Sens retenus créés au besoin

**Étant donné** qu'un collègue ajoute une Image à un Sens que j'utilise
**Quand** je rouvre ma Préparation
**Alors** mes Images et mes liens sont inchangés (FR-22)
**Et** aucune action d'un enseignant ne modifie ni ne supprime une Image ou une Préparation d'un autre enseignant, ce que vérifie un test API par ressource d'écriture

### Story 3.5 : Notifications et « Ne plus verser »

En tant qu'enseignant,
Je veux pouvoir retirer de la Banque une Image que j'ai versée, et être prévenu quand une Image que je réutilise en est retirée,
Afin que le partage reste réversible sans laisser mes collègues dans le flou (FR-19, FR-21, FR-33).

**Critères d'acceptation :**

**Étant donné** une de mes Images versées que personne ne réutilise
**Quand** je choisis « Ne plus verser »
**Alors** elle repasse à l'état `privee` sans confirmation, et un Bandeau « Annuler » s'affiche pendant 8 s

**Étant donné** une de mes Images versées que des collègues réutilisent
**Quand** je choisis « Ne plus verser »
**Alors** un Dialogue de confirmation m'avertit que leurs Préparations afficheront « image retirée de la banque »
**Et** après confirmation, la transition `versee → privee` crée, dans la même transaction, une Notification pour chaque enseignant distinct qui a un lien vers l'Image (AD-3, AD-17)
**Et** chaque Notification stocke un instantané (`type`, `image_id`, `mot_forme`, `sens_libelle`, `cree_le`, `lue_le`), jamais le fichier ni le nom de l'acteur

**Étant donné** un collègue qui a un lien vers cette Image
**Quand** il ouvre sa Préparation
**Alors** l'Image reste visible dans cette Préparation, et seulement là, grisée avec le badge « image retirée de la banque », car `aRemplacer` vaut `retiree` (valeur calculée à la lecture et jamais copiée)
**Et** elle n'est plus proposée nulle part et `reutilisable` vaut `false`
**Et** le Panneau de choix d'Image lui permet d'en choisir une autre

**Étant donné** des Notifications non lues
**Quand** l'enseignant se connecte
**Alors** la cloche de la barre supérieure porte une pastille. Le menu déroulant liste les Notifications et les marque lues à son ouverture (UX-DR-7)
**Et** sans Notification, le menu affiche « Aucune notification »

### Story 3.6 : Supprimer ses Images sans casser le travail des autres

En tant qu'enseignant,
Je veux supprimer une de mes Images,
Afin de faire le ménage dans Mes mots sans priver mes collègues de ce qu'ils utilisent (FR-20).

**Critères d'acceptation :**

**Étant donné** une de mes Images que aucun collègue ne lie
**Quand** je choisis « Supprimer » puis je confirme
**Alors** l'Image est effacée avec ses fichiers, et mes propres liens vers elle sont supprimés dans la même transaction. Les Mots concernés redeviennent « à illustrer » dans mes Préparations (AD-3)

**Étant donné** une de mes Images qu'au moins un collègue lie
**Quand** je choisis « Supprimer » puis je confirme
**Alors** l'Image passe à l'état `abandonnee` : elle disparaît de Mes mots et de la Banque, et mes propres liens sont supprimés
**Et** elle reste visible dans les Préparations des collègues avec le badge « image retirée de la banque », et ces collègues reçoivent une Notification
**Et** quand le dernier lien vers une Image `abandonnee` est supprimé, l'Image est effacée

**Étant donné** deux enseignants qui, au même moment, lient l'Image et la suppriment
**Quand** les deux requêtes arrivent ensemble
**Alors** le verrou `SELECT … FOR UPDATE` et la colonne `@Version` garantissent un résultat cohérent : soit le lien est refusé, soit l'Image passe à `abandonnee` (AD-17)

**Étant donné** une Image d'un collègue
**Quand** un enseignant tente de la supprimer par l'API
**Alors** l'API répond `403`

## Epic 4 : Générer des fiches et les exporter en Word et PowerPoint

Un enseignant génère une Fiche à partir d'une Préparation, d'un Module, d'un filtre ou d'une sélection faite dans la Banque. Il choisit un Modèle de fiche et ses Écritures, vérifie l'aperçu avec les crédits, puis exporte en .docx et en .pptx éditables. Depuis l'historique, il refait une Fiche en un clic.

**Préalables :** polices des Fiches (Q-5) et texte exact d'attribution ARASAAC (Q-2).

### Story 4.1 : Générer une Fiche de cartes depuis une Préparation

En tant qu'enseignant,
Je veux ouvrir la Génération de Fiche depuis ma Préparation et voir aussitôt l'aperçu de mes cartes,
Afin de passer de la liste de mots au support de classe sans rien remonter (FR-26, FR-27).

**Critères d'acceptation :**

**Étant donné** une Préparation ouverte
**Quand** l'enseignant choisit « Générer une fiche »
**Alors** la Génération de Fiche s'ouvre avec les Réglages à gauche et l'Aperçu à droite (UX-DR-33)
**Et** le titre est prérempli avec celui de l'Album, le modèle « cartes » est sélectionné avec 4 cartes par page A4, et la source est la Préparation

**Étant donné** une Préparation découpée en Modules
**Quand** l'enseignant choisit un Module comme source
**Alors** seuls les Mots de ce Module sont retenus

**Étant donné** les Réglages de Fiche
**Quand** l'enseignant change le tri (ordre alphabétique, ordre de saisie, catégorie grammaticale) ou le nombre de cartes par page (1, 2, 4, 6, 8)
**Alors** l'Aperçu se met à jour à chaque changement

**Étant donné** l'Aperçu
**Quand** l'enseignant désélectionne un Mot
**Alors** ce Mot disparaît de la Fiche, mais pas de la Préparation

**Étant donné** l'Aperçu de Fiche
**Quand** il s'affiche
**Alors** il montre une page blanche fidèle à l'export : une Image grande et seule par carte, le Mot dessous, aucun décor, avec la police de l'export et non les jetons de l'interface (UX-DR-34)

**Étant donné** une Préparation qui contient une Image retirée de la Banque ou une Image supprimée
**Quand** l'Aperçu est généré
**Alors** l'Image retirée y figure, car elle reste `consultable` par son lien
**Et** une Image `supprimee` est remplacée par un cadre vide légendé « image supprimée », signalé dans la réponse (AD-12)

**Étant donné** une sélection vide
**Quand** l'Aperçu s'affiche
**Alors** il indique « Aucune image » et l'export est désactivé

### Story 4.2 : Écritures combinables

En tant qu'enseignant,
Je veux choisir une ou plusieurs Écritures sous chaque Image,
Afin d'adapter la Fiche à l'âge de mes élèves (FR-28).

**Critères d'acceptation :**

**Étant donné** les Réglages de Fiche
**Quand** l'enseignant sélectionne des puces d'Écriture parmi capitales, script, cursive, Arial et sans texte
**Alors** chaque Écriture sélectionnée s'affiche sous chaque Image, dans l'ordre capitales, script, cursive, Arial

**Étant donné** « sans texte » sélectionné
**Quand** l'enseignant l'active
**Alors** les autres Écritures sont désélectionnées et ne peuvent plus être choisies tant que « sans texte » reste actif

**Étant donné** l'interrupteur « Afficher l'article »
**Quand** la Fiche s'ouvre
**Alors** l'interrupteur est désactivé par défaut et les Mots s'affichent sans article
**Et** s'il est activé, l'article ou le genre enregistré du Mot s'affiche

**Étant donné** les polices retenues pour la cursive scolaire, le script et les capitales (Q-5)
**Quand** l'Aperçu s'affiche et quand la Fiche est exportée
**Alors** l'Aperçu et l'export utilisent les mêmes polices, et l'Aperçu n'utilise jamais de police de repli à la place

### Story 4.3 : Exporter une Fiche en Word, avec les crédits

En tant qu'enseignant,
Je veux exporter ma Fiche en .docx éditable, avec les mentions de licence ajoutées automatiquement,
Afin de l'imprimer ou de l'ajuster dans Word en respectant les droits (FR-29).

**Critères d'acceptation :**

**Étant donné** une Fiche affichée en aperçu
**Quand** l'enseignant choisit « Exporter en Word »
**Alors** un .docx est généré à la demande par Apache POI, en une requête synchrone, puis téléchargé ; le fichier n'est jamais stocké sur le serveur (AD-12)
**Et** il s'ouvre dans Word, et ses textes et ses images restent modifiables

**Étant donné** les Images de la Fiche
**Quand** les crédits sont calculés
**Alors** un composant unique de crédits produit, à partir des Cartes d'identité, les mentions exigées par chaque licence (par exemple pour ARASAAC : auteur, ARASAAC, Gobierno de Aragón, licence), ainsi que le titre et l'auteur de l'Album de chaque image d'album
**Et** ces mentions apparaissent en pied de page du .docx et dans l'Aperçu
**Et** elles citent le champ `auteur` de la Carte d'identité, jamais le nom du propriétaire (AD-20)

**Étant donné** une Fiche de 30 Mots
**Quand** elle est exportée
**Alors** l'export prend moins de 10 secondes, avec une progression affichée (NFR-5)

**Étant donné** un échec d'export
**Quand** le back répond par une erreur
**Alors** un Bandeau d'erreur propose « Réessayer », et les réglages sont conservés

### Story 4.4 : Exporter une Fiche en PowerPoint pour projeter

En tant qu'enseignant,
Je veux exporter ma Fiche en .pptx éditable,
Afin de la projeter en classe (FR-29, NFR-2).

**Critères d'acceptation :**

**Étant donné** une Fiche au modèle « cartes »
**Quand** l'enseignant choisit « Exporter en PowerPoint »
**Alors** le .pptx contient une carte par diapositive, avec ses textes et ses images modifiables

**Étant donné** une Fiche d'un autre modèle
**Quand** elle est exportée en PowerPoint
**Alors** chaque page de la Fiche devient une diapositive

**Étant donné** toute Fiche exportée en PowerPoint
**Quand** le fichier est généré
**Alors** une diapositive finale de crédits contient les mentions produites par le même composant de crédits que pour Word
**Et** l'Aperçu montre cette diapositive en vignette

**Étant donné** une Fiche de 30 Mots
**Quand** elle est exportée en PowerPoint
**Alors** l'export prend moins de 10 secondes

### Story 4.5 : Modèles liste illustrée, planche de catégorisation et fiche d'activité

En tant qu'enseignant,
Je veux choisir parmi les quatre Modèles de fiche,
Afin de produire aussi des supports d'atelier pour l'ATSEM et des planches de tri pour la GS (FR-27).

**Critères d'acceptation :**

**Étant donné** le Modèle « liste illustrée »
**Quand** il est choisi
**Alors** plusieurs Mots tiennent sur une page, chacun avec une Image

**Étant donné** le Modèle « planche de catégorisation »
**Quand** il est choisi
**Alors** les Images de la sélection sont réunies sur une page, avec plusieurs Images par Sens quand il en existe plusieurs de `proposable` ou liées

**Étant donné** le Modèle « fiche d'activité »
**Quand** il est choisi
**Alors** un champ « Consigne » apparaît dans les Réglages, et la page place les Images et les Mots à côté d'une zone de consigne libre, modifiable dans Word

**Étant donné** chacun des quatre modèles
**Quand** la Fiche est exportée en .docx et en .pptx
**Alors** l'export respecte le modèle, l'Écriture et le titre, et inclut les crédits

### Story 4.6 : Fiche thématique par filtre et depuis la Banque

En tant qu'enseignant,
Je veux générer une Fiche à partir d'un filtre ou d'une sélection faite dans la Banque, tous Albums confondus,
Afin de préparer par exemple une planche « automne » pour l'atelier de l'ATSEM (FR-26, UJ-4).

**Critères d'acceptation :**

**Étant donné** la rubrique Fiches
**Quand** l'enseignant choisit « Fiche thématique »
**Alors** la Génération de Fiche s'ouvre avec, dans les Réglages, des filtres Thème, Section, catégorie grammaticale et provenance

**Étant donné** les filtres « automne » + GS, avec la provenance « Tout »
**Quand** l'Aperçu se génère
**Alors** il ne contient que des Images `proposable`, venues de tous les Albums (AD-12)
**Et** il ne contient jamais une Image non versée d'un collègue, ce que vérifie un test

**Étant donné** un filtre sans résultat
**Quand** l'Aperçu s'affiche
**Alors** il indique « Aucune image » avec « Effacer les filtres », et l'export est désactivé

**Étant donné** une sélection d'Images dans la Banque
**Quand** l'enseignant choisit « Créer une fiche avec cette sélection » dans la Barre d'actions en lot
**Alors** la Génération de Fiche s'ouvre avec cette sélection comme source

### Story 4.7 : Historique des Fiches et « Refaire » en un clic

En tant qu'enseignant,
Je veux retrouver mes Fiches passées et en refaire une avec les mêmes réglages,
Afin de produire la planche « hiver » en un clic après la planche « automne » (FR-29).

**Critères d'acceptation :**

**Étant donné** une Fiche exportée
**Quand** l'export réussit
**Alors** `fiches` enregistre les réglages (modèle, Écritures, article, tri, cartes par page, titre, consigne) et la source (Préparation, Module, filtres ou sélection), mais pas le fichier généré (AD-12)

**Étant donné** la rubrique Fiches
**Quand** elle s'affiche
**Alors** une Ligne d'historique par Fiche exportée montre le titre, le modèle, la source et la date, avec un bouton « Refaire »
**Et** sans aucune Fiche, l'État vide propose « Fiche thématique »

**Étant donné** une Ligne d'historique
**Quand** l'enseignant choisit « Refaire »
**Alors** la Génération de Fiche s'ouvre avec la même source et les mêmes réglages, et l'enseignant peut changer un filtre (par exemple le Thème) avant d'exporter

**Étant donné** une nouvelle Fiche
**Quand** l'enseignant ouvre la Génération de Fiche
**Alors** les réglages de sa dernière Fiche sont repris par défaut

**Étant donné** une Fiche dont la Préparation source a été supprimée
**Quand** l'événement `PreparationSupprimee` est observé
**Alors** la Fiche est marquée `source_disponible = false` dans la même transaction (AD-15)
**Et** sa ligne d'historique indique que la source n'est plus disponible, et « Refaire » est désactivé

## Epic 5 : Remplir sa banque sans ressaisir : import des anciens imagiers et photo au téléphone

Une enseignante dépose ses anciens fichiers Word et PowerPoint, vérifie les paires extraites, les complète en lot, puis valide l'Import ou le reprend plus tard. Un enseignant ajoute aussi une photo depuis son téléphone, en trois gestes.

### Story 5.1 : Déposer des fichiers et extraire les paires image + mot

En tant qu'enseignante,
Je veux déposer mes anciens imagiers .docx et .pptx,
Afin que l'application en extraie les images et les mots sans que j'aie à les ressaisir (FR-23).

**Critères d'acceptation :**

**Étant donné** « + › Importer des fichiers »
**Quand** l'enseignante ouvre l'Import
**Alors** la Zone de dépôt accepte le glisser-déposer et propose aussi un bouton « Choisir des fichiers », pour déposer plusieurs fichiers à la fois (UX-DR-32)

**Étant donné** un ou plusieurs fichiers .docx ou .pptx, de 100 Mo au total au plus
**Quand** ils sont déposés
**Alors** un `ImportBrouillon` persistant est créé dans `importation`, et Apache POI extrait chaque image (AD-11)
**Et** dans un .docx, chaque image est associée au texte du paragraphe ou de la cellule de tableau voisine ; dans un .pptx, elle est associée aux zones de texte de la même diapositive
**Et** les octets de chaque image sont réduits par `ReductionImages` puis stockés dans le brouillon
**Et** une progression s'affiche pour chaque fichier

**Étant donné** un fichier .doc, .ppt ou illisible
**Quand** il est déposé
**Alors** une carte de problème est affichée pour ce fichier et l'extraction des autres fichiers continue

**Étant donné** l'extraction terminée
**Quand** l'écran de vérification s'ouvre
**Alors** chaque paire s'affiche sur une Carte de vérification, avec son image, le Mot proposé et son fichier d'origine
**Et** aucune Image n'est encore créée dans `vocabulaire`

### Story 5.2 : Vérifier et corriger les paires

En tant qu'enseignante,
Je veux voir toutes les paires extraites, corriger un mot mal lu et écarter ce qui ne me convient pas,
Afin de n'importer que des paires justes (FR-24).

**Critères d'acceptation :**

**Étant donné** l'écran de vérification
**Quand** l'enseignante corrige le Mot directement sur une carte
**Alors** la correction est enregistrée dans le brouillon dès qu'elle quitte le champ

**Étant donné** chaque Mot proposé
**Quand** la carte s'affiche ou que le Mot est corrigé
**Alors** la détection de la Story 2.7 s'applique : un Mot existant indique « existe déjà » et les Sens proposés selon AD-2
**Et** une paire dont le Mot a plusieurs Sens est signalée « Sens à choisir », et l'enseignante choisit un Sens ou en crée un nouveau sur place, avec Création de Sens (AD-11)

**Étant donné** une paire sans Mot lisible ou sans image
**Quand** l'écran s'affiche
**Alors** la carte apparaît en `error-container` avec le libellé « mot manquant » ou « image manquante », et reste bloquante tant qu'elle n'est ni corrigée ni écartée

**Étant donné** une paire
**Quand** l'enseignante l'écarte
**Alors** elle disparaît sans demande de confirmation, avec un Bandeau « Annuler »

**Étant donné** une paire dont le type d'image n'est pas précisé
**Quand** elle s'affiche
**Alors** son type vaut « inconnu », avec le badge de type correspondant

### Story 5.3 : Compléter les paires en lot

En tant qu'enseignante,
Je veux appliquer d'un coup l'Album, le Thème, les Sections, le type et la licence à une sélection de paires,
Afin de ranger 80 mots en quelques gestes (FR-24).

**Critères d'acceptation :**

**Étant donné** les Cartes de vérification
**Quand** l'enseignante sélectionne des cartes (Case de sélection, Maj+clic pour une plage, « Tout sélectionner »)
**Alors** la Barre d'actions en lot propose : Album, Module, Thème (Champ à étiquettes), Sections, type d'image, source et licence (Sélecteur de licence)

**Étant donné** une sélection
**Quand** une valeur est appliquée en lot
**Alors** elle est enregistrée dans le brouillon sur chaque paire sélectionnée, sans écraser les corrections faites sur les autres champs

**Étant donné** le type « image d'album » appliqué à une sélection
**Quand** aucun Album n'est choisi pour cette sélection
**Alors** les cartes concernées sont signalées « Album d'origine requis » et bloquent la validation

**Étant donné** le type « image libre » sans source ni licence
**Quand** la paire est complétée
**Alors** la paire reste importable, mais ne pourra être versée qu'une fois ces champs remplis (règle de l'Epic 3)

### Story 5.4 : Valider l'Import

En tant qu'enseignante,
Je veux valider mes paires pour qu'elles deviennent des Images de Mes mots,
Afin de retrouver mes anciens imagiers rangés et filtrables (FR-25).

**Critères d'acceptation :**

**Étant donné** un brouillon sans carte bloquante
**Quand** l'enseignante choisit « Valider »
**Alors** chaque paire devient une Image dans Mes mots, créée par `vocabulaire.service` à l'état `privee`, rattachée au Mot et au Sens obtenus ou créés par le Lexique (AD-11, AD-19)
**Et** une progression s'affiche pour chaque paire
**Et** aucune Image n'est versée automatiquement

**Étant donné** une Préparation choisie au moment de la validation (facultatif)
**Quand** les Images sont créées
**Alors** chacune est liée au Mot de cette Préparation, avec `origine = nouvelle`

**Étant donné** une validation rejouée, par exemple après une coupure réseau
**Quand** la requête est envoyée une deuxième fois
**Alors** aucune Image n'est créée en double, grâce à l'unicité de `import_paire_id`, et le brouillon passe à `valide` dans la même transaction

**Étant donné** une validation partielle en échec
**Quand** des paires n'ont pas pu être créées
**Alors** les paires déjà créées sont conservées, les autres restent en vérification, et un Bandeau d'erreur propose « Réessayer »

**Étant donné** un Mot créé par un collègue entre l'extraction et la validation
**Quand** la paire est validée
**Alors** elle est rattachée au Mot existant, et sa carte le signale

**Étant donné** la fin de l'Import
**Quand** l'enseignante ouvre la Banque
**Alors** ses Images importées apparaissent dans Mes mots, filtrables

**Étant donné** un brouillon validé ou abandonné depuis 30 jours
**Quand** la tâche de purge de `importation` s'exécute
**Alors** le brouillon et ses octets sont supprimés

### Story 5.5 : Reprendre un Import interrompu

En tant qu'enseignante,
Je veux retrouver mon Import là où je l'ai laissé,
Afin de ne perdre aucune correction si je m'arrête en cours de route (FR-25).

**Critères d'acceptation :**

**Étant donné** un brouillon ni validé ni abandonné
**Quand** l'enseignante ouvre l'accueil
**Alors** une Carte « Import en cours » s'affiche en tête des cartes, avec le nom des fichiers, « n paires à vérifier » et un bouton « Reprendre » (UX-DR-23)

**Étant donné** la Carte « Import en cours »
**Quand** l'enseignante choisit « Reprendre »
**Alors** l'écran de vérification se rouvre avec toutes les corrections, paires écartées et valeurs de lot déjà enregistrées

**Étant donné** un brouillon dont l'enseignante ne veut plus
**Quand** elle choisit « Abandonner l'import » et confirme
**Alors** le brouillon passe à `abandonne`, et aucune Image n'est créée

**Étant donné** un enseignant dont Mes mots est vide
**Quand** il ouvre l'accueil ou la Banque
**Alors** l'Encart Import de l'accueil, ou le lien de l'État vide de la Banque, ouvre l'Import (UX-DR-23)

### Story 5.6 : Ajouter une photo depuis le téléphone en trois gestes

En tant qu'enseignant en déplacement,
Je veux photographier un objet, taper le Mot et cocher les Sections,
Afin d'enrichir la banque depuis le marché, en trois gestes (FR-17, UJ-3).

**Critères d'acceptation :**

**Étant donné** un téléphone (largeur inférieure à 600 px) avec une session active
**Quand** l'enseignant ouvre l'application
**Alors** l'accueil mobile n'affiche que le bouton « Ajouter une photo », pleine largeur et haut de 96 px (UX-DR-35)

**Étant donné** le bouton « Ajouter une photo »
**Quand** l'enseignant le touche
**Alors** l'appareil photo s'ouvre directement, avec le Rappel de prise de vue « Pas d'enfant identifiable · un seul objet, fond uni » et le Repère de qualité
**Et** si l'appareil photo est refusé ou indisponible, « Choisir dans la galerie » est proposé

**Étant donné** la photo prise
**Quand** l'enseignant tape le Mot
**Alors** si le Mot existe, « Ce mot existe déjà » s'affiche et le Sens le plus utilisé est présélectionné, avec possibilité d'en changer
**Et** si le Mot est nouveau, le Sens par défaut est « à compléter »

**Étant donné** le Sélecteur de Sections (boutons à bascule PS, MS, GS)
**Quand** la photo, le Mot et au moins une Section sont renseignés
**Alors** le bouton Enregistrer, haut de 52 px, devient actif, sans aucun autre champ obligatoire

**Étant donné** l'enregistrement
**Quand** la photo est envoyée
**Alors** une progression s'affiche, puis l'Image est créée à l'état `privee`, avec le type `photo_personnelle`, la licence `droits_auteur_enseignant` et l'enseignant comme auteur, après réduction par `ReductionImages` (au plus 1600 px, EXIF supprimé) (AD-4, AD-8)

**Étant donné** un envoi impossible faute de réseau
**Quand** l'erreur survient
**Alors** la photo et la saisie restent à l'écran avec « Réessayer », sans file d'attente hors connexion

**Étant donné** une session expirée pendant l'ajout
**Quand** l'enseignant se reconnecte
**Alors** il revient directement à l'ajout de photo (UX-DR-38)

## Epic 6 : Garder la banque saine, protéger les données et suivre le pilote

L'administrateur peut retirer de la Banque une Image (avec un motif) ou la supprimer ; son auteur et les collègues qui l'utilisent sont prévenus. Il fusionne les Albums en doublon, supprime un compte en effaçant ses données, repère les comptes inactifs et suit le tableau de bord d'usage. Chaque enseignant peut exporter tout Mes mots dans une archive ouverte. Avant l'ouverture du pilote, on vérifie qu'une sauvegarde se restaure bien.

### Story 6.1 : Retirer une Image de la Banque avec un motif

En tant qu'administrateur,
Je veux retirer de la Banque de l'école une Image inadaptée, en indiquant pourquoi,
Afin de garder la banque saine sans toucher au travail personnel de son auteur (FR-30, FR-33).

**Critères d'acceptation :**

**Étant donné** un administrateur qui ouvre la Carte d'identité d'une Image versée
**Quand** il choisit « Retirer de la banque »
**Alors** le Dialogue de retrait s'ouvre avec quatre motifs : licence non conforme, image d'album, image inadaptée, autre. Le motif « autre » exige un texte, et le bouton « Retirer de la banque » ne s'active qu'une fois un motif choisi (UX-DR-15)
**Et** le libellé de cette action est distinct de « Ne plus verser », que voit le propriétaire

**Étant donné** le retrait confirmé
**Quand** `moderation` appelle `vocabulaire.service` avec l'acteur `Administrateur(id, motif)`
**Alors** l'Image repasse à l'état `privee` et `retrait_admin_motif` est enregistré (AD-3)
**Et** dans la même transaction, le propriétaire reçoit une Notification avec le motif, et chaque collègue qui a un lien vers l'Image en reçoit une aussi
**Et** les Préparations des collègues affichent « image retirée de la banque » (FR-21)
**Et** aucune annulation n'est proposée, car le dialogue vaut confirmation

**Étant donné** l'Image retirée
**Quand** son propriétaire tente de la verser à nouveau
**Alors** le versement est refusé avec le code `image.versement.retrait_admin`, jusqu'à ce qu'il modifie la Carte d'identité

**Étant donné** les actions d'administration sur une Image
**Quand** on inspecte l'API
**Alors** elles ne sont exposées que par `moderation.api` et exigent le rôle `admin`, et seules les Images `moderable` (`versee` ou `abandonnee`) sont concernées (AD-2)
**Et** l'administrateur ne peut pas modifier la Carte d'identité (FR-14)

### Story 6.2 : Supprimer définitivement une Image

En tant qu'administrateur,
Je veux supprimer définitivement une Image, par exemple une Image sous licence illicite,
Afin qu'elle ne soit plus servie nulle part (FR-31).

**Critères d'acceptation :**

**Étant donné** une Image `moderable`
**Quand** l'administrateur choisit « Supprimer » et confirme dans le Dialogue de confirmation
**Alors** l'Image passe à l'état `supprimee`, ses fichiers sont effacés et sa ligne est conservée comme trace de la suppression (AD-3)
**Et** dans la même transaction, le propriétaire et chaque enseignant qui a un lien vers l'Image reçoivent une Notification

**Étant donné** une Préparation qui liait cette Image
**Quand** elle s'ouvre
**Alors** la carte affiche « image supprimée, à remplacer », avec le même traitement visuel que « retirée de la banque », et le Panneau de choix d'Image permet d'en choisir une autre
**Et** une Fiche générée depuis cette Préparation montre un cadre vide légendé « image supprimée » (AD-12)

**Étant donné** une Image `supprimee`
**Quand** quelqu'un demande son fichier
**Alors** `FichiersImages.lire` ne renvoie rien

### Story 6.3 : Fusionner les Albums en doublon et corriger le lexique

En tant qu'administrateur,
Je veux fusionner deux Albums en doublon et corriger un Album, un Mot ou un Sens mal saisi,
Afin que l'équipe retrouve un seul « Roule galette » (FR-4, AD-19).

**Critères d'acceptation :**

**Étant donné** Administration › Fusion d'Albums
**Quand** l'administrateur choisit l'Album à conserver et l'Album en double, puis confirme
**Alors** `referentiels` émet l'événement synchrone `AlbumsFusionnes`. Les modules qui utilisent des Albums (`preparations`, `vocabulaire`, `fiches`) le reçoivent et reportent leurs références sur l'Album conservé, dans la même transaction (AD-15)
**Et** l'Album en double est supprimé, et les Modules des deux Albums sont réunis

**Étant donné** un Album quelconque
**Quand** l'administrateur le corrige (titre, auteur, éditeur)
**Alors** la correction est visible partout

**Étant donné** un Mot (forme, article, genre) ou un Sens (libellé, catégorie grammaticale) mal saisi
**Quand** l'administrateur le corrige
**Alors** la correction s'applique sans changer le Mot ou le Sens auquel chaque Image est rattachée (AD-19)
**Et** les enseignants n'ont pas accès à cette correction

### Story 6.4 : Supprimer un compte et effacer ses données

En tant qu'administrateur,
Je veux supprimer le compte d'un enseignant à sa demande,
Afin de respecter son droit à l'effacement sans priver l'équipe des Images partagées (FR-32, NFR-12).

**Critères d'acceptation :**

**Étant donné** un compte dans Administration › Comptes
**Quand** l'administrateur choisit « Supprimer » et confirme
**Alors** les étapes se suivent dans l'ordre d'AD-18 :
1. Keycloak passe `enabled=false` et révoque les sessions.
2. Une transaction de `comptes.service` passe le statut à `suppression_en_cours`.
3. Les modules `fiches`, `importation`, `preparations` (libération des usages), `vocabulaire` et `notifications` purgent les données de l'enseignant.
4. Le compte est anonymisé en « ancien membre de l'équipe » et passe au statut `supprime`.
5. L'utilisateur est supprimé de Keycloak (`DELETE`).

**Étant donné** les Images du compte supprimé
**Quand** `vocabulaire` purge ses données
**Alors** les Images non versées sont effacées, ou passent à l'état `abandonnee` si un collègue les lie
**Et** les Images versées restent dans la Banque, attribuées à « ancien membre de l'équipe »

**Étant donné** une Image versée appartenant à un compte supprimé
**Quand** l'administrateur la retire de la Banque
**Alors** ce retrait vaut suppression par le propriétaire (AD-3)

**Étant donné** le dernier administrateur
**Quand** on tente de supprimer son compte
**Alors** la suppression est refusée

**Étant donné** une étape Keycloak en échec pendant la suppression
**Quand** la tâche horaire de `comptes` s'exécute
**Alors** elle rejoue l'étape manquante. Le compte ne peut plus se connecter dès l'étape 1

### Story 6.5 : Signaler les comptes inactifs

En tant qu'administrateur,
Je veux voir les comptes inactifs depuis plus d'un an,
Afin d'en proposer la suppression et de limiter la conservation des données (FR-32).

**Critères d'acceptation :**

**Étant donné** un enseignant actif
**Quand** il fait son premier appel à l'API dans un mois donné
**Alors** le filtre de `comptes` enregistre une ligne `enseignant_activite(enseignant_id, mois)` (AD-24)

**Étant donné** un compte sans activité depuis plus de 12 mois
**Quand** l'administrateur ouvre Administration › Comptes
**Alors** ce compte est signalé « inactif depuis plus d'un an », avec un accès direct à « Supprimer »
**Et** la durée de conservation est réglable dans la configuration, en attendant la réponse du DPD (Q-3)

### Story 6.6 : Tableau de bord d'usage

En tant qu'administrateur,
Je veux suivre des indicateurs agrégés de l'usage,
Afin de mesurer le pilote sans classer mes collègues (FR-34).

**Critères d'acceptation :**

**Étant donné** Administration › Tableau de bord
**Quand** la page s'ouvre
**Alors** elle affiche le nombre d'enseignants actifs par mois, le nombre de Préparations par enseignant (en distribution anonyme), le nombre d'Images versées et le taux de réutilisation par Album
**Et** le taux de réutilisation est égal au nombre de liens `reutilisee` divisé par le nombre de Mots illustrés, et la part « réutilisée d'un collègue » compte les liens dont le propriétaire de l'Image n'est pas l'enseignant du lien (AD-24)

**Étant donné** le module `indicateurs`
**Quand** il calcule ces valeurs
**Alors** il ne lit que les méthodes `Statistiques…` des autres modules, qui renvoient des nombres et des taux, jamais d'identifiant d'Image ni de nom d'enseignant
**Et** aucun classement nominatif n'est affiché

### Story 6.7 : Exporter tout Mes mots

En tant qu'enseignant,
Je veux télécharger toutes mes Images et leurs Cartes d'identité dans un format ouvert,
Afin que mon travail ne soit jamais prisonnier de l'outil (NFR-7).

**Critères d'acceptation :**

**Étant donné** Menu de profil › Mes données
**Quand** l'enseignant choisit « Exporter mes images »
**Alors** une progression s'affiche, puis une archive ZIP est téléchargée (UX-DR-40)
**Et** l'archive contient chaque Image de l'enseignant (fichier pleine taille, obtenu par `FichiersImages.lire`), un fichier JSON avec les Cartes d'identité, et ses Préparations avec leurs Mots

**Étant donné** l'archive
**Quand** on l'inspecte
**Alors** elle ne contient aucune Image non versée d'un collègue
**Et** les Images de collègues liées dans ses Préparations n'y figurent que comme références (Mot, Sens, auteur), sans leur fichier

**Étant donné** un échec de l'export
**Quand** il survient
**Alors** un Bandeau d'erreur propose « Réessayer »

### Story 6.8 : Prêt pour l'ouverture du pilote

En tant que Paul, porteur du projet,
Je veux vérifier qu'on sait restaurer une sauvegarde et que les questions préalables sont tranchées,
Afin d'ouvrir l'application aux 5 collègues en toute sécurité (NFR-8, NFR-12).

**Critères d'acceptation :**

**Étant donné** une sauvegarde nocturne récente
**Quand** Paul déroule la procédure de restauration sur une machine vierge
**Alors** l'application redémarre avec toutes ses données (comptes Keycloak, Images, Préparations, Fiches), et le résultat est consigné, daté, dans `deploiement/`

**Étant donné** la liste des questions préalables
**Quand** Paul prépare l'ouverture
**Alors** les décisions sur Q-1 (images d'album), Q-2 (licences), Q-3 (avis du DPD et inscription au registre des traitements) et sur le relais SMTP sont consignées
**Et** si Q-1 interdit le stockage des images d'album, le type `image_album` est retiré de la saisie, de l'Import et des Sélecteurs, sans autre changement
