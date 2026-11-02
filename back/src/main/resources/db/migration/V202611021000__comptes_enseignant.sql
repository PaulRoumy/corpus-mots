-- Enseignant (AD-6) : id = sub Keycloak, seule exception à uuidv7() ; e-mail, mot de passe et rôle restent
-- dans Keycloak. Le nom affiché est saisi par l'enseignant en créant son mot de passe : vide tant que invite.
CREATE TABLE enseignant (
    id uuid PRIMARY KEY,
    nom_affiche text,
    statut text NOT NULL,
    cree_le timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT enseignant_statut_valide
        CHECK (statut IN ('invite', 'actif', 'desactive', 'suppression_en_cours', 'supprime')),
    CONSTRAINT enseignant_nom_affiche_renseigne
        CHECK (statut = 'invite' OR nom_affiche IS NOT NULL)
);
