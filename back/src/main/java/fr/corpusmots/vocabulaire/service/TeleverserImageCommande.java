package fr.corpusmots.vocabulaire.service;

import java.util.UUID;

/**
 * Image téléversée par l'enseignant courant : son fichier, déjà réduit par {@link ReductionImages#reduire} pour ce
 * type, le Sens {@code sensId} qu'elle illustre, son type, sa licence ({@code null} : non renseignée ; ignorée pour une
 * photo personnelle ou une image d'album, qui reçoivent la leur), sa source, son auteur et son Album d'origine
 * ({@code null} : aucun, refusé pour une image d'album).
 */
public record TeleverserImageCommande(ImageReduiteVue fichier, UUID sensId, TypeImage typeImage, Licence licence,
        String source, String auteur, UUID albumId) {
}
