package fr.corpusmots.preparations.api;

import fr.corpusmots.preparations.service.RetablirMotCommande;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/** Mot retiré d'une Préparation à rétablir, tel que le retrait l'a renvoyé : Mot, Sens et place qu'il avait. */
public record RetablissementMotPreparationDto(
        @Schema(required = true, description = "Identifiant du Mot du Lexique") UUID motId,
        @Schema(required = true, description = "Sens que le Mot avait dans la Préparation, Sens de ce Mot") UUID sensId,
        @Schema(nullable = true, minimum = "1",
                description = "Place d'origine ; le Mot est placé en fin si elle est prise ou absente") Integer ordre) {

    RetablirMotCommande enCommande() {
        return new RetablirMotCommande(motId, sensId, ordre);
    }
}
