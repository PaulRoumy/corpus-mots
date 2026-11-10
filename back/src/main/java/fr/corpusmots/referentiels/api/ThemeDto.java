package fr.corpusmots.referentiels.api;

import fr.corpusmots.referentiels.service.ThemeVue;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/** Thème de l'école. */
public record ThemeDto(
        @Schema(required = true) UUID id,
        @Schema(required = true) String nom,
        @Schema(description = "Enseignant qui a créé le Thème, seul avec l'administrateur à pouvoir le renommer ou le"
                + " supprimer ; absent pour un Thème antérieur, géré par l'administrateur seul") UUID createurId) {

    static ThemeDto de(ThemeVue vue) {
        return new ThemeDto(vue.id(), vue.nom(), vue.createurId());
    }
}
