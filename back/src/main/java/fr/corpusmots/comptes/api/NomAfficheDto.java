package fr.corpusmots.comptes.api;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

/** Nom affiché voulu par l'enseignant connecté : sans espaces autour, de 1 à 100 caractères. */
public record NomAfficheDto(@Schema(required = true,
        description = "De 1 à 100 caractères, une fois retirés les espaces de début et de fin") String nomAffiche) {
}
