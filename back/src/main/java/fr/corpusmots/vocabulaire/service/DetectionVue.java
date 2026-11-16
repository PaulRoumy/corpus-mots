package fr.corpusmots.vocabulaire.service;

import java.util.List;

/**
 * Détection d'une saisie (FR-8) : {@code forme} est la saisie normalisée par {@link Lexique#normaliser} ; {@code mots}
 * les Mots existants de même forme, sans casse ni accents, visibles de l'enseignant courant (AD-2), par forme. Une liste
 * vide présente la saisie comme un Mot nouveau.
 */
public record DetectionVue(String forme, List<MotDetecteVue> mots) {
}
