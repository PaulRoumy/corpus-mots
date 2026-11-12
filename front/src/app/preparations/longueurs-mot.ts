/**
 * Longueurs de la saisie d'un Mot, partagées par la saisie rapide et le Dialogue « Téléverser une image » (mode Mes
 * mots). Fichier sans dépendance : l'importer ne charge aucun composant.
 */

/** Longueur maximale d'un Mot, une fois la saisie normalisée (le back applique la limite exacte). */
export const LONGUEUR_MAX_MOT = 100;

/** Longueur maximale du champ : un Mot de 100 caractères précédé de l'article le plus long et d'une espace (« une »). */
export const LONGUEUR_MAX_SAISIE = LONGUEUR_MAX_MOT + 'une '.length;
