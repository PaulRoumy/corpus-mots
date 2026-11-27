package fr.corpusmots.preparations.service;

/**
 * Résultat de « Utiliser dans une préparation » (story 3.4) : le Mot de Préparation illustré par l'Image, et
 * {@code ajoute} vrai s'il vient d'être ajouté à la Préparation, faux s'il y figurait déjà.
 */
public record UtilisationImageVue(MotPreparationVue mot, boolean ajoute) {
}
