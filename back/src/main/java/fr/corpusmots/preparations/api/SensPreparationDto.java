package fr.corpusmots.preparations.api;

import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/** Sens retenu par l'enseignant pour un Mot de sa Préparation. */
public record SensPreparationDto(
        @Schema(required = true) UUID id,
        @Schema(required = true, description = "« à compléter » pour le Sens par défaut") String libelle,
        @Schema(description = "Catégorie grammaticale, absente si elle reste à compléter") String categorie) {
}
