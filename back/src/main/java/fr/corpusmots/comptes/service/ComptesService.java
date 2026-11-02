package fr.corpusmots.comptes.service;

import fr.corpusmots.commun.api.ErreurMetier;
import fr.corpusmots.comptes.persistance.Enseignant;
import fr.corpusmots.comptes.persistance.EnseignantRepository;
import fr.corpusmots.comptes.persistance.StatutEnseignant;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.util.Optional;
import java.util.UUID;

/** Enseignants de l'équipe : seul point d'écriture de la table {@code enseignant} (AD-6). */
@ApplicationScoped
public class ComptesService {

    /** Rôle de realm Keycloak des administrateurs : donné à l'invitation, lu dans le jeton (AD-6). */
    public static final String ROLE_ADMINISTRATEUR = "admin";

    static final String CODE_COMPTE_INCONNU_OU_INACTIF = "compte.inconnu_ou_inactif";

    @Inject
    EnseignantRepository enseignants;

    @Transactional
    public boolean existeUnEnseignant() {
        return enseignants.count() > 0;
    }

    /** Dernière étape d'une invitation, après les appels Keycloak (AD-18). */
    @Transactional
    public void creerInvite(UUID id) {
        // flush : une violation de contrainte lève ici une exception non vérifiée, que l'invitation compense,
        // plutôt qu'une RollbackException au commit.
        enseignants.persistAndFlush(Enseignant.invite(id));
    }

    /**
     * Admet la requête d'un jeton valide seulement si son {@code sub} est un Enseignant actif. Un invité qui présente
     * un jeton a créé son mot de passe et saisi son nom : il devient actif à ce premier appel.
     *
     * @throws ErreurMetier {@code 403 compte.inconnu_ou_inactif} sinon
     */
    @Transactional
    public void verifierActif(String sub, Optional<String> nom) {
        Enseignant enseignant = enseignants.findByIdOptional(identifiant(sub))
                .orElseThrow(ComptesService::inconnuOuInactif);
        if (enseignant.statut() == StatutEnseignant.INVITE) {
            String nomAffiche = nom.map(String::strip).filter(valeur -> !valeur.isEmpty())
                    .orElseThrow(ComptesService::inconnuOuInactif);
            enseignant.activer(nomAffiche);
        }
        if (enseignant.statut() != StatutEnseignant.ACTIF) {
            throw inconnuOuInactif();
        }
    }

    @Transactional
    public MonCompteVue monCompte(String sub, boolean administrateur) {
        Enseignant enseignant = enseignants.findByIdOptional(identifiant(sub))
                .filter(trouve -> trouve.statut() == StatutEnseignant.ACTIF)
                .orElseThrow(ComptesService::inconnuOuInactif);
        return new MonCompteVue(enseignant.id(), enseignant.nomAffiche(), administrateur);
    }

    private static UUID identifiant(String sub) {
        try {
            return UUID.fromString(sub);
        } catch (IllegalArgumentException | NullPointerException horsFormat) {
            throw inconnuOuInactif();
        }
    }

    private static ErreurMetier inconnuOuInactif() {
        return new ErreurMetier(403, CODE_COMPTE_INCONNU_OU_INACTIF,
                "Aucun enseignant actif ne correspond à ce jeton");
    }
}
