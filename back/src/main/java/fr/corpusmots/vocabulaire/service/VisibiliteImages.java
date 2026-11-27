package fr.corpusmots.vocabulaire.service;

import fr.corpusmots.vocabulaire.persistance.Image;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Seul arbitre de ce qu'un enseignant voit d'une Image (AD-2) : trois prédicats, et aucun autre, plus l'état
 * « à remplacer » ({@link #aRemplacer}) sous lequel il voit une Image liée. Le rôle {@code admin}
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

    /**
     * État « à remplacer » de l'Image de propriétaire {@code proprietaireId} et d'état {@code etat} lue par
     * l'enseignant {@code enseignantId}, calculé à la lecture, jamais stocké : {@code retiree} pour une Image
     * {@code privee} lue par un autre que son propriétaire (il ne la voit que par son propre lien, après « Ne plus
     * verser »), {@code null} sinon.
     */
    public String aRemplacer(UUID proprietaireId, EtatImage etat, UUID enseignantId) {
        boolean proprietaire = proprietaireId != null && proprietaireId.equals(enseignantId);
        return !proprietaire && etat == EtatImage.PRIVEE ? "retiree" : null;
    }

    /** Vrai si une Image d'état {@code etat} relève de la modération. */
    public boolean moderable(EtatImage etat) {
        return etat == EtatImage.VERSEE || etat == EtatImage.ABANDONNEE;
    }

    /**
     * Critère SQL des Images de la Banque pour la provenance {@code provenance} et l'enseignant {@code enseignantId}
     * (FR-18), à appliquer en base à la table {@code image} sous l'alias {@code i}, pour filtrer et paginer sans charger
     * les Images. C'est {@link #proposable} écrit en SQL, restreint au propriétaire pour {@code mes-mots} :
     * <ul>
     *   <li>{@code mes-mots} : il en est propriétaire et l'état est {@code privee} ou {@code versee} ;</li>
     *   <li>{@code banque} : l'état est {@code versee}, quel que soit le propriétaire ;</li>
     *   <li>{@code tout} : l'union des deux, soit exactement {@link #proposable}.</li>
     * </ul>
     * Un lien ne fait jamais apparaître une Image ; {@code abandonnee} et {@code supprimee} n'apparaissent jamais.
     * Seul endroit où ce critère est écrit (AD-2).
     */
    CritereImages critereBanque(ProvenanceImages provenance, UUID enseignantId) {
        Map<String, Object> parametres = new HashMap<>();
        parametres.put("visibiliteVersee", EtatImage.VERSEE.valeur());
        String condition = switch (provenance) {
            case MES_MOTS -> {
                parametres.put("visibilitePrivee", EtatImage.PRIVEE.valeur());
                parametres.put("visibiliteEnseignant", enseignantId);
                yield "(i.proprietaire_id = :visibiliteEnseignant"
                        + " and i.etat in (:visibilitePrivee, :visibiliteVersee))";
            }
            case BANQUE -> "(i.etat = :visibiliteVersee)";
            case TOUT -> {
                parametres.put("visibilitePrivee", EtatImage.PRIVEE.valeur());
                parametres.put("visibiliteEnseignant", enseignantId);
                yield "(i.etat = :visibiliteVersee"
                        + " or (i.proprietaire_id = :visibiliteEnseignant and i.etat = :visibilitePrivee))";
            }
        };
        return new CritereImages(condition, Map.copyOf(parametres));
    }

    /**
     * Critère SQL des Images qui font d'un enseignant un propriétaire proposable dans le filtre propriétaire de la
     * Banque (FR-15), à appliquer à la table {@code image} sous l'alias {@code i} : l'Image est {@code versee}. Un
     * collègue qui n'a rien versé n'est donc jamais nommé ; l'enseignant connecté est ajouté par l'appelant. Écrit ici,
     * à côté du critère de provenance, et nulle part ailleurs (AD-2).
     */
    CritereImages critereAyantVerse() {
        return new CritereImages("(i.etat = :visibiliteVersee)", Map.of("visibiliteVersee", EtatImage.VERSEE.valeur()));
    }

    /**
     * Condition SQL sur la table {@code image} sous l'alias {@code i}, et ses paramètres nommés, produite par
     * {@link #critereBanque} ou {@link #critereAyantVerse} ; aucune autre classe n'écrit de condition de visibilité
     * (AD-2).
     */
    record CritereImages(String condition, Map<String, Object> parametres) {
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
