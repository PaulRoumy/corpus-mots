-- Story 2.6, partie 3 : Module facultatif d'une Image (FR-14), de n'importe quel Album, indépendant du type et de
-- l'Album d'origine. NULL : sans Module. module_id désigne un Module de referentiels par son UUID, sans clé étrangère
-- (AD-1, AD-22) ; la suppression d'un Module le retire des Images par vocabulaire.service.ModulesDesImages, dans la
-- même transaction (AD-15).
ALTER TABLE image ADD COLUMN module_id uuid;

-- Retrait d'un Module supprimé (ImageRepository.retirerModule) sans parcourir toutes les Images.
CREATE INDEX image_module_idx ON image (module_id) WHERE module_id IS NOT NULL;
