-- Lexique (AD-10, AD-19) et registre des Sens retenus (AD-14) du module vocabulaire.
-- Mots et Sens n'ont pas de propriétaire ; ils ne sont créés que par Lexique.obtenirOuCreerMot et
-- obtenirOuCreerSens (INSERT … ON CONFLICT DO NOTHING, puis relecture), d'où les contraintes d'unicité.

-- forme = première saisie normalisée par Lexique.normaliser (sans article) ; forme_cle = forme en minuscules NFC,
-- accents gardés (côte et côté sont deux Mots) ; forme_recherche = unaccent(forme_cle), calculée à l'insertion
-- (unaccent() n'étant pas IMMUTABLE, elle est stockée) et indexée en trigrammes pour la détection.
CREATE TABLE mot (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    forme text NOT NULL,
    forme_cle text NOT NULL,
    forme_recherche text NOT NULL,
    cree_le timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT mot_forme_renseignee CHECK (btrim(forme) <> ''),
    CONSTRAINT mot_forme_cle_unique UNIQUE (forme_cle)
);

CREATE INDEX mot_forme_recherche_trigrammes ON mot USING gin (forme_recherche gin_trgm_ops);

-- Sens d'un Mot ; libelle_cle = libellé normalisé (Lexique), unique par Mot. categorie absente : Sens « à compléter ».
CREATE TABLE sens (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    mot_id uuid NOT NULL REFERENCES mot (id),
    libelle text NOT NULL,
    libelle_cle text NOT NULL,
    categorie text,
    cree_le timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT sens_libelle_renseigne CHECK (btrim(libelle) <> ''),
    CONSTRAINT sens_libelle_unique UNIQUE (mot_id, libelle_cle)
);

-- Sens retenu pour un Mot d'une Préparation, écrit par Usages.retenirSens dans la transaction de preparations.
-- preparation_id, preparation_mot_id (preparations), enseignant_id (comptes) et album_id (referentiels) sont des UUID
-- d'autres modules, sans clé étrangère (AD-1, AD-22) ; seule sens_id en est une, à l'intérieur du module.
CREATE TABLE sens_retenu (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    preparation_id uuid NOT NULL,
    preparation_mot_id uuid NOT NULL,
    sens_id uuid NOT NULL REFERENCES sens (id),
    enseignant_id uuid NOT NULL,
    album_id uuid NOT NULL,
    section text NOT NULL,
    cree_le timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT sens_retenu_section_valide CHECK (section IN ('ps', 'ms', 'gs')),
    CONSTRAINT sens_retenu_preparation_mot_unique UNIQUE (preparation_mot_id)
);

-- Sens le plus récemment retenu par un enseignant (Usages.retenirSens) ; Sens d'un Mot (jointure sur sens).
CREATE INDEX sens_retenu_enseignant_recents ON sens_retenu (enseignant_id, cree_le DESC);
CREATE INDEX sens_retenu_preparation ON sens_retenu (preparation_id);
CREATE INDEX sens_mot ON sens (mot_id);
