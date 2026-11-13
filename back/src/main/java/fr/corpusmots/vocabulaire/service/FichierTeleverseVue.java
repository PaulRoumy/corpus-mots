package fr.corpusmots.vocabulaire.service;

/**
 * Fichier téléversé prêt à enregistrer, produit hors transaction par {@link ReductionImages#preparerTeleversement} :
 * le type d'Image et la licence ({@code null} : non renseignée) lus dans la requête, et le fichier réduit pour ce type.
 */
public record FichierTeleverseVue(TypeImage typeImage, Licence licence, ImageReduiteVue fichier) {
}
