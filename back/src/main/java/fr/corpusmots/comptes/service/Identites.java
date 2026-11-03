package fr.corpusmots.comptes.service;

import java.util.List;
import java.util.UUID;

/**
 * Opérations sur les utilisateurs de Keycloak, qui possède e-mail, mot de passe, rôle et sessions (AD-6).
 * Chaque méthode est un appel HTTP sortant : jamais dans une transaction ouverte (AD-17).
 */
public interface Identites {

    /**
     * Crée l'utilisateur, sans mot de passe, et renvoie son identifiant ({@code sub}).
     *
     * @throws IdentiteDejaExistante si l'e-mail appartient déjà à un utilisateur
     */
    UUID creerUtilisateur(String email);

    void donnerRoleAdministrateur(UUID id);

    /** Envoie l'e-mail « Créer mon mot de passe » : mot de passe, prénom et nom, lien valable 7 jours. */
    void envoyerInvitation(UUID id);

    void supprimer(UUID id);

    /** Tous les utilisateurs du realm, avec leur e-mail et la présence du rôle {@code admin}. */
    List<IdentiteVue> lister();
}
