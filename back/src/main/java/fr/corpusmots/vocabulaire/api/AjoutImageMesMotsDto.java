package fr.corpusmots.vocabulaire.api;

import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.openapi.annotations.enums.SchemaType;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.jboss.resteasy.reactive.PartType;
import org.jboss.resteasy.reactive.RestForm;
import org.jboss.resteasy.reactive.multipart.FileUpload;

/**
 * Formulaire {@code multipart/form-data} de l'ajout d'une Image dans Mes mots, sans Préparation : le fichier (JPEG, PNG
 * ou GIF, 20 Mo au plus), le Mot qu'elle illustre, son type, sa source, sa licence, son auteur et, pour une image
 * d'album, son Album d'origine.
 */
public class AjoutImageMesMotsDto {

    @RestForm
    @PartType(MediaType.APPLICATION_OCTET_STREAM)
    @Schema(required = true, type = SchemaType.STRING, format = "binary",
            description = "Fichier JPEG, PNG ou GIF, 20 Mo au plus")
    public FileUpload fichier;

    @RestForm
    @Schema(required = true, description = "Mot illustré, normalisé comme à la saisie (article initial retiré),"
            + " 100 caractères au plus")
    public String mot;

    @RestForm
    @Schema(required = true, enumeration = { "image_album", "image_libre", "photo_personnelle", "inconnu" })
    public String typeImage;

    @RestForm
    @Schema(description = "Source de l'image (site, ouvrage…), facultative, 500 caractères au plus")
    public String source;

    @RestForm
    @Schema(description = "Licence, facultative ; ignorée pour une photo personnelle ou une image d'album, qui reçoivent"
            + " la leur", enumeration = { "arasaac_cc_by_nc_sa", "sclera_cc_by_nc", "mulberry_cc_by_sa",
                    "cc0_domaine_public", "pixabay", "autre_inconnue" })
    public String licence;

    @RestForm
    @Schema(description = "Auteur de l'image, facultatif, 500 caractères au plus")
    public String auteur;

    @RestForm
    @Schema(format = "uuid", description = "Album d'origine, obligatoire pour une image d'album et ignoré sinon")
    public String albumId;
}
