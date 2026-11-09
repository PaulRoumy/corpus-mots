package fr.corpusmots.preparations.api;

import fr.corpusmots.preparations.service.PreparationVue;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/** Préparation de l'enseignant connecté, de quoi afficher son En-tête. */
public record PreparationDto(
        @Schema(required = true) UUID id,
        @Schema(required = true) UUID albumId,
        @Schema(required = true) String titreAlbum,
        @Schema(required = true, enumeration = { "ps", "ms", "gs" }) String section,
        @Schema(description = "Absent si aucun Module n'est choisi") UUID moduleId,
        @Schema(description = "Absent si aucun Module n'est choisi") String nomModule,
        @Schema(description = "Absent si aucun Thème par défaut n'est choisi") UUID themeDefautId,
        @Schema(description = "Absent si aucun Thème par défaut n'est choisi") String nomThemeDefaut,
        @Schema(description = "Temps passé en minutes, absent s'il n'est pas renseigné") Integer tempsPasseMinutes,
        @Schema(required = true) int nombreMots,
        @Schema(required = true, description = "Mots qui ont une Image") int nombreIllustres,
        @Schema(required = true) OffsetDateTime creeLe) {

    static PreparationDto de(PreparationVue vue) {
        return new PreparationDto(vue.id(), vue.albumId(), vue.titreAlbum(), vue.section().valeur(), vue.moduleId(),
                vue.nomModule(), vue.themeDefautId(), vue.nomThemeDefaut(), vue.tempsPasseMinutes(), vue.nombreMots(),
                vue.nombreIllustres(), vue.creeLe());
    }
}
