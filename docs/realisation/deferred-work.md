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
