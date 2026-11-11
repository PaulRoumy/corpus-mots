package fr.corpusmots.preparations.api;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

/** Mot tapé dans le Champ de saisie rapide, tel quel : le back le normalise (espaces, apostrophes, article). */
public record NouveauMotPreparationDto(
        @Schema(required = true, description = "De 1 à 100 caractères une fois normalisé") String saisie) {
}
