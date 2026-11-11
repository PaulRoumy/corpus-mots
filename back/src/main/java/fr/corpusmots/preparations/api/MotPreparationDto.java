package fr.corpusmots.preparations.api;

import fr.corpusmots.preparations.service.MotPreparationVue;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/** Mot d'une Préparation de l'enseignant connecté, à sa place dans l'ordre de saisie. */
public record MotPreparationDto(
        @Schema(required = true, description = "Identifiant du Mot dans cette Préparation") UUID id,
        @Schema(required = true, description = "Identifiant du Mot du Lexique, partagé par l'école") UUID motId,
        @Schema(required = true, description = "Première forme saisie dans l'école, sans article") String forme,
        @Schema(required = true, description = "Place dans l'ordre de saisie, à partir de 1") int ordre,
        @Schema(required = true) SensPreparationDto sens,
        @Schema(required = true, description = "Vrai si une Image est liée au Mot dans cette Préparation")
        boolean illustre) {

    static MotPreparationDto de(MotPreparationVue vue) {
        return new MotPreparationDto(vue.id(), vue.motId(), vue.forme(), vue.ordre(),
                new SensPreparationDto(vue.sensId(), vue.libelleSens(), vue.categorieSens()), vue.illustre());
    }
}
