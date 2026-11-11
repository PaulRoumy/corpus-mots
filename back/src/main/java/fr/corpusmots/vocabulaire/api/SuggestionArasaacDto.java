package fr.corpusmots.vocabulaire.api;

import fr.corpusmots.vocabulaire.service.SuggestionArasaacVue;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/** Pictogramme ARASAAC suggéré pour un Mot : son fichier est servi par {@code GET /api/arasaac/pictogrammes/{id}}. */
public record SuggestionArasaacDto(
        @Schema(required = true, description = "Identifiant du pictogramme chez ARASAAC") long idArasaac,
        @Schema(required = true, description = "Premier mot-clé français du pictogramme, ou le Mot cherché si ARASAAC"
                + " n'en donne aucun ; alternative de sa vignette")
        String motCle) {

    static SuggestionArasaacDto de(SuggestionArasaacVue vue) {
        return new SuggestionArasaacDto(vue.idArasaac(), vue.motCle());
    }
}
