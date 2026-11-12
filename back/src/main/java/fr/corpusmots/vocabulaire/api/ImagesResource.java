package fr.corpusmots.vocabulaire.api;

import fr.corpusmots.commun.api.ErreurMetier;
import fr.corpusmots.commun.service.EnseignantCourant;
import fr.corpusmots.vocabulaire.service.AjouterImageCommande;
import fr.corpusmots.vocabulaire.service.FichierImageVue;
import fr.corpusmots.vocabulaire.service.FichiersImages;
import fr.corpusmots.vocabulaire.service.ImageReduiteVue;
import fr.corpusmots.vocabulaire.service.Images;
import fr.corpusmots.vocabulaire.service.Licence;
import fr.corpusmots.vocabulaire.service.ReductionImages;
import fr.corpusmots.vocabulaire.service.TypeImage;
import fr.corpusmots.vocabulaire.service.UsageFichierImage;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.EntityTag;
import jakarta.ws.rs.core.HttpHeaders;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Request;
import jakarta.ws.rs.core.Response;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.enums.SchemaType;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.jboss.resteasy.reactive.ResponseStatus;

/**
 * Images de l'enseignant connecté. {@code POST /images} ajoute une Image dans Mes mots, sans Préparation (FR-13).
 *
 * <p>Fichiers des Images (AD-23) : servis uniquement par {@link FichiersImages#lire}, qui applique la visibilité (AD-2).
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

    @Inject
    Images images;

    @Inject
    ReductionImages reduction;

    @POST
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Produces(MediaType.APPLICATION_JSON)
    @ResponseStatus(201)
    @Operation(operationId = "ajouterImage",
            summary = "Ajouter une Image dans Mes mots de l'enseignant connecté, sans Préparation ; le Mot est créé"
                    + " s'il n'existe pas")
    @APIResponse(responseCode = "201", description = "Image créée (privee), réduite, sur le Sens par défaut du Mot",
            content = @Content(mediaType = MediaType.APPLICATION_JSON,
                    schema = @Schema(implementation = MesMotsImageDto.class)))
    public MesMotsImageDto ajouter(AjoutImageMesMotsDto ajout) {
        if (ajout == null || ajout.fichier == null) {
            throw new ErreurMetier(400, "requete.invalide", "Le fichier est obligatoire");
        }
        TypeImage type = TypeImage.deValeur(ajout.typeImage)
                .orElseThrow(() -> new ErreurMetier(400, "requete.invalide", "Type d'image absent ou inconnu"));
        Licence licence = ajout.licence == null || ajout.licence.isBlank() ? null
                : Licence.deValeur(ajout.licence)
                        .orElseThrow(() -> new ErreurMetier(400, "requete.invalide", "Licence inconnue"));
        UUID albumId = albumId(ajout.albumId);
        // 413 avant de lire le fichier en mémoire : reduire() ne prend que des octets déjà lus.
        reduction.verifierTaille(ajout.fichier.size());
        byte[] octets;
        try {
            octets = Files.readAllBytes(ajout.fichier.uploadedFile());
        } catch (IOException erreur) {
            throw new UncheckedIOException(erreur);
        }
        // Réduction coûteuse hors transaction : aucune connexion tenue pendant le décodage.
        ImageReduiteVue fichier = reduction.reduire(octets, type);
        return MesMotsImageDto.de(images.ajouterDansMesMots(new AjouterImageCommande(fichier, ajout.mot, type,
                licence, ajout.source, ajout.auteur, albumId)));
    }

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

    /** Album d'origine saisi, {@code null} s'il est vide. */
    private static UUID albumId(String saisie) {
        if (saisie == null || saisie.isBlank()) {
            return null;
        }
        try {
            return UUID.fromString(saisie.strip());
        } catch (IllegalArgumentException erreur) {
            throw new ErreurMetier(400, "requete.invalide", "Identifiant d'album mal formé");
        }
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
