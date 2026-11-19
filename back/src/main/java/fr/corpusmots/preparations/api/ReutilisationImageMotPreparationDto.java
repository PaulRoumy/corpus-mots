package fr.corpusmots.preparations.api;

import fr.corpusmots.preparations.service.ReutiliserImageCommande;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/** Image existante retenue dans le Panneau de détection, à lier au Mot qu'elle illustre, ajouté à la Préparation. */
public record ReutilisationImageMotPreparationDto(
        @Schema(required = true, description = "Identifiant du Mot du Lexique, celui que l'Image illustre") UUID motId,
        @Schema(required = true, description = "Image proposable retenue ; son Sens devient le Sens retenu du Mot")
        UUID imageId) {

    ReutiliserImageCommande enCommande() {
        return new ReutiliserImageCommande(motId, imageId);
    }
}
