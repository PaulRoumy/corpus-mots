package fr.corpusmots.vocabulaire.api;

import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/**
 * Image refusée d'un versement en lot, avec le code stable de son refus. Pour le code
 * {@code image.versement.licence_non_versable}, {@code licence} distingue « licence à préciser » ({@code null}) de
 * « licence non partageable » (sa valeur).
 */
public record RefusVersementImageDto(
        @Schema(required = true) UUID imageId,
        @Schema(required = true, enumeration = { "image.indisponible", "image.reservee_au_proprietaire",
                "image.versement.retrait_admin", "image.versement.image_album", "image.versement.type_inconnu",
                "image.versement.source_manquante", "image.versement.licence_non_versable" },
                description = "Image absente ou invisible, Image d'un collègue, ou motif qui empêche de la verser")
        String code,
        @Schema(nullable = true,
                enumeration = { "arasaac_cc_by_nc_sa", "sclera_cc_by_nc", "mulberry_cc_by_sa", "cc0_domaine_public",
                        "pixabay", "autre_inconnue", "droits_auteur_enseignant", "usage_pedagogique_album" },
                description = "Licence de l'Image pour le code image.versement.licence_non_versable : null si elle"
                        + " est absente (licence à préciser), sa valeur sinon (licence non partageable) ; null pour"
                        + " tout autre code")
        String licence) {
}
