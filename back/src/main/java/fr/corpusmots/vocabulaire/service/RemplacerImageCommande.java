package fr.corpusmots.vocabulaire.service;

import fr.corpusmots.commun.service.Section;
import java.util.UUID;

/**
 * Remplacement de l'Image liée au Mot de Préparation {@code preparationMotId} de la Préparation {@code preparationId}
 * (Album {@code albumId}, Section {@code section}) de l'enseignant courant par l'Image {@code imageId}, avec l'origine du
 * nouveau lien : {@code reutilisee} pour une Image choisie dans le Panneau de choix d'Image, {@code nouvelle} pour une
 * Image téléversée depuis ce panneau (story 2.7). Le Mot peut n'avoir encore aucune Image.
 */
public record RemplacerImageCommande(UUID preparationId, UUID preparationMotId, UUID imageId, UUID albumId,
        Section section, OrigineLien origine) {
}
