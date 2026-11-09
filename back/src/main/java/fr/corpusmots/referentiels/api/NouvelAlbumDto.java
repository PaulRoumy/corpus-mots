package fr.corpusmots.referentiels.api;

import fr.corpusmots.referentiels.service.NouvelAlbumCommande;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/** Nouvel Album : titre et auteur obligatoires, éditeur facultatif, 200 caractères au plus chacun. */
public record NouvelAlbumDto(
        @Schema(required = true, maxLength = 200) String titre,
        @Schema(required = true, maxLength = 200) String auteur,
        @Schema(description = "Facultatif ; vide ou absent, l'Album n'a pas d'éditeur", maxLength = 200)
        String editeur) {

    NouvelAlbumCommande enCommande() {
        return new NouvelAlbumCommande(titre, auteur, editeur);
    }
}
