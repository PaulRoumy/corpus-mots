package fr.corpusmots.vocabulaire.service;

/** Image ajoutée dans Mes mots, vue par l'enseignant courant, avec le Mot et le Sens qu'elle illustre. */
public record ImageMesMotsVue(ImageVue image, MotVue mot, SensVue sens) {
}
