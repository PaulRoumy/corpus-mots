package fr.corpusmots.vocabulaire.api;

import java.util.List;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.enums.SchemaType;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/**
 * Classement d'une Image, modifié par son propriétaire : Sections, Module et Thèmes. Les trois valeurs remplacent
 * ensemble celles de l'Image ; les doublons sont ignorés.
 */
public record ClassementImageDto(
        @Schema(required = true, type = SchemaType.ARRAY, implementation = SectionImageDto.class,
                description = "Sections cochées, aucune, une ou plusieurs")
        List<String> sections,
        @Schema(nullable = true, description = "Module, de n'importe quel Album ; null pour aucun") UUID moduleId,
        @Schema(required = true, description = "Thèmes de l'Image, sans limite") List<UUID> themeIds) {
}
