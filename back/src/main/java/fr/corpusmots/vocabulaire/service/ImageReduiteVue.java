package fr.corpusmots.vocabulaire.service;

/**
 * Fichier d'une Image produit par {@link ReductionImages#reduire} : l'image réduite ({@code octets}, de
 * {@code largeur} × {@code hauteur} px) et sa miniature, au même format {@code typeMime} ({@code image/png} si la
 * source a de la transparence, sinon {@code image/jpeg}), sans métadonnées.
 */
public record ImageReduiteVue(byte[] octets, byte[] miniature, String typeMime, int largeur, int hauteur) {
}
