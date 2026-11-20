package fr.corpusmots.vocabulaire.service;

import fr.corpusmots.commun.service.Section;
import java.util.Map;
import java.util.UUID;

/**
 * Copie des usages de la Préparation {@code sourceId} vers sa copie {@code cibleId} (duplication, story 2.10) :
 * {@code motsCopies} associe à chaque Mot de Préparation de la source le Mot de Préparation qui le copie ; Album et
 * Section sont ceux de la copie.
 */
public record CopierPreparationCommande(UUID sourceId, UUID cibleId, Map<UUID, UUID> motsCopies, UUID albumId,
        Section section) {
}
