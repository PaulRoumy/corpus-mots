package fr.corpusmots.preparations.api;

import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/** Image choisie dans le Panneau de choix d'Image, à lier au Mot de Préparation à la place de celle qu'il a. */
public record ChoixImageMotPreparationDto(
        @Schema(required = true, description = "Image proposable d'un Sens du Mot ; si son Sens n'est pas le Sens"
                + " retenu, il le devient") UUID imageId) {
}
