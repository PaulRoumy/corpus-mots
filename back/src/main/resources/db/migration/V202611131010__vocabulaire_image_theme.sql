-- Story 2.6, partie 3 : Thèmes d'une Image (FR-14), sans limite. theme_id désigne un Thème de referentiels par son
-- UUID, sans clé étrangère (AD-1, AD-22) : un Thème porté par une Image ne se supprime pas
-- (vocabulaire.service.ThemesDesImages, 409 theme.utilise) ; image_id est une clé étrangère, à l'intérieur du module.
CREATE TABLE image_theme (
    image_id uuid NOT NULL REFERENCES image (id) ON DELETE CASCADE,
    theme_id uuid NOT NULL,
    PRIMARY KEY (image_id, theme_id)
);

-- Vérification « Thème utilisé » à la suppression d'un Thème, sans parcourir toutes les Images.
CREATE INDEX image_theme_theme_idx ON image_theme (theme_id);
