package fr.corpusmots.comptes.api;

import fr.corpusmots.comptes.service.ComptesService;
import io.quarkus.security.identity.SecurityIdentity;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.parameters.RequestBody;

/** Compte de l'enseignant connecté, tiré du jeton (AD-6) : seul le nom affiché y est modifiable (FR-3). */
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
        return MonCompteDto.de(comptes.monCompte(jeton.getSubject(), email(), administrateur()));
    }

    @PUT
    @Path("/nom-affiche")
    @Consumes(MediaType.APPLICATION_JSON)
    @Operation(operationId = "modifierNomAffiche",
            summary = "Corriger le nom affiché de l'enseignant connecté (le nom gardé dans Keycloak ne change pas)")
    public MonCompteDto modifierNomAffiche(@RequestBody(required = true) NomAfficheDto nom) {
        return MonCompteDto.de(comptes.renommer(jeton.getSubject(), nom == null ? null : nom.nomAffiche(), email(),
                administrateur()));
    }

    private boolean administrateur() {
        return identite.hasRole(ComptesService.ROLE_ADMINISTRATEUR);
    }

    /** Keycloak fait foi pour l'e-mail (AD-6) : chaîne vide si le jeton n'en porte pas. */
    private String email() {
        return FiltreCompteActif.texte(jeton.getClaim("email")).orElse("");
    }
}
