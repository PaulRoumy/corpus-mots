package fr.corpusmots.preparations.api;

import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/** Thème d'un Mot de Préparation ; une valeur absente ou nulle le retire. */
public record ThemeMotPreparationDto(
        @Schema(nullable = true, description = "Thème du Mot, null pour aucun") UUID themeId) {
}
