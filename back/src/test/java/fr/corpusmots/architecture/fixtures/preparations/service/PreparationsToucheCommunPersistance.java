package fr.corpusmots.architecture.fixtures.preparations.service;

import fr.corpusmots.architecture.fixtures.commun.persistance.CommunEntiteFixture;

/** Violation d'AD-1 : accès à la couche persistance de commun. */
public class PreparationsToucheCommunPersistance {
    public String lire(CommunEntiteFixture entite) {
        return entite.valeur;
    }
}
