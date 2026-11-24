package fr.corpusmots.vocabulaire.api;

import fr.corpusmots.vocabulaire.service.VersementLotVue;
import java.util.List;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/**
 * Résultat d'un versement en lot (FR-19), dans l'ordre de la demande : les Images versées par cet appel, celles qui
 * l'étaient déjà, et les refusées avec la raison de leur refus.
 */
public record ResultatVersementLotDto(
        @Schema(required = true, description = "Images versées par cet appel (privee → versee)")
        List<UUID> versees,
        @Schema(required = true, description = "Images déjà versées avant cet appel, inchangées")
        List<UUID> dejaVersees,
        @Schema(required = true, description = "Images refusées, restées hors du lot, avec leur raison")
        List<RefusVersementImageDto> refusees) {

    static ResultatVersementLotDto de(VersementLotVue vue) {
        return new ResultatVersementLotDto(vue.versees(), vue.dejaVersees(), vue.refusees().stream()
                .map(refus -> new RefusVersementImageDto(refus.imageId(), refus.code(), refus.licence()))
                .toList());
    }
}
