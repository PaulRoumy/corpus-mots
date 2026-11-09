-- Préparation (FR-6) du module preparations : un Album et une Section, Module et Thème par défaut facultatifs.
-- proprietaire_id (comptes), album_id, module_id et theme_defaut_id (referentiels) sont des UUID d'autres modules,
-- sans clé étrangère (AD-1, AD-22) : preparations.service vérifie leur existence par referentiels.service.
CREATE TABLE preparation (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    proprietaire_id uuid NOT NULL,
    album_id uuid NOT NULL,
    section text NOT NULL,
    module_id uuid,
    theme_defaut_id uuid,
    cree_le timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT preparation_section_valide CHECK (section IN ('ps', 'ms', 'gs'))
);

-- Accueil (Préparations de l'enseignant, les plus récentes d'abord) et dernière Section utilisée.
CREATE INDEX preparation_proprietaire_recentes ON preparation (proprietaire_id, cree_le DESC);
