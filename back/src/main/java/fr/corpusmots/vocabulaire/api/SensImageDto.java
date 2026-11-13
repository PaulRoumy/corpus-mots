package fr.corpusmots.vocabulaire.api;

import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/** Nouveau Sens d'une Image, choisi par son propriétaire parmi les Sens proposés pour son Mot. */
public record SensImageDto(
        @Schema(required = true, description = "Sens du Mot de l'Image, parmi ceux de GET /images/{id}/sens")
        UUID sensId) {
}
