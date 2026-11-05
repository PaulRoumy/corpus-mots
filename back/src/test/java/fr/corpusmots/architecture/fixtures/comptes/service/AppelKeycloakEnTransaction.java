package fr.corpusmots.architecture.fixtures.comptes.service;

import jakarta.transaction.Transactional;

/** Violation d'AD-17 : appel Keycloak depuis une méthode {@code @Transactional}. */
public class AppelKeycloakEnTransaction {

    Identites identites;

    @Transactional
    public void desactiver(String id) {
        identites.desactiver(id);
    }
}
