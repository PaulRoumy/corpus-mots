package fr.corpusmots.preparations.api;

import fr.corpusmots.commun.api.ErreurMetier;
import fr.corpusmots.commun.service.Pagination;
import fr.corpusmots.commun.service.Section;
import fr.corpusmots.preparations.service.PreparationsService;
import fr.corpusmots.preparations.service.TeleverserImageMotCommande;
import fr.corpusmots.vocabulaire.service.Licence;
import fr.corpusmots.vocabulaire.service.ImageReduiteVue;
import fr.corpusmots.vocabulaire.service.ReductionImages;
import fr.corpusmots.vocabulaire.service.TypeImage;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.util.List;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.parameters.RequestBody;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.jboss.resteasy.reactive.ResponseStatus;

/**
 * Préparations de l'enseignant connecté (FR-6). La Préparation d'un collègue répond {@code 404 ressource.introuvable},
 * comme un identifiant inexistant, et n'apparaît dans aucune liste.
 */
@Path("/preparations")
@Produces(MediaType.APPLICATION_JSON)
public class PreparationsResource {

    @Inject
    PreparationsService preparations;

    @Inject
    ReductionImages reduction;

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @ResponseStatus(201)
    @Operation(operationId = "creerPreparation", summary = "Créer une Préparation pour un Album existant")
    @APIResponse(responseCode = "201", description = "Préparation créée, propriété de l'enseignant connecté",
            content = @Content(mediaType = MediaType.APPLICATION_JSON,
                    schema = @Schema(implementation = PreparationDto.class)))
    public PreparationDto creer(@RequestBody(required = true) NouvellePreparationDto nouvelle) {
        if (nouvelle == null) {
            throw new ErreurMetier(400, "requete.invalide", "Le corps de la requête est obligatoire");
        }
        return PreparationDto.de(preparations.creer(nouvelle.enCommande()));
    }

    @GET
    @Operation(operationId = "listerMesPreparations",
            summary = "Préparations de l'enseignant connecté, les plus récentes d'abord")
    public PageCartesPreparationDto lister(
            @Parameter(description = "Numéro de page, à partir de 0") @QueryParam("page") Integer page,
            @Parameter(description = "Taille de la page, 100 au plus (20 par défaut)") @QueryParam("taille")
            Integer taille) {
        return PageCartesPreparationDto.de(preparations.mesPreparations(Pagination.de(page, taille)));
    }

    @GET
    @Path("/derniere-section")
    @Operation(operationId = "lireDerniereSection",
            summary = "Section de la Préparation la plus récente de l'enseignant connecté")
    public DerniereSectionDto derniereSection() {
        return new DerniereSectionDto(preparations.derniereSection().map(Section::valeur).orElse(null));
    }

    @GET
    @Path("/{id}")
    @Operation(operationId = "lirePreparation", summary = "Une Préparation de l'enseignant connecté")
    public PreparationDto lire(@PathParam("id") UUID id) {
        return PreparationDto.de(preparations.lire(id));
    }

    @PUT
    @Path("/{id}/reglages")
    @Consumes(MediaType.APPLICATION_JSON)
    @Operation(operationId = "reglerPreparation",
            summary = "Remplacer le Module, le Thème par défaut et le Temps passé d'une Préparation de l'enseignant connecté")
    public PreparationDto regler(@PathParam("id") UUID id, @RequestBody(required = true) ReglagesPreparationDto reglages) {
        if (reglages == null) {
            throw new ErreurMetier(400, "requete.invalide", "Le corps de la requête est obligatoire");
        }
        return PreparationDto.de(preparations.regler(id, reglages.enCommande()));
    }

    @POST
    @Path("/{id}/mots")
    @Consumes(MediaType.APPLICATION_JSON)
    @ResponseStatus(201)
    @Operation(operationId = "ajouterMotPreparation",
            summary = "Ajouter en fin de Préparation de l'enseignant connecté un Mot saisi, normalisé par le Lexique")
    @APIResponse(responseCode = "201", description = "Mot ajouté, avec le Sens retenu pour lui",
            content = @Content(mediaType = MediaType.APPLICATION_JSON,
                    schema = @Schema(implementation = MotPreparationDto.class)))
    public MotPreparationDto ajouterMot(@PathParam("id") UUID id,
            @RequestBody(required = true) NouveauMotPreparationDto nouveau) {
        if (nouveau == null) {
            throw new ErreurMetier(400, "requete.invalide", "Le corps de la requête est obligatoire");
        }
        return MotPreparationDto.de(preparations.ajouterMot(id, nouveau.saisie()));
    }

    @DELETE
    @Path("/{id}/mots/{motPreparationId}")
    @Operation(operationId = "retirerMotPreparation",
            summary = "Retirer un Mot d'une Préparation de l'enseignant connecté ; le Mot reste dans le Lexique")
    @APIResponse(responseCode = "200", description = "Mot retiré, avec le Sens et la place qu'il avait, pour le rétablir",
            content = @Content(mediaType = MediaType.APPLICATION_JSON,
                    schema = @Schema(implementation = MotPreparationDto.class)))
    public MotPreparationDto retirerMot(@PathParam("id") UUID id,
            @PathParam("motPreparationId") UUID motPreparationId) {
        return MotPreparationDto.de(preparations.retirerMot(id, motPreparationId));
    }

    @POST
    @Path("/{id}/mots/retablissement")
    @Consumes(MediaType.APPLICATION_JSON)
    @ResponseStatus(201)
    @Operation(operationId = "retablirMotPreparation",
            summary = "Rétablir un Mot retiré d'une Préparation de l'enseignant connecté, avec son Sens, à sa place")
    @APIResponse(responseCode = "201", description = "Mot rétabli, à sa place d'origine si elle est libre, sinon en fin",
            content = @Content(mediaType = MediaType.APPLICATION_JSON,
                    schema = @Schema(implementation = MotPreparationDto.class)))
    public MotPreparationDto retablirMot(@PathParam("id") UUID id,
            @RequestBody(required = true) RetablissementMotPreparationDto retablissement) {
        if (retablissement == null) {
            throw new ErreurMetier(400, "requete.invalide", "Le corps de la requête est obligatoire");
        }
        return MotPreparationDto.de(preparations.retablirMot(id, retablissement.enCommande()));
    }

    @POST
    @Path("/{id}/mots/{motPreparationId}/image")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @ResponseStatus(201)
    @Operation(operationId = "televerserImageMotPreparation",
            summary = "Téléverser une Image pour un Mot d'une Préparation de l'enseignant connecté et la lui lier")
    @APIResponse(responseCode = "201", description = "Image créée (privee), réduite et liée au Mot (origine nouvelle)",
            content = @Content(mediaType = MediaType.APPLICATION_JSON,
                    schema = @Schema(implementation = MotPreparationDto.class)))
    public MotPreparationDto televerserImage(@PathParam("id") UUID id,
            @PathParam("motPreparationId") UUID motPreparationId, TeleversementImageMotPreparationDto televersement) {
        if (televersement == null || televersement.fichier == null) {
            throw new ErreurMetier(400, "requete.invalide", "Le fichier est obligatoire");
        }
        TypeImage type = TypeImage.deValeur(televersement.typeImage)
                .orElseThrow(() -> new ErreurMetier(400, "requete.invalide", "Type d'image absent ou inconnu"));
        Licence licence = televersement.licence == null || televersement.licence.isBlank() ? null
                : Licence.deValeur(televersement.licence)
                        .orElseThrow(() -> new ErreurMetier(400, "requete.invalide", "Licence inconnue"));
        // 413 avant de lire le fichier en mémoire : reduire() ne prend que des octets déjà lus.
        reduction.verifierTaille(televersement.fichier.size());
        byte[] octets;
        try {
            octets = Files.readAllBytes(televersement.fichier.uploadedFile());
        } catch (IOException erreur) {
            throw new UncheckedIOException(erreur);
        }
        // Réduction coûteuse hors transaction : aucune connexion tenue pendant le décodage.
        ImageReduiteVue fichier = reduction.reduire(octets, type);
        return MotPreparationDto.de(preparations.televerserImage(id, motPreparationId,
                new TeleverserImageMotCommande(fichier, type, licence, televersement.source, televersement.auteur)));
    }

    @PUT
    @Path("/{id}/mots/{motPreparationId}/theme")
    @Consumes(MediaType.APPLICATION_JSON)
    @Operation(operationId = "changerThemeMotPreparation",
            summary = "Remplacer le Thème d'un Mot d'une Préparation de l'enseignant connecté ; null le retire")
    public MotPreparationDto changerThemeMot(@PathParam("id") UUID id,
            @PathParam("motPreparationId") UUID motPreparationId,
            @RequestBody(required = true) ThemeMotPreparationDto theme) {
        if (theme == null) {
            throw new ErreurMetier(400, "requete.invalide", "Le corps de la requête est obligatoire");
        }
        return MotPreparationDto.de(preparations.changerThemeMot(id, motPreparationId, theme.themeId()));
    }

    @GET
    @Path("/{id}/mots")
    @Operation(operationId = "listerMotsPreparation",
            summary = "Mots d'une Préparation de l'enseignant connecté, dans l'ordre de saisie")
    public List<MotPreparationDto> listerMots(@PathParam("id") UUID id) {
        return preparations.motsDe(id).stream().map(MotPreparationDto::de).toList();
    }
}
