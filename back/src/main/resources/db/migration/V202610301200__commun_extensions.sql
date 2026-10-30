-- Extensions utilisées par la recherche des Mots (AD-10) : unaccent pour forme_recherche,
-- pg_trgm pour son index de similarité.
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
