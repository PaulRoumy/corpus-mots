package fr.corpusmots.vocabulaire.service;

import fr.corpusmots.vocabulaire.persistance.Image;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.UUID;

/**
 * Seul arbitre de ce qu'un enseignant voit d'une Image (AD-2) : trois prédicats, et aucun autre. Le rôle {@code admin}
 * n'élargit aucun d'eux : ils ne le reçoivent même pas. Ne jamais filtrer les Images ailleurs.
 *
 * <ul>
 *   <li>{@link #consultable} : l'enseignant en est propriétaire et l'état est {@code privee} ou {@code versee} ; ou
 *       l'état est {@code versee} ; ou il a un lien vers elle (elle n'est alors montrée que dans la Préparation qui la
 *       lie).</li>
 *   <li>{@link #proposable} : il en est propriétaire et l'état est {@code privee} ou {@code versee} ; ou l'état est
 *       {@code versee}. Un lien ne rend jamais une Image proposable.</li>
 *   <li>{@link #moderable} : l'état est {@code versee} ou {@code abandonnee} (réservé à {@code moderation}).</li>
 * </ul>
 */
@ApplicationScoped
public class VisibiliteImages {

    /**
     * Vrai si l'enseignant {@code enseignantId} peut consulter l'Image de propriétaire {@code proprietaireId} et d'état
     * {@code etat} ; {@code lieParLEnseignant} dit s'il a un lien vers elle.
     */
    public boolean consultable(UUID proprietaireId, EtatImage etat, UUID enseignantId, boolean lieParLEnseignant) {
        return proposable(proprietaireId, etat, enseignantId) || lieParLEnseignant;
    }

    /** Vrai si l'Image de propriétaire {@code proprietaireId} et d'état {@code etat} peut être proposée à l'enseignant. */
    public boolean proposable(UUID proprietaireId, EtatImage etat, UUID enseignantId) {
        boolean proprietaire = proprietaireId != null && proprietaireId.equals(enseignantId);
        return etat == EtatImage.VERSEE || (proprietaire && etat == EtatImage.PRIVEE);
    }

    /** Vrai si une Image d'état {@code etat} relève de la modération. */
    public boolean moderable(EtatImage etat) {
        return etat == EtatImage.VERSEE || etat == EtatImage.ABANDONNEE;
    }

    boolean consultable(Image image, UUID enseignantId, boolean lieParLEnseignant) {
        return consultable(image.proprietaireId(), etat(image), enseignantId, lieParLEnseignant);
    }

    boolean proposable(Image image, UUID enseignantId) {
        return proposable(image.proprietaireId(), etat(image), enseignantId);
    }

    static EtatImage etat(Image image) {
        return EtatImage.deValeur(image.etat())
                .orElseThrow(() -> new IllegalStateException("État inconnu de l'Image " + image.id()));
    }
}
