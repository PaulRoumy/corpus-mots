package fr.corpusmots.preparations.api;

import fr.corpusmots.preparations.service.CartePreparationVue;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/** Carte de Préparation de l'accueil. */
public record CartePreparationDto(
        @Schema(required = true) UUID id,
        @Schema(required = true) UUID albumId,
        @Schema(required = true) String titreAlbum,
        @Schema(required = true, enumeration = { "ps", "ms", "gs" }) String section,
        @Schema(description = "Absent si aucun Module n'est choisi") UUID moduleId,
        @Schema(description = "Absent si aucun Module n'est choisi") String nomModule,
        @Schema(required = true) int nombreMots,
        @Schema(required = true, description = "Mots sans Image") int nombreAIllustrer,
        @Schema(required = true) OffsetDateTime creeLe) {

    static CartePreparationDto de(CartePreparationVue vue) {
        return new CartePreparationDto(vue.id(), vue.albumId(), vue.titreAlbum(), vue.section().valeur(),
                vue.moduleId(), vue.nomModule(), vue.nombreMots(), vue.nombreAIllustrer(), vue.creeLe());
    }
}
