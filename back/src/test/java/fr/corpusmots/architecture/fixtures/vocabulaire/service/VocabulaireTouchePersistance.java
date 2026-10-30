package fr.corpusmots.architecture.fixtures.vocabulaire.service;

import fr.corpusmots.architecture.fixtures.referentiels.persistance.AlbumFixture;

/** Violation d'AD-1 : vocabulaire accède à la couche persistance de referentiels. */
public class VocabulaireTouchePersistance {
    public String lire(AlbumFixture album) {
        return album.titre;
    }
}
