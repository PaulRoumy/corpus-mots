package fr.corpusmots.preparations.api;

import fr.corpusmots.commun.service.Section;
import fr.corpusmots.vocabulaire.service.ImageDetecteeVue;
import fr.corpusmots.vocabulaire.service.ImageVue;
import java.util.List;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.enums.SchemaType;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/** Image proposable d'un Mot détecté, telle que vocabulaire la montre à l'enseignant connecté (AD-16). */
public record DetectionImageDto(
        @Schema(required = true) UUID id,
        @Schema(required = true) UUID proprietaireId,
        @Schema(required = true, enumeration = { "privee", "versee", "abandonnee", "supprimee" }) String etat,
        @Schema(nullable = true, enumeration = { "retiree", "supprimee" },
                description = "État « à remplacer », calculé à la lecture ; null tant que l'Image reste disponible")
        String aRemplacer,
        @Schema(required = true, description = "Vrai si l'enseignant connecté peut réutiliser cette Image")
        boolean reutilisable,
        @Schema(required = true, enumeration = { "image_album", "image_libre", "photo_personnelle", "inconnu" })
        String typeImage,
        @Schema(required = true, description = "Vrai pour une image libre sans source ou sans licence")
        boolean aCompleter,
        @Schema(required = true, type = SchemaType.ARRAY, implementation = DetectionSectionDto.class,
                description = "Sections cochées, dans l'ordre PS, MS, GS")
        List<String> sections,
        @Schema(nullable = true, description = "Album d'origine d'une image d'album, null pour un autre type")
        DetectionAlbumDto albumOrigine,
        @Schema(required = true, description = "Sens illustré par l'Image") DetectionSensDto sens,
        @Schema(required = true, description = "Vrai si l'enseignant connecté a déjà lié cette Image dans l'une de"
                + " ses Préparations")
        boolean dejaUtilisee,
        @Schema(nullable = true, description = "Identifiant du pictogramme ARASAAC dont l'Image a été créée, null pour"
                + " une autre Image")
        Long idArasaac) {

    static DetectionImageDto de(ImageDetecteeVue vue) {
        ImageVue image = vue.image();
        return new DetectionImageDto(image.id(), image.proprietaireId(), image.etat().valeur(), image.aRemplacer(),
                image.reutilisable(), image.typeImage().valeur(), image.aCompleter(),
                vue.sections().stream().map(Section::valeur).toList(), DetectionAlbumDto.de(vue.albumOrigine()),
                DetectionSensDto.de(vue.sens()), vue.dejaUtilisee(), vue.idArasaac());
    }
}
