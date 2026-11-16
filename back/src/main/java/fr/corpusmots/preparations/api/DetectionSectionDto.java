package fr.corpusmots.preparations.api;

import org.eclipse.microprofile.openapi.annotations.enums.SchemaType;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/**
 * Schéma OpenAPI d'une Section dans les Sections d'une Image détectée ({@code ps}, {@code ms}, {@code gs}) : une
 * annotation {@code @Schema} ne peut pas porter l'énumération des éléments d'une liste de chaînes. Jamais instancié.
 */
@Schema(type = SchemaType.STRING, enumeration = { "ps", "ms", "gs" },
        description = "Section de maternelle : ps, ms ou gs")
public final class DetectionSectionDto {

    private DetectionSectionDto() {
    }
}
