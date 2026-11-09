package fr.corpusmots.preparations.api;

import fr.corpusmots.preparations.service.ReglagesPreparationCommande;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/** Réglages de l'En-tête d'une Préparation, remplacés tous ensemble ; une valeur absente ou nulle est retirée. */
public record ReglagesPreparationDto(
        @Schema(nullable = true, description = "Module de l'Album de la Préparation, null pour aucun") UUID moduleId,
        @Schema(nullable = true, description = "Thème par défaut, null pour aucun") UUID themeDefautId,
        @Schema(nullable = true, minimum = "0", maximum = "6000",
                description = "Temps passé en minutes, multiple de 30 (demi-heure), null s'il n'est pas renseigné")
        Integer tempsPasseMinutes) {

    ReglagesPreparationCommande enCommande() {
        return new ReglagesPreparationCommande(moduleId, themeDefautId, tempsPasseMinutes);
    }
}
