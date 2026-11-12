-- Liens d'Image du registre des usages (AD-14), écrits uniquement par vocabulaire.service.Usages dans la transaction
-- de preparations. preparation_id, preparation_mot_id (preparations), enseignant_id (comptes) et album_id
-- (referentiels) sont des UUID d'autres modules, sans clé étrangère (AD-1, AD-22) ; image_id en est une, à
-- l'intérieur du module. Album et Section sont copiés pour que le classement des propositions ne lise pas les tables
-- de preparations. origine : nouvelle (Image créée pour cette Préparation) ou reutilisee (Image existante).
CREATE TABLE lien_image (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    preparation_id uuid NOT NULL,
    preparation_mot_id uuid NOT NULL,
    image_id uuid NOT NULL REFERENCES image (id),
    enseignant_id uuid NOT NULL,
    album_id uuid NOT NULL,
    section text NOT NULL,
    origine text NOT NULL,
    cree_le timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT lien_image_section_valide CHECK (section IN ('ps', 'ms', 'gs')),
    CONSTRAINT lien_image_origine_valide CHECK (origine IN ('nouvelle', 'reutilisee')),
    -- Un Mot de Préparation a au plus une Image.
    CONSTRAINT lien_image_preparation_mot_unique UNIQUE (preparation_mot_id)
);

CREATE INDEX lien_image_image ON lien_image (image_id);
CREATE INDEX lien_image_preparation ON lien_image (preparation_id);
