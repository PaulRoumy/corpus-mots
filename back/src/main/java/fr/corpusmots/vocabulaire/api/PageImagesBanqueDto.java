package fr.corpusmots.vocabulaire.api;

import fr.corpusmots.vocabulaire.service.PageImagesBanqueVue;
import java.util.List;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/** Page de la Banque pour une provenance, et nombre total d'Images de cette provenance. */
public record PageImagesBanqueDto(
        @Schema(required = true) List<ImageBanqueDto> elements,
        @Schema(required = true) long total) {

    static PageImagesBanqueDto de(PageImagesBanqueVue vue) {
        return new PageImagesBanqueDto(vue.elements().stream().map(ImageBanqueDto::de).toList(), vue.total());
    }
}
