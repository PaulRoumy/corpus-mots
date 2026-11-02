package fr.corpusmots.comptes.api;

import fr.corpusmots.comptes.service.ComptesService;
import io.quarkus.security.identity.SecurityIdentity;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.eclipse.microprofile.openapi.annotations.Operation;

/** Compte de l'enseignant connecté, tiré du jeton (AD-6). */
@Path("/mon-compte")
@Produces(MediaType.APPLICATION_JSON)
public class MonCompteResource {

    @Inject
    SecurityIdentity identite;

    @Inject
    JsonWebToken jeton;

    @Inject
    ComptesService comptes;

    @GET
    @Operation(operationId = "lireMonCompte", summary = "Compte de l'enseignant connecté")
    public MonCompteDto lire() {
        boolean administrateur = identite.hasRole(ComptesService.ROLE_ADMINISTRATEUR);
        return MonCompteDto.de(comptes.monCompte(jeton.getSubject(), administrateur));
    }
}
