-- Story 2.6, partie 3 : Sections d'une Image (FR-14), cochées librement par son propriétaire, aucune, une ou
-- plusieurs. Une ligne par Section ; image_id est une clé étrangère, à l'intérieur du module (AD-22). Écrites
-- uniquement par vocabulaire.service.Images.
CREATE TABLE image_section (
    image_id uuid NOT NULL REFERENCES image (id) ON DELETE CASCADE,
    section text NOT NULL,
    CONSTRAINT image_section_valide CHECK (section IN ('ps', 'ms', 'gs')),
    PRIMARY KEY (image_id, section)
);
