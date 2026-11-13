package fr.corpusmots.vocabulaire.api;

import org.eclipse.microprofile.openapi.annotations.enums.SchemaType;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/**
 * Schéma OpenAPI d'une Section dans les listes de Sections d'une Image ({@code ps}, {@code ms}, {@code gs}) : une
 * annotation {@code @Schema} ne peut pas porter l'énumération des éléments d'une liste de chaînes. Jamais instancié ;
 * les DTO gardent des {@code List<String>}, validées par la ressource.
 */
@Schema(type = SchemaType.STRING, enumeration = { "ps", "ms", "gs" },
        description = "Section de maternelle : ps, ms ou gs")
public final class SectionImageDto {

    private SectionImageDto() {
    }
}
