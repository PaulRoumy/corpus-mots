package fr.corpusmots.referentiels.api;

import fr.corpusmots.commun.api.ErreurMetier;
import fr.corpusmots.referentiels.service.ReferentielsService;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import java.util.List;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.parameters.RequestBody;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.jboss.resteasy.reactive.ResponseStatus;

/**
 * Thèmes de l'école (FR-5), ouverts à tout enseignant actif : les renommer ou les supprimer est réservé à leur créateur
 * et à l'administrateur ({@code 403 theme.reserve_au_createur} pour les autres).
 */
@Path("/themes")
@Produces(MediaType.APPLICATION_JSON)
public class ThemesResource {

    @Inject
    ReferentielsService referentiels;

    @GET
    @Operation(operationId = "listerThemes", summary = "Thèmes de l'école, par nom")
    public List<ThemeDto> lister() {
        return referentiels.themes().stream().map(ThemeDto::de).toList();
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @ResponseStatus(201)
    @Operation(operationId = "creerTheme", summary = "Créer un Thème, visible aussitôt de toute l'école")
    @APIResponse(responseCode = "201", description = "Thème créé, dont l'enseignant connecté est le créateur",
            content = @Content(mediaType = MediaType.APPLICATION_JSON,
                    schema = @Schema(implementation = ThemeDto.class)))
    public ThemeDto creer(@RequestBody(required = true) NomThemeDto nom) {
        if (nom == null) {
            throw new ErreurMetier(400, "requete.invalide", "Le corps de la requête est obligatoire");
        }
        return ThemeDto.de(referentiels.creerTheme(nom.nom()));
    }

    @PUT
    @Path("/{id}/nom")
    @Consumes(MediaType.APPLICATION_JSON)
    @Operation(operationId = "renommerTheme",
            summary = "Renommer un Thème (son créateur ou l'administrateur), visible aussitôt de toute l'école")
    public ThemeDto renommer(@PathParam("id") UUID id, @RequestBody(required = true) NomThemeDto nom) {
        if (nom == null) {
            throw new ErreurMetier(400, "requete.invalide", "Le corps de la requête est obligatoire");
        }
        return ThemeDto.de(referentiels.renommerTheme(id, nom.nom()));
    }

    @DELETE
    @Path("/{id}")
    @Operation(operationId = "supprimerTheme",
            summary = "Supprimer un Thème inutilisé (son créateur ou l'administrateur) : les Préparations qui l'avaient"
                    + " pour Thème par défaut n'en ont plus")
    @APIResponse(responseCode = "204", description = "Thème supprimé")
    public void supprimer(@PathParam("id") UUID id) {
        referentiels.supprimerTheme(id);
    }
}
