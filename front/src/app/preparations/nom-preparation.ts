/**
 * Nom affiché d'une Préparation (story 2.10), partagé par l'accueil et la page de la Préparation : son nom propre s'il
 * en a un, sinon le titre de son Album. Fichier sans dépendance : l'importer ne charge aucun composant.
 */

/** Longueur maximale du nom d'une Préparation, une fois nettoyé (le back applique la même). */
export const LONGUEUR_MAX_NOM_PREPARATION = 100;

/** Nom propre s'il y en a un, sinon titre de l'Album. */
export function nomPreparation(preparation: {
  readonly nom?: string | null;
  readonly titreAlbum: string;
}): string {
  return preparation.nom ?? preparation.titreAlbum;
}

/** Nom nettoyé comme par le back : espaces aux bords retirées, espaces consécutives réduites à une. */
export function nettoyerNomPreparation(nom: string): string {
  return nom.trim().replace(/\s+/g, ' ');
}
