package fr.corpusmots.comptes.api;

import fr.corpusmots.comptes.service.MonCompteVue;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

public record MonCompteDto(
        @Schema(required = true) UUID id,
        @Schema(required = true) String nomAffiche,
        @Schema(required = true) boolean administrateur) {

    static MonCompteDto de(MonCompteVue vue) {
        return new MonCompteDto(vue.id(), vue.nomAffiche(), vue.administrateur());
    }
}
