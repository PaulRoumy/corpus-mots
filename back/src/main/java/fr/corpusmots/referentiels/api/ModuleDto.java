package fr.corpusmots.referentiels.api;

import fr.corpusmots.referentiels.service.ModuleVue;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/** Module d'un Album, à sa place {@code ordre}. */
public record ModuleDto(
        @Schema(required = true) UUID id,
        @Schema(required = true) UUID albumId,
        @Schema(required = true) String nom,
        @Schema(required = true) int ordre) {

    static ModuleDto de(ModuleVue vue) {
        return new ModuleDto(vue.id(), vue.albumId(), vue.nom(), vue.ordre());
    }
}
