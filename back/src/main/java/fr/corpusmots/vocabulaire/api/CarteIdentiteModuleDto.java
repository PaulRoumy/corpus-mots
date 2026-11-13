package fr.corpusmots.vocabulaire.api;

import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/** Module d'une Image, dans sa Carte d'identité, avec le titre de son Album (« Module 1 · Roule galette »). */
public record CarteIdentiteModuleDto(
        @Schema(required = true) UUID id,
        @Schema(required = true) String nom,
        @Schema(required = true) UUID albumId,
        @Schema(required = true) String titreAlbum) {
}
