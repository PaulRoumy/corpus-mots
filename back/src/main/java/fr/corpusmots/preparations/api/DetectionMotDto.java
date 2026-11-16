package fr.corpusmots.preparations.api;

import fr.corpusmots.vocabulaire.service.MotDetecteVue;
import java.util.List;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/** Mot existant, visible de l'enseignant connecté, de même forme que la saisie (sans casse ni accents). */
public record DetectionMotDto(
        @Schema(required = true, description = "Identifiant du Mot du Lexique, partagé par l'école") UUID motId,
        @Schema(required = true, description = "Première forme saisie dans l'école, sans article") String forme,
        @Schema(required = true, description = "Vrai si le Mot figure déjà dans cette Préparation")
        boolean dejaDansLaPreparation,
        @Schema(required = true, description = "Sens visibles, par libellé, « à compléter » en dernier")
        List<DetectionSensDto> sens,
        @Schema(required = true, description = "Albums d'origine des Images proposables et Albums des Préparations"
                + " de l'enseignant connecté où figure le Mot, par titre")
        List<DetectionAlbumDto> albums,
        @Schema(required = true, description = "Images proposables, dans l'ordre de classement")
        List<DetectionImageDto> images) {

    static DetectionMotDto de(MotDetecteVue vue, boolean dejaDansLaPreparation) {
        return new DetectionMotDto(vue.mot().id(), vue.mot().forme(), dejaDansLaPreparation,
                vue.sens().stream().map(DetectionSensDto::de).toList(),
                vue.albums().stream().map(DetectionAlbumDto::de).toList(),
                vue.images().stream().map(DetectionImageDto::de).toList());
    }
}
