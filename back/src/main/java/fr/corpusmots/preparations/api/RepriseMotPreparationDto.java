package fr.corpusmots.preparations.api;

import fr.corpusmots.vocabulaire.service.MotDejaIllustreVue;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/** Mot déjà illustré pour l'Album d'une Préparation de l'enseignant connecté, proposé par l'Encart (story 2.9). */
public record RepriseMotPreparationDto(
        @Schema(required = true, description = "Identifiant du Mot du Lexique, partagé par l'école") UUID motId,
        @Schema(required = true, description = "Première forme saisie dans l'école, sans article") String forme,
        @Schema(required = true, description = "Sens de l'Image proposée, retenu si le Mot est repris")
        SensPreparationDto sens,
        @Schema(required = true, description = "Image proposée, la première selon le classement de la détection parmi"
                + " les Images proposables d'un Sens lié à l'Album")
        DetectionImageDto image) {

    static RepriseMotPreparationDto de(MotDejaIllustreVue vue) {
        return new RepriseMotPreparationDto(vue.mot().id(), vue.mot().forme(),
                new SensPreparationDto(vue.sens().id(), vue.sens().libelle(), vue.sens().categorie()),
                DetectionImageDto.de(vue.image()));
    }
}
