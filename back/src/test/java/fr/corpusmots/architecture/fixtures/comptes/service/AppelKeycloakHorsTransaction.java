package fr.corpusmots.architecture.fixtures.comptes.service;

import jakarta.transaction.Transactional;

/**
 * Accepté par la règle AD-17 : {@code desactiver} appelle Keycloak hors transaction, ce qui est conforme.
 * {@code desactiverSousVerrou} n'est pas conforme mais toléré : ArC intercepte l'auto-appel, le {@code Runnable}
 * s'exécute donc dans la transaction ; c'est l'exception de {@code sousVerrouAdministrateurs} (décision 1 de la
 * story 1.6), que la règle laisse passer faute d'appel direct.
 */
public class AppelKeycloakHorsTransaction {

    Identites identites;

    public void desactiver(String id) {
        identites.desactiver(id);
        enregistrer(id);
    }

    public void desactiverSousVerrou(String id) {
        sousVerrou(() -> identites.desactiver(id));
    }

    @Transactional
    void sousVerrou(Runnable action) {
        action.run();
    }

    @Transactional
    void enregistrer(String id) {
    }
}
