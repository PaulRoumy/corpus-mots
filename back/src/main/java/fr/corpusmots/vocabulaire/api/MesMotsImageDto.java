package fr.corpusmots.vocabulaire.api;

import fr.corpusmots.vocabulaire.service.ImageMesMotsVue;
import fr.corpusmots.vocabulaire.service.ImageVue;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/** Image de Mes mots de l'enseignant connecté (AD-16), avec le Mot et le Sens qu'elle illustre. */
public record MesMotsImageDto(
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
        @Schema(required = true, description = "Identifiant du Mot du Lexique, partagé par l'école") UUID motId,
        @Schema(required = true, description = "Première forme saisie dans l'école, sans article") String forme,
        @Schema(required = true) MesMotsSensDto sens) {

    static MesMotsImageDto de(ImageMesMotsVue vue) {
        ImageVue image = vue.image();
        return new MesMotsImageDto(image.id(), image.proprietaireId(), image.etat().valeur(), image.aRemplacer(),
                image.reutilisable(), image.typeImage().valeur(), image.aCompleter(), vue.mot().id(),
                vue.mot().forme(), MesMotsSensDto.de(vue.sens()));
    }
}
