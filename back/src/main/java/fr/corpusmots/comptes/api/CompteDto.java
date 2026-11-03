package fr.corpusmots.comptes.api;

import fr.corpusmots.comptes.service.CompteVue;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/** Compte de l'équipe : nom affiché et statut tirés de la base, e-mail et rôle de Keycloak. */
public record CompteDto(
        @Schema(required = true) UUID id,
        @Schema(description = "Absent tant que le compte est invité") String nomAffiche,
        @Schema(required = true, description = "Vide si Keycloak ne connaît plus l'utilisateur") String email,
        @Schema(required = true, enumeration = { "invite", "actif", "desactive", "suppression_en_cours" })
        String statut,
        @Schema(required = true) boolean administrateur) {

    static CompteDto de(CompteVue vue) {
        return new CompteDto(vue.id(), vue.nomAffiche(), vue.email(), vue.statut(), vue.administrateur());
    }
}
