package fr.corpusmots.preparations.api;

import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.openapi.annotations.enums.SchemaType;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.jboss.resteasy.reactive.PartType;
import org.jboss.resteasy.reactive.RestForm;
import org.jboss.resteasy.reactive.multipart.FileUpload;

/**
 * Formulaire {@code multipart/form-data} du téléversement d'une Image depuis la Carte d'un Mot : le fichier (JPEG, PNG
 * ou GIF, 20 Mo au plus), son type, sa source, sa licence et son auteur.
 */
public class TeleversementImageMotPreparationDto {

    @RestForm
    @PartType(MediaType.APPLICATION_OCTET_STREAM)
    @Schema(required = true, type = SchemaType.STRING, format = "binary",
            description = "Fichier JPEG, PNG ou GIF, 20 Mo au plus")
    public FileUpload fichier;

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
}
