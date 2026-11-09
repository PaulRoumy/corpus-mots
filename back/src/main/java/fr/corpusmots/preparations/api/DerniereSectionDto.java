package fr.corpusmots.preparations.api;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

/** Section de la Préparation la plus récente de l'enseignant connecté, qui préremplit le Dialogue « Nouvelle préparation ». */
public record DerniereSectionDto(
        @Schema(required = true, nullable = true, enumeration = { "ps", "ms", "gs" },
                description = "null si l'enseignant n'a encore aucune Préparation") String section) {
}
