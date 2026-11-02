package fr.corpusmots.comptes.service;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.core.Response;
import java.time.Duration;
import java.util.List;
import java.util.UUID;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.keycloak.admin.client.CreatedResponseUtil;
import org.keycloak.admin.client.Keycloak;
import org.keycloak.admin.client.resource.RealmResource;
import org.keycloak.representations.idm.RoleRepresentation;
import org.keycloak.representations.idm.UserRepresentation;

/** {@link Identites} par l'API d'administration de Keycloak, avec le compte de service du client du back. */
@ApplicationScoped
public class IdentitesKeycloak implements Identites {

    static final String CLIENT_FRONT = "corpus-mots-front";
    static final Duration VALIDITE_INVITATION = Duration.ofDays(7);
    static final List<String> ACTIONS_INVITATION = List.of("UPDATE_PASSWORD", "UPDATE_PROFILE");

    @Inject
    Keycloak keycloak;

    @ConfigProperty(name = "quarkus.keycloak.admin-client.realm")
    String realm;

    @ConfigProperty(name = "corpusmots.url-publique")
    String urlPublique;

    @Override
    public UUID creerUtilisateur(String email) {
        UserRepresentation utilisateur = new UserRepresentation();
        utilisateur.setUsername(email);
        utilisateur.setEmail(email);
        // Le lien d'invitation, reçu à cette adresse, vaut vérification de l'e-mail.
        utilisateur.setEmailVerified(true);
        utilisateur.setEnabled(true);
        utilisateur.setRequiredActions(ACTIONS_INVITATION);
        try (Response reponse = realm().users().create(utilisateur)) {
            if (reponse.getStatus() == Response.Status.CONFLICT.getStatusCode()) {
                throw new IdentiteDejaExistante("Un utilisateur Keycloak porte déjà cet e-mail");
            }
            return UUID.fromString(CreatedResponseUtil.getCreatedId(reponse));
        }
    }

    @Override
    public void donnerRoleAdministrateur(UUID id) {
        RoleRepresentation role = realm().roles().get(ComptesService.ROLE_ADMINISTRATEUR).toRepresentation();
        realm().users().get(id.toString()).roles().realmLevel().add(List.of(role));
    }

    @Override
    public void envoyerInvitation(UUID id) {
        realm().users().get(id.toString()).executeActionsEmail(
                CLIENT_FRONT, urlPublique + "/", (int) VALIDITE_INVITATION.toSeconds(), ACTIONS_INVITATION);
    }

    @Override
    public void supprimer(UUID id) {
        try (Response reponse = realm().users().delete(id.toString())) {
            int statut = reponse.getStatus();
            if (statut != Response.Status.NO_CONTENT.getStatusCode() && statut != Response.Status.NOT_FOUND.getStatusCode()) {
                throw new IllegalStateException("Suppression de l'utilisateur Keycloak refusée : HTTP " + statut);
            }
        }
    }

    private RealmResource realm() {
        return keycloak.realm(realm);
    }
}
