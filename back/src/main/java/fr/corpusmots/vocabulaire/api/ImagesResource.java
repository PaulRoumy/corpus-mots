package fr.corpusmots.vocabulaire.api;

import fr.corpusmots.commun.api.ErreurMetier;
import fr.corpusmots.commun.service.EnseignantCourant;
import fr.corpusmots.vocabulaire.service.FichierImageVue;
import fr.corpusmots.vocabulaire.service.FichiersImages;
import fr.corpusmots.vocabulaire.service.UsageFichierImage;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.EntityTag;
import jakarta.ws.rs.core.HttpHeaders;
import jakarta.ws.rs.core.Request;
import jakarta.ws.rs.core.Response;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.enums.SchemaType;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

/**
 * Fichiers des Images (AD-23) : servis uniquement par {@link FichiersImages#lire}, qui applique la visibilité (AD-2).
 * Une Image que l'enseignant connecté ne peut pas consulter répond {@code 404 ressource.introuvable}, comme une Image
 * inexistante. Réponse avec {@code Cache-Control: private, max-age=86400} et un {@code ETag} égal à la version de
 * l'Image ; le front la charge en {@code blob}, jamais par une URL portant un jeton.
 */
@Path("/images")
public class ImagesResource {

    static final String CACHE_FICHIER = "private, max-age=86400";
    static final String TAILLE_MINIATURE = "miniature";
    static final String TAILLE_GRANDE = "grande";

    @Inject
    FichiersImages fichiers;

    @Inject
    EnseignantCourant enseignantCourant;

    @GET
    @Path("/{id}/fichier")
    @Operation(operationId = "fichierImage",
            summary = "Fichier d'une Image que l'enseignant connecté peut consulter (JPEG ou PNG, sans métadonnées)")
    @APIResponse(responseCode = "200", description = "Fichier de l'Image, à la taille demandée",
            content = @Content(mediaType = "image/*", schema = @Schema(type = SchemaType.STRING, format = "binary")))
    public Response fichier(@PathParam("id") UUID id,
            @Parameter(description = "miniature (256 px au plus, pour les listes) ou grande (par défaut)",
                    schema = @Schema(type = SchemaType.STRING, enumeration = { TAILLE_MINIATURE, TAILLE_GRANDE }))
            @QueryParam("taille") String taille,
            @Context Request requete) {
        UsageFichierImage usage = usage(taille);
        FichierImageVue fichier = fichiers.lire(id, enseignantCourant.id(), usage)
                .orElseThrow(() -> new ErreurMetier(404, "ressource.introuvable",
                        "Aucune image consultable ne porte cet identifiant"));
        EntityTag etiquette = new EntityTag(Long.toString(fichier.version()));
        Response.ResponseBuilder inchange = requete.evaluatePreconditions(etiquette);
        Response.ResponseBuilder reponse = inchange != null ? inchange
                : Response.ok(fichier.octets(), fichier.typeMime());
        return reponse.tag(etiquette).header(HttpHeaders.CACHE_CONTROL, CACHE_FICHIER).build();
    }

    private static UsageFichierImage usage(String taille) {
        if (taille == null || taille.equals(TAILLE_GRANDE)) {
            return UsageFichierImage.GRANDE;
        }
        if (taille.equals(TAILLE_MINIATURE)) {
            return UsageFichierImage.MINIATURE;
        }
        throw new ErreurMetier(400, "requete.invalide", "La taille doit valoir miniature ou grande");
    }
}
