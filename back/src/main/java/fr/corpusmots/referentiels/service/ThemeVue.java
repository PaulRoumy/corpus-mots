package fr.corpusmots.referentiels.service;

import java.util.UUID;

/**
 * Thème de l'école. {@code createurId} est {@code null} pour un Thème inséré avant la story 2.2, partie 3, que seul
 * l'administrateur gère.
 */
public record ThemeVue(UUID id, String nom, UUID createurId) {
}
