package fr.corpusmots.comptes.service;

import java.util.List;
import java.util.Set;
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

    /** Retire le rôle {@code admin} ; sans effet si l'utilisateur ne l'a pas. Il s'applique au prochain jeton. */
    void retirerRoleAdministrateur(UUID id);

    /** Bloque la connexion ({@code enabled=false}) puis révoque toutes les sessions de l'utilisateur (AD-6). */
    void desactiver(UUID id);

    /** Rend la connexion possible ({@code enabled=true}). */
    void reactiver(UUID id);

    /** Membres du rôle {@code admin} dont le compte Keycloak est activé. */
    Set<UUID> administrateursActives();

    /** Envoie l'e-mail « Créer mon mot de passe » : mot de passe, prénom et nom, lien valable 7 jours. */
    void envoyerInvitation(UUID id);

    void supprimer(UUID id);

    /** Tous les utilisateurs du realm (compte de service compris), avec e-mail, rôle {@code admin} et activation. */
    List<IdentiteVue> lister();
}
