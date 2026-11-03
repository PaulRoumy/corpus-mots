package fr.corpusmots.comptes.api;

import fr.corpusmots.comptes.service.ComptesService;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import java.util.List;
import org.eclipse.microprofile.openapi.annotations.Operation;

/** Annuaire de l'équipe, ouvert à tout enseignant actif : le nom affiché n'est stocké que dans {@code comptes} (AD-20). */
@Path("/enseignants")
@Produces(MediaType.APPLICATION_JSON)
public class EnseignantsResource {

    @Inject
    ComptesService comptes;

    @GET
    @Operation(operationId = "listerEnseignants", summary = "Annuaire de l'équipe, sans les invités")
    public List<EnseignantDto> lister() {
        return comptes.annuaire().stream().map(EnseignantDto::de).toList();
    }
}
