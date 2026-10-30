package fr.corpusmots.commun.api;

import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

/** Ressource de test qui lève les erreurs de la matrice de la story 1.1. */
@Path("/test-erreurs")
public class ErreursTestResource {

    static final String MESSAGE_INTERNE = "détail interne qui ne doit jamais sortir";

    @GET
    @Path("/metier")
    public String metier() {
        throw new ErreurMetier(409, "exemple.code", "Exemple d'erreur métier");
    }

    @GET
    @Path("/indisponible")
    public String indisponible() {
        throw new WebApplicationException(Response.status(503).header("Retry-After", "120").build());
    }

    @POST
    @Path("/json")
    @Consumes(MediaType.APPLICATION_JSON)
    public String json(ExempleCorps corps) {
        return corps.valeur();
    }

    public record ExempleCorps(String valeur) {
    }

    @GET
    @Path("/inattendue")
    public String inattendue() {
        throw new RuntimeException(MESSAGE_INTERNE);
    }
}
