package fr.corpusmots.vocabulaire.api;

import fr.corpusmots.vocabulaire.service.SuggestionsArasaac;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.HttpHeaders;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.List;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.enums.SchemaType;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

/**
 * Proxy ARASAAC (AD-9, story 2.4) : le navigateur n'appelle jamais ARASAAC. Réservé aux enseignants connectés ; ARASAAC
 * injoignable, en erreur ou trop lent donne {@code 503 arasaac.indisponible}. Rien n'est enregistré.
 */
@Path("/arasaac")
public class ArasaacResource {

    static final String PNG = "image/png";

    /** Les pictogrammes ARASAAC changent rarement : un jour de cache privé du navigateur. */
    static final String CACHE_PICTOGRAMME = "private, max-age=86400";

    @Inject
    SuggestionsArasaac suggestions;

    @GET
    @Path("/suggestions")
    @Produces(MediaType.APPLICATION_JSON)
    @Operation(operationId = "suggestionsArasaac",
            summary = "Au plus trois pictogrammes ARASAAC pour un Mot, dans l'ordre d'ARASAAC (liste vide si aucun)")
    public List<SuggestionArasaacDto> suggestions(
            @Parameter(description = "Forme du Mot, de 1 à 100 caractères (l'article initial est ignoré)",
                    required = true) @QueryParam("mot") String mot) {
        return suggestions.suggestions(mot).stream().map(SuggestionArasaacDto::de).toList();
    }

    @GET
    @Path("/pictogrammes/{idArasaac}")
    @Produces(PNG)
    @Operation(operationId = "pictogrammeArasaac", summary = "Fichier PNG d'un pictogramme ARASAAC, servi par le back")
    @APIResponse(responseCode = "200", description = "Pictogramme (PNG, 300 px)",
            content = @Content(mediaType = PNG, schema = @Schema(type = SchemaType.STRING, format = "binary")))
    public Response pictogramme(@PathParam("idArasaac") long idArasaac) {
        return Response.ok(suggestions.pictogramme(idArasaac), PNG)
                .header(HttpHeaders.CACHE_CONTROL, CACHE_PICTOGRAMME)
                .build();
    }
}
