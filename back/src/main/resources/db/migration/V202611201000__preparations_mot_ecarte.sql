-- Mots écartés de l'Encart « mots déjà illustrés » d'une Préparation (story 2.9). mot_id désigne un Mot de vocabulaire
-- par son UUID, sans clé étrangère (AD-1, AD-22). Écarter ne supprime rien de la banque ; la ligne suit sa Préparation
-- (ON DELETE CASCADE).
CREATE TABLE mot_ecarte (
    preparation_id uuid NOT NULL REFERENCES preparation (id) ON DELETE CASCADE,
    mot_id uuid NOT NULL,
    cree_le timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (preparation_id, mot_id)
);
