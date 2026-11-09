package fr.corpusmots.preparations.api;

import fr.corpusmots.preparations.service.PageCartesPreparationVue;
import java.util.List;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/** Page des Préparations de l'enseignant connecté, les plus récentes d'abord, et leur nombre total. */
public record PageCartesPreparationDto(
        @Schema(required = true) List<CartePreparationDto> elements,
        @Schema(required = true) long total) {

    static PageCartesPreparationDto de(PageCartesPreparationVue vue) {
        return new PageCartesPreparationDto(vue.elements().stream().map(CartePreparationDto::de).toList(),
                vue.total());
    }
}
