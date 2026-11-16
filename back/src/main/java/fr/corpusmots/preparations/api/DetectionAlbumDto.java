package fr.corpusmots.preparations.api;

import fr.corpusmots.referentiels.service.AlbumVue;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/** Album montré par la détection : album d'origine d'une Image, ou Album d'une Préparation de l'enseignant connecté. */
public record DetectionAlbumDto(
        @Schema(required = true) UUID id,
        @Schema(required = true) String titre) {

    static DetectionAlbumDto de(AlbumVue vue) {
        return vue == null ? null : new DetectionAlbumDto(vue.id(), vue.titre());
    }
}
