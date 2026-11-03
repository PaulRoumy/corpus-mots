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
