package fr.corpusmots.vocabulaire.service;

/**
 * Sens proposé au propriétaire d'une Image pour la Carte d'identité : un Sens du Mot de l'Image qui lui est visible ;
 * {@code aCompleter} est vrai pour le Sens par défaut « à compléter », sans catégorie.
 */
public record SensProposeVue(SensVue sens, boolean aCompleter) {
}
