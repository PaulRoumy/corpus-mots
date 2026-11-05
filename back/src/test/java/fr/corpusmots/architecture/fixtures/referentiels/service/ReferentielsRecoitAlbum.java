package fr.corpusmots.architecture.fixtures.referentiels.service;

import fr.corpusmots.architecture.fixtures.referentiels.persistance.AlbumFixture;

/** Violation d'AD-16 : un type de persistance en paramètre, en paramètre de constructeur et en champ publics. */
public class ReferentielsRecoitAlbum {

    public AlbumFixture courant;

    public ReferentielsRecoitAlbum(AlbumFixture album) {
        courant = album;
    }

    public void enregistrer(AlbumFixture album) {
        courant = album;
    }
}
