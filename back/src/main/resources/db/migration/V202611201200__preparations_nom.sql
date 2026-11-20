-- Story 2.10 : nom propre facultatif d'une Préparation (« Renommer »). NULL : sans nom, l'accueil et l'En-tête
-- affichent le titre de l'Album. preparations.service le nettoie (espaces aux bords et doublés retirés) ; un nom vide
-- est enregistré NULL.
ALTER TABLE preparation ADD COLUMN nom text;
ALTER TABLE preparation ADD CONSTRAINT preparation_nom_longueur
    CHECK (nom IS NULL OR char_length(nom) BETWEEN 1 AND 100);
