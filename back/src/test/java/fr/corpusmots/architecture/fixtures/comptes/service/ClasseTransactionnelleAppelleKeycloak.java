package fr.corpusmots.architecture.fixtures.comptes.service;

import jakarta.transaction.Transactional;

/** Violation d'AD-17 : appel Keycloak depuis une méthode d'une classe {@code @Transactional}. */
@Transactional
public class ClasseTransactionnelleAppelleKeycloak {

    Identites identites;

    public void desactiver(String id) {
        identites.desactiver(id);
    }
}
