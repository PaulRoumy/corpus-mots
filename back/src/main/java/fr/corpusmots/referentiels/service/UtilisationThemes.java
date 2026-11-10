package fr.corpusmots.referentiels.service;

import java.util.UUID;

/**
 * Utilisation d'un Thème par un module aval (AD-15) : un Thème utilisé ne se supprime pas
 * ({@code 409 theme.utilise}). Déclarée par {@code referentiels}, implémentée par les modules qui portent des Thèmes
 * ({@code vocabulaire} pour les Images, story 2.6) ; {@code referentiels} ne lit jamais leurs tables. Être le Thème par
 * défaut d'une Préparation ne compte pas comme une utilisation.
 */
public interface UtilisationThemes {

    /** Vrai si le module aval utilise le Thème {@code themeId}. Appelée dans la transaction de la suppression. */
    boolean utilise(UUID themeId);
}
