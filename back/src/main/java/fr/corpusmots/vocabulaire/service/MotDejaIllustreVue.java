package fr.corpusmots.vocabulaire.service;

/**
 * Mot déjà illustré pour l'Album d'une Préparation (Encart, story 2.9) : le Mot, le Sens de son Image proposée et
 * cette Image, la première selon le classement de la détection parmi ses Images proposables d'un Sens lié à l'Album.
 */
public record MotDejaIllustreVue(MotVue mot, SensVue sens, ImageDetecteeVue image) {
}
