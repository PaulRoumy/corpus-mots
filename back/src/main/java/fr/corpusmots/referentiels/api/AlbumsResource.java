package fr.corpusmots.referentiels.api;

import fr.corpusmots.commun.service.Pagination;
import fr.corpusmots.referentiels.service.ReferentielsService;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import java.util.List;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;

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

    @GET
    @Path("/{id}/modules")
    @Operation(operationId = "listerModulesDeLAlbum", summary = "Modules de l'Album, dans leur ordre")
    public List<ModuleDto> modules(@PathParam("id") UUID id) {
        return referentiels.modulesDeLAlbum(id).stream().map(ModuleDto::de).toList();
    }
}
