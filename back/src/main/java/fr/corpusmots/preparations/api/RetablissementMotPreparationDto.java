package fr.corpusmots.preparations.api;

import fr.corpusmots.preparations.service.RetablirMotCommande;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/** Mot retiré d'une Préparation à rétablir, tel que le retrait l'a renvoyé : Mot, Sens, place et Thème qu'il avait. */
public record RetablissementMotPreparationDto(
        @Schema(required = true, description = "Identifiant du Mot du Lexique") UUID motId,
        @Schema(required = true, description = "Sens que le Mot avait dans la Préparation, Sens de ce Mot") UUID sensId,
        @Schema(nullable = true, minimum = "1",
                description = "Place d'origine ; le Mot est placé en fin si elle est prise ou absente") Integer ordre,
        @Schema(nullable = true,
                description = "Thème que le Mot avait, null pour aucun ; un Thème supprimé entre-temps est ignoré")
        UUID themeId) {

    RetablirMotCommande enCommande() {
        return new RetablirMotCommande(motId, sensId, ordre, themeId);
    }
}
