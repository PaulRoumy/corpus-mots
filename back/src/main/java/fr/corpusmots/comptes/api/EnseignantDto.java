package fr.corpusmots.comptes.api;

import fr.corpusmots.comptes.service.ComptesService.EnseignantLu;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/** Entrée de l'annuaire : de quoi afficher le nom d'un enseignant à partir de son identifiant (AD-20). */
public record EnseignantDto(
        @Schema(required = true) UUID id,
        @Schema(required = true) String nomAffiche,
        @Schema(required = true, enumeration = { "actif", "desactive", "suppression_en_cours", "supprime" })
        String statut) {

    static EnseignantDto de(EnseignantLu enseignant) {
        return new EnseignantDto(enseignant.id(), enseignant.nomAffiche(), enseignant.statut());
    }
}
