package fr.corpusmots.vocabulaire.api;

import fr.corpusmots.commun.service.Section;
import fr.corpusmots.vocabulaire.service.EtatImage;
import fr.corpusmots.vocabulaire.service.ImageBanqueVue;
import fr.corpusmots.vocabulaire.service.ImageVue;
import java.util.List;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.enums.SchemaType;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/**
 * Image de la Banque (FR-18, AD-16) : l'Image, ses Sections, son type, et le Mot et le Sens qu'elle illustre. Le
 * propriétaire est renvoyé par identifiant ; le front résout son nom par l'annuaire (AD-20).
 */
public record ImageBanqueDto(
        @Schema(required = true) UUID id,
        @Schema(required = true) UUID proprietaireId,
        @Schema(required = true, enumeration = { "privee", "versee", "abandonnee", "supprimee" }) String etat,
        @Schema(nullable = true, enumeration = { "retiree", "supprimee" },
                description = "État « à remplacer », calculé à la lecture ; null tant que l'Image reste disponible")
        String aRemplacer,
        @Schema(required = true, description = "Vrai si l'enseignant connecté peut réutiliser cette Image")
        boolean reutilisable,
        @Schema(required = true, description = "Vrai si l'Image est versée dans la Banque de l'école") boolean versee,
        @Schema(required = true, enumeration = { "image_album", "image_libre", "photo_personnelle", "inconnu" })
        String typeImage,
        @Schema(nullable = true, enumeration = { "versable", "image.versement.retrait_admin",
                "image.versement.image_album", "image.versement.type_inconnu", "image.versement.source_manquante",
                "image.versement.licence_non_versable" },
                description = "versable, ou le code du motif qui empêche de verser l'Image (AD-4) ; null si"
                        + " l'enseignant connecté n'en est pas le propriétaire ou si elle est déjà versée")
        String versabilite,
        @Schema(required = true, type = SchemaType.ARRAY, implementation = SectionImageDto.class,
                description = "Sections cochées, dans l'ordre PS, MS, GS")
        List<String> sections,
        @Schema(required = true, description = "Identifiant du Mot du Lexique, partagé par l'école") UUID motId,
        @Schema(required = true, description = "Première forme saisie dans l'école, sans article") String forme,
        @Schema(required = true) UUID sensId,
        @Schema(required = true, description = "« à compléter » pour le Sens par défaut") String sensLibelle,
        @Schema(nullable = true, enumeration = { "nom", "verbe", "adjectif", "adverbe", "autre" },
                description = "Catégorie grammaticale du Sens, null si elle reste à compléter")
        String categorie) {

    static ImageBanqueDto de(ImageBanqueVue vue) {
        ImageVue image = vue.image();
        return new ImageBanqueDto(image.id(), image.proprietaireId(), image.etat().valeur(), image.aRemplacer(),
                image.reutilisable(), image.etat() == EtatImage.VERSEE, image.typeImage().valeur(),
                image.versabilite() == null ? null : image.versabilite().valeur(),
                vue.sections().stream().map(Section::valeur).toList(), vue.mot().id(), vue.mot().forme(),
                vue.sens().id(), vue.sens().libelle(), vue.sens().categorie());
    }
}
