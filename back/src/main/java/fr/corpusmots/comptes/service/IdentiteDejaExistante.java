package fr.corpusmots.comptes.service;

/** L'e-mail invité appartient déjà à un utilisateur Keycloak. */
public class IdentiteDejaExistante extends RuntimeException {

    public IdentiteDejaExistante(String message) {
        super(message);
    }
}
