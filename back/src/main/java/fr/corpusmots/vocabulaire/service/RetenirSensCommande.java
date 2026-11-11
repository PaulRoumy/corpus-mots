package fr.corpusmots.vocabulaire.service;

import fr.corpusmots.commun.service.Section;
import java.util.UUID;

/**
 * Mot {@code motId} ajouté à la Préparation {@code preparationId} (Album {@code albumId}, Section {@code section}) de
 * l'enseignant courant, sous la ligne {@code preparationMotId} de {@code preparations}.
 */
public record RetenirSensCommande(UUID preparationId, UUID preparationMotId, UUID motId, UUID albumId,
        Section section) {
}
