package fr.corpusmots.vocabulaire.persistance;

import fr.corpusmots.commun.service.Section;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import org.hibernate.annotations.Generated;

/**
 * Image (AD-3, AD-4), écrite uniquement par {@code vocabulaire.service}. Type d'image, licence et état sont gardés sous
 * leur valeur en base ({@code image_libre}, {@code privee}…) et convertis par la couche service, qui seule connaît les
 * énumérations. Propriétaire, Album d'origine, Module et Thèmes appartiennent à d'autres modules et sont référencés
 * par UUID (AD-1) ; Sections et Thèmes sont dans {@code image_section} et {@code image_theme}.
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

    /** Module facultatif, de n'importe quel Album, référencé par UUID (AD-1). */
    @Column(name = "module_id")
    private UUID moduleId;

    @ElementCollection
    @CollectionTable(name = "image_section", joinColumns = @JoinColumn(name = "image_id"))
    @Column(name = "section", nullable = false)
    @Convert(converter = SectionConverter.class)
    private Set<Section> sections = new HashSet<>();

    /** Thèmes de {@code referentiels}, référencés par UUID (AD-1). */
    @ElementCollection
    @CollectionTable(name = "image_theme", joinColumns = @JoinColumn(name = "image_id"))
    @Column(name = "theme_id", nullable = false)
    private Set<UUID> themeIds = new HashSet<>();

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

    /**
     * Remplace d'un coup les Sections, le Module et les Thèmes, déjà validés par {@code vocabulaire.service.Images} ;
     * l'état ne change pas (AD-3). La version est incrémentée si le classement change, même si seules les collections
     * changent ; elle reste la même pour un classement identique.
     */
    public void classer(Collection<Section> sections, UUID moduleId, Collection<UUID> themeIds) {
        this.sections.retainAll(sections);
        this.sections.addAll(sections);
        this.moduleId = moduleId;
        this.themeIds.retainAll(themeIds);
        this.themeIds.addAll(themeIds);
    }

    /**
     * Remplace le Sens illustré par un autre Sens du même Mot, déjà validé par {@code vocabulaire.service.Images},
     * qui a vérifié sous verrou que l'Image n'a aucun lien (AD-5) ; l'état ne change pas (AD-3).
     */
    public void changerSens(UUID sensId) {
        this.sensId = sensId;
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

    /** Module, {@code null} s'il n'y en a pas. */
    public UUID moduleId() {
        return moduleId;
    }

    /** Sections cochées, non modifiables. */
    public Set<Section> sections() {
        return Set.copyOf(sections);
    }

    /** Identifiants des Thèmes, non modifiables. */
    public Set<UUID> themeIds() {
        return Set.copyOf(themeIds);
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
