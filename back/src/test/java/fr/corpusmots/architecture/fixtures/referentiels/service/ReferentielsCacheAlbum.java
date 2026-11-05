package fr.corpusmots.architecture.fixtures.referentiels.service;

import fr.corpusmots.architecture.fixtures.referentiels.persistance.AlbumFixture;
import java.util.List;

/** Conforme à AD-16 : la persistance n'apparaît que dans des membres non publics. */
public class ReferentielsCacheAlbum {

    private AlbumFixture dernier;

    public List<String> titres() {
        return List.of();
    }

    List<AlbumFixture> albums() {
        return dernier == null ? List.of() : List.of(dernier);
    }
}
