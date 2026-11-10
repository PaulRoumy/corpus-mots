-- Story 2.2, partie 3 : créateur d'un Thème, seul avec l'administrateur à pouvoir le renommer ou le supprimer (FR-5).
-- createur_id désigne un Enseignant de comptes par son UUID, sans clé étrangère (AD-1, AD-22). NULL : Thème inséré
-- avant cette migration, géré par l'administrateur seul.
ALTER TABLE theme ADD COLUMN createur_id uuid;
