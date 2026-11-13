package fr.corpusmots.vocabulaire.service;

import java.util.UUID;

/**
 * Nouvelle description d'une Image par son propriétaire (FR-14) : son type, sa licence ({@code null} : non renseignée ;
 * ignorée pour une photo personnelle ou une image d'album, qui reçoivent la leur), sa source, son auteur et, pour une
 * image d'album seulement, son Album d'origine. Les cinq valeurs remplacent ensemble celles de l'Image.
 */
public record ModifierDescriptionImageCommande(TypeImage typeImage, Licence licence, String source, String auteur,
        UUID albumId) {
}
