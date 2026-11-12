-- Images (AD-3, AD-4, AD-8) et leurs fichiers, du module vocabulaire.
-- proprietaire_id (comptes) et album_id (referentiels) sont des UUID d'autres modules, sans clé étrangère (AD-1,
-- AD-22) ; sens_id est une clé étrangère, à l'intérieur du module. L'état n'est modifié que par vocabulaire.service ;
-- version sert au verrouillage optimiste (@Version, AD-17), les transitions prennent aussi SELECT … FOR UPDATE.
CREATE TABLE image (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    proprietaire_id uuid NOT NULL,
    sens_id uuid NOT NULL REFERENCES sens (id),
    type_media text NOT NULL DEFAULT 'image',
    type_image text NOT NULL,
    licence text,
    source text,
    auteur text,
    album_id uuid,
    etat text NOT NULL DEFAULT 'privee',
    version bigint NOT NULL DEFAULT 0,
    cree_le timestamptz NOT NULL DEFAULT now(),
    modifie_le timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT image_type_media_valide CHECK (type_media IN ('image')),
    CONSTRAINT image_type_image_valide
        CHECK (type_image IN ('image_album', 'image_libre', 'photo_personnelle', 'inconnu')),
    CONSTRAINT image_licence_valide CHECK (licence IS NULL OR licence IN ('arasaac_cc_by_nc_sa', 'sclera_cc_by_nc',
        'mulberry_cc_by_sa', 'cc0_domaine_public', 'pixabay', 'autre_inconnue', 'droits_auteur_enseignant',
        'usage_pedagogique_album')),
    CONSTRAINT image_etat_valide CHECK (etat IN ('privee', 'versee', 'abandonnee', 'supprimee')),
    -- Une image d'album exige son Album d'origine (AD-4).
    CONSTRAINT image_album_requis CHECK (type_image <> 'image_album' OR album_id IS NOT NULL)
);

CREATE INDEX image_proprietaire ON image (proprietaire_id);
CREATE INDEX image_sens ON image (sens_id);

-- Fichier d'une Image, séparé d'image pour que les listes ne chargent jamais les octets (AD-8, AD-23) : l'image
-- réduite par ReductionImages (octets) et sa miniature, au même format (type_mime), sans métadonnées.
CREATE TABLE image_fichier (
    image_id uuid PRIMARY KEY REFERENCES image (id) ON DELETE CASCADE,
    octets bytea NOT NULL,
    miniature bytea NOT NULL,
    type_mime text NOT NULL,
    largeur integer NOT NULL,
    hauteur integer NOT NULL,
    CONSTRAINT image_fichier_type_mime_valide CHECK (type_mime IN ('image/jpeg', 'image/png')),
    CONSTRAINT image_fichier_dimensions_valides CHECK (largeur > 0 AND hauteur > 0)
);
