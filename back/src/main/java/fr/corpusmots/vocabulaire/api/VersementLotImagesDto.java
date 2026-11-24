package fr.corpusmots.vocabulaire.api;

import java.util.List;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/** Images à verser en lot dans la Banque de l'école (FR-19) : de 1 à 500 identifiants, chacun une seule fois. */
public record VersementLotImagesDto(
        @Schema(required = true, minItems = 1, maxItems = 500, uniqueItems = true,
                description = "Images de l'enseignant connecté à verser, de 1 à 500, sans doublon")
        List<UUID> imageIds) {
}
