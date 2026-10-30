package fr.corpusmots.architecture.fixtures.fiches.service;

import fr.corpusmots.architecture.fixtures.comptes.service.ComptesFixture;

/** Violation d'AD-1 : fiches ne dépend pas de comptes dans le graphe. */
public class FichesAppelleComptes {
    public void agir(ComptesFixture comptes) {
        comptes.agir();
    }
}
