-- Identifiant du pictogramme ARASAAC d'une Image (story 2.11), du module vocabulaire. Posé à la création depuis un
-- pictogramme et jamais modifié ensuite : il identifie le fichier, que rien ne change. Sert à ne pas créer deux fois
-- l'Image d'un même pictogramme pour le même Mot et le même Sens (« déjà utilisée »). Null pour toute autre Image.
ALTER TABLE image
    ADD COLUMN arasaac_id bigint NULL,
    ADD CONSTRAINT image_arasaac_id_positif CHECK (arasaac_id IS NULL OR arasaac_id > 0);

-- Images ARASAAC déjà créées : l'identifiant est repris de la mention de source posée à la création
-- (« ARASAAC (https://arasaac.org), pictogramme n° <id> »), pour la seule licence ARASAAC.
UPDATE image
SET arasaac_id = substring(source FROM 'pictogramme n° ([0-9]{1,18})$')::bigint
WHERE arasaac_id IS NULL
  AND licence = 'arasaac_cc_by_nc_sa'
  AND source ~ 'pictogramme n° [0-9]{1,18}$'
  AND substring(source FROM 'pictogramme n° ([0-9]{1,18})$')::bigint > 0;

-- Recherche de l'Image d'un pictogramme que l'enseignant possède déjà.
CREATE INDEX image_proprietaire_arasaac ON image (proprietaire_id, arasaac_id) WHERE arasaac_id IS NOT NULL;
