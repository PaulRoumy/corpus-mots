package fr.corpusmots.preparations.api;

import fr.corpusmots.vocabulaire.service.SensProposeVue;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/** Sens visible d'un Mot détecté. */
public record DetectionSensDto(
        @Schema(required = true) UUID id,
        @Schema(required = true) String libelle,
        @Schema(nullable = true, description = "Catégorie grammaticale, null si elle reste à compléter")
        String categorie,
        @Schema(required = true, description = "Vrai pour le Sens par défaut « à compléter »") boolean aCompleter) {

    static DetectionSensDto de(SensProposeVue vue) {
        return new DetectionSensDto(vue.sens().id(), vue.sens().libelle(), vue.sens().categorie(), vue.aCompleter());
    }
}
