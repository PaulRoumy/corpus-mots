---
title: Réconciliation de la spine avec ses sources — corpus-mots
date: 2026-10-29
spine: docs/architecture/architecture-corpus-mots-2026-10-29/ARCHITECTURE-SPINE.md
sources:
  - docs/prd/prd-corpus-mots-2026-10-27/prd.md
  - docs/prd/prd-corpus-mots-2026-10-27/addendum.md
  - docs/ux-designs/ux-corpus-mots-2026-10-28/DESIGN.md
  - docs/ux-designs/ux-corpus-mots-2026-10-28/EXPERIENCE.md
  - docs/architecture/architecture-corpus-mots-2026-10-29/.memlog.md
---

# Réconciliation de la spine avec ses sources

## Verdict

La spine couvre bien les grands invariants (visibilité, cycle de vie, versement, liens, identité, contrat, stockage). Elle contient toutefois **une contradiction structurelle** : le graphe de dépendances d'AD-1 empêche `vocabulaire` de lire les liens Préparation→Image, alors qu'AD-2, AD-3, FR-9, FR-15 et FR-33 en ont besoin. Elle laisse aussi plusieurs exigences discrètes sans invariant : désactivation face aux sessions longues, différence entre « visible » et « réutilisable », immutabilité des Sens partagés, service authentifié des fichiers image avec des vignettes pour tenir 500 Images en moins de 2 s, suppression de compte d'un module à l'autre, et ambiguïté sur le versement des photos personnelles.

Échelle : **critique** = la spine se contredit ou contredit une source, et des unités divergeront à coup sûr ; **haute** = des unités construites séparément divergeront probablement ; **moyenne** = trou à combler avant les stories concernées ; **basse** = précision ou rappel.

---

## Critique

### C-1 — `vocabulaire` doit lire les liens Préparation→Image, mais le graphe l'interdit
- **Source :** FR-15 (filtre Section de Mes mots qui « retient aussi les Images utilisées dans une Préparation de cette Section »), FR-9 (« déjà utilisées pour ce Sens dans d'autres Albums »), FR-20 (abandon si « Réutilisée dans la Préparation d'un collègue »), FR-33 (notifier les enseignants qui Réutilisent une Image retirée), EXPERIENCE › Marque « déjà utilisée ».
- **Problème :** AD-2 place `VisibiliteImages` dans `vocabulaire` et y inscrit la clause « liée à l'une de ses Préparations ». AD-3 fait choisir entre `abandonnee` et la suppression selon qu'il existe un lien chez un collègue, et fait notifier les enseignants qui ont lié l'Image. Or la table `preparation_image` appartient à `preparations` (ERD, Capability Map), et AD-1 n'autorise que `preparations → vocabulaire`. `vocabulaire` ne peut donc ni lire ces liens ni appeler `preparations` sans créer un cycle. Chaque développeur contournera le problème à sa façon (requête SQL directe, appel inverse, données dupliquées), ce qu'AD-1 et AD-2 visent justement à empêcher.
- **Correctif :** décider dans la spine qui possède le lien. Option recommandée : faire porter à `vocabulaire` une table `utilisation_image` (UUID de l'Image, UUID de la Préparation, propriétaire de la Préparation, Section, Album, `origine`), écrite **uniquement** via `vocabulaire.service` quand `preparations` lie ou délie une Image. `preparations` garde sa structure Mot/Sens et appelle `vocabulaire` pour lier. AD-2, AD-3, AD-5, l'ERD et la Capability Map sont à ajuster en conséquence. Autre option : un port de lecture déclaré dans `vocabulaire` et implémenté par `preparations`, avec une inversion documentée. Il faut l'écrire explicitement.

---

## Haute

### H-1 — AD-4 laisse entendre que la photo personnelle n'est pas versable
- **Source :** UJ-3 (« il verse la photo dans la Banque de l'école »), SM-5, FR-19 ; EXPERIENCE › Sélecteur de licence (liste fermée de 6 licences, sans `photo_personnelle`).
- **Problème :** AD-4 se termine par « plus `photo_personnelle` et `image_album` non versables par type ». On peut le lire comme si les deux types étaient non versables, ce qui contredit UJ-3. La spine mélange aussi le **type** et la **licence** dans une même énumération, alors que l'UX garde le type et la licence comme deux champs distincts, avec une liste de licences qui ne contient pas `photo_personnelle`.
- **Correctif :** séparer les deux énumérations (`type_image` : `image_album`, `image_libre`, `photo_personnelle`, `inconnu` ; `licence` : les 6 valeurs de l'UX). Écrire explicitement qu'une `photo_personnelle` est versable, avec pour licence et auteur l'enseignant, renseignés automatiquement. Ajouter « licence non renseignée » (null) aux motifs de refus (raison UX « licence à préciser »).

### H-2 — Fichiers image : authentification des `<img>` et vignettes pour le seuil de 2 s
- **Source :** PRD §5 Réactivité (page de banque de 500 Images en moins de 2 s) ; EXPERIENCE › State Patterns Banque ; AD-6 (jeton bearer) ; AD-8 (fichiers en `bytea`).
- **Problème :** (a) Un `<img src="/api/images/{id}/fichier">` n'envoie pas l'en-tête `Authorization: Bearer`. Si rien n'est fixé, chaque développeur choisira sa solution : blob via HttpClient, cookie, URL signée ou endpoint public. Un endpoint public casserait AD-2. (b) Une page de 500 Images à la taille d'impression, lues en `bytea` puis servies par Quarkus, ne tiendra pas les 2 s. La spine ne prévoit ni vignette, ni cache HTTP, ni pagination.
- **Correctif :** ajouter un invariant « service des fichiers image ». Une vignette (par exemple ≤ 256 px) est générée à l'enregistrement dans `IMAGE_FICHIER`, à côté du fichier pleine taille. Les grilles ne chargent que des vignettes. Les fichiers sont servis avec `ETag` et `Cache-Control: private, immutable` (contenu adressé par version). Le mécanisme d'authentification des images est unique et décidé dans la spine (par exemple une URL signée de courte durée émise par `VisibiliteImages`, ou un chargement en blob via le client généré). Les listes de la Banque sont paginées.

### H-3 — La désactivation et la suppression de compte n'agissent pas sur les sessions longues
- **Source :** FR-32 (« Désactiver un compte bloque la connexion »), FR-2 (session d'environ 30 jours sur le téléphone).
- **Problème :** AD-6 se contente de vérifier le jeton à chaque requête. Avec un jeton de rafraîchissement valable 30 jours, un compte désactivé reste utilisable jusqu'à l'expiration. `Enseignant.actif` existe, mais aucune règle ne le fait vérifier.
- **Correctif :** dans AD-6, prévoir que `comptes.service` désactive l'utilisateur **et** ferme ses sessions dans Keycloak (logout de l'utilisateur). Le composant « enseignant courant » de `commun` refuse toute requête d'un `Enseignant` inactif ou anonymisé (403, avec le code `compte.desactive`).

### H-4 — La suppression de compte traverse des modules que `comptes` ne peut pas atteindre
- **Source :** FR-32, PRD §6.2 (droit à l'effacement), AD-6.
- **Problème :** AD-6 efface les Images non versées et anonymise l'`Enseignant`, mais il ne dit rien des Préparations, des Fiches (réglages), des `ImportBrouillon` ni des Notifications du compte supprimé. Or `comptes` ne dépend que de `vocabulaire` et de `commun` (AD-1). Trois autres points restent ouverts : (a) les Images non versées **liées chez un collègue** ne correspondent à aucune transition d'AD-3, qui ne prévoit `→ abandonnee` que pour une suppression par le propriétaire ; (b) le champ `auteur` d'une photo personnelle (le nom de l'enseignant, UJ-3) reste une donnée personnelle après l'anonymisation ; (c) supprimer dans Keycloak puis anonymiser en base touche deux systèmes sans transaction commune, si bien qu'un échec à mi-chemin laisse un état incohérent.
- **Correctif :** décrire la suppression de compte comme une orchestration explicite. Soit `comptes` appelle chaque module propriétaire par sa couche `service` (et le graphe s'enrichit en conséquence), soit chaque module expose un « purger l'enseignant X » appelé dans un ordre fixé. Fixer les règles suivantes : les Images non versées liées ailleurs passent à `abandonnee` ; le champ `auteur` d'une photo personnelle est remplacé par « ancien membre de l'équipe » ; l'application anonymise d'abord, Keycloak est appelé ensuite, et l'opération est rejouable sans effet de bord (idempotente) en cas d'échec.

### H-5 — « Visible » ne veut pas dire « réutilisable »
- **Source :** FR-21 (une Image retirée « ne peut plus être Réutilisée »), FR-9, FR-11 (dupliquer une Préparation).
- **Problème :** AD-2 rend visible une Image « liée à l'une de ses Préparations », même quand elle n'est plus versée. Rien n'empêche donc un collègue de la lier à une **autre** Préparation, ou de dupliquer une Préparation qui contient une Image retirée, abandonnée ou une pierre tombale. Chaque module jugera cette éligibilité différemment.
- **Correctif :** ajouter une règle unique d'éligibilité à la réutilisation dans `vocabulaire.service` : une Image ne peut être liée que si elle appartient à l'enseignant et n'est pas `abandonnee` ou `supprimee`, ou si elle est `versee`. Préciser ce que fait la duplication (FR-11) d'une Préparation qui contient des Images non éligibles, par exemple dupliquer le Mot dans l'état « à illustrer » ou recopier le lien avec l'état « à remplacer ». Préciser aussi la valeur d'`origine` dans une copie, puisqu'elle compte pour SM-4.

### H-6 — Mot et Sens sont partagés, mais la Carte d'identité permet de les modifier
- **Source :** FR-14 (la Carte d'identité contient Mot, Sens et catégorie grammaticale, modifiables par le propriétaire), FR-22 (« aucune action d'un enseignant ne modifie […] une Image […] d'un autre »), FR-10 (la catégorie est portée par le Sens), PRD §4.5 « Rien n'est jamais écrasé ».
- **Problème :** la catégorie grammaticale et le libellé appartiennent au **Sens**, que partagent les Images de plusieurs enseignants. Si un propriétaire change la catégorie depuis la Carte d'identité de son Image, la modification s'applique aux Images de ses collègues. AD-5 ne protège que la Carte d'identité de l'Image, et le report « Gestion des Sens par plusieurs enseignants » ne fixe aucune règle provisoire pour la V1.
- **Correctif :** écrire dans AD-5 (ou dans un nouvel AD) qu'en V1, un Mot et un Sens ne peuvent être modifiés que s'ils ne portent que des Images du même enseignant et ne figurent dans aucune Préparation d'un collègue. Sinon, modifier le Sens d'une Image revient à la **rattacher** à un autre Sens, existant ou nouveau. Fixer aussi le cas du Sens provisoire « à compléter » créé depuis le téléphone (voir M-6).

### H-7 — Fusion d'Albums et suppression de Thème : des dépendances inverses
- **Source :** FR-4 (fusion de deux Albums par l'administrateur), FR-5 (« un Thème utilisé ne peut pas être supprimé sans réaffecter ses Images » ; suppression ou renommage d'un Module).
- **Problème :** fusionner deux Albums oblige à réécrire `image.album`, `preparation.album` et les sources de Fiche, qui appartiennent à `vocabulaire`, `preparations` et `fiches`. Savoir si un Thème ou un Module est utilisé oblige à interroger ces mêmes modules. AD-1 n'autorise que les dépendances vers `referentiels`, jamais celles qui en partent.
- **Correctif :** dans AD-1, désigner un orchestrateur, par exemple un service de fusion et de suppression des référentiels placé dans un module qui dépend des trois autres (`moderation` ou un module `administration`). Autre option : chaque module expose « remplacer l'Album A par B » et « compter les usages du Thème T », appelés depuis cet orchestrateur. Le sens des dépendances reste ainsi sans cycle.

### H-8 — Quels Albums peut-on révéler pour un Mot
- **Source :** FR-8 (« les Albums où [un collègue] a utilisé le Mot uniquement dans Mes mots ne sont jamais montrés »), FR-7 (les Mots déjà illustrés pour l'Album, dans Mes mots et dans la Banque), EXPERIENCE › Confidentialité.
- **Problème :** AD-2 dit quelles **Images** et quels **Mots ou Sens** peuvent être montrés, mais pas quels **Albums** on peut associer à un Mot. L'Album peut venir de l'album d'origine d'une Image visible ou des Préparations privées d'un collègue. La seconde source divulguerait une partie de Mes mots. FR-7 pose la même question (UJ-1 : les 9 mots de *Roule galette* viennent-ils des Préparations de Paul ou des Images versées marquées avec cet Album ?).
- **Correctif :** compléter AD-2 ainsi : les Albums associés à un Mot sont l'album d'origine de ses Images visibles et les Albums des Préparations **de l'enseignant courant**, jamais ceux des Préparations d'un collègue. FR-7 se calcule sur les Images visibles dont l'album d'origine est cet Album, plus les Préparations de l'enseignant. Préciser aussi que les Préparations sont privées à leur auteur, puisqu'aucune règle de visibilité des Préparations n'existe hors des Images.

### H-9 — L'ordre de proposition des Images (FR-9) n'a pas de propriétaire unique
- **Source :** FR-9, FR-7 (« Image proposée selon l'ordre de FR-9 »), EXPERIENCE › Panneau de détection, Panneau de choix d'Image, Encart « mots déjà illustrés », Marque « déjà utilisée », Bouton Enregistrer mobile (« le Sens le plus utilisé présélectionné »).
- **Problème :** cinq surfaces appliquent le même classement : Section de la Préparation d'abord ; à Section égale, l'Image déjà utilisée pour ce Sens ; les Images de l'enseignant avant celles des collègues ; marque « déjà utilisée ». C'est le principe pédagogique central (« même image pour un même Sens »). La spine ne le localise nulle part et le laisse réimplémenter côté front ou dans chaque ressource.
- **Correctif :** ajouter un AD « Classement des Images proposées ». Un seul composant de `vocabulaire.service`, construit après `VisibiliteImages`, renvoie les Images ordonnées avec le drapeau `deja_utilisee`. Il sert la détection, le choix d'Image, la reprise FR-7 et l'import. Le front n'ordonne jamais lui-même. La même règle couvre le « Sens le plus utilisé ».

---

## Moyenne

### M-1 — Trous dans le diagramme d'états (AD-3)
- **Source :** FR-20, FR-31.
- **Problème :** (a) Aucune transition `versee → [*]` n'existe, alors qu'un propriétaire peut supprimer une Image versée que personne ne Réutilise. (b) Le cas d'une Image liée **seulement dans les Préparations de son propriétaire** n'est pas fixé : la supprimer physiquement casse ses propres liens. (c) Selon AD-2, le propriétaire voit son Image si elle n'est pas `abandonnee`, donc il voit aussi une Image `supprimee` (pierre tombale) dans Mes mots.
- **Correctif :** ajouter `versee → [*]` (suppression sans lien chez un collègue). Préciser que les liens du propriétaire vers l'Image supprimée sont retirés de ses Préparations, ou que le Mot repasse à l'état « à illustrer ». Dans AD-2, écrire « n'est ni `abandonnee` ni `supprimee` ».

### M-2 — Une image qui devient image d'album après l'enregistrement n'est pas réduite
- **Source :** FR-13, PRD §6.1 et Q-1 (basse résolution, environ 400 × 400 px), FR-24 (type précisé en lot après l'extraction).
- **Problème :** AD-8 réduit la taille « à l'enregistrement », selon le type. Or le type change souvent ensuite : il vaut `inconnu` à l'import, puis l'enseignant passe une image libre en image d'album depuis la Carte d'identité. Le fichier pleine résolution resterait stocké.
- **Correctif :** dans AD-8, réduire de nouveau le fichier (de façon irréversible) à chaque passage au type `image_album`, quelle qu'en soit l'origine. La règle s'applique aussi à la validation d'un Import.

### M-3 — L'Album est obligatoire pour une image d'album, mais rien ne le contrôle
- **Source :** FR-13, PRD §6.1, EXPERIENCE (« Album d'origine requis », enregistrement bloqué, aussi en lot à l'Import).
- **Problème :** AD-4 ne contrôle qu'au moment de verser. Or l'exigence s'applique dès l'**enregistrement** et la modification, puisque la référence de l'Album doit figurer sur tous les exports (FR-29).
- **Correctif :** ajouter une règle de validation dans `vocabulaire.service`, appliquée à la création, à la modification et à la validation d'Import : `type = image_album` implique `album_id` non nul. La refuser avec un code stable (par exemple `image.album_requis`).

### M-4 — L'activité des comptes n'est enregistrée nulle part
- **Source :** FR-32 (compte inactif depuis plus d'un an signalé), FR-34 (enseignants actifs par mois, indicateurs agrégés sans classement nominatif).
- **Problème :** Keycloak possède les sessions (AD-6), mais aucun module ne conserve de date de dernière activité ni d'historique mensuel. De plus, « nombre de Préparations par enseignant » et « aucun classement nominatif » imposent une contrainte de forme à l'API, que la spine ne fixe pas.
- **Correctif :** `comptes` tient `Enseignant.derniere_activite`, mis à jour par le composant « enseignant courant » au plus une fois par jour, et éventuellement une table d'activité mensuelle. Écrire que l'API `indicateurs` ne renvoie que des agrégats ou des distributions anonymes, jamais un nom associé à un chiffre.

### M-5 — L'invariant « il reste au moins un administrateur » n'est pas tenu
- **Source :** FR-32, EXPERIENCE › Administration (retrait du rôle et suppression refusés pour le dernier administrateur).
- **Problème :** le rôle `admin` est stocké dans Keycloak. Deux retraits simultanés, ou une désactivation, peuvent laisser l'école sans administrateur.
- **Correctif :** dans AD-6, `comptes.service` vérifie qu'un autre administrateur actif existe avant tout retrait de rôle, désactivation ou suppression d'un administrateur. Ces opérations sont sérialisées, par exemple par un verrou consultatif PostgreSQL.

### M-6 — Le modèle de données impose un Sens que les sources ne demandent pas
- **Source :** FR-6 (Mot enregistré sans Image, « à illustrer » ; le minimum est le Mot), FR-17 et EXPERIENCE (le Sens n'est jamais exigé sur le téléphone : Sens « à compléter »).
- **Problème :** dans l'ERD, `SENS ||--o{ IMAGE` et `PREPARATION_MOT }o--|| SENS` rendent le Sens obligatoire. Le Sens provisoire « à compléter » n'est pas défini : il peut être partagé entre enseignants (voir H-6) ou propre à chaque Image.
- **Correctif :** préciser que `sens_id` peut être nul (dans `IMAGE` comme dans `PREPARATION_MOT`), avec l'état « à compléter », ou que chaque saisie rapide crée un Sens provisoire **propre à l'enseignant**, jamais montré aux collègues avant d'être nommé.

### M-7 — Export de Mes mots (réversibilité) : format et volume non fixés
- **Source :** PRD §5 Réversibilité (« tout Mes mots, Images et Cartes d'identité, dans un format ouvert »), EXPERIENCE › Mes données (progression puis téléchargement d'une archive).
- **Problème :** la Capability Map ne donne que le module. Avec jusqu'à 5 000 Images en `bytea`, une requête synchrone qui charge tout en mémoire est risquée. Le contenu n'est pas défini non plus : Images versées et non versées ? Images `abandonnee` ? Préparations ?
- **Correctif :** fixer le format, par exemple un ZIP contenant les fichiers pleine taille et un `cartes.json` ou `cartes.csv` documenté et versionné. Le flux est produit en streaming, sans tout charger en mémoire. Le périmètre est : toutes les Images dont l'enseignant est propriétaire et qui ne sont ni `abandonnee` ni `supprimee`, plus la liste de ses Préparations.

### M-8 — Gestes annulables : la sémantique n'est pas fixée
- **Source :** EXPERIENCE › Bandeau « Annuler » (8 s), « Annuler plutôt que confirmer » : retirer un Mot d'une Préparation, écarter une Image ou une paire d'Import, « Ne plus verser » une Image non Réutilisée.
- **Problème :** si l'annulation recrée un lien, `origine` est recalculée et fausse SM-4. Si elle reverse une Image, une règle a pu changer entre-temps. Chaque écran implémentera l'annulation à sa façon (suppression puis recréation, suppression logique, délai côté front).
- **Correctif :** fixer un seul modèle. Soit l'annulation appelle une opération inverse qui restaure l'état exact (même UUID de lien, même `origine`), soit le retrait est une suppression logique `retire_le` effacée pour de bon après le délai. Préciser que l'annulation ne crée jamais de notification.

### M-9 — Session expirée : la saisie doit survivre à la redirection
- **Source :** EXPERIENCE › State Patterns (« Mot en cours de saisie conservé », retour à la même page ; téléphone : retour direct à l'ajout de photo) ; Voice and Tone (« votre saisie est conservée »).
- **Problème :** le flux code + PKCE passe par une redirection pleine page vers Keycloak, qui fait perdre l'état mémoire de la SPA. La spine reporte le choix de la bibliothèque OIDC « sans effet sur les autres modules », alors que ce comportement concerne tous les écrans de saisie.
- **Correctif :** écrire dans les conventions que le front renouvelle le jeton sans interaction (rafraîchissement silencieux) et qu'avant toute redirection d'authentification, il enregistre l'URL de retour et la saisie en cours dans `sessionStorage`. Prévoir aussi la photo en attente sur le téléphone, ou assumer explicitement sa perte.

### M-10 — Limites de taille des requêtes : les trois couches doivent être alignées
- **Source :** FR-17 (photo de téléphone), FR-23 (plusieurs .docx et .pptx, souvent lourds) ; report « taille max fixée dans la story ».
- **Problème :** Caddy, Quarkus (`max-body-size`, 10 Mo par défaut) et le front doivent appliquer la même limite. Si chaque story la fixe de son côté, le refus sera incohérent (413 sans `problem+json`).
- **Correctif :** déclarer une convention : les limites sont centralisées dans la configuration (dans `.env` et le profil Quarkus), Caddy est réglé au-dessus de Quarkus, et le refus prend la forme d'un `problem+json` avec le code `fichier.trop_volumineux`. Seules les valeurs restent à fixer dans les stories.

### M-11 — Métadonnées EXIF des photos
- **Source :** PRD §6.2 (données minimales), FR-17 ; inférence.
- **Problème :** une photo prise au téléphone contient souvent la position GPS (souvent celle du domicile ou de l'école), le modèle d'appareil et une orientation EXIF. La réduction côté back (AD-8) ne dit pas si ces métadonnées sont conservées.
- **Correctif :** dans AD-8, supprimer toutes les métadonnées EXIF ou XMP à l'enregistrement, après avoir appliqué l'orientation.

### M-12 — Pages Keycloak (connexion, mot de passe, invitation) : thème et RGPD
- **Source :** EXPERIENCE › Surfaces (Connexion, Créer mon mot de passe, Mot de passe oublié utilisables sur téléphone, lien « Données personnelles », vouvoiement, message pour un lien d'invitation expiré ou un compte désactivé) ; FR-3.
- **Problème :** ces écrans sont servis par Keycloak, pas par Angular. Sans décision, ils resteront dans le thème par défaut, en anglais ou avec des libellés génériques, sans le lien RGPD.
- **Correctif :** ajouter à la Structural Seed un thème de connexion Keycloak versionné dans le dépôt (`deploiement/keycloak/theme/`), en français et au vouvoiement, avec le lien vers la page d'information de l'application. Les e-mails d'invitation et de réinitialisation sont en français.

### M-13 — L'écart d'hébergement avec le PRD n'est pas tracé dans la spine
- **Source :** PRD §6.3 (hébergeur européen par défaut, Q-4), addendum (Doctrine technique, cadre de sécurité), Q-3 (avis du DPD) ; .memlog (décision « serveur personnel de Paul »).
- **Problème :** la spine présente le mini-PC domestique comme acquis, sans dire qu'il remplace l'hypothèse du PRD. Or le DPD académique pourrait s'y opposer (disponibilité, sécurité physique, adresse IP résidentielle).
- **Correctif :** dans « Deferred », lier l'hébergement domestique à Q-3, au même titre que Q-1 : à valider avec le DPD avant l'ouverture aux collègues. Noter que le déploiement par Compose reste portable vers un VPS européen sans changement d'architecture.

### M-14 — Génération de Fiche et Images retirées, abandonnées ou supprimées
- **Source :** FR-21 (« les Fiches déjà exportées ne sont pas affectées »), FR-31, AD-12 (« Refaire » régénère).
- **Problème :** puisque les Fiches sont régénérées, il faut dire ce qu'une Fiche fait d'une pierre tombale `supprimee` (sans fichier) ou d'une Image retirée : l'omettre, afficher un emplacement vide, ou la garder parce qu'elle reste liée.
- **Correctif :** fixer la règle dans AD-12 : les Images `supprimee` sont omises et signalées dans l'aperçu ; une Image retirée encore liée reste exportable, puisqu'elle reste visible ; une Fiche créée à partir d'un filtre n'utilise que `VisibiliteImages` au moment de la régénération.

### M-15 — Stockage et purge des brouillons d'Import
- **Source :** FR-25 (Import interrompu puis repris), AD-11.
- **Problème :** un `ImportBrouillon` doit garder les images extraites, qui sont des octets, mais la spine ne dit pas où (AD-8 interdit le disque) ni combien de temps. Un brouillon abandonné peut peser des centaines de Mo dans les sauvegardes.
- **Correctif :** les octets extraits sont stockés dans une table du module `import`, déjà réduits selon AD-8. Le brouillon est supprimé à la validation, à l'abandon explicite ou après N jours d'inactivité. Il est aussi purgé à la suppression du compte (H-4).

---

## Basse

### L-1 — UUID d'`Enseignant` et convention `uuidv7()`
- **Source :** AD-6, Consistency Conventions.
- **Problème :** l'identifiant d'`Enseignant` est le `sub` de Keycloak, qui n'est pas généré par la base. La convention « UUID générés par la base, `uuidv7()` » paraît universelle.
- **Correctif :** noter l'exception dans la convention.

### L-2 — Polices et ressources auto-hébergées (pas de tiers)
- **Source :** PRD §6.3 (« sans traceur publicitaire et sans mesure d'audience tierce ») ; DESIGN.md (Nunito, repli Playwrite FR Moderne « auto-hébergée »).
- **Problème :** charger Nunito ou d'autres ressources depuis Google Fonts ou un CDN révélerait les adresses IP des enseignants à un tiers.
- **Correctif :** ajouter la convention « aucune ressource tierce chargée par le navigateur ; polices et icônes servies par le front ».

### L-3 — Sauvegardes et effacement RGPD
- **Source :** PRD §6.2 (effacement), Structural Seed (rétention de 14 jours).
- **Problème :** les données d'un compte supprimé restent jusqu'à 14 jours dans les sauvegardes, ce que la page d'information doit dire.
- **Correctif :** mentionner cette durée dans le report RGPD (Q-3) et dans la page d'information de FR-3.

### L-4 — Recherche approchée des titres d'Album
- **Source :** FR-4 (Albums au titre proche signalés).
- **Problème :** AD-10 réserve `pg_trgm` à `forme_normalisee` du Mot.
- **Correctif :** réutiliser la même fonction de normalisation et `pg_trgm` pour `album.titre`, ou dire que FR-4 suit une autre règle.

### L-5 — Création simultanée d'un même Mot
- **Source :** AD-10 (unicité de `forme_normalisee`), EXPERIENCE › Import (« Mot créé entre-temps par un collègue : rattaché »).
- **Problème :** le comportement en cas de conflit d'unicité n'est pas fixé : erreur ou rattachement.
- **Correctif :** `vocabulaire.service` « trouve ou crée » le Mot de façon atomique (`INSERT … ON CONFLICT DO NOTHING` puis lecture). Ce n'est jamais une erreur pour l'utilisateur.

### L-6 — Catégorie grammaticale proposée par défaut et confidentialité
- **Source :** FR-10 (catégorie « proposée par défaut quand le Mot existe »), FR-8.
- **Problème :** un Mot qui n'existe que dans Mes mots d'un collègue est présenté comme nouveau. Proposer la catégorie de son Sens caché trahirait son existence.
- **Correctif :** préciser dans AD-2 que les métadonnées d'un Sens non révélé (libellé, catégorie) ne sont jamais renvoyées.

### L-7 — Les notifications portent le motif
- **Source :** FR-30, EXPERIENCE › Notifications (motif affiché).
- **Problème :** AD-3 impose de créer une notification, mais pas son contenu.
- **Correctif :** la `Notification` stocke le type, l'UUID de l'Image, le motif (code et texte libre) et l'état lu ou non lu. Elle reste lisible même si l'Image est `supprimee`.

### L-8 — Temps de préparation facultatif (SM-3)
- **Source :** SM-3, EXPERIENCE › En-tête de Préparation (« Temps passé » facultatif).
- **Problème :** ce champ n'est pas cité dans le modèle. Il ne pose pas de risque de divergence, mais il sert au bilan.
- **Correctif :** l'ajouter aux attributs de `PREPARATION`, en durée facultative.

---

## Vérifié, sans écart

- Licences en liste fermée et refus de verser Pixabay ou une licence inconnue (FR-13, FR-19, §6.1) : AD-4, en dehors de H-1.
- Crédits calculés automatiquement, en pied de page Word et sur une diapositive finale PowerPoint (FR-29, §6.1) : AD-12.
- Import : rien n'est versé automatiquement, reprise possible (FR-25) : AD-11.
- ARASAAC appelé par le back, image copiée en base, pas d'appel tiers depuis le navigateur (FR-12, §6.3) : AD-9.
- Détection insensible à la casse, aux accents et à l'article, sans lemmatisation (FR-8) : AD-10.
- Notification créée dans la même transaction (FR-30, FR-31, FR-33) : AD-3. Notifications par e-mail reportées : conforme à l'hypothèse de FR-33.
- Sauvegarde quotidienne et restauration testée (PRD §5) : Structural Seed.
- Modèle ouvert à la V2 (Section, catégorie, article, `type_media`) : conforme à PRD §5.
- Export de 30 Mots en moins de 10 s, en requête synchrone : plausible avec Apache POI à ce volume.
