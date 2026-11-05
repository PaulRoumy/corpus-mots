package fr.corpusmots.architecture.fixtures.referentiels.service;

import fr.corpusmots.architecture.fixtures.referentiels.persistance.AlbumFixture;
import java.util.Map;
import java.util.UUID;

/** Violation d'AD-16 : un type de persistance en argument générique d'une méthode publique de service. */
public class ReferentielsExposeAlbum {

    public Map<UUID, AlbumFixture> albumsParId() {
        return Map.of();
    }
}
