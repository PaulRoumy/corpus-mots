package fr.corpusmots.preparations.api;

import fr.corpusmots.preparations.service.NouvellePreparationCommande;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/** Nouvelle Préparation : Album et Section obligatoires, Module de cet Album et Thème par défaut facultatifs. */
public record NouvellePreparationDto(
        @Schema(required = true) UUID albumId,
        @Schema(required = true, enumeration = { "ps", "ms", "gs" }) String section,
        @Schema(description = "Module de l'Album, facultatif") UUID moduleId,
        @Schema(description = "Thème par défaut, facultatif") UUID themeDefautId) {

    NouvellePreparationCommande enCommande() {
        return new NouvellePreparationCommande(albumId, section, moduleId, themeDefautId);
    }
}
