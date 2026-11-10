package fr.corpusmots.referentiels.service;

import java.util.UUID;

/**
 * Le Thème {@code themeId} va être supprimé. Émis par {@link ReferentielsService} avant la suppression, de façon
 * synchrone, pour que les modules aval qui le référencent par UUID (Thème par défaut des Préparations) le retirent dans
 * la même transaction : leurs observateurs sont des {@code @Observes} synchrones, jamais {@code @ObservesAsync} ni
 * {@code AFTER_*} (AD-15).
 */
public record ThemeSupprime(UUID themeId) {
}
