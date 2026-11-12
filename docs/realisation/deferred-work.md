# Travail reporté

- source_spec: `docs/realisation/spec-1-1-socle-de-l-application-deployable.md`
  summary: Ajouter une règle ArchUnit de couches internes à chaque module (api → service → persistance, api ne touche pas persistance).
  evidence: Le paradigme de l'architecture décrit ces couches, mais aucun test ne les fige (revue story 1.1, constat 8).
- source_spec: `docs/realisation/spec-1-1-socle-de-l-application-deployable.md`
  summary: Étendre l'unicité AD-16 à tous les types exposés par l'API REST (énumérations, records), pas seulement aux classes `*Dto`.
  evidence: Deux énumérations homonymes dans deux modules produiraient deux schémas OpenAPI en conflit sans faire échouer `nomsDeDtoUniques` (revue story 1.1, constat 9).
- source_spec: `docs/realisation/spec-1-1-socle-de-l-application-deployable.md`
  summary: Ajouter des en-têtes de sécurité (HSTS, X-Content-Type-Options, CSP stricte) au Caddyfile public.
  evidence: `deploiement/Caddyfile` n'en pose aucun ; une CSP stricte vérifierait aussi l'absence de ressources tierces (revue story 1.1, constat 15).
- source_spec: `docs/realisation/spec-1-1-socle-de-l-application-deployable.md`
  summary: Vérifier l'import du realm Keycloak (placeholders SMTP `${env.X}` résolus) sur un Keycloak réel.
  evidence: Non exécuté pendant la story 1.1 faute de moteur de conteneurs ; à faire avec la story 1.3 (revue story 1.1, constat 21).
- source_spec: `docs/realisation/spec-1-2-sauvegarde-nocturne-de-la-base.md`
  summary: Alerter Paul quand la sauvegarde échoue ou n'a pas réussi depuis plus d'un jour (unité `OnFailure=`, e-mail par le relais SMTP, ou indicateur au tableau de bord de l'Epic 6).
  evidence: Seul le fichier d'état trace l'échec ; NFR-8 exige au moins une sauvegarde par jour sans moyen d'être prévenu (revue story 1.2, constat 6).
- source_spec: `docs/realisation/spec-1-2-sauvegarde-nocturne-de-la-base.md`
  summary: Ajouter à `AGENTS.md` (« Lancer et vérifier ») le test `sh deploiement/tests/sauvegarde.test.sh` et `shellcheck`.
  evidence: Commandes exécutées par la CI mais absentes des instructions des agents (revue story 1.2, constat 17).
- source_spec: `docs/realisation/spec-1-3-premier-administrateur-et-connexion.md`
  summary: Tester `IdentitesKeycloak` contre un vrai Keycloak (409 → `IdentiteDejaExistante`, suppression tolérant 404, actions et durée de l'e-mail d'invitation).
  evidence: Tous les tests remplacent Keycloak par `IdentitesFactices` ; circuit vérifié à la main avec `compose.dev.yaml` (revue story 1.3, constat 2). Utile avant la story 1.5, qui réutilise l'adaptateur.
- source_spec: `docs/realisation/spec-1-3-premier-administrateur-et-connexion.md`
  summary: Décrire dans le contrat OpenAPI les réponses d'erreur (`401`, `403`, `ProblemeDto`) pour que le front lise `code` par un type généré.
  evidence: `accueil.ts` lit `erreur.error?.code` sans type ; aucune réponse d'erreur dans `front/openapi/` depuis 1.1 (revue story 1.3, constat 21). À traiter avec le service de traduction des codes (story 1.4).
- source_spec: `docs/realisation/spec-1-3-premier-administrateur-et-connexion.md`
  summary: Refuser au démarrage les secrets restés à `a-remplacer` ou trop courts dans `deploiement/.env` (dont `KEYCLOAK_BACK_SECRET`).
  evidence: `${VAR:?}` accepte la valeur du modèle ; le compte de service `corpus-mots-back` a `manage-users` (revue story 1.3, constat 27).
- source_spec: `docs/realisation/spec-1-3-premier-administrateur-et-connexion.md`
  summary: Ajouter le lien « Données personnelles » aux pages Keycloak (Connexion, Créer mon mot de passe, Mot de passe oublié) par surcharge du gabarit du thème.
  evidence: UX-DR-39 ; la page n'existe pas encore : à faire avec la story 1.7 (revue story 1.3, constat 23).
  status: fait (story 1.7, partie 2, `footer.ftl` du thème corpus-mots).
- source_spec: none
  summary: Story 1.4, seconde partie : composants partagés de `commun/` (Bandeau « Annuler », Bandeau d'erreur, Dialogue de confirmation, squelettes de chargement, avec leurs tests de composant) et service qui traduit chaque `code` d'erreur du back en message français.
  evidence: Découpage de la story 1.4 décidé par Paul (2026-11-03) : la coquille et le système de design partent d'abord ; ces composants ne servent qu'à partir de la story 1.5 et doivent être livrés avant elle.
- source_spec: `docs/realisation/spec-1-4-2-composants-partages-et-messages-d-erreur.md`
  summary: Lire le `code` d'erreur d'une réponse `Blob` ou texte (téléchargement des Fiches et des archives) avant d'appeler `messageErreur`.
  evidence: `codeErreur` ne lit qu'un corps JSON déjà décodé ; avec `responseType: 'blob'`, le message retombe sur le statut (revue story 1.4.2, constat 5). À faire avec les exports (Epic 4).
- source_spec: `docs/realisation/spec-1-4-2-composants-partages-et-messages-d-erreur.md`
  summary: Vérifier avec un lecteur d'écran (NVDA) que le squelette annonce « Chargement » et qu'une page à plusieurs squelettes ne multiplie pas les annonces.
  evidence: Région `role="status"` insérée déjà remplie (revue story 1.4.2, constat 12) ; à faire au premier écran qui l'utilise (story 1.5).
- source_spec: `docs/realisation/spec-1-4-2-composants-partages-et-messages-d-erreur.md`
  summary: Conserver la saisie en cours quand la session expire (Connexion puis retour à la même page), comme le promet le message de `authentification.requise`.
  evidence: Depuis la story 1.3, `Authentification` redirige vers Keycloak et la page se recharge : la saisie est perdue (revue story 1.4.2, constat 15 ; EXPERIENCE.md › State Patterns, session expirée).
- source_spec: `docs/realisation/spec-1-5-inviter-un-collegue.md`
  summary: Tester aussi `IdentitesKeycloak.lister()` contre un vrai Keycloak : plus de 100 utilisateurs (pages), membres du rôle `admin` marqués administrateurs.
  evidence: Tous les tests passent par `IdentitesFactices` (revue story 1.5, constat 1) ; à joindre au test de l'adaptateur déjà reporté (spec 1.3).
- source_spec: none
  summary: Story 1.6, deuxième partie : tâche planifiée de `comptes` (au démarrage puis chaque heure) qui rejoue les étapes Keycloak restées en échec et supprime les utilisateurs Keycloak sans `Enseignant` (AD-18).
  evidence: Découpage de la story 1.6 décidé par Paul (2026-11-03) : les actions sur les comptes partent d'abord ; la réconciliation est à livrer avant le déploiement (un utilisateur Keycloak orphelin bloque sinon son adresse, revue story 1.5).
- source_spec: none
  summary: Story 1.6, troisième partie : annuaire `GET /api/enseignants` (`id`, `nomAffiche`, `statut`, comptes `invite` exclus) et son cache front `commun/annuaire` (AD-20).
  evidence: Découpage de la story 1.6 décidé par Paul (2026-11-03) : aucun écran ne l'utilise avant l'Epic 3 ; à livrer avant lui.
- source_spec: `docs/realisation/spec-1-6-gerer-les-comptes-de-l-equipe.md`
  summary: Tester aussi contre un vrai Keycloak `desactiver` (`enabled=false` puis révocation des sessions), `reactiver`, `retirerRoleAdministrateur` et `administrateursActives` (membres activés du rôle `admin`, pages).
  evidence: Tous les tests passent par `IdentitesFactices` (revue story 1.6, constat 2) ; la règle du dernier administrateur dépend de cette lecture. À joindre au test de l'adaptateur reporté (specs 1.3 et 1.5).
- source_spec: `docs/realisation/spec-1-6-gerer-les-comptes-de-l-equipe.md`
  summary: La tâche de réconciliation (story 1.6, partie 2) doit aussi corriger le sens inverse : Keycloak modifié (désactivé, réactivé) mais statut non écrit en base.
  evidence: Désactiver ou réactiver appelle Keycloak puis écrit la base ; si l'écriture échoue, les deux divergent jusqu'au rejeu manuel (revue story 1.6, constat 4).
- source_spec: `docs/realisation/spec-1-6-2-reconciliation-des-comptes.md`
  summary: Le circuit de suppression de compte (Epic 6) doit laisser, s'il s'interrompt après Keycloak `enabled=false`, un état que `ReconciliationComptes` distingue d'une désactivation interrompue (sinon l'effacement RGPD est achevé en simple désactivation, sans trace).
  evidence: Revue story 1.6, partie 2, constat 9 : Keycloak désactivé et Enseignant encore `actif` est aujourd'hui corrigé en `desactive` ; à vérifier quand AD-18 §1 sera implémenté.

- source_spec: none
  summary: Story 1.7, partie 2 : page « Données personnelles » accessible sans connexion et depuis Mes données, lien depuis les pages Keycloak, vérification de l'absence de traceur (NFR-13).
  evidence: Découpage de la story 1.7 choisi par Paul ; la page publique impose une entrée hors de la connexion forcée au démarrage, indépendante de Mon compte (partie 1).
  status: fait (`docs/realisation/spec-1-7-2-donnees-personnelles.md`).
- source_spec: `docs/realisation/spec-1-7-2-donnees-personnelles.md`
  summary: Relire la page Données personnelles à la story 6.8 (périmètre réel, réponse à Q-3).
  evidence: Le texte (`front/src/app/compte/donnees-personnelles.ts`) décrit le périmètre prévu de la V1 (Images et leur auteur, Préparations, historique des Fiches, notifications, mois d'activité, sort des Images versées après suppression) et annonce une durée de conservation « en cours de validation avec le délégué à la protection des données ».
- source_spec: `docs/realisation/spec-1-7-2-donnees-personnelles.md`
  summary: Vérifier en CI que les pages Keycloak rendues (thème corpus-mots) portent le lien « Données personnelles » vers `/donnees-personnelles`.
  evidence: Revue story 1.7, partie 2, constat 13 : seul un contrôle à la main l'a vu ; un renommage de `footer.ftl`, de la macro `content` ou de la clé `donneesPersonnelles`, ou une montée de version de keycloak.v2, le ferait disparaître sans échec de la CI. Piste : Keycloak 26.8 en `start-dev` dans le job `configuration`, puis `curl` de la page de connexion.
- source_spec: `docs/realisation/spec-1-7-2-donnees-personnelles.md`
  summary: Décider si le prénom et le nom saisis à l'activation (profil Keycloak) restent gardés, et mettre FR-3 ou le profil Keycloak en accord.
  evidence: Revue story 1.7, partie 2, constat 8 : FR-3 limite le compte à nom affiché, e-mail, mot de passe et rôle ; la page Données personnelles déclare aussi le prénom et le nom.
- source_spec: `docs/realisation/spec-1-7-2-donnees-personnelles.md`
  summary: Inspecter aussi les bundles `*.js` du front pour des URL externes chargées à l'exécution (`fetch`, `import()`), avec une liste d'exceptions pour les URL de documentation d'Angular.
  evidence: Revue story 1.7, partie 2, constat 6 : le contrôle de la CI ne lit que `*.html` et `*.css` (et le thème) depuis la story 1.4.
- source_spec: `docs/realisation/spec-2-1-creer-une-preparation-pour-un-album.md`
  summary: Story 2.1, partie 2 : « Créer l'album » dans le Dialogue « Nouvelle préparation » (titre, auteur, éditeur facultatif), signalement des titres proches (casse, accents, article, trigramme) avec choix de l'existant, et refus `409 album.deja_existant` d'un Album de même titre et même auteur normalisés (décision de Paul).
  evidence: Découpage de la story 2.1 choisi par Paul (spec d'environ 4 500 tokens) ; la partie 1 livre la Préparation sur un Album existant, la création d'Album s'y ajoute sans la modifier.
  status: fait (`docs/realisation/spec-2-1-2-creer-un-album.md`).
- source_spec: `docs/realisation/spec-2-1-creer-une-preparation-pour-un-album.md`
  summary: Dialogue « Nouvelle préparation » : une erreur par source (recherche, Modules, Thèmes, création), réessais liés à l'Album et au texte courants, et tests des chemins d'échec de la recherche, des Modules et des Thèmes.
  evidence: Revue de la story 2.1, partie 1, lignes 9 et 21 du journal de tri. Le signal unique `erreur` est effacé par une recherche réussie, si bien qu'un échec du chargement des Thèmes laisse le champ masqué sans « Réessayer ». Un réessai du chargement des Modules après un changement d'Album affiche les Modules de l'ancien Album. Aucun test ne fait échouer `rechercherAlbums`, `listerModulesDeLAlbum` ni `listerThemes`. À reprendre avec la partie 2, qui retravaille le champ Album.
  status: fait (`docs/realisation/spec-2-1-2-creer-un-album.md`).
- source_spec: `docs/realisation/spec-2-1-2-creer-un-album.md`
  summary: Fixer par des tests le seuil des titres proches (0,4) et leur ordre complet (similarité, puis titre), avec un Album juste sous le seuil.
  evidence: Revue de la story 2.1, partie 2, ligne 21 du journal de tri : remplacer `SEUIL_PROCHE` par `SEUIL_SIMILARITE` ou retirer le départage par titre ne ferait échouer aucun test. Il faut des données dont la similarité trigramme a été mesurée.
- source_spec: `docs/realisation/spec-2-2-en-tete-de-preparation-modifiable.md`
  summary: Story 2.2, partie 2 : Modules. « Nouveau module » depuis l'En-tête et le Dialogue « Nouvelle préparation », ajouté en fin d'Album et visible aussitôt de tous ; renommer ou supprimer, réservé au créateur et à l'administrateur (`403` pour les autres) ; événement synchrone `ModuleSupprime`, observé par `preparations`, qui retire le Module de ses Préparations dans la même transaction.
  evidence: Découpage de la story 2.2 choisi par Paul (quatre objectifs livrables séparément) ; la partie 1 rend l'En-tête modifiable, qui sert de cadre.
  status: fait (`docs/realisation/spec-2-2-2-modules.md`).
- source_spec: `docs/realisation/spec-2-2-en-tete-de-preparation-modifiable.md`
  summary: Story 2.2, partie 3 : Thèmes. Champ à étiquettes (UX-DR-17) qui propose les Thèmes existants, « Créer le thème « … » » pour toute l'école, Entrée pour ajouter, Retour arrière pour retirer ; renommer ou supprimer, réservé au créateur et à l'administrateur (`403`) ; suppression refusée si le Thème est encore utilisé, par les interfaces `…Utilisation` des modules aval (AD-15).
  evidence: Découpage de la story 2.2 choisi par Paul.
  status: fait (`docs/realisation/spec-2-2-3-themes.md`).
- source_spec: `docs/realisation/spec-2-2-en-tete-de-preparation-modifiable.md`
  summary: Story 2.2, partie 4 : « Corriger l'album » dans le menu de l'En-tête, réservé au créateur de l'Album et à l'administrateur, pour modifier le titre, l'auteur et l'éditeur ; la correction se voit partout.
  evidence: Découpage de la story 2.2 choisi par Paul.
  status: fait (`docs/realisation/spec-2-2-4-corriger-l-album.md`).
- source_spec: `docs/realisation/spec-2-2-en-tete-de-preparation-modifiable.md`
  summary: Story 2.3 : brancher `Usages.changerContextePreparation` sur le changement de Module dans `PreparationsService.regler`.
  evidence: Revue de la story 2.2, partie 1, ligne 12 du journal de tri. `Usages` n'existait pas avant la story 2.3, et l'appel prévu par AD-14 et par le critère de la story 2.2 n'est pas fait.
  status: sans objet (`docs/realisation/spec-2-3-saisir-des-mots-en-serie.md`, Design Notes) : `sens_retenu` n'a pas de colonne Module (AD-14), un changement de Module ne touche aucun usage ; `changerContextePreparation` (Album, Section) attend son premier appelant, la duplication (story 2.10).
- source_spec: `docs/realisation/spec-2-2-en-tete-de-preparation-modifiable.md`
  summary: Story 2.2, partie 2 : après `preparation.module_invalide` dans l'En-tête, recharger la liste des Modules et retirer le Module disparu, au lieu de renvoyer la même valeur.
  evidence: Revue de la story 2.2, partie 1, ligne 17 du journal de tri. Une fois un Module supprimé, « Réessayer » renverrait le même Module invalide, et tout enregistrement suivant échouerait.
  status: fait (`docs/realisation/spec-2-2-2-modules.md`).
- source_spec: `docs/realisation/spec-2-2-2-modules.md`
  summary: Page Données personnelles : déclarer les Albums, les Modules et les Thèmes créés par l'enseignant, et le lien au créateur gardé sur eux (`album.createur_id`, `module.createur_id`, `theme.createur_id` depuis la story 2.2, partie 3), visible des collègues par `createurId`.
  evidence: Revue de la story 2.2, partie 2, ligne 13 du journal de tri. AGENTS.md demande cette mise à jour quand les données conservées changent ; `donnees-personnelles.ts` ne cite que les Préparations, et l'oubli date de la story 2.1.
- source_spec: `docs/realisation/spec-2-2-3-themes.md`
  summary: Story 2.6 : quand `vocabulaire` implémentera `UtilisationThemes`, empêcher qu'une Image reçoive un Thème en cours de suppression (verrou partagé entre la vérification `theme.utilise` et l'affectation).
  evidence: Revue de la story 2.2, partie 3, ligne 10 du journal de tri (non vérifié, gravité moyenne si confirmé) : `supprimerTheme` interroge les utilisations sans verrou ; aucune affectation n'existe encore pour le démontrer.
- source_spec: none
  summary: Story 2.3, partie 2 : retirer un Mot de la Préparation sans confirmation, Bandeau « Annuler » de 8 s, Mot libéré par `Usages.libererPreparationMot`, et « Annuler » qui le rétablit avec son Sens (et sa place).
  evidence: Découpage de la story 2.3 choisi par Paul (trois objectifs livrables séparément) ; la partie 1 pose la saisie, le Lexique, `Usages` et la Grille.
  status: fait (`docs/realisation/spec-2-3-2-retirer-un-mot.md`).
- source_spec: none
  summary: Story 2.3, partie 3 : Thème de chaque Mot, prérempli par le Thème par défaut de la Préparation et modifiable mot par mot (FR-6) ; stockage dans `preparation_mot` et retrait par `ThemesDesPreparations` à la suppression du Thème ; interface à concevoir (aucune maquette ne la décrit).
  evidence: Découpage de la story 2.3 choisi par Paul ; ni l'architecture ni l'UX ne fixent où vit le Thème d'un Mot ni comment le changer sur une Carte.
- source_spec: `docs/realisation/spec-2-3-saisir-des-mots-en-serie.md`
  summary: Story 2.10 : supprimer une Préparation appelle d'abord `Usages.libererPreparation`, pour ne laisser aucun `sens_retenu` (ni `lien_image`) orphelin ; la cascade de `preparation_mot` ne touche pas les tables de `vocabulaire`.
  evidence: Revue de la story 2.3, partie 1, ligne 8 du journal de tri : des `sens_retenu` orphelins garderaient `enseignant_id` et continueraient d'alimenter le Sens « le plus récent ».
- source_spec: `docs/realisation/spec-2-3-saisir-des-mots-en-serie.md`
  summary: Epic 6 : la fusion d'Albums (`AlbumsFusionnes`) réécrit aussi `sens_retenu.album_id` (et `lien_image.album_id`), copiés depuis la Préparation.
  evidence: Revue de la story 2.3, partie 1, ligne 9 du journal de tri : seule la réécriture de `preparation.album_id` est prévue aujourd'hui.
- source_spec: `docs/realisation/spec-2-3-2-retirer-un-mot.md`
  summary: Story 2.4 : `Usages.libererPreparationMot` supprime aussi le `lien_image` du Mot de Préparation, et le rétablissement par « Annuler » rétablit son Image.
  evidence: Revue de la story 2.3, partie 2, ligne 16 du journal de tri : seul un commentaire Javadoc le prévoit aujourd'hui.
- source_spec: `docs/realisation/spec-2-3-3-theme-de-chaque-mot.md`
  summary: Thème supprimé en même temps qu'il est écrit sur un Mot de Préparation (ajout, changement, rétablissement) ou comme Thème par défaut : verrou partagé côté `referentiels` (`SELECT … FOR SHARE` sur `theme`) pris par `preparations` avant d'écrire, à traiter avec l'entrée de la story 2.6 sur `UtilisationThemes`.
  evidence: Revue de la story 2.3, partie 3, ligne 9 du journal de tri : sans clé étrangère (AD-1), un `theme_id` orphelin reste en base, affiché « Sans thème ».
- source_spec: none
  summary: Story 2.4, partie 2 : choisir un pictogramme ARASAAC crée l'Image (téléchargement hors transaction, `ReductionImages`, `image` et `image_fichier`, état `privee`, licence `arasaac_cc_by_nc_sa`), la lie au Mot par `Usages.lierImage` (origine `nouvelle`, verrou sur l'Image), et la Carte affiche la vignette servie en blob par `commun/image-securisee` (`?taille=miniature`, `Cache-Control`, `ETag`), avec `VisibiliteImages` et ses trois prédicats testés.
  evidence: Découpage de la story 2.4 choisi par Paul ; la partie 1 pose les suggestions ARASAAC dans la Carte par le proxy de `vocabulaire`.
- source_spec: `docs/realisation/spec-2-4-suggestions-arasaac.md`
  summary: Cache court des recherches (par `forme`) et des PNG (par identifiant) d'ARASAAC, et plafond d'appels sortants simultanés, une fois les conditions d'usage de l'API connues (Q-2).
  evidence: Revue de la story 2.4, partie 1, ligne 12 du journal de tri : chaque Carte « à illustrer » fait 1 + 3 appels bloquants (jusqu'à 3 s) à chaque affichage.
- source_spec: `docs/realisation/spec-2-4-suggestions-arasaac.md`
  summary: Story 2.4, partie 2 : une Carte illustrée n'interroge pas ARASAAC et occupe une seule colonne ; décider du placement des Cartes « à illustrer » sur 3 colonnes parmi les Cartes illustrées (trous de la Grille), et tester `illustre: true` dans `carte-mot.spec.ts` et `preparation.spec.ts`.
  evidence: Revue de la story 2.4, partie 1, ligne 13 du journal de tri : `grid-column: span 3` avec `auto-fill` laisse des cellules vides en fin de ligne.
- source_spec: none
  summary: Story 2.5, partie 2 : « + › Ajouter une image » ouvre le même téléversement avec la saisie du Mot (normalisé comme en story 2.3), et l'Image est enregistrée dans Mes mots sans lien vers une Préparation.
  evidence: Découpage de la story 2.5 choisi par Paul ; la partie 1 pose le téléversement depuis la Carte « à illustrer » et les fondations de l'Image.
  status: fait (`docs/realisation/spec-2-5-2-ajouter-une-image.md`).
- source_spec: none
  summary: Story 2.7 : le Panneau de choix d'Image propose « Téléverser » (« Ajouter une image ») avec le formulaire de la story 2.5.
  evidence: Critère de la story 2.5 qui dépend d'un Panneau livré par la story 2.7.
