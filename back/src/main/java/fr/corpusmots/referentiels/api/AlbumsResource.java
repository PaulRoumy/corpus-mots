package fr.corpusmots.referentiels.api;

import fr.corpusmots.commun.api.ErreurMetier;
import fr.corpusmots.commun.service.Pagination;
import fr.corpusmots.referentiels.service.ReferentielsService;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import java.util.List;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.parameters.RequestBody;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.jboss.resteasy.reactive.ResponseStatus;

/** Albums de l'école et leurs Modules (FR-4, FR-5), ouverts à tout enseignant actif. */
@Path("/albums")
@Produces(MediaType.APPLICATION_JSON)
public class AlbumsResource {

    @Inject
    ReferentielsService referentiels;

    @GET
    @Operation(operationId = "rechercherAlbums",
            summary = "Albums dont le titre contient le texte cherché ou lui ressemble, du plus proche au moins proche")
    public PageAlbumsDto rechercher(
            @Parameter(description = "Texte cherché, sans tenir compte de la casse, des accents ni de l'article ;"
                    + " moins de 2 caractères : aucun résultat") @QueryParam("recherche") String recherche,
            @Parameter(description = "Numéro de page, à partir de 0") @QueryParam("page") Integer page,
            @Parameter(description = "Taille de la page, 100 au plus (20 par défaut)") @QueryParam("taille")
            Integer taille) {
        return PageAlbumsDto.de(referentiels.rechercherAlbums(recherche, Pagination.de(page, taille)));
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @ResponseStatus(201)
    @Operation(operationId = "creerAlbum", summary = "Créer un Album, visible aussitôt de toute l'école")
    @APIResponse(responseCode = "201", description = "Album créé, dont l'enseignant connecté est le créateur",
            content = @Content(mediaType = MediaType.APPLICATION_JSON,
                    schema = @Schema(implementation = AlbumDto.class)))
    public AlbumDto creer(@RequestBody(required = true) NouvelAlbumDto nouvel) {
        if (nouvel == null) {
            throw new ErreurMetier(400, "requete.invalide", "Le corps de la requête est obligatoire");
        }
        return AlbumDto.de(referentiels.creerAlbum(nouvel.enCommande()));
    }

    @GET
    @Path("/titres-proches")
    @Operation(operationId = "listerTitresProches",
            summary = "Au plus 5 Albums de titre identique ou proche, à signaler avant de créer un Album")
    public List<AlbumDto> titresProches(
            @Parameter(description = "Titre de l'Album à créer, sans tenir compte de la casse, des accents ni de"
                    + " l'article ; moins de 2 caractères : aucun résultat") @QueryParam("titre") String titre) {
        return referentiels.titresProches(titre).stream().map(AlbumDto::de).toList();
    }

    @GET
    @Path("/{id}/modules")
    @Operation(operationId = "listerModulesDeLAlbum", summary = "Modules de l'Album, dans leur ordre")
    public List<ModuleDto> modules(@PathParam("id") UUID id) {
        return referentiels.modulesDeLAlbum(id).stream().map(ModuleDto::de).toList();
    }
}
