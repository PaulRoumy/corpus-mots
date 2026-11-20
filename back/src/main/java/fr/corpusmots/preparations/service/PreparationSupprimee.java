package fr.corpusmots.preparations.service;

import java.util.UUID;

/**
 * La Préparation {@code preparationId} de l'enseignant {@code proprietaireId} va être supprimée (story 2.10). Émis par
 * {@link PreparationsService#supprimer} après la libération de ses usages et avant la suppression de sa ligne, de façon
 * synchrone, pour que les modules aval qui la référencent par UUID (les Fiches, Epic 4) réagissent dans la même
 * transaction : leurs observateurs sont des {@code @Observes} synchrones, jamais {@code @ObservesAsync} ni
 * {@code AFTER_*} (AD-15).
 */
public record PreparationSupprimee(UUID preparationId, UUID proprietaireId) {
}
