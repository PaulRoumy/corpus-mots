-- Story 2.3, partie 3 : Thème facultatif de chaque Mot d'une Préparation (FR-6), un seul, comme le Thème par défaut.
-- NULL : sans thème. theme_id désigne un Thème de referentiels par son UUID, sans clé étrangère (AD-1, AD-22) ; la
-- suppression d'un Thème le retire des Mots par preparations.service.ThemesDesPreparations, dans la même transaction.
ALTER TABLE preparation_mot ADD COLUMN theme_id uuid;
-- Retrait d'un Thème supprimé (PreparationMotRepository.retirerTheme) sans parcourir tous les Mots de Préparation.
CREATE INDEX preparation_mot_theme_idx ON preparation_mot (theme_id) WHERE theme_id IS NOT NULL;
