package fr.corpusmots.vocabulaire.service;

/**
 * Pictogramme ARASAAC téléchargé et réduit hors transaction par {@link SuggestionsArasaac#telecharger}, prêt à devenir
 * une Image : son fichier réduit, son type ({@code image_libre}), sa licence ({@code arasaac_cc_by_nc_sa}) et les
 * mentions de source et d'auteur qu'exige la licence ARASAAC.
 */
public record PictogrammeTelechargeVue(ImageReduiteVue fichier, TypeImage typeImage, Licence licence, String source,
        String auteur) {
}
