package fr.corpusmots.referentiels.api;

import fr.corpusmots.referentiels.service.AlbumVue;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/** Album jeunesse partagé par l'école, avec son créateur et son nombre de Modules. */
public record AlbumDto(
        @Schema(required = true) UUID id,
        @Schema(required = true) String titre,
        @Schema(required = true) String auteur,
        @Schema(description = "Absent si l'éditeur n'a pas été saisi") String editeur,
        @Schema(required = true,
                description = "Enseignant qui a créé l'Album, seul avec l'administrateur à pouvoir le corriger")
        UUID createurId,
        @Schema(required = true) long nombreModules) {

    static AlbumDto de(AlbumVue vue) {
        return new AlbumDto(vue.id(), vue.titre(), vue.auteur(), vue.editeur(), vue.createurId(),
                vue.nombreModules());
    }
}
