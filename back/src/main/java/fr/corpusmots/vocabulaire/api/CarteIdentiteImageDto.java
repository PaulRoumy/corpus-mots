package fr.corpusmots.vocabulaire.api;

import fr.corpusmots.commun.service.Section;
import fr.corpusmots.vocabulaire.service.CarteIdentiteImageVue;
import fr.corpusmots.vocabulaire.service.ImageVue;
import java.util.List;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.enums.SchemaType;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/**
 * Carte d'identité d'une Image que l'enseignant connecté peut consulter (FR-14, AD-16) : l'Image, le Mot et le Sens
 * qu'elle illustre, son Album d'origine, sa licence, sa source et son auteur, ses Sections, son Module et ses Thèmes.
 */
public record CarteIdentiteImageDto(
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
        @Schema(required = true) CarteIdentiteSensDto sens,
        @Schema(nullable = true, description = "Album d'origine d'une image d'album, null pour un autre type")
        CarteIdentiteAlbumDto albumOrigine,
        @Schema(nullable = true, description = "Licence, null si elle n'est pas renseignée",
                enumeration = { "arasaac_cc_by_nc_sa", "sclera_cc_by_nc", "mulberry_cc_by_sa", "cc0_domaine_public",
                        "pixabay", "autre_inconnue", "droits_auteur_enseignant", "usage_pedagogique_album" })
        String licence,
        @Schema(nullable = true, description = "Source, null si elle n'est pas renseignée") String source,
        @Schema(nullable = true, description = "Auteur, null s'il n'est pas renseigné") String auteur,
        @Schema(required = true, type = SchemaType.ARRAY, implementation = SectionImageDto.class,
                description = "Sections cochées, dans l'ordre PS, MS, GS")
        List<String> sections,
        @Schema(nullable = true, description = "Module de l'Image, de n'importe quel Album ; null sans Module")
        CarteIdentiteModuleDto module,
        @Schema(required = true, description = "Thèmes de l'Image, par nom") List<CarteIdentiteThemeDto> themes) {

    static CarteIdentiteImageDto de(CarteIdentiteImageVue vue) {
        ImageVue image = vue.image();
        return new CarteIdentiteImageDto(image.id(), image.proprietaireId(), image.etat().valeur(),
                image.aRemplacer(), image.reutilisable(), image.typeImage().valeur(), image.aCompleter(),
                vue.mot().id(), vue.mot().forme(),
                new CarteIdentiteSensDto(vue.sens().id(), vue.sens().libelle(), vue.sens().categorie(),
                        vue.sensACompleter()),
                vue.albumOrigine() == null ? null
                        : new CarteIdentiteAlbumDto(vue.albumOrigine().id(), vue.albumOrigine().titre(),
                                vue.albumOrigine().auteur()),
                vue.licence() == null ? null : vue.licence().valeur(), vue.source(), vue.auteur(),
                vue.sections().stream().map(Section::valeur).toList(),
                vue.module() == null ? null
                        : new CarteIdentiteModuleDto(vue.module().id(), vue.module().nom(), vue.module().albumId(),
                                vue.albumModule().titre()),
                vue.themes().stream().map(theme -> new CarteIdentiteThemeDto(theme.id(), theme.nom())).toList());
    }
}
