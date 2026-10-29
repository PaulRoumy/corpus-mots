---
title: Revue de la spine d'architecture — corpus-mots (grille « bonne spine »)
cible: docs/architecture/architecture-corpus-mots-2026-10-29/ARCHITECTURE-SPINE.md
date: 2026-10-29
sources: ARCHITECTURE-SPINE.md, .memlog.md, docs/prd/prd-corpus-mots-2026-10-27/prd.md
---

# Revue de la spine d'architecture — corpus-mots

## Verdict

Spine concise, bien découpée et globalement juste sur le fond (visibilité unique, cycle de vie centralisé, lien plutôt que copie, contrat généré, données et fichiers dans une seule base), **mais pas encore prête pour le découpage en epics** : le graphe de dépendances (AD-1) ne permet pas d'implémenter les règles d'AD-2, d'AD-3 et de plusieurs FR sans cycle ni lecture de tables d'un autre module, AD-4 contredit le PRD sur les photos personnelles, et l'enveloppe d'exploitation d'un serveur domestique (exposition Internet, mises à jour, provisionnement Keycloak) est en grande partie muette.

## Synthèse par critère

| # | Critère | Résultat |
| --- | --- | --- |
| 1 | Points de divergence réels fixés, aucun manqué | Partiel : bons AD, mais il manque find-or-create Mot/Sens, livraison des fichiers image, pagination, provisionnement Keycloak, cascade de suppression de compte (C1, H4, H5, H7, M5) |
| 2 | Chaque Rule est applicable et empêche la divergence visée | Partiel : AD-1 est incompatible avec AD-2 et AD-3 (C1) ; AD-4 est ambiguë (H1) ; AD-3 a des trous (H3) ; AD-8 est vidée par un report (M2) |
| 3 | Aucun report (Deferred) ne permet de diverger | Non : la taille des images est reportée « dans la story concernée » alors qu'AD-8 exige une taille unique (M2) ; « gestion des Sens » est reportée alors que la création de Sens est nécessaire dès V1 (H7) |
| 4 | Technologies plausibles et à jour | Oui dans l'ensemble ; quelques points à vérifier (L2) |
| 5 | La carte des capacités couvre FR-1..FR-34 | Oui, les 34 FR sont cités ; mais plusieurs ne sont pas réalisables dans le module indiqué (FR-4 fusion, FR-5, FR-15, FR-18, FR-20, FR-32, FR-33, FR-34, voir C1, H4, M9) |
| 6 | Chaque dimension est décidée, reportée ou ouverte (surtout l'exploitation) | Partiel : déploiement, environnements, sauvegarde et secrets sont traités ; l'exposition Internet, le durcissement et les mises à jour de l'hôte, le dimensionnement, la supervision des sauvegardes et la position RGPD de l'hébergement ne le sont pas (H5, H6, M7) |
| — | Diagrammes mermaid | Syntaxe valide pour les quatre ; incohérences de contenu (C1, H3, L1) |

---

## Critique

### C1. Le graphe d'AD-1 empêche d'implémenter AD-2, AD-3 et plusieurs FR

**Constat.** `preparations → vocabulaire` est la seule direction autorisée, et chaque table appartient à un seul module. Or `vocabulaire` doit connaître des données qui, d'après le modèle, appartiennent à d'autres modules :

- **AD-2** : une Image est visible si elle est « liée à l'une de ses Préparations », et un Mot est révélé s'il « figure dans une Préparation de l'enseignant ». Ces liens (`PREPARATION_MOT`, `PREPARATION_IMAGE`) appartiennent à `preparations`. `VisibiliteImages` ne peut pas les lire.
- **AD-3 / FR-20** : le choix entre `[*]` et `abandonnee` dépend de « Image liée chez un collègue », donc encore de `preparations`.
- **AD-3 / FR-33** : prévenir les collègues qui réutilisent une Image retirée exige la liste des propriétaires de Préparations qui la lient.
- **FR-15** : dans Mes mots, le filtre Section retient les Images utilisées dans une Préparation de cette Section.
- **FR-15 / FR-18** : filtre par propriétaire et affichage du propriétaire. Le nom affiché appartient à `comptes`, alors que le graphe impose `comptes → vocabulaire`.
- **FR-4 / FR-5** : fusionner deux Albums, ou refuser de supprimer un Thème utilisé, demande à `referentiels` de connaître et de réécrire les références tenues par `vocabulaire`, `preparations`, `fiches` et `import`. Ces modules dépendent tous de `referentiels`, d'où un cycle.

Deux agents qui implémentent AD-2 et FR-20 vont chacun contourner AD-1 à leur façon : requête native sur `preparation_image`, appel inverse, duplication de données. C'est précisément la divergence que la spine doit empêcher.

**Correction proposée.** Trancher dans AD-1 avec une des options suivantes, et redessiner le graphe en conséquence :
1. `vocabulaire` possède la table de liens Préparation→Image (par exemple `utilisation_image` : préparation, enseignant, section, origine). `preparations` l'écrit uniquement par `vocabulaire.service`. Cette option est la plus simple.
2. Autre possibilité : l'inversion explicite. `vocabulaire.service` déclare des interfaces (`LiensImages`, `AnnuaireEnseignants`), implémentées par `preparations` et `comptes` et injectées par CDI. Le graphe distingue alors « dépend de » et « implémente ».

Pour les noms affichés, mettre une lecture `EnseignantResume` (id, nom affiché) dans `commun`, ou bien laisser le front faire la jointure. Pour la fusion et la suppression dans `referentiels`, prévoir une interface `UsageReferentiel` que chaque module consommateur implémente (comptage et réaffectation). Ajouter une ligne au graphe pour chaque cas.

---

## Haute

### H1. AD-4 interdit de verser les photos personnelles et confond type et licence

**Constat.** « … plus `photo_personnelle` et `image_album` non versables par type. » Cette phrase se lit comme « les photos personnelles ne sont pas versables », ce qui contredit UJ-3 (« il verse la photo dans la Banque ») et FR-19. Par ailleurs, `photo_personnelle` et `image_album` sont des **types** (Glossaire), pas des licences. L'énumération des types (`image_album`, `image_libre`, `photo_personnelle`, `inconnu`) n'est donnée nulle part, et aucune licence ne couvre une photo personnelle versée, alors que le composant de crédits d'AD-12 en a besoin.

**Correction proposée.** Séparer deux énumérations fermées : `TypeImage` = `image_album | image_libre | photo_personnelle | inconnu`, et `Licence` = la liste actuelle, plus une valeur pour la photo de l'enseignant (par exemple `photo_enseignant_usage_ecole`, ou une CC choisie). Réécrire la règle ainsi : versable si type ∈ {`image_libre`, `photo_personnelle`} et, pour `image_libre`, source renseignée et licence ∉ {`pixabay`, `autre_inconnue`}. Ajouter un test pour chaque cas.

### H2. Livraison des fichiers image : authentification, vignettes et cache non décidés

**Constat.** `GET /api/images/{id}/fichier` est authentifié par jeton bearer (convention Sécurité, AD-6). Or une balise `<img src>` n'envoie pas d'en-tête `Authorization`. Chaque écran (Banque, Préparation, Import, Fiche) va donc résoudre le problème à sa manière : blob et `createObjectURL`, cookie, URL signée, ou point d'accès laissé public. De plus, AD-8 ne stocke qu'une taille « impression et projection » : une page de Banque de 500 Images chargerait 500 fichiers pleine taille, ce qui rend la NFR « < 2 s » irréaliste. Rien n'est dit non plus sur `ETag` ni sur `Cache-Control`.

**Correction proposée.** Ajouter un AD « Accès aux fichiers image » qui fixe :
- le mécanisme, par exemple des URL signées à courte durée émises par `vocabulaire` après contrôle AD-2, ou bien un intercepteur unique côté front qui charge en blob ;
- deux variantes stockées dans `IMAGE_FICHIER` (`vignette` d'environ 256 px et `impression`), générées à l'enregistrement ;
- des en-têtes de cache (`ETag`, `Cache-Control: private, max-age`, contenu immuable par identifiant).

### H3. Le diagramme d'états d'AD-3 est incomplet par rapport à FR-20, FR-31 et FR-32

**Constat.**
- Il manque `versee → [*]` : la suppression par le propriétaire d'une Image versée qui n'est liée nulle part.
- Le cas « liée seulement dans **ses propres** Préparations » n'est couvert ni par `[*]` (les liens deviendraient orphelins) ni par `abandonnee` (qui ne vise que les collègues).
- Aucune sortie de `abandonnee` quand la dernière Préparation qui la lie est supprimée (FR-11) ou modifiée. Les Images d'un compte supprimé restent donc indéfiniment, ce qui pose un problème RGPD.
- `privee → supprimee : suppression admin` suppose que l'admin voit les Images privées, alors qu'AD-2 ne prévoit aucune exception pour l'admin. Le même problème vaut pour `abandonnee → supprimee`.
- Le retrait par le propriétaire (`versee → privee`) doit lui aussi notifier les réutilisateurs (FR-33). La règle générique le couvre, mais rien ne le relie au diagramme.

**Correction proposée.** Compléter le diagramme avec :
- `versee --> [*]` (non liée) ;
- une règle explicite pour « liée seulement chez soi » : retirer les liens, puis `[*]`, ou bien refuser avec un message ;
- `abandonnee --> [*]` lorsque le dernier lien disparaît, dans la même transaction que la suppression du lien.

Dans AD-2, préciser ce que l'admin voit : Banque et Images `abandonnee` signalées, mais jamais les Images `privee`. Retirer `privee --> supprimee` si l'admin ne voit pas les Images privées.

### H4. La suppression de compte (FR-32) n'a ni cascade ni atomicité définies

**Constat.** AD-6 traite les Images. Il ne dit rien des Préparations, des `ImportBrouillon`, des Fiches ni des Notifications de l'enseignant supprimé, et `comptes` ne dépend que de `vocabulaire` dans le graphe. Le cas des Images non versées **mais liées ailleurs** n'est pas tranché (vraisemblablement `abandonnee`). Enfin, `comptes.service` « pilote Keycloak puis met à jour `Enseignant` » sans transaction commune : un échec entre les deux laisse un compte Keycloak orphelin, ou un `Enseignant` actif sans compte.

**Correction proposée.** Fixer l'ordre de suppression :
1. chaque module expose `supprimerDonneesEnseignant(UUID)` (Préparations, brouillons, Fiches, Notifications), appelé par `comptes` dans une transaction ;
2. les Images liées passent à `abandonnee` ;
3. l'`Enseignant` est anonymisé ;
4. l'appel à Keycloak vient en dernier, rejoué tant qu'il échoue (marqueur `suppression_keycloak_en_attente`).

Pour l'invitation, l'ordre inverse s'applique : créer l'utilisateur Keycloak, puis l'`Enseignant`, avec une compensation qui supprime l'utilisateur Keycloak en cas d'échec. Ajouter les arêtes correspondantes au graphe.

### H5. Exposition Internet d'un serveur domestique non décidée

**Constat.** Le schéma montre « Box de Paul, HTTPS 443 », mais ne dit rien du nom de domaine (« à acquérir » dans le memlog), de l'IP publique fixe ou dynamique, du DNS dynamique, du CGNAT possible chez certains fournisseurs, du transfert de port (443 ; 80 si le défi ACME est HTTP-01), du pare-feu de l'hôte, ni de la protection contre la force brute (réglage Keycloak « brute force detection », limitation de débit dans Caddy). Pour un opérateur non spécialiste, c'est le premier point de panne.

**Correction proposée.** Ajouter au Structural Seed une ligne « Exposition » (domaine, DDNS ou IP fixe, ports ouverts, défi ACME, pare-feu, protection contre la force brute activée dans le realm). Si l'IP publique n'est pas garantie, l'inscrire comme question ouverte, avec un repli tel qu'un tunnel (par exemple Cloudflare Tunnel ou un VPS relais dans l'UE).

### H6. L'hébergement domestique n'est pas confronté à Q-3 (RGPD/DPD) ni au PRD §6.3

**Constat.** Le memlog acte que le serveur de Paul remplace « l'hébergeur européen par défaut ». Le responsable de traitement étant le DASEN, le DPD académique peut exiger des garanties (sécurité physique, disponibilité, sous-traitance, sauvegarde hors site) qu'un mini-PC chez un particulier ne fournit pas. La spine rattache Q-3 aux seules « Images d'album / RGPD avant l'ouverture », sans dire qu'une réponse défavorable remet en cause le déploiement.

**Correction proposée.** Ajouter une question ouverte : « Q-3 peut imposer un hébergeur ». Fixer comme invariant que la pile reste portable sans modification vers un VPS de l'UE (Compose, `.env`, sauvegarde et restauration identiques), et documenter la procédure de migration en restaurant le `pg_dumpall`.

### H7. Création d'un Mot ou d'un Sens qui existe déjà mais reste caché : sémantique non fixée

**Constat.** `forme_normalisee` est unique dans l'école (AD-10). Pourtant, un Mot qui n'existe que dans Mes mots d'un collègue est « présenté comme nouveau » (AD-2). Quand l'enseignant l'enregistre, que fait le service : réutiliser silencieusement la ligne existante (dont les Sens du collègue, qui pourraient alors fuiter), ou échouer sur la contrainte d'unicité ? Il en va de même pour un Sens au libellé proche. La saisie en série (FR-6), la photo (FR-17) et l'Import (FR-25) sont des stories distinctes qui trancheront chacune différemment. Le report « gestion des Sens par plusieurs enseignants » ne couvre pas ce cas, qui se produit dès V1.

**Correction proposée.** Étendre AD-10 avec une méthode unique `vocabulaire.service.obtenirOuCreerMot(saisie)`, qui réutilise la ligne Mot existante sans rien révéler. Préciser que la création d'un Sens crée toujours une nouvelle ligne, propre à l'enseignant tant qu'aucune Image visible ne le porte, et que les libellés de Sens d'un collègue ne sont exposés qu'à travers AD-2. Tous les points d'entrée (saisie, photo, Import, ARASAAC) passent par cette méthode.

### H8. `import` est un mot réservé Java

**Constat.** Le paquetage `fr.corpusmots.import.api` ne compile pas, car `import` est un mot-clé du langage. Le nom est figé dans la liste des modules, le graphe, l'arborescence et la carte des capacités.

**Correction proposée.** Renommer le module `importation` (ou `imports`) partout : modules, graphe, arborescence, carte des capacités. Côté front, `src/app/import/` reste possible.

---

## Moyenne

### M1. Visibilité et réutilisabilité confondues ; forme de `VisibiliteImages` non précisée
- **Constat.** D'après AD-2, une Image liée dans une de mes Préparations m'est « visible ». Mais FR-21 dit qu'une Image retirée de la banque « ne peut plus être Réutilisée » : la détection (FR-8) et la reprise (FR-7) ne doivent donc pas la proposer. D'autre part, si `VisibiliteImages` filtre après la requête, la pagination de la Banque (500 Images, < 2 s) est faussée.
- **Correction proposée.** Définir deux prédicats dans le même composant : `visible` (consultation) et `reutilisable` (Images propres non `abandonnee`/`supprimee`, ou Images `versee`). Les exposer sous forme de **prédicats de requête** (Criteria/JPQL ou vue SQL) appliqués dans la requête, jamais comme filtre en mémoire. Préciser le sort des Images `supprimee` (pierre tombale renvoyée sans fichier).

### M2. AD-8 : la taille unique est reportée story par story, et le format et les métadonnées ne sont pas fixés
- **Constat.** AD-8 exige « une taille fixée unique », mais le report « fixées dans la story concernée » permet à chaque story (téléversement, photo, ARASAAC, Import) de choisir la sienne. Le format de stockage n'est pas fixé, alors que WebP et HEIC (photos iPhone) passent mal dans les .docx et .pptx. La suppression des métadonnées EXIF (position GPS des photos prises au marché) et la correction de l'orientation ne sont pas mentionnées.
- **Correction proposée.** Fixer dans AD-8 les valeurs (par exemple 1600 px sur le grand côté, et 400 × 400 pour `image_album`), les formats de sortie (PNG si transparence, sinon JPEG), la suppression des EXIF après rotation, et un composant unique `vocabulaire.service.ReductionImage`. Ne laisser en report que les plafonds de téléversement.

### M3. Configuration du realm Keycloak non versionnée
- **Constat.** Clients (front public avec PKCE, compte de service du back), rôle `admin`, durées de jeton et de session (30 jours), lien d'invitation de 7 jours, SMTP, thème français, console compte : rien ne dit comment le realm est créé. Le développement (Dev Services) et la production vont diverger, et les tests `@QuarkusTest` dépendront d'une configuration manuelle.
- **Correction proposée.** Fixer un « realm as code » : `deploiement/keycloak/corpus-mots-realm.json` importé au démarrage (`--import-realm`) et réutilisé par les Dev Services. Les secrets sont injectés par variables. Décider aussi si la console compte de Keycloak (`/auth/realms/…/account`) est exposée : si elle l'est, un enseignant peut changer son e-mail ou son nom hors de `comptes`.

### M4. AD-7 : chaîne de génération du client non fixée
- **Constat.** Le générateur (openapi-generator `typescript-angular`, ng-openapi-gen, orval…) n'est pas choisi. On ne sait pas si le client est versionné ou produit au build, ni qui le régénère, ni comment une dérive est détectée. Les points d'accès binaires (multipart pour l'Import et les photos, téléchargement .docx/.pptx) ne sont pas mentionnés.
- **Correction proposée.** Fixer : l'OpenAPI est exporté au build Maven, le client est généré par l'outil X dans `front/src/app/api`, il est versionné, et la CI échoue si la régénération produit un diff. Préciser le typage des réponses binaires (`Blob`) et des envois `multipart/form-data`.

### M5. Pas de convention de pagination, de tri et de filtres
- **Constat.** La Banque, Mes mots, les filtres combinés (FR-15), les listes de Préparations et le tableau de bord seront paginés par des stories différentes, avec des paramètres et des enveloppes de réponse différents.
- **Correction proposée.** Ajouter une ligne aux conventions : `?page=&taille=&tri=champ,asc` (ou par curseur) et une réponse `{ elements, total }`, avec des filtres en paramètres répétables (`?theme=…&section=GS`).

### M6. AD-1 non outillée ; types de retour des services et clés étrangères inter-modules non fixés
- **Constat.** Dans un seul module Maven, rien n'empêche un import interdit. Les services peuvent renvoyer des entités, ce qui fait fuir la couche persistance. AD-1 interdit les relations JPA entre modules, mais ne dit pas si des **clés étrangères SQL** existent entre tables de modules différents : certaines stories en mettront, d'autres non, avec des effets différents sur la suppression et la fusion.
- **Correction proposée.** Ajouter un test ArchUnit (dépendances entre paquetages selon le graphe, persistance privée, termes du domaine) dans la convention Tests. Imposer que les services n'exposent que des records définis dans `service`. Trancher : clés étrangères SQL autorisées entre modules (`ON DELETE RESTRICT`) ou interdites. La première option est recommandée pour l'intégrité.

### M7. Exploitation : mises à jour, supervision des sauvegardes, dimensionnement
- **Constat.** Rien sur :
  - les mises à jour du système hôte et des images (correctifs Keycloak et PostgreSQL), Renovate ou Dependabot ;
  - la montée de version majeure de PostgreSQL dans Docker ;
  - un dump avant chaque `compose up`, et le retour arrière en cas de migration Flyway ratée ;
  - une alerte si la sauvegarde nocturne échoue (la supervision externe est hors V1, donc un échec passe inaperçu) ;
  - le chiffrement du disque de sauvegarde ;
  - les politiques `restart:` et les healthchecks ;
  - la RAM du mini-PC, « non précisée » dans le memlog, alors que Keycloak, la JVM Quarkus, PostgreSQL et la génération POI en mémoire réclament plusieurs Go.
- **Correction proposée.** Ajouter au Structural Seed une ligne « Mises à jour » : procédure tag → dump → pull/up, retour arrière = restauration du dump, cadence mensuelle des correctifs, Renovate sur le dépôt. Ajouter une ligne « Sauvegarde » qui écrit un témoin de succès et un signal visible, par exemple une alerte dans le tableau de bord admin si la dernière sauvegarde a plus de 36 h. Ajouter les limites mémoire des conteneurs, et une question ouverte « RAM minimale de 8 Go ».

### M8. Normalisation : Java et `unaccent` peuvent diverger
- **Constat.** AD-10 impose une fonction Java unique, mais active aussi `unaccent`. Si une requête applique `unaccent(lower(…))` côté SQL, les deux normalisations diffèrent : `œ` devient `oe` avec `unaccent` mais reste `œ` après la décomposition NFD en Java. L'apostrophe typographique `’`, fréquente dans les .docx importés, n'est pas traitée (« l’arbre »).
- **Correction proposée.** Préciser que l'entrée de recherche est normalisée **par la même fonction Java** avant d'être comparée (`pg_trgm`) à `forme_normalisee`, et que `unaccent` n'est pas utilisé, ou bien l'utiliser des deux côtés via une fonction SQL unique. Lister dans la règle les ligatures (`œ`, `æ`), les apostrophes (`'`, `’`) et les espaces multiples.

### M9. Pas de donnée « dernière activité » ni de tâches planifiées
- **Constat.** FR-34 (enseignants actifs par mois) et FR-32 (compte inactif depuis plus d'un an) supposent un relevé d'activité. On ne sait pas s'il vient des événements Keycloak ou d'une colonne `derniere_activite` dans `Enseignant`, mise à jour par qui. Ce choix oppose `indicateurs` et `comptes`. Les tâches périodiques (comptes inactifs, brouillons d'Import abandonnés, nettoyage des Images `abandonnee`) n'ont pas de convention.
- **Correction proposée.** Fixer `comptes` comme propriétaire de l'activité : un filtre de requête met à jour `derniere_activite` au plus une fois par jour, et `indicateurs` lit par `comptes.service`. Ajouter une ligne aux conventions : « Tâches planifiées : `quarkus-scheduler`, dans le module propriétaire de la donnée, idempotentes ».

### M10. Statuts ADOPTED non conformes au memlog
- **Constat.** Le memlog indique pour le cycle de vie affiné (`abandonnee`, retrait admin `versee → privee`) « À confirmer par Paul ». L'état validé s'appelait `retiree`. AD-3 est pourtant marqué `[ADOPTED]`. AD-5 (`origine`, « déduit ») et l'anonymisation d'AD-6 (« distillation ») n'ont pas non plus de validation enregistrée.
- **Correction proposée.** Passer AD-3, la partie `origine` d'AD-5 et l'anonymisation d'AD-6 en `[PROPOSED]` jusqu'à confirmation, puis consigner la validation dans le memlog.

### M11. Origine de « les Albums où un Mot apparaît » non définie (FR-7, FR-8)
- **Constat.** Deux sources sont possibles : l'album d'origine des Images visibles, ou l'Album des Préparations (privées). FR-8 interdit de montrer les Albums où un collègue n'a utilisé le Mot que dans Mes mots. Une story qui dériverait les Albums des Préparations divulguerait cette information.
- **Correction proposée.** Ajouter à AD-2 : « Les Albums d'un Mot = albums d'origine de ses Images visibles, plus les Albums des Préparations **de l'enseignant courant** ».

---

## Basse

### L1. Incohérences dans les diagrammes et le seed
- Le diagramme de déploiement indique `pg_dump nocturne`, le texte `pg_dumpall`. Aligner sur `pg_dumpall`, qui inclut la base Keycloak.
- Le nœud `C` (Caddy) est déclaré hors du `subgraph MiniPC` (dans `BOX --> C[...]`). Selon la version de mermaid, il sera ou non dessiné dans le mini-PC. Le déclarer dans le subgraph.
- Le graphe AD-1 ne trace des arêtes vers `commun` que pour quatre modules, alors que tous peuvent en dépendre. Soit les tracer toutes, soit n'en tracer aucune et garder la phrase.
- La convention « dossiers front calqués sur les modules du back » ne correspond pas à l'arborescence (`banque/`, `administration/`, `photo/` n'existent pas côté back). Dire « par fonctionnalité » sans le mot « calqués ».
- L'ER ne représente ni les Sections (multi-valuées sur `IMAGE`, unique sur `PREPARATION`) ni le créateur d'un Album, d'un Module ou d'un Thème (FR-4, FR-5 : droit de modification).
- Syntaxe : les quatre diagrammes (graph TD, stateDiagram-v2, graph LR, erDiagram) sont valides.

### L2. Versions à confirmer au scaffolding
PostgreSQL 18.6 est probablement en avance sur le rythme trimestriel des versions mineures (18.4 ou 18.5 attendue fin 2026). Vérifier que la matrice de bases supportées de Keycloak 26.x inclut **PostgreSQL 18**, puisque la base est partagée avec Keycloak. Une LTS Quarkus plus récente (3.40, annoncée) peut exister, et Angular 23 est attendu en novembre 2026. Le reste (Java 25 LTS, Node 24 LTS, POI 5.5.x, Caddy 2.11, `uuidv7()` natif de PG 18) est plausible et cohérent.

### L3. Identifiants
« UUID générés par la base (`uuidv7()`) » contredit l'UUID d'`Enseignant`, qui est le `sub` de Keycloak. Préciser l'exception, et choisir entre une génération par la base et une génération Hibernate (`@UuidGenerator` v7) pour éviter un mélange.

### L4. Plafonds de téléversement transverses
Les plafonds de taille (Caddy `request_body`, `quarkus.http.limits.max-body-size`, multipart) forment une configuration partagée. La fixer à un seul endroit, même si les valeurs restent à définir.

### L5. Stockage et nettoyage d'`ImportBrouillon`
Où vivent les images extraites avant validation (bytea dans le brouillon ?) et quand un brouillon abandonné est-il purgé ? Le préciser dans AD-11.

### L6. Détails d'intégration derrière Caddy
Keycloak sous `/auth` exige `KC_HTTP_RELATIVE_PATH=/auth`, `KC_HOSTNAME` et `KC_PROXY_HEADERS=xforwarded`. Le conteneur `front` a besoin d'un serveur statique, ou bien Caddy sert directement le build. Pour un compte désactivé, le back devrait vérifier `Enseignant.actif`, car un jeton déjà émis reste valide jusqu'à son expiration. Le noter dans AD-6.

### L7. Le report « conditions ARASAAC » touche plus que les crédits
Si les conditions d'usage interdisent de stocker les pictogrammes, AD-9 (copie en base) tombe. Reformuler le report : « peut remettre en cause la copie d'AD-9 ».

### L8. Réversibilité
L'export de Mes mots (NFR §5) n'a pas de format. Une seule story le réalise, donc pas de risque de divergence. On peut néanmoins indiquer « ZIP : fichiers + `cartes.json`/CSV » pour cadrer la story.
