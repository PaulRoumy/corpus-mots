-- Story 2.2, partie 2 : créateur d'un Module, seul avec l'administrateur à pouvoir le renommer ou le supprimer (FR-5).
-- createur_id désigne un Enseignant de comptes par son UUID, sans clé étrangère (AD-1, AD-22). NULL : Module inséré
-- avant cette migration, géré par l'administrateur seul.
ALTER TABLE module ADD COLUMN createur_id uuid;
