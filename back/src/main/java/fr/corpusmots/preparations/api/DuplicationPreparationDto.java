package fr.corpusmots.preparations.api;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

/** Section de la copie d'une Préparation (« Dupliquer », story 2.10). */
public record DuplicationPreparationDto(
        @Schema(required = true, enumeration = { "ps", "ms", "gs" },
                description = "Section de la copie, la même que la Préparation dupliquée permise") String section) {
}
