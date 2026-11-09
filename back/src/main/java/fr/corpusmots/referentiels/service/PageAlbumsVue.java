package fr.corpusmots.referentiels.service;

import java.util.List;

/** Page d'une recherche d'Albums et nombre total d'Albums trouvés. */
public record PageAlbumsVue(List<AlbumVue> elements, long total) {
}
