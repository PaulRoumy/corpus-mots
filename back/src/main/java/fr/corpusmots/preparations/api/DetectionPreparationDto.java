package fr.corpusmots.preparations.api;

import fr.corpusmots.preparations.service.DetectionPreparationVue;
import java.util.List;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/** Détection d'une saisie dans une Préparation de l'enseignant connecté (FR-8). */
public record DetectionPreparationDto(
        @Schema(required = true, description = "Saisie normalisée par le Lexique, sans article") String forme,
        @Schema(required = true, description = "Mots existants et visibles, par forme ; vide pour un Mot nouveau")
        List<DetectionMotDto> mots) {

    static DetectionPreparationDto de(DetectionPreparationVue vue) {
        return new DetectionPreparationDto(vue.detection().forme(), vue.detection().mots().stream()
                .map(mot -> DetectionMotDto.de(mot, vue.motsDejaPresents().contains(mot.mot().id())))
                .toList());
    }
}
