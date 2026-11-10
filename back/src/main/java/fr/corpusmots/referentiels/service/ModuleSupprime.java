package fr.corpusmots.referentiels.service;

import java.util.UUID;

/**
 * Le Module {@code moduleId} de l'Album {@code albumId} va être supprimé. Émis par {@link ReferentielsService} avant la
 * suppression, de façon synchrone, pour que les modules aval qui le référencent par UUID (Préparations, et Images en
 * story 2.6) le retirent dans la même transaction : leurs observateurs sont des {@code @Observes} synchrones, jamais
 * {@code @ObservesAsync} ni {@code AFTER_*} (AD-15).
 */
public record ModuleSupprime(UUID moduleId, UUID albumId) {
}
