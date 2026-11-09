-- Story 2.2, partie 1 : « Temps passé » facultatif d'une Préparation (FR-6, bilan SM-3), saisi en heures par demi-heure
-- dans le front et enregistré en minutes. NULL : non renseigné. De 0 à 100 heures, par demi-heure.
ALTER TABLE preparation ADD COLUMN temps_passe_minutes integer;
ALTER TABLE preparation ADD CONSTRAINT preparation_temps_passe_borne
    CHECK (temps_passe_minutes IS NULL OR (temps_passe_minutes BETWEEN 0 AND 6000 AND temps_passe_minutes % 30 = 0));
