-- Mots d'une Préparation (FR-6), dans l'ordre de saisie. mot_id désigne un Mot de vocabulaire par son UUID, sans
-- clé étrangère (AD-1, AD-22) ; le Sens retenu et les Images liées sont dans le registre de vocabulaire (AD-14).
-- La ligne suit sa Préparation (ON DELETE CASCADE). La suppression d'une Préparation (story 2.10) devra d'abord
-- libérer ses usages par vocabulaire.service.Usages.libererPreparation, avant d'effacer ses Mots avec elle.
CREATE TABLE preparation_mot (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    preparation_id uuid NOT NULL REFERENCES preparation (id) ON DELETE CASCADE,
    mot_id uuid NOT NULL,
    ordre integer NOT NULL,
    cree_le timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT preparation_mot_ordre_unique UNIQUE (preparation_id, ordre),
    CONSTRAINT preparation_mot_mot_unique UNIQUE (preparation_id, mot_id)
);
