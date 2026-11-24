-- Retrait d'une Image de la Banque par l'administrateur (AD-3), du module vocabulaire. Écrit par la modération
-- (Epic 6) ; tant que retrait_admin_motif est renseigné, le versement est refusé (image.versement.retrait_admin). Toute
-- modification effective de la Carte d'identité par le propriétaire vide les deux colonnes (vocabulaire.service).
ALTER TABLE image
    ADD COLUMN retrait_admin_motif text NULL,
    ADD COLUMN retrait_admin_texte text NULL,
    ADD CONSTRAINT image_retrait_admin_motif_valide CHECK (retrait_admin_motif IS NULL
        OR retrait_admin_motif IN ('licence_non_conforme', 'image_album', 'image_inadaptee', 'autre')),
    -- Le motif « autre » exige un texte non vide (AD-3).
    ADD CONSTRAINT image_retrait_admin_texte_autre CHECK (retrait_admin_motif IS DISTINCT FROM 'autre'
        OR (retrait_admin_texte IS NOT NULL AND btrim(retrait_admin_texte) <> '')),
    -- Pas de texte sans motif.
    ADD CONSTRAINT image_retrait_admin_texte_sans_motif CHECK (retrait_admin_motif IS NOT NULL
        OR retrait_admin_texte IS NULL);
