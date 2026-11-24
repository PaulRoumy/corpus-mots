package fr.corpusmots.preparations.api;

import fr.corpusmots.vocabulaire.service.ImageVue;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/** Image liée à un Mot d'une Préparation de l'enseignant connecté, telle que vocabulaire la lui montre (AD-16). */
public record PreparationImageDto(
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
        @Schema(nullable = true, enumeration = { "versable", "image.versement.retrait_admin",
                "image.versement.image_album", "image.versement.type_inconnu", "image.versement.source_manquante",
                "image.versement.licence_non_versable" },
                description = "versable, ou le code du motif qui empêche de verser l'Image (AD-4) ; null si"
                        + " l'enseignant connecté n'en est pas le propriétaire ou si elle est déjà versée")
        String versabilite) {

    static PreparationImageDto de(ImageVue vue) {
        return vue == null ? null
                : new PreparationImageDto(vue.id(), vue.proprietaireId(), vue.etat().valeur(), vue.aRemplacer(),
                        vue.reutilisable(), vue.typeImage().valeur(), vue.aCompleter(),
                        vue.versabilite() == null ? null : vue.versabilite().valeur());
    }
}
