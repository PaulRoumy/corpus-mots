package fr.corpusmots.preparations.api;

import fr.corpusmots.preparations.service.PreparationsService;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/** Nouveau nom d'une Préparation (« Renommer », story 2.10). */
public record NomPreparationDto(
        @Schema(nullable = true, maxLength = PreparationsService.NOM_MAXIMUM,
                description = "Nom propre de la Préparation, 100 caractères au plus une fois nettoyé (espaces aux bords"
                        + " et doublées retirées) ; vide ou null l'efface, et le titre de l'Album s'affiche de nouveau")
        String nom) {
}
