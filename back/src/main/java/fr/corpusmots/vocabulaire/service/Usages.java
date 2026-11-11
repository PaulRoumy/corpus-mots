package fr.corpusmots.vocabulaire.service;

import fr.corpusmots.commun.service.EnseignantCourant;
import fr.corpusmots.vocabulaire.persistance.SensRetenu;
import fr.corpusmots.vocabulaire.persistance.SensRetenuRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.util.UUID;

/**
 * Registre des usages (AD-14) : seul point d'écriture de {@code sens_retenu} (et, dès la story 2.4, de
 * {@code lien_image}). Appelé par {@code preparations} dans sa transaction, qu'il rejoint (AD-17). L'enseignant est
 * l'enseignant courant, lu dans le jeton (AD-6).
 */
@ApplicationScoped
public class Usages {

    /** Libellé du Sens par défaut d'un Mot pour lequel l'enseignant n'a encore retenu aucun Sens. */
    static final String LIBELLE_A_COMPLETER = "à compléter";

    @Inject
    SensRetenuRepository sensRetenus;

    @Inject
    Lexique lexique;

    @Inject
    EnseignantCourant enseignantCourant;

    /**
     * Retient un Sens pour le Mot que la commande ajoute à une Préparation de l'enseignant courant : le Sens imposé par
     * la commande s'il y en a un ; sinon le Sens qu'il a retenu le plus récemment pour ce Mot dans ses Préparations ;
     * sinon le Sens « à compléter » du Mot (sans catégorie), obtenu ou créé. Jamais le Sens retenu par un collègue
     * (AD-2).
     *
     * @throws IllegalArgumentException si le Sens imposé n'est pas un Sens de ce Mot : l'appelant le vérifie avant par
     *         {@link Lexique#sensDuMot}
     */
    @Transactional
    public SensVue retenirSens(RetenirSensCommande commande) {
        UUID enseignant = enseignantCourant.id();
        SensVue retenu = commande.sensId() != null
                ? lexique.sensDuMot(commande.motId(), commande.sensId())
                        .orElseThrow(() -> new IllegalArgumentException("Le Sens " + commande.sensId()
                                + " n'est pas un Sens du Mot " + commande.motId()))
                : sensRetenus.dernierRetenu(enseignant, commande.motId())
                        .map(Lexique::vue)
                        .orElseGet(() -> lexique.obtenirOuCreerSens(commande.motId(), LIBELLE_A_COMPLETER, null));
        sensRetenus.persist(SensRetenu.nouveau(sensRetenus.nouvelIdentifiant(), commande.preparationId(),
                commande.preparationMotId(), retenu.id(), enseignant, commande.albumId(), commande.section()));
        return retenu;
    }

    /**
     * Libère le Mot de Préparation {@code preparationMotId} avant que {@code preparations} ne supprime sa ligne : son
     * Sens retenu est supprimé (et, dès la story 2.4, ses liens d'Image). Le Mot et ses Sens restent dans le Lexique.
     * L'appelant a vérifié que ce Mot est celui d'une Préparation de l'enseignant courant.
     */
    @Transactional
    public void libererPreparationMot(UUID preparationMotId) {
        sensRetenus.supprimerDe(preparationMotId);
    }
}
