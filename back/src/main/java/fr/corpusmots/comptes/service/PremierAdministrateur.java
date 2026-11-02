package fr.corpusmots.comptes.service;

import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.util.Optional;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

/**
 * Premier administrateur : tant que la base n'a aucun Enseignant, invite l'e-mail défini dans
 * {@code deploiement/.env} avec le rôle {@code admin}, par le circuit normal (AD-6, AD-18). Lancé au démarrage puis
 * chaque minute, ce qui couvre un Keycloak encore en cours de démarrage ; inerte dès qu'un Enseignant existe.
 */
@ApplicationScoped
public class PremierAdministrateur {

    private static final Logger LOG = Logger.getLogger(PremierAdministrateur.class);

    @Inject
    ComptesService comptes;

    @Inject
    InvitationService invitations;

    @ConfigProperty(name = "corpusmots.admin-initial.email")
    Optional<String> email;

    private volatile boolean termine;
    private volatile boolean avertissementDonne;

    @Scheduled(identity = "premier-administrateur", every = "1m",
            concurrentExecution = Scheduled.ConcurrentExecution.SKIP)
    void inviterSiBaseVide() {
        executer(email);
    }

    void executer(Optional<String> emailInitial) {
        if (termine) {
            return;
        }
        // Tout échec (Keycloak, base) laisse la tâche suivante réessayer, sans remonter au scheduler.
        try {
            if (comptes.existeUnEnseignant()) {
                termine = true;
                return;
            }
            Optional<String> adresse = emailInitial.map(String::strip).filter(valeur -> !valeur.isEmpty());
            if (adresse.isEmpty()) {
                avertirUneFois("Aucun enseignant en base et ADMIN_INITIAL_EMAIL vide : aucun administrateur à inviter");
                return;
            }
            invitations.inviter(adresse.get(), true);
            termine = true;
            LOG.info("Premier administrateur invité");
        } catch (IdentiteDejaExistante dejaExistante) {
            avertirUneFois("Premier administrateur non invité : un utilisateur Keycloak porte déjà ADMIN_INITIAL_EMAIL ;"
                    + " le supprimer dans Keycloak pour relancer l'invitation");
        } catch (RuntimeException echec) {
            LOG.warnf("Premier administrateur non invité, nouvel essai dans une minute : %s", echec.toString());
        }
    }

    private void avertirUneFois(String message) {
        if (!avertissementDonne) {
            avertissementDonne = true;
            LOG.error(message);
        }
    }

    /** Pour les tests : remet la tâche dans son état de démarrage. */
    void reinitialiser() {
        termine = false;
        avertissementDonne = false;
    }
}
