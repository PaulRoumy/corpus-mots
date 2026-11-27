package fr.corpusmots.preparations.api;

import fr.corpusmots.preparations.service.UtiliserImageCommande;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/** Image de la Banque à utiliser dans une Préparation (story 3.4) : liée au Mot qu'elle illustre, ajouté au besoin. */
public record UtilisationImagePreparationDto(
        @Schema(required = true, description = "Image proposable à l'enseignant connecté : la sienne ou celle, versée,"
                + " d'un collègue") UUID imageId,
        @Schema(description = "Vrai pour remplacer l'Image déjà liée au Mot, qui est seulement déliée ; faux ou absent,"
                + " un Mot déjà illustré est refusé (409 preparation.mot_deja_illustre)") Boolean remplacer) {

    UtiliserImageCommande enCommande() {
        return new UtiliserImageCommande(imageId, Boolean.TRUE.equals(remplacer));
    }
}
