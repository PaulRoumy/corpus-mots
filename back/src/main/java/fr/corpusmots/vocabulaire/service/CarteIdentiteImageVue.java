package fr.corpusmots.vocabulaire.service;

import fr.corpusmots.referentiels.service.AlbumVue;

/**
 * Carte d'identité d'une Image consultable par l'enseignant courant (FR-14) : l'Image (AD-16), le Mot et le Sens
 * qu'elle illustre, {@code sensACompleter} vrai pour le Sens par défaut « à compléter », l'Album d'origine
 * ({@code null} hors image d'album), la licence, la source et l'auteur ({@code null} s'ils ne sont pas renseignés).
 */
public record CarteIdentiteImageVue(ImageVue image, MotVue mot, SensVue sens, boolean sensACompleter,
        AlbumVue albumOrigine, Licence licence, String source, String auteur) {
}
