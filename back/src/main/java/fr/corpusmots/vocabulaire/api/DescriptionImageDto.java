package fr.corpusmots.vocabulaire.api;

import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/**
 * Description d'une Image, modifiée par son propriétaire : type, licence, source, auteur et Album d'origine. Les cinq
 * valeurs remplacent ensemble celles de l'Image ; une valeur absente efface la valeur enregistrée.
 */
public record DescriptionImageDto(
        @Schema(required = true, enumeration = { "image_album", "image_libre", "photo_personnelle", "inconnu" })
        String typeImage,
        @Schema(nullable = true, description = "Licence, facultative ; ignorée pour une photo personnelle ou une image"
                + " d'album, qui reçoivent la leur", enumeration = { "arasaac_cc_by_nc_sa", "sclera_cc_by_nc",
                        "mulberry_cc_by_sa", "cc0_domaine_public", "pixabay", "autre_inconnue" })
        String licence,
        @Schema(nullable = true, maxLength = 500, description = "Source de l'image (site, ouvrage…), facultative")
        String source,
        @Schema(nullable = true, maxLength = 500, description = "Auteur de l'image, facultatif") String auteur,
        @Schema(description = "Album d'origine, obligatoire pour une image d'album et ignoré sinon")
        UUID albumId) {
}
