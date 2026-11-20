package fr.corpusmots.preparations.api;

import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/** Sens choisi dans le Panneau de choix d'Image, à retenir pour le Mot de Préparation. */
public record ChoixSensMotPreparationDto(
        @Schema(required = true, description = "Sens visible du Mot ; l'Image liée d'un autre Sens est déliée")
        UUID sensId) {
}
