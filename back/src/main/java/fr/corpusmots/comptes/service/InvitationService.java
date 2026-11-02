package fr.corpusmots.comptes.service;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.util.UUID;
import org.jboss.logging.Logger;

/**
 * Circuit d'invitation (AD-18) : Keycloak d'abord (utilisateur, rôle, e-mail), base ensuite ; tout échec après la
 * création de l'utilisateur Keycloak le supprime. Jamais de transaction autour : appels HTTP sortants (AD-17).
 */
@ApplicationScoped
public class InvitationService {

    private static final Logger LOG = Logger.getLogger(InvitationService.class);

    @Inject
    Identites identites;

    @Inject
    ComptesService comptes;

    /**
     * @throws IdentiteDejaExistante si l'e-mail appartient déjà à un utilisateur Keycloak, laissé intact
     */
    public UUID inviter(String email, boolean administrateur) {
        UUID id = identites.creerUtilisateur(email);
        boolean enregistre = false;
        // finally plutôt que catch : la compensation suit tout échec, y compris une exception vérifiée levée au commit.
        try {
            if (administrateur) {
                identites.donnerRoleAdministrateur(id);
            }
            identites.envoyerInvitation(id);
            comptes.creerInvite(id);
            enregistre = true;
            return id;
        } finally {
            if (!enregistre) {
                compenser(id);
            }
        }
    }

    private void compenser(UUID id) {
        try {
            identites.supprimer(id);
        } catch (RuntimeException echecDeCompensation) {
            // L'échec d'origine remonte à l'appelant ; l'utilisateur sans Enseignant sera supprimé par la tâche de
            // réconciliation des comptes (story 1.6).
            LOG.errorf(echecDeCompensation, "Invitation échouée et utilisateur Keycloak %s non supprimé", id);
        }
    }
}
