package fr.corpusmots.comptes.service;

import fr.corpusmots.commun.api.ErreurMetier;
import fr.corpusmots.comptes.persistance.Enseignant;
import fr.corpusmots.comptes.persistance.EnseignantRepository;
import fr.corpusmots.comptes.persistance.StatutEnseignant;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.LockModeType;
import jakarta.transaction.Transactional;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/** Enseignants de l'équipe : seul point d'écriture de la table {@code enseignant} (AD-6). */
@ApplicationScoped
public class ComptesService {

    /** Rôle de realm Keycloak des administrateurs : donné à l'invitation, lu dans le jeton (AD-6). */
    public static final String ROLE_ADMINISTRATEUR = "admin";

    static final String CODE_COMPTE_INCONNU_OU_INACTIF = "compte.inconnu_ou_inactif";
    static final String CODE_INVITATION_INUTILE = "compte.invitation_inutile";
    static final String CODE_INTROUVABLE = "ressource.introuvable";
    static final String CODE_STATUT_INCOMPATIBLE = "compte.statut_incompatible";

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

    /** Enseignants de l'équipe, hors {@code supprime}. */
    @Transactional
    public List<EnseignantLu> enseignantsDeLEquipe() {
        return enseignants.list("statut <> ?1", StatutEnseignant.SUPPRIME).stream()
                .map(enseignant -> new EnseignantLu(enseignant.id(), enseignant.nomAffiche(),
                        enseignant.statut().valeur()))
                .toList();
    }

    /** Statut de chaque Enseignant, {@code supprime} compris (réconciliation avec Keycloak). */
    @Transactional
    public Map<UUID, StatutEnseignant> statutsDesEnseignants() {
        return enseignants.listAll().stream()
                .collect(Collectors.toMap(Enseignant::id, Enseignant::statut));
    }

    /**
     * Vérifie qu'une invitation peut être renvoyée à cet Enseignant.
     *
     * @throws ErreurMetier {@code 404 ressource.introuvable} s'il n'existe pas (ou plus),
     *         {@code 409 compte.invitation_inutile} s'il n'est pas {@code invite}
     */
    @Transactional
    public void verifierInvite(UUID id) {
        if (lire(id).statut() != StatutEnseignant.INVITE) {
            throw new ErreurMetier(409, CODE_INVITATION_INUTILE, "Ce compte n'est plus au statut invite");
        }
    }

    /**
     * Vérifie, avant l'appel Keycloak, que ce compte peut être désactivé (invité ou actif).
     *
     * @throws ErreurMetier {@code 404 ressource.introuvable}, {@code 409 compte.statut_incompatible}
     */
    @Transactional
    public void verifierDesactivable(UUID id) {
        exigerStatut(lire(id), StatutEnseignant.INVITE, StatutEnseignant.ACTIF);
    }

    /**
     * Vérifie, avant l'appel Keycloak, que ce compte peut être réactivé (désactivé).
     *
     * @throws ErreurMetier {@code 404 ressource.introuvable}, {@code 409 compte.statut_incompatible}
     */
    @Transactional
    public void verifierReactivable(UUID id) {
        exigerStatut(lire(id), StatutEnseignant.DESACTIVE);
    }

    /**
     * Vérifie que le rôle de ce compte peut changer : tout compte de l'équipe, sauf en cours de suppression.
     *
     * @throws ErreurMetier {@code 404 ressource.introuvable}, {@code 409 compte.statut_incompatible}
     */
    @Transactional
    public void verifierRoleModifiable(UUID id) {
        exigerStatut(lire(id), StatutEnseignant.INVITE, StatutEnseignant.ACTIF, StatutEnseignant.DESACTIVE);
    }

    /**
     * Exécute {@code action} sous le verrou consultatif des administrateurs, pour lire le décompte dans Keycloak puis y
     * appliquer le retrait sans qu'une requête concurrente s'intercale (« au moins un administrateur actif », AD-6).
     *
     * <p>Exception à AD-17, limitée à ce verrou (décision 1 de la story 1.6) : cette transaction n'écrit rien en base,
     * elle ne sert qu'à tenir {@code pg_advisory_xact_lock} pendant les appels Keycloak de {@code action}, et se
     * termine avec elle ; le statut s'écrit ensuite dans une transaction normale. Une exception de {@code action}
     * l'annule et remonte telle quelle.
     */
    @Transactional
    public void sousVerrouAdministrateurs(Runnable action) {
        enseignants.verrouillerAdministrateurs();
        action.run();
    }

    /** Parmi {@code ids}, ceux dont l'Enseignant est {@code actif}. */
    @Transactional
    public Set<UUID> actifsParmi(Set<UUID> ids) {
        if (ids.isEmpty()) {
            return Set.of();
        }
        return enseignants.list("id in ?1 and statut = ?2", ids, StatutEnseignant.ACTIF).stream()
                .map(Enseignant::id)
                .collect(Collectors.toSet());
    }

    /** Dernière étape d'une désactivation, après Keycloak (AD-18) : le filtre refuse l'API dès ce commit. */
    @Transactional
    public void desactiver(UUID id) {
        Enseignant enseignant = lirePourEcrire(id);
        exigerStatut(enseignant, StatutEnseignant.INVITE, StatutEnseignant.ACTIF);
        enseignant.desactiver();
    }

    /** Dernière étape d'une réactivation, après Keycloak (AD-18) : actif, ou invité s'il n'a jamais été activé. */
    @Transactional
    public void reactiver(UUID id) {
        Enseignant enseignant = lirePourEcrire(id);
        exigerStatut(enseignant, StatutEnseignant.DESACTIVE);
        enseignant.reactiver();
    }

    private Enseignant lire(UUID id) {
        return enseignants.findByIdOptional(id)
                .filter(trouve -> trouve.statut() != StatutEnseignant.SUPPRIME)
                .orElseThrow(ComptesService::introuvable);
    }

    private Enseignant lirePourEcrire(UUID id) {
        return enseignants.findByIdOptional(id, LockModeType.PESSIMISTIC_WRITE)
                .filter(trouve -> trouve.statut() != StatutEnseignant.SUPPRIME)
                .orElseThrow(ComptesService::introuvable);
    }

    private static void exigerStatut(Enseignant enseignant, StatutEnseignant... admis) {
        if (!List.of(admis).contains(enseignant.statut())) {
            throw new ErreurMetier(409, CODE_STATUT_INCOMPATIBLE,
                    "Action sans objet pour un compte au statut " + enseignant.statut().valeur());
        }
    }

    private static ErreurMetier introuvable() {
        return new ErreurMetier(404, CODE_INTROUVABLE, "Aucun compte ne porte cet identifiant");
    }

    /** Enseignant tel qu'il est en base : nom affiché (vide tant que {@code invite}) et statut. */
    public record EnseignantLu(UUID id, String nomAffiche, String statut) {
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
