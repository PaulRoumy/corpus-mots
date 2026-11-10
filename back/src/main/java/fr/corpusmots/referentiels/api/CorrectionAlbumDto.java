package fr.corpusmots.referentiels.api;

import fr.corpusmots.referentiels.service.CorrectionAlbumCommande;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/** Correction d'un Album : titre et auteur obligatoires, éditeur facultatif, 200 caractères au plus chacun. */
public record CorrectionAlbumDto(
        @Schema(required = true, maxLength = 200) String titre,
        @Schema(required = true, maxLength = 200) String auteur,
        @Schema(description = "Facultatif ; vide ou absent, l'Album n'a plus d'éditeur", maxLength = 200)
        String editeur) {

    CorrectionAlbumCommande enCommande() {
        return new CorrectionAlbumCommande(titre, auteur, editeur);
    }
}
