package fr.corpusmots.vocabulaire.api;

import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/** Sens qu'illustre une Image, dans sa Carte d'identité. */
public record CarteIdentiteSensDto(
        @Schema(required = true) UUID id,
        @Schema(required = true, description = "« à compléter » pour le Sens par défaut") String libelle,
        @Schema(nullable = true, description = "Catégorie grammaticale, null si elle reste à compléter")
        String categorie,
        @Schema(required = true, description = "Vrai pour le Sens par défaut « à compléter »") boolean aCompleter) {
}
