-- Story 1.6 : un invité peut être désactivé avant d'avoir saisi son nom ; réactivé, il redevient invité.
-- Le nom affiché reste obligatoire pour tout autre statut.
ALTER TABLE enseignant DROP CONSTRAINT enseignant_nom_affiche_renseigne;
ALTER TABLE enseignant ADD CONSTRAINT enseignant_nom_affiche_renseigne
    CHECK (statut IN ('invite', 'desactive') OR nom_affiche IS NOT NULL);
