package fr.corpusmots.vocabulaire.api;

import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/** Thème d'une Image, dans sa Carte d'identité. */
public record CarteIdentiteThemeDto(
        @Schema(required = true) UUID id,
        @Schema(required = true) String nom) {
}
