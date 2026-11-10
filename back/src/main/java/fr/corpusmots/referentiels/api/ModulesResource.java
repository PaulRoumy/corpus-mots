package fr.corpusmots.referentiels.api;

import fr.corpusmots.commun.api.ErreurMetier;
import fr.corpusmots.referentiels.service.ReferentielsService;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.parameters.RequestBody;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

/**
 * Modules des Albums (FR-5) : les renommer ou les supprimer est réservé à leur créateur et à l'administrateur
 * ({@code 403 module.reserve_au_createur} pour les autres). Leur création passe par {@code POST /albums/{id}/modules}.
 */
@Path("/modules")
@Produces(MediaType.APPLICATION_JSON)
public class ModulesResource {

    @Inject
    ReferentielsService referentiels;

    @PUT
    @Path("/{id}/nom")
    @Consumes(MediaType.APPLICATION_JSON)
    @Operation(operationId = "renommerModule",
            summary = "Renommer un Module (son créateur ou l'administrateur), visible aussitôt de toute l'école")
    public ModuleDto renommer(@PathParam("id") UUID id, @RequestBody(required = true) NomModuleDto nom) {
        if (nom == null) {
            throw new ErreurMetier(400, "requete.invalide", "Le corps de la requête est obligatoire");
        }
        return ModuleDto.de(referentiels.renommerModule(id, nom.nom()));
    }

    @DELETE
    @Path("/{id}")
    @Operation(operationId = "supprimerModule",
            summary = "Supprimer un Module (son créateur ou l'administrateur) : les Préparations qui l'avaient n'en"
                    + " ont plus")
    @APIResponse(responseCode = "204", description = "Module supprimé")
    public void supprimer(@PathParam("id") UUID id) {
        referentiels.supprimerModule(id);
    }
}
