package fr.corpusmots.vocabulaire.api;

import fr.corpusmots.commun.api.ErreurMetier;
import fr.corpusmots.commun.service.EnseignantCourant;
import fr.corpusmots.commun.service.Pagination;
import fr.corpusmots.commun.service.Section;
import fr.corpusmots.vocabulaire.service.AjouterImageCommande;
import fr.corpusmots.vocabulaire.service.CategorieGrammaticale;
import fr.corpusmots.vocabulaire.service.ClasserImageCommande;
import fr.corpusmots.vocabulaire.service.FichierImageVue;
import fr.corpusmots.vocabulaire.service.FichierTeleverseVue;
import fr.corpusmots.vocabulaire.service.FichiersImages;
import fr.corpusmots.vocabulaire.service.Images;
import fr.corpusmots.vocabulaire.service.Licence;
import fr.corpusmots.vocabulaire.service.ModifierDescriptionImageCommande;
import fr.corpusmots.vocabulaire.service.ProvenanceImages;
import fr.corpusmots.vocabulaire.service.ReductionImages;
import fr.corpusmots.vocabulaire.service.TypeImage;
import fr.corpusmots.vocabulaire.service.UsageFichierImage;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
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
import java.util.List;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.enums.SchemaType;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.parameters.RequestBody;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.jboss.resteasy.reactive.ResponseStatus;

/**
 * Images de l'enseignant connecté. {@code GET /images?provenance=mes-mots|banque|tout&page=&taille=} rend une page de
 * la Banque (FR-18), filtrée par {@code VisibiliteImages} (AD-2) ; une provenance inconnue ou une taille hors de 1 à 100
 * répond {@code 400 requete.invalide}. {@code POST /images} ajoute une Image dans Mes mots, sans Préparation (FR-13) ;
 * {@code GET /images/{id}} rend la Carte d'identité d'une Image consultable (FR-14), sinon
 * {@code 404 ressource.introuvable} ; {@code PUT /images/{id}/description} en modifie le type, la licence, la source,
 * l'auteur et l'Album d'origine, par le seul propriétaire ({@code 403 image.reservee_au_proprietaire} pour les autres) ;
 * {@code PUT /images/{id}/classement} en remplace les Sections, le Module et les Thèmes, avec les mêmes refus ;
 * {@code GET /images/{id}/sens} liste au propriétaire les Sens qu'il peut lui donner et {@code PUT /images/{id}/sens}
 * en change le Sens, refusé en {@code 409 image.sens_non_modifiable} dès que l'Image a un lien ;
 * {@code POST /images/{id}/sens} lui donne un Sens tapé par le propriétaire, créé s'il n'existe pas, avec les mêmes
 * refus.
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
        UUID albumId = albumId(ajout.albumId);
        // Lecture et réduction coûteuses hors transaction : aucune connexion tenue pendant le décodage.
        FichierTeleverseVue prepare = reduction.preparerTeleversement(ajout.fichier.uploadedFile(),
                ajout.fichier.size(), ajout.typeImage, ajout.licence);
        return MesMotsImageDto.de(images.ajouterDansMesMots(new AjouterImageCommande(prepare.fichier(), ajout.mot,
                prepare.typeImage(), prepare.licence(), ajout.source, ajout.auteur, albumId)));
    }

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    @Operation(operationId = "listerImagesBanque",
            summary = "Images de la Banque pour une provenance : Mes mots (par défaut), Banque de l'école ou Tout ;"
                    + " par forme du Mot, puis Sens, puis les plus récentes d'abord")
    @APIResponse(responseCode = "200", description = "Page d'Images et nombre total d'Images de la provenance",
            content = @Content(mediaType = MediaType.APPLICATION_JSON,
                    schema = @Schema(implementation = PageImagesBanqueDto.class)))
    public PageImagesBanqueDto listerBanque(
            @Parameter(description = "mes-mots (par défaut) : mes Images, versées ou non ; banque : les Images versées"
                    + " de tous ; tout : l'union des deux",
                    schema = @Schema(type = SchemaType.STRING, enumeration = { "mes-mots", "banque", "tout" },
                            defaultValue = "mes-mots"))
            @QueryParam("provenance") String provenance,
            @Parameter(description = "Numéro de page, à partir de 0",
                    schema = @Schema(type = SchemaType.INTEGER, minimum = "0", defaultValue = "0"))
            @QueryParam("page") String page,
            @Parameter(description = "Taille de la page, de 1 à 100 (100 par défaut)",
                    schema = @Schema(type = SchemaType.INTEGER, minimum = "1", maximum = "100", defaultValue = "100"))
            @QueryParam("taille") String taille) {
        // Absente ou vide (provenance=) : la valeur par défaut, Mes mots.
        ProvenanceImages choisie = provenance == null || provenance.isBlank() ? ProvenanceImages.MES_MOTS
                : ProvenanceImages.deValeur(provenance)
                        .orElseThrow(() -> new ErreurMetier(400, "requete.invalide",
                                "La provenance doit valoir mes-mots, banque ou tout"));
        Integer numero = entier(page, "page");
        Integer nombre = entier(taille, "taille");
        Pagination pagination = Pagination.de(numero, nombre == null ? Pagination.TAILLE_MAX : nombre);
        return PageImagesBanqueDto.de(images.banque(choisie, pagination));
    }

    @GET
    @Path("/{id}")
    @Produces(MediaType.APPLICATION_JSON)
    @Operation(operationId = "carteIdentiteImage",
            summary = "Carte d'identité d'une Image que l'enseignant connecté peut consulter")
    @APIResponse(responseCode = "200", description = "Carte d'identité de l'Image",
            content = @Content(mediaType = MediaType.APPLICATION_JSON,
                    schema = @Schema(implementation = CarteIdentiteImageDto.class)))
    public CarteIdentiteImageDto carteIdentite(@PathParam("id") UUID id) {
        return CarteIdentiteImageDto.de(images.carteIdentite(id)
                .orElseThrow(() -> new ErreurMetier(404, "ressource.introuvable",
                        "Aucune image consultable ne porte cet identifiant")));
    }

    @PUT
    @Path("/{id}/description")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    @Operation(operationId = "modifierDescriptionImage",
            summary = "Modifier le type, la licence, la source, l'auteur et l'Album d'origine d'une Image (son seul"
                    + " propriétaire) ; passer en image d'album réduit l'Image à 400 × 400 px")
    @APIResponse(responseCode = "200", description = "Carte d'identité à jour de l'Image",
            content = @Content(mediaType = MediaType.APPLICATION_JSON,
                    schema = @Schema(implementation = CarteIdentiteImageDto.class)))
    public CarteIdentiteImageDto modifierDescription(@PathParam("id") UUID id,
            @RequestBody(required = true) DescriptionImageDto description) {
        if (description == null) {
            throw new ErreurMetier(400, "requete.invalide", "Le corps de la requête est obligatoire");
        }
        TypeImage type = TypeImage.deValeur(description.typeImage())
                .orElseThrow(() -> new ErreurMetier(400, "requete.invalide", "Type d'image absent ou inconnu"));
        Licence licence = description.licence() == null || description.licence().isBlank() ? null
                : Licence.deValeur(description.licence())
                        .orElseThrow(() -> new ErreurMetier(400, "requete.invalide", "Licence inconnue"));
        return CarteIdentiteImageDto.de(images.modifierDescription(id, new ModifierDescriptionImageCommande(type,
                licence, description.source(), description.auteur(), description.albumId())));
    }

    @PUT
    @Path("/{id}/classement")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    @Operation(operationId = "classerImage",
            summary = "Modifier les Sections, le Module et les Thèmes d'une Image (son seul propriétaire)")
    @APIResponse(responseCode = "200", description = "Carte d'identité à jour de l'Image",
            content = @Content(mediaType = MediaType.APPLICATION_JSON,
                    schema = @Schema(implementation = CarteIdentiteImageDto.class)))
    public CarteIdentiteImageDto classer(@PathParam("id") UUID id,
            @RequestBody(required = true) ClassementImageDto classement) {
        if (classement == null || classement.sections() == null || classement.themeIds() == null) {
            throw new ErreurMetier(400, "requete.invalide", "Les sections et les thèmes sont obligatoires");
        }
        List<Section> sections = classement.sections().stream()
                .map(valeur -> Section.deValeur(valeur)
                        .orElseThrow(() -> new ErreurMetier(400, "requete.invalide", "Section absente ou inconnue")))
                .toList();
        return CarteIdentiteImageDto.de(images.classer(id,
                new ClasserImageCommande(sections, classement.moduleId(), classement.themeIds())));
    }

    @GET
    @Path("/{id}/sens")
    @Produces(MediaType.APPLICATION_JSON)
    @Operation(operationId = "listerSensImage",
            summary = "Sens que le propriétaire peut donner à son Image : ceux de son Mot qui lui sont visibles, le Sens"
                    + " actuel compris")
    @APIResponse(responseCode = "200", description = "Sens proposés, « à compléter » d'abord puis par libellé",
            content = @Content(mediaType = MediaType.APPLICATION_JSON,
                    schema = @Schema(type = SchemaType.ARRAY, implementation = SensProposeImageDto.class)))
    public List<SensProposeImageDto> sensProposes(@PathParam("id") UUID id) {
        return images.sensProposes(id).stream().map(SensProposeImageDto::de).toList();
    }

    @PUT
    @Path("/{id}/sens")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    @Operation(operationId = "changerSensImage",
            summary = "Changer le Sens d'une Image pour un autre Sens de son Mot (son seul propriétaire), tant qu'elle"
                    + " n'est liée dans aucune Préparation")
    @APIResponse(responseCode = "200", description = "Carte d'identité à jour de l'Image",
            content = @Content(mediaType = MediaType.APPLICATION_JSON,
                    schema = @Schema(implementation = CarteIdentiteImageDto.class)))
    public CarteIdentiteImageDto changerSens(@PathParam("id") UUID id,
            @RequestBody(required = true) SensImageDto sens) {
        if (sens == null || sens.sensId() == null) {
            throw new ErreurMetier(400, "requete.invalide", "Le sens est obligatoire");
        }
        return CarteIdentiteImageDto.de(images.changerSens(id, sens.sensId()));
    }

    @POST
    @Path("/{id}/sens")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    @Operation(operationId = "creerSensImage",
            summary = "Créer un Sens (ou réutiliser celui de même libellé) pour le Mot d'une Image et le lui donner (son"
                    + " seul propriétaire), tant qu'elle n'est liée dans aucune Préparation")
    @APIResponse(responseCode = "200", description = "Carte d'identité à jour de l'Image",
            content = @Content(mediaType = MediaType.APPLICATION_JSON,
                    schema = @Schema(implementation = CarteIdentiteImageDto.class)))
    public CarteIdentiteImageDto creerSens(@PathParam("id") UUID id,
            @RequestBody(required = true) NouveauSensImageDto nouveau) {
        if (nouveau == null) {
            throw new ErreurMetier(400, "requete.invalide", "Le corps de la requête est obligatoire");
        }
        CategorieGrammaticale categorie = CategorieGrammaticale.deValeur(nouveau.categorie())
                .orElseThrow(() -> new ErreurMetier(400, "requete.invalide",
                        "Catégorie grammaticale absente ou inconnue"));
        return CarteIdentiteImageDto.de(images.creerSens(id, nouveau.libelle(), categorie));
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

    /**
     * Entier d'un paramètre de requête, {@code null} s'il est absent : un texte non entier répond
     * {@code 400 requete.invalide}, et non {@code 404} comme le ferait la conversion de JAX-RS.
     */
    private static Integer entier(String saisie, String nom) {
        if (saisie == null) {
            return null;
        }
        try {
            return Integer.valueOf(saisie.strip());
        } catch (NumberFormatException erreur) {
            throw new ErreurMetier(400, "requete.invalide", nom + " doit être un nombre entier");
        }
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
