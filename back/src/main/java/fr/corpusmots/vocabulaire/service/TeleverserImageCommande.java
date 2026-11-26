package fr.corpusmots.vocabulaire.service;

import fr.corpusmots.commun.service.Section;
import java.util.UUID;

/**
 * Image téléversée par l'enseignant courant : son fichier, déjà réduit par {@link ReductionImages#reduire} pour ce
 * type, le Sens {@code sensId} qu'elle illustre, son type, sa licence ({@code null} : non renseignée ; ignorée pour une
 * photo personnelle ou une image d'album, qui reçoivent la leur), sa source, son auteur, son Album d'origine
 * ({@code null} : aucun, refusé pour une image d'album ; ignoré pour un autre type) et la Section qu'elle vise
 * d'office ({@code null} : aucune ; la Section de la Préparation pour une Image créée depuis une Préparation,
 * story 2.11), et l'identifiant du pictogramme ARASAAC dont elle est créée ({@code null} : autre Image, story 2.11).
 */
public record TeleverserImageCommande(ImageReduiteVue fichier, UUID sensId, TypeImage typeImage, Licence licence,
        String source, String auteur, UUID albumId, Section section, Long arasaacId) {
}
