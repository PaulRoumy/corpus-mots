-- Albums, Modules et Thèmes (FR-4, FR-5) du module referentiels, partagés par toute l'école.
-- createur_id désigne un Enseignant de comptes par son UUID, sans clé étrangère (AD-1, AD-22) ;
-- seule module.album_id est une clé étrangère, à l'intérieur du module.
-- titre_recherche = TitresAlbums.normaliser(titre) (minuscules, sans accents ni article initial), écrit par le
-- service : unaccent() n'étant pas IMMUTABLE, la forme normalisée est stockée et indexée en trigrammes.
CREATE TABLE album (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    titre text NOT NULL,
    titre_recherche text NOT NULL,
    auteur text NOT NULL,
    editeur text,
    createur_id uuid NOT NULL,
    cree_le timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT album_titre_renseigne CHECK (btrim(titre) <> ''),
    CONSTRAINT album_auteur_renseigne CHECK (btrim(auteur) <> '')
);

CREATE INDEX album_titre_recherche_trigrammes ON album USING gin (titre_recherche gin_trgm_ops);

-- Modules d'un Album, ordonnés (ajoutés en fin, story 2.2).
CREATE TABLE module (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    album_id uuid NOT NULL REFERENCES album (id),
    nom text NOT NULL,
    ordre integer NOT NULL,
    cree_le timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT module_nom_renseigne CHECK (btrim(nom) <> ''),
    CONSTRAINT module_ordre_unique UNIQUE (album_id, ordre)
);

-- Thèmes de l'école (cuisine, animaux…), de nom unique.
CREATE TABLE theme (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    nom text NOT NULL,
    cree_le timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT theme_nom_renseigne CHECK (btrim(nom) <> ''),
    CONSTRAINT theme_nom_unique UNIQUE (nom)
);
