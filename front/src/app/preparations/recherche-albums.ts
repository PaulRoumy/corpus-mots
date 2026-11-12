/**
 * Réglages de la recherche d'Album par titre pendant la frappe, partagés par le Dialogue « Nouvelle préparation » et
 * le Dialogue « Téléverser une image » (mode Mes mots). Fichier sans dépendance : l'importer ne charge aucun dialogue.
 */

/** Délai de frappe avant de chercher les Albums, ou les titres proches du titre à créer. */
export const DELAI_RECHERCHE_ALBUMS_MS = 250;

/** Longueur minimale du texte cherché (le back applique la même, après normalisation). */
export const LONGUEUR_MIN_RECHERCHE = 2;

export const MESSAGE_AUCUN_ALBUM = 'Aucun album trouvé';
