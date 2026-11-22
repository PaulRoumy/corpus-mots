package fr.corpusmots.preparations.api;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

/** Pictogramme ARASAAC choisi sur la Carte « à illustrer » d'un Mot de Préparation : seul son identifiant traverse l'API. */
public record PictogrammeMotPreparationDto(
        @Schema(required = true, minimum = "1", description = "Identifiant ARASAAC du pictogramme, strictement positif ; le back le"
                + " télécharge lui-même")
        Long idArasaac) {
}
