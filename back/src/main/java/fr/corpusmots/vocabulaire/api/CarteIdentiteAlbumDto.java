package fr.corpusmots.vocabulaire.api;

import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/** Album d'origine d'une image d'album, dans sa Carte d'identité. */
public record CarteIdentiteAlbumDto(
        @Schema(required = true) UUID id,
        @Schema(required = true) String titre,
        @Schema(required = true) String auteur) {
}
