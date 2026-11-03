package fr.corpusmots.comptes.service;

import fr.corpusmots.comptes.persistance.StatutEnseignant;
import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.jboss.logging.Logger;

/**
 * Réconciliation des comptes entre Keycloak et la table {@code enseignant} (AD-18) : achève une opération de compte
 * interrompue après son appel Keycloak (base non écrite, compensation en échec). Keycloak ayant été appelé d'abord,
 * son état fait foi pour activé / désactivé, sauf pour un compte en cours de suppression. Lancée au démarrage puis
 * chaque heure.
 *
 * <p>Un écart n'est corrigé que s'il est constaté, identique, à deux passages successifs : une requête en cours entre
 * son appel Keycloak et son écriture en base n'est jamais « corrigée ». Les écarts sont gardés en mémoire ; un
 * redémarrage retarde la correction d'une heure au plus. Aucune correction ne réduit l'ensemble des administrateurs
 * actifs (activés dans Keycloak et {@code actif} en base) : la règle du dernier administrateur n'est pas en jeu.
 *
 * <p>Keycloak s'appelle hors transaction, la base s'écrit par {@link ComptesService} (AD-17).
 */
@ApplicationScoped
public class ReconciliationComptes {

    private static final Logger LOG = Logger.getLogger(ReconciliationComptes.class);

    /** Écart entre Keycloak et la base, et sa correction. */
    enum Ecart {
        /** Utilisateur Keycloak sans Enseignant, ou dont l'Enseignant est supprimé : supprimé de Keycloak. */
        ORPHELIN("utilisateur Keycloak sans enseignant ou d'un enseignant supprimé", "suppression dans Keycloak"),
        /** Keycloak désactivé, Enseignant invité ou actif : désactivation rejouée puis écrite en base. */
        DESACTIVATION_INTERROMPUE("désactivé dans Keycloak, invité ou actif en base",
                "désactivation rejouée dans Keycloak, statut desactive"),
        /** Keycloak activé, Enseignant désactivé : réactivation écrite en base. */
        REACTIVATION_INTERROMPUE("activé dans Keycloak, désactivé en base", "statut actif ou invite"),
        /** Keycloak activé, Enseignant en cours de suppression : désactivé dans Keycloak. */
        SUPPRESSION_EN_COURS_ACTIVE("activé dans Keycloak, en cours de suppression en base",
                "désactivation dans Keycloak");

        private final String description;
        private final String action;

        Ecart(String description, String action) {
            this.description = description;
            this.action = action;
        }
    }

    @Inject
    Identites identites;

    @Inject
    ComptesService comptes;

    /** Écarts constatés au passage précédent, à corriger s'ils sont retrouvés à l'identique. */
    private Map<UUID, Ecart> ecartsPrecedents = new HashMap<>();

    @Scheduled(identity = "reconciliation-comptes", every = "1h",
            concurrentExecution = Scheduled.ConcurrentExecution.SKIP)
    void reconcilierPeriodiquement() {
        reconcilier();
    }

    synchronized void reconcilier() {
        List<IdentiteVue> utilisateurs;
        Map<UUID, StatutEnseignant> statuts;
        // Keycloak d'abord : une invitation crée l'utilisateur avant l'Enseignant, la lecture de la base le voit donc.
        try {
            utilisateurs = identites.lister();
            statuts = comptes.statutsDesEnseignants();
        } catch (RuntimeException echec) {
            LOG.warnf("Réconciliation des comptes annulée, nouvel essai dans une heure : %s", echec.toString());
            return;
        }

        Map<UUID, Ecart> ecarts = constater(utilisateurs, statuts);
        int corriges = 0;
        for (Map.Entry<UUID, Ecart> ecart : ecarts.entrySet()) {
            if (ecart.getValue() == ecartsPrecedents.get(ecart.getKey()) && corriger(ecart.getKey(), ecart.getValue())) {
                corriges++;
            }
        }
        ecartsPrecedents = ecarts;
        LOG.infof("Réconciliation des comptes : %d utilisateurs Keycloak, %d enseignants, %d écarts, %d corrigés",
                utilisateurs.size(), statuts.size(), ecarts.size(), corriges);
    }

    private static Map<UUID, Ecart> constater(List<IdentiteVue> utilisateurs, Map<UUID, StatutEnseignant> statuts) {
        Map<UUID, Ecart> ecarts = new HashMap<>();
        Set<UUID> connus = new HashSet<>();
        boolean baseVide = statuts.isEmpty();
        for (IdentiteVue utilisateur : utilisateurs) {
            connus.add(utilisateur.id());
            if (utilisateur.compteDeService()) {
                continue;
            }
            StatutEnseignant statut = statuts.get(utilisateur.id());
            Ecart ecart = ecart(utilisateur.active(), statut);
            if (ecart == Ecart.ORPHELIN && baseVide) {
                // Base peut-être mal restaurée : rien n'est supprimé, le premier administrateur s'en charge.
                continue;
            }
            if (ecart != null) {
                ecarts.put(utilisateur.id(), ecart);
            }
        }
        if (baseVide && !utilisateurs.stream().allMatch(IdentiteVue::compteDeService)) {
            LOG.warn("Réconciliation des comptes : aucun enseignant en base, aucun utilisateur Keycloak supprimé");
        }
        statuts.forEach((id, statut) -> {
            if (statut != StatutEnseignant.SUPPRIME && !connus.contains(id)) {
                LOG.warnf("Réconciliation des comptes : enseignant %s (%s) sans utilisateur Keycloak, non corrigé",
                        id, statut.valeur());
            }
        });
        return ecarts;
    }

    /** Écart d'un utilisateur Keycloak, selon son activation et le statut de son Enseignant ({@code null} si absent). */
    private static Ecart ecart(boolean active, StatutEnseignant statut) {
        if (statut == null) {
            return Ecart.ORPHELIN;
        }
        return switch (statut) {
            // Hypothèse : seule l'application désactive un utilisateur Keycloak (console d'admin jamais exposée,
            // permanentLockout du realm à false ; un verrouillage temporaire ne touche pas enabled). Activer le
            // verrouillage permanent ferait désactiver en base tout compte verrouillé.
            case INVITE, ACTIF -> active ? null : Ecart.DESACTIVATION_INTERROMPUE;
            case DESACTIVE -> active ? Ecart.REACTIVATION_INTERROMPUE : null;
            case SUPPRESSION_EN_COURS -> active ? Ecart.SUPPRESSION_EN_COURS_ACTIVE : null;
            case SUPPRIME -> Ecart.ORPHELIN;
        };
    }

    /** Corrige un écart confirmé ; un échec est journalisé et n'arrête pas les autres comptes. */
    private boolean corriger(UUID id, Ecart ecart) {
        try {
            switch (ecart) {
                case ORPHELIN -> identites.supprimer(id);
                case DESACTIVATION_INTERROMPUE -> {
                    // Rejouée en entier : enabled=false déjà fait, mais la révocation des sessions a pu manquer.
                    identites.desactiver(id);
                    comptes.desactiver(id);
                }
                case REACTIVATION_INTERROMPUE -> comptes.reactiver(id);
                case SUPPRESSION_EN_COURS_ACTIVE -> identites.desactiver(id);
            }
            LOG.infof("Réconciliation des comptes : %s, %s : %s", id, ecart.description, ecart.action);
            return true;
        } catch (RuntimeException echec) {
            LOG.warnf("Réconciliation des comptes : %s, %s, correction en échec (%s) : %s",
                    id, ecart.description, ecart.action, echec.toString());
            return false;
        }
    }

    /** Pour les tests : oublie les écarts du passage précédent, comme un redémarrage. */
    synchronized void reinitialiser() {
        ecartsPrecedents = new HashMap<>();
    }
}
