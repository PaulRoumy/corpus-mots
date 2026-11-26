package fr.corpusmots.preparations.api;

import fr.corpusmots.commun.api.ErreurMetier;
import fr.corpusmots.commun.service.Pagination;
import fr.corpusmots.commun.service.Section;
import fr.corpusmots.preparations.service.AjouterMotCommande;
import fr.corpusmots.preparations.service.MotPreparationVue;
import fr.corpusmots.preparations.service.PreparationsService;
import fr.corpusmots.preparations.service.TeleverserImageMotCommande;
import fr.corpusmots.vocabulaire.service.CategorieGrammaticale;
import fr.corpusmots.vocabulaire.service.FichierTeleverseVue;
import fr.corpusmots.vocabulaire.service.PictogrammeTelechargeVue;
import fr.corpusmots.vocabulaire.service.ReductionImages;
import fr.corpusmots.vocabulaire.service.SuggestionsArasaac;
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
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.enums.SchemaType;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.parameters.RequestBody;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.jboss.resteasy.reactive.ResponseStatus;
import org.jboss.resteasy.reactive.RestResponse;

/**
 * Préparations de l'enseignant connecté (FR-6). La Préparation d'un collègue répond {@code 404 ressource.introuvable},
 * comme un identifiant inexistant, et n'apparaît dans aucune liste.
 */
@Path("/preparations")
@Produces(MediaType.APPLICATION_JSON)
public class PreparationsResource {

    /** Nombre maximal de Mots d'un « Tout reprendre » (story 2.9). */
    static final int REPRISES_MAXIMUM = 200;

    @Inject
    PreparationsService preparations;

    @Inject
    ReductionImages reduction;

    @Inject
    SuggestionsArasaac suggestionsArasaac;

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
    @Path("/{id}/nom")
    @Consumes(MediaType.APPLICATION_JSON)
    @Operation(operationId = "renommerPreparation",
            summary = "Renommer une Préparation de l'enseignant connecté ; un nom vide l'efface et le titre de l'Album"
                    + " s'affiche de nouveau")
    public CartePreparationDto renommer(@PathParam("id") UUID id,
            @RequestBody(required = true) NomPreparationDto nom) {
        if (nom == null) {
            throw new ErreurMetier(400, "requete.invalide", "Le corps de la requête est obligatoire");
        }
        return CartePreparationDto.de(preparations.renommer(id, nom.nom()));
    }

    @POST
    @Path("/{id}/duplication")
    @Consumes(MediaType.APPLICATION_JSON)
    @ResponseStatus(201)
    @Operation(operationId = "dupliquerPreparation",
            summary = "Dupliquer une Préparation de l'enseignant connecté pour une Section : mêmes Mots, Sens retenus et"
                    + " Images liées (origine reutilisee), aucune Image copiée")
    @APIResponse(responseCode = "201", description = "Carte de la Préparation créée",
            content = @Content(mediaType = MediaType.APPLICATION_JSON,
                    schema = @Schema(implementation = CartePreparationDto.class)))
    public CartePreparationDto dupliquer(@PathParam("id") UUID id,
            @RequestBody(required = true) DuplicationPreparationDto duplication) {
        Section section = (duplication == null ? Optional.<Section>empty()
                : Section.deValeur(duplication.section()))
                .orElseThrow(() -> new ErreurMetier(400, "requete.invalide", "La section doit valoir ps, ms ou gs"));
        return CartePreparationDto.de(preparations.dupliquer(id, section));
    }

    @DELETE
    @Path("/{id}")
    @ResponseStatus(204)
    @Operation(operationId = "supprimerPreparation",
            summary = "Supprimer une Préparation de l'enseignant connecté ; ses Mots la quittent, aucune Image n'est"
                    + " supprimée")
    @APIResponse(responseCode = "204", description = "Préparation supprimée")
    public void supprimer(@PathParam("id") UUID id) {
        preparations.supprimer(id);
    }

    @GET
    @Path("/{id}/detection")
    @Operation(operationId = "detecterMotPreparation",
            summary = "Mots existants de même forme que la saisie, visibles de l'enseignant connecté, avec leurs Sens,"
                    + " leurs Albums et leurs Images classées ; rien n'est écrit")
    public DetectionPreparationDto detecter(@PathParam("id") UUID id,
            @Parameter(description = "Saisie en cours, de 2 à 100 caractères une fois normalisée (l'article initial"
                    + " est ignoré)", required = true) @QueryParam("saisie") String saisie) {
        return DetectionPreparationDto.de(preparations.detecter(id, saisie));
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
        if (nouveau.motId() != null && nouveau.sensId() == null && nouveau.nouveauSens() == null) {
            throw new ErreurMetier(400, "requete.invalide", "Le mot ne se donne qu'avec un sens ou un nouveau sens");
        }
        AjouterMotCommande.NouveauSens nouveauSens = null;
        if (nouveau.nouveauSens() != null) {
            if (nouveau.sensId() != null) {
                throw new ErreurMetier(400, "requete.invalide", "Un sens existant ou un nouveau sens, pas les deux");
            }
            nouveauSens = new AjouterMotCommande.NouveauSens(nouveau.nouveauSens().libelle(),
                    CategorieGrammaticale.deValeur(nouveau.nouveauSens().categorie())
                            .orElseThrow(() -> new ErreurMetier(400, "requete.invalide",
                                    "Catégorie grammaticale absente ou inconnue")));
        }
        return MotPreparationDto.de(preparations.ajouterMot(id,
                new AjouterMotCommande(nouveau.saisie(), nouveau.motId(), nouveau.sensId(), nouveauSens)));
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
    @Path("/{id}/mots/reutilisation")
    @Consumes(MediaType.APPLICATION_JSON)
    @ResponseStatus(201)
    @Operation(operationId = "reutiliserImageMotPreparation",
            summary = "Ajouter en fin de Préparation de l'enseignant connecté le Mot d'une Image existante, avec le Sens"
                    + " de l'Image, et la lui lier sans copie (origine reutilisee)")
    @APIResponse(responseCode = "201", description = "Mot ajouté, illustré par l'Image retenue",
            content = @Content(mediaType = MediaType.APPLICATION_JSON,
                    schema = @Schema(implementation = MotPreparationDto.class)))
    public MotPreparationDto reutiliserImage(@PathParam("id") UUID id,
            @RequestBody(required = true) ReutilisationImageMotPreparationDto reutilisation) {
        if (reutilisation == null || reutilisation.motId() == null || reutilisation.imageId() == null) {
            throw new ErreurMetier(400, "requete.invalide", "Le mot et l'image sont obligatoires");
        }
        return MotPreparationDto.de(preparations.reutiliserImage(id, reutilisation.enCommande()));
    }

    @GET
    @Path("/{id}/reprises")
    @Operation(operationId = "listerReprisesPreparation",
            summary = "Mots déjà illustrés pour l'Album d'une Préparation de l'enseignant connecté, chacun avec son"
                    + " Image proposée, par forme ; sans les Mots déjà présents ni écartés ; rien n'est écrit")
    public List<RepriseMotPreparationDto> reprises(@PathParam("id") UUID id) {
        return preparations.reprises(id).stream().map(RepriseMotPreparationDto::de).toList();
    }

    @POST
    @Path("/{id}/reprises")
    @Consumes(MediaType.APPLICATION_JSON)
    @Operation(operationId = "reprendreMotsPreparation",
            summary = "Ajouter en fin de Préparation de l'enseignant connecté ceux de ces Mots qui sont encore"
                    + " candidats, dans l'ordre de l'Encart, chacun avec son Image proposée (origine reutilisee) ; les"
                    + " autres sont ignorés")
    @APIResponse(responseCode = "200", description = "Mots ajoutés, dans l'ordre ; vide si aucun n'était plus candidat",
            content = @Content(mediaType = MediaType.APPLICATION_JSON,
                    schema = @Schema(type = SchemaType.ARRAY, implementation = MotPreparationDto.class)))
    public List<MotPreparationDto> reprendre(@PathParam("id") UUID id,
            @RequestBody(required = true) RepriseMotsPreparationDto reprise) {
        if (reprise == null || reprise.motIds() == null || reprise.motIds().isEmpty()
                || reprise.motIds().size() > REPRISES_MAXIMUM || reprise.motIds().stream().anyMatch(Objects::isNull)) {
            throw new ErreurMetier(400, "requete.invalide",
                    "La liste des mots doit compter de 1 à " + REPRISES_MAXIMUM + " identifiants");
        }
        return preparations.reprendre(id, new LinkedHashSet<>(reprise.motIds())).stream()
                .map(MotPreparationDto::de).toList();
    }

    @PUT
    @Path("/{id}/ecartes/{motId}")
    @ResponseStatus(204)
    @Operation(operationId = "ecarterMotPreparation",
            summary = "Écarter un Mot de l'Encart « mots déjà illustrés » d'une Préparation de l'enseignant connecté ;"
                    + " sans effet s'il l'est déjà, rien n'est supprimé de la banque")
    @APIResponse(responseCode = "204", description = "Mot écarté")
    public void ecarter(@PathParam("id") UUID id, @PathParam("motId") UUID motId) {
        preparations.ecarter(id, motId);
    }

    @DELETE
    @Path("/{id}/ecartes/{motId}")
    @ResponseStatus(204)
    @Operation(operationId = "annulerEcartMotPreparation",
            summary = "Rendre à l'Encart « mots déjà illustrés » un Mot écarté d'une Préparation de l'enseignant"
                    + " connecté ; sans effet s'il ne l'était pas")
    @APIResponse(responseCode = "204", description = "Mot rendu à l'Encart")
    public void annulerEcart(@PathParam("id") UUID id, @PathParam("motId") UUID motId) {
        preparations.annulerEcart(id, motId);
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
        // Lecture et réduction coûteuses hors transaction : aucune connexion tenue pendant le décodage.
        FichierTeleverseVue prepare = reduction.preparerTeleversement(televersement.fichier.uploadedFile(),
                televersement.fichier.size(), televersement.typeImage, televersement.licence);
        return MotPreparationDto.de(preparations.televerserImage(id, motPreparationId,
                new TeleverserImageMotCommande(prepare.fichier(), prepare.typeImage(), prepare.licence(),
                        televersement.source, televersement.auteur,
                        Boolean.TRUE.equals(televersement.remplacer), null)));
    }

    @POST
    @Path("/{id}/mots/{motPreparationId}/pictogramme")
    @Consumes(MediaType.APPLICATION_JSON)
    @Operation(operationId = "choisirPictogrammeMotPreparation",
            summary = "Illustrer un Mot d'une Préparation de l'enseignant connecté avec un pictogramme ARASAAC :"
                    + " l'Image que l'enseignant possède déjà pour ce pictogramme et le Sens retenu est liée, sinon"
                    + " le back télécharge le pictogramme et crée l'Image")
    @APIResponse(responseCode = "200",
            description = "Image déjà possédée par l'enseignant pour ce pictogramme et ce Sens, liée au Mot (origine"
                    + " reutilisee), sans téléchargement ni création",
            content = @Content(mediaType = MediaType.APPLICATION_JSON,
                    schema = @Schema(implementation = MotPreparationDto.class)))
    @APIResponse(responseCode = "201",
            description = "Image créée (privee, image_libre, licence ARASAAC), réduite et liée au Mot (origine nouvelle)",
            content = @Content(mediaType = MediaType.APPLICATION_JSON,
                    schema = @Schema(implementation = MotPreparationDto.class)))
    public RestResponse<MotPreparationDto> choisirPictogramme(@PathParam("id") UUID id,
            @PathParam("motPreparationId") UUID motPreparationId,
            @RequestBody(required = true) PictogrammeMotPreparationDto choix) {
        if (choix == null || choix.idArasaac() == null || choix.idArasaac() <= 0) {
            throw new ErreurMetier(400, "requete.invalide", "Identifiant ARASAAC positif attendu");
        }
        // Préparation d'un collègue (404) ou Mot déjà illustré (409) : refus avant ARASAAC (lecture sans verrou).
        preparations.verifierMot(id, motPreparationId);
        // Pictogramme déjà possédé pour ce Mot et ce Sens (story 2.11) : l'Image existante est liée, sans appel ARASAAC.
        Optional<MotPreparationVue> reutilise =
                preparations.lierImagePossedeeDuPictogramme(id, motPreparationId, choix.idArasaac());
        if (reutilise.isPresent()) {
            return RestResponse.ok(MotPreparationDto.de(reutilise.get()));
        }
        // Téléchargement et réduction hors transaction (AD-9, AD-17), puis création et lien dans une transaction.
        PictogrammeTelechargeVue pictogramme = suggestionsArasaac.telecharger(choix.idArasaac());
        return RestResponse.status(RestResponse.Status.CREATED, MotPreparationDto.de(preparations.televerserImage(id,
                motPreparationId, new TeleverserImageMotCommande(pictogramme.fichier(), pictogramme.typeImage(),
                        pictogramme.licence(), pictogramme.source(), pictogramme.auteur(), false,
                        pictogramme.arasaacId()))));
    }

    @GET
    @Path("/{id}/mots/{motPreparationId}/propositions")
    @Operation(operationId = "proposerImagesMotPreparation",
            summary = "Images proposables d'un Mot d'une Préparation de l'enseignant connecté, de tous ses Sens ou"
                    + " d'un seul, classées comme la détection ; rien n'est écrit")
    public DetectionMotDto propositions(@PathParam("id") UUID id,
            @PathParam("motPreparationId") UUID motPreparationId,
            @Parameter(description = "Sens dont montrer les Images ; absent, les Images de tous les Sens. La liste des"
                    + " Sens visibles reste complète") @QueryParam("sensId") UUID sensId) {
        return DetectionMotDto.de(preparations.propositions(id, motPreparationId, sensId), true);
    }

    @PUT
    @Path("/{id}/mots/{motPreparationId}/sens")
    @Consumes(MediaType.APPLICATION_JSON)
    @Operation(operationId = "changerSensMotPreparation",
            summary = "Changer le Sens retenu d'un Mot d'une Préparation de l'enseignant connecté, parmi ses Sens"
                    + " visibles ; l'Image liée d'un autre Sens est seulement déliée")
    public MotPreparationDto changerSens(@PathParam("id") UUID id,
            @PathParam("motPreparationId") UUID motPreparationId,
            @RequestBody(required = true) ChoixSensMotPreparationDto choix) {
        if (choix == null || choix.sensId() == null) {
            throw new ErreurMetier(400, "requete.invalide", "Le sens est obligatoire");
        }
        return MotPreparationDto.de(preparations.changerSens(id, motPreparationId, choix.sensId()));
    }

    @POST
    @Path("/{id}/mots/{motPreparationId}/sens")
    @Consumes(MediaType.APPLICATION_JSON)
    @Operation(operationId = "creerSensMotPreparation",
            summary = "Créer un Sens (ou réutiliser celui de même libellé) pour un Mot d'une Préparation de l'enseignant"
                    + " connecté et le retenir ; l'Image liée d'un autre Sens est seulement déliée")
    @APIResponse(responseCode = "200", description = "Mot de Préparation avec son nouveau Sens retenu",
            content = @Content(mediaType = MediaType.APPLICATION_JSON,
                    schema = @Schema(implementation = MotPreparationDto.class)))
    public MotPreparationDto creerSens(@PathParam("id") UUID id,
            @PathParam("motPreparationId") UUID motPreparationId,
            @RequestBody(required = true) NouveauSensMotPreparationDto nouveau) {
        if (nouveau == null) {
            throw new ErreurMetier(400, "requete.invalide", "Le corps de la requête est obligatoire");
        }
        CategorieGrammaticale categorie = CategorieGrammaticale.deValeur(nouveau.categorie())
                .orElseThrow(() -> new ErreurMetier(400, "requete.invalide",
                        "Catégorie grammaticale absente ou inconnue"));
        return MotPreparationDto.de(preparations.creerSens(id, motPreparationId, nouveau.libelle(), categorie));
    }

    @PUT
    @Path("/{id}/mots/{motPreparationId}/image")
    @Consumes(MediaType.APPLICATION_JSON)
    @Operation(operationId = "choisirImageMotPreparation",
            summary = "Lier une Image existante à un Mot d'une Préparation de l'enseignant connecté, à la place de"
                    + " celle qu'il a (origine reutilisee) ; l'Image remplacée est seulement déliée")
    public MotPreparationDto choisirImage(@PathParam("id") UUID id,
            @PathParam("motPreparationId") UUID motPreparationId,
            @RequestBody(required = true) ChoixImageMotPreparationDto choix) {
        if (choix == null || choix.imageId() == null) {
            throw new ErreurMetier(400, "requete.invalide", "L'image est obligatoire");
        }
        return MotPreparationDto.de(preparations.remplacerImage(id, motPreparationId, choix.imageId()));
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
