package fr.corpusmots.vocabulaire.service;

import java.util.UUID;

/**
 * Image ajoutée par l'enseignant courant dans Mes mots, sans Préparation : son fichier, déjà réduit par
 * {@link ReductionImages#reduire} pour ce type, la saisie du Mot qu'elle illustre (normalisée par
 * {@link Lexique#normaliser}), son type, sa licence ({@code null} : non renseignée ; ignorée pour une photo
 * personnelle ou une image d'album), sa source, son auteur et, pour une image d'album seulement, son Album d'origine.
 */
public record AjouterImageCommande(ImageReduiteVue fichier, String mot, TypeImage typeImage, Licence licence,
        String source, String auteur, UUID albumId) {
}
