package fr.corpusmots.vocabulaire.service;

import fr.corpusmots.commun.service.Section;
import java.util.UUID;

/**
 * Mot {@code motId} ajouté à la Préparation {@code preparationId} (Album {@code albumId}, Section {@code section}) de
 * l'enseignant courant, sous la ligne {@code preparationMotId} de {@code preparations}. {@code sensId} impose le Sens
 * retenu (rétablissement d'un Mot retiré) ; {@code null} laisse {@link Usages#retenirSens} le choisir.
 */
public record RetenirSensCommande(UUID preparationId, UUID preparationMotId, UUID motId, UUID albumId,
        Section section, UUID sensId) {

    /** Commande sans Sens imposé : {@link Usages#retenirSens} choisit le Sens. */
    public RetenirSensCommande(UUID preparationId, UUID preparationMotId, UUID motId, UUID albumId, Section section) {
        this(preparationId, preparationMotId, motId, albumId, section, null);
    }
}
