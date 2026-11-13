package fr.corpusmots.vocabulaire.persistance;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.hibernate.annotations.Generated;

/**
 * Image (AD-3, AD-4), écrite uniquement par {@code vocabulaire.service}. Type d'image, licence et état sont gardés sous
 * leur valeur en base ({@code image_libre}, {@code privee}…) et convertis par la couche service, qui seule connaît les
 * énumérations. Propriétaire et Album d'origine appartiennent à d'autres modules et sont référencés par UUID (AD-1).
 * Les octets sont dans {@link ImageFichier}, pour que les listes ne les chargent jamais.
 */
@Entity
@Table(name = "image")
public class Image {

    @Id
    private UUID id;

    @Column(name = "proprietaire_id", nullable = false, updatable = false)
    private UUID proprietaireId;

    @Column(name = "sens_id", nullable = false)
    private UUID sensId;

    @Column(name = "type_media", nullable = false)
    private String typeMedia;

    @Column(name = "type_image", nullable = false)
    private String typeImage;

    private String licence;

    private String source;

    private String auteur;

    @Column(name = "album_id")
    private UUID albumId;

    @Column(nullable = false)
    private String etat;

    @Version
    private long version;

    @Generated
    @Column(name = "cree_le", insertable = false, updatable = false)
    private OffsetDateTime creeLe;

    @Generated
    @Column(name = "modifie_le", insertable = false, updatable = false)
    private OffsetDateTime modifieLe;

    protected Image() {
    }

    /** Nouvelle Image d'identifiant {@code id}, tiré par la base ({@link ImageRepository#nouvelIdentifiant}). */
    public static Image nouvelle(UUID id, UUID proprietaireId, UUID sensId, String typeMedia, String typeImage,
            String licence, String source, String auteur, UUID albumId, String etat) {
        Image image = new Image();
        image.id = id;
        image.proprietaireId = proprietaireId;
        image.sensId = sensId;
        image.typeMedia = typeMedia;
        image.typeImage = typeImage;
        image.licence = licence;
        image.source = source;
        image.auteur = auteur;
        image.albumId = albumId;
        image.etat = etat;
        return image;
    }

    /**
     * Remplace d'un coup le type, la licence, la source, l'auteur et l'Album d'origine, déjà validés par
     * {@code vocabulaire.service.Images} ; l'état ne change pas (AD-3).
     */
    public void decrire(String typeImage, String licence, String source, String auteur, UUID albumId) {
        this.typeImage = typeImage;
        this.licence = licence;
        this.source = source;
        this.auteur = auteur;
        this.albumId = albumId;
    }

    public UUID id() {
        return id;
    }

    public UUID proprietaireId() {
        return proprietaireId;
    }

    public UUID sensId() {
        return sensId;
    }

    public String typeMedia() {
        return typeMedia;
    }

    public String typeImage() {
        return typeImage;
    }

    /** Licence, {@code null} si elle n'est pas renseignée. */
    public String licence() {
        return licence;
    }

    /** Source, {@code null} si elle n'est pas renseignée. */
    public String source() {
        return source;
    }

    /** Auteur, {@code null} s'il n'est pas renseigné. */
    public String auteur() {
        return auteur;
    }

    /** Album d'origine, {@code null} s'il n'y en a pas. */
    public UUID albumId() {
        return albumId;
    }

    public String etat() {
        return etat;
    }

    public long version() {
        return version;
    }

    public OffsetDateTime creeLe() {
        return creeLe;
    }

    public OffsetDateTime modifieLe() {
        return modifieLe;
    }
}
