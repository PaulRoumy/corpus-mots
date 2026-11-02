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
