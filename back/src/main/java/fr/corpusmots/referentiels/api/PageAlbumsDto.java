package fr.corpusmots.referentiels.api;

import fr.corpusmots.referentiels.service.PageAlbumsVue;
import java.util.List;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/** Page d'une recherche d'Albums, du plus proche au moins proche, et nombre total d'Albums trouvés. */
public record PageAlbumsDto(
        @Schema(required = true) List<AlbumDto> elements,
        @Schema(required = true) long total) {

    static PageAlbumsDto de(PageAlbumsVue vue) {
        return new PageAlbumsDto(vue.elements().stream().map(AlbumDto::de).toList(), vue.total());
    }
}
