package fr.corpusmots.vocabulaire.api;

import fr.corpusmots.vocabulaire.service.SensVue;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/** Sens qu'illustre une Image de Mes mots. */
public record MesMotsSensDto(
        @Schema(required = true) UUID id,
        @Schema(required = true, description = "« à compléter » pour le Sens par défaut") String libelle,
        @Schema(description = "Catégorie grammaticale, absente si elle reste à compléter") String categorie) {

    static MesMotsSensDto de(SensVue vue) {
        return new MesMotsSensDto(vue.id(), vue.libelle(), vue.categorie());
    }
}
