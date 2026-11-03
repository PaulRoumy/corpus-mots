package fr.corpusmots.comptes.service;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.core.Response;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.function.BiFunction;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.keycloak.admin.client.CreatedResponseUtil;
import org.keycloak.admin.client.Keycloak;
import org.keycloak.admin.client.resource.RealmResource;
import org.keycloak.admin.client.resource.UserResource;
import org.keycloak.representations.idm.RoleRepresentation;
import org.keycloak.representations.idm.UserRepresentation;

/** {@link Identites} par l'API d'administration de Keycloak, avec le compte de service du client du back. */
@ApplicationScoped
public class IdentitesKeycloak implements Identites {

    static final String CLIENT_FRONT = "corpus-mots-front";
    static final Duration VALIDITE_INVITATION = Duration.ofDays(7);
    static final List<String> ACTIONS_INVITATION = List.of("UPDATE_PASSWORD", "UPDATE_PROFILE");
    static final int TAILLE_PAGE = 100;
    static final String PREFIXE_COMPTE_DE_SERVICE = "service-account-";

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
    public void retirerRoleAdministrateur(UUID id) {
        RoleRepresentation role = realm().roles().get(ComptesService.ROLE_ADMINISTRATEUR).toRepresentation();
        realm().users().get(id.toString()).roles().realmLevel().remove(List.of(role));
    }

    @Override
    public void desactiver(UUID id) {
        activer(id, false);
        // Un jeton déjà émis reste valide jusqu'à son expiration : le filtre du back le refuse dès l'écriture du
        // statut ; la révocation empêche son renouvellement.
        realm().users().get(id.toString()).logout();
    }

    @Override
    public void reactiver(UUID id) {
        activer(id, true);
    }

    @Override
    public Set<UUID> administrateursActives() {
        Set<UUID> actifs = new HashSet<>();
        // Représentation complète : elle porte à coup sûr le champ enabled.
        parPages((premier, nombre) -> realm().roles().get(ComptesService.ROLE_ADMINISTRATEUR)
                .getUserMembers(false, premier, nombre)).stream()
                .filter(utilisateur -> Boolean.TRUE.equals(utilisateur.isEnabled()))
                .forEach(utilisateur -> actifs.add(UUID.fromString(utilisateur.getId())));
        return actifs;
    }

    private void activer(UUID id, boolean active) {
        UserResource utilisateur = realm().users().get(id.toString());
        UserRepresentation representation = utilisateur.toRepresentation();
        representation.setEnabled(active);
        utilisateur.update(representation);
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

    @Override
    public List<IdentiteVue> lister() {
        Set<String> administrateurs = new HashSet<>();
        parPages((premier, nombre) -> realm().roles().get(ComptesService.ROLE_ADMINISTRATEUR)
                .getUserMembers(premier, nombre))
                .forEach(utilisateur -> administrateurs.add(utilisateur.getId()));
        return parPages((premier, nombre) -> realm().users().list(premier, nombre)).stream()
                .map(utilisateur -> vue(utilisateur, administrateurs))
                .toList();
    }

    /** Utilisateur Keycloak vu par le back ; {@code administrateurs} : identifiants des membres du rôle {@code admin}. */
    static IdentiteVue vue(UserRepresentation utilisateur, Set<String> administrateurs) {
        return new IdentiteVue(UUID.fromString(utilisateur.getId()), utilisateur.getEmail(),
                administrateurs.contains(utilisateur.getId()), Boolean.TRUE.equals(utilisateur.isEnabled()),
                estCompteDeService(utilisateur));
    }

    /**
     * Utilisateur d'un client (compte de service), reconnu au lien vers son client ou, si la représentation ne le
     * porte pas, au préfixe que Keycloak donne à son nom d'utilisateur.
     */
    private static boolean estCompteDeService(UserRepresentation utilisateur) {
        return utilisateur.getServiceAccountClientId() != null
                || (utilisateur.getUsername() != null && utilisateur.getUsername().startsWith(PREFIXE_COMPTE_DE_SERVICE));
    }

    /** Lit une liste de l'API d'administration page après page, jusqu'à une page incomplète. */
    private static List<UserRepresentation> parPages(BiFunction<Integer, Integer, List<UserRepresentation>> page) {
        List<UserRepresentation> tous = new ArrayList<>();
        for (int premier = 0; ; premier += TAILLE_PAGE) {
            List<UserRepresentation> lus = page.apply(premier, TAILLE_PAGE);
            tous.addAll(lus);
            if (lus.size() < TAILLE_PAGE) {
                return tous;
            }
        }
    }

    private RealmResource realm() {
        return keycloak.realm(realm);
    }
}
