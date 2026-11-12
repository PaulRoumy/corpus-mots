package fr.corpusmots.vocabulaire.service;

import fr.corpusmots.commun.service.Section;
import java.util.UUID;

/**
 * Lien de l'Image {@code imageId} vers le Mot de Préparation {@code preparationMotId} de la Préparation
 * {@code preparationId} (Album {@code albumId}, Section {@code section}) de l'enseignant courant, avec son origine.
 */
public record LierImageCommande(UUID preparationId, UUID preparationMotId, UUID imageId, UUID albumId,
        Section section, OrigineLien origine) {
}
