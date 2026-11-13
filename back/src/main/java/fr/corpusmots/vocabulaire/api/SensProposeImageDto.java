package fr.corpusmots.vocabulaire.api;

import fr.corpusmots.vocabulaire.service.SensProposeVue;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/** Sens proposé au propriétaire d'une Image, dans sa Carte d'identité : un Sens du Mot de l'Image qui lui est visible. */
public record SensProposeImageDto(
        @Schema(required = true) UUID id,
        @Schema(required = true, description = "« à compléter » pour le Sens par défaut") String libelle,
        @Schema(nullable = true, description = "Catégorie grammaticale, null si elle reste à compléter")
        String categorie,
        @Schema(required = true, description = "Vrai pour le Sens par défaut « à compléter »") boolean aCompleter) {

    static SensProposeImageDto de(SensProposeVue vue) {
        return new SensProposeImageDto(vue.sens().id(), vue.sens().libelle(), vue.sens().categorie(),
                vue.aCompleter());
    }
}
