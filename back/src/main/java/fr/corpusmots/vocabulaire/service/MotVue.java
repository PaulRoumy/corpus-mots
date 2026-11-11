package fr.corpusmots.vocabulaire.service;

import java.util.UUID;

/** Mot du Lexique : {@code forme} est la première forme saisie dans l'école, normalisée par {@link Lexique#normaliser}. */
public record MotVue(UUID id, String forme) {
}
