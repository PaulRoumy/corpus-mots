package fr.corpusmots.vocabulaire.persistance;

import fr.corpusmots.commun.service.Section;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.hibernate.annotations.Generated;

/**
 * Lien d'une Image vers un Mot d'une Préparation (registre des usages, AD-14), écrit uniquement par
 * {@code vocabulaire.service.Usages}. Préparation, Mot de Préparation, enseignant et Album appartiennent à d'autres
 * modules et sont référencés par UUID (AD-1). {@code origine} vaut {@code nouvelle} ou {@code reutilisee}.
 */
@Entity
@Table(name = "lien_image")
public class LienImage {

    @Id
    private UUID id;

    @Column(name = "preparation_id", nullable = false, updatable = false)
    private UUID preparationId;

    @Column(name = "preparation_mot_id", nullable = false, updatable = false)
    private UUID preparationMotId;

    @Column(name = "image_id", nullable = false)
    private UUID imageId;

    @Column(name = "enseignant_id", nullable = false, updatable = false)
    private UUID enseignantId;

    @Column(name = "album_id", nullable = false)
    private UUID albumId;

    @Convert(converter = SectionConverter.class)
    @Column(nullable = false)
    private Section section;

    @Column(nullable = false)
    private String origine;

    @Generated
    @Column(name = "cree_le", insertable = false, updatable = false)
    private OffsetDateTime creeLe;

    protected LienImage() {
    }

    /** Nouveau lien d'identifiant {@code id}, tiré par la base ({@link LienImageRepository#nouvelIdentifiant}). */
    public static LienImage nouveau(UUID id, UUID preparationId, UUID preparationMotId, UUID imageId,
            UUID enseignantId, UUID albumId, Section section, String origine) {
        LienImage lien = new LienImage();
        lien.id = id;
        lien.preparationId = preparationId;
        lien.preparationMotId = preparationMotId;
        lien.imageId = imageId;
        lien.enseignantId = enseignantId;
        lien.albumId = albumId;
        lien.section = section;
        lien.origine = origine;
        return lien;
    }

    public UUID id() {
        return id;
    }

    public UUID preparationId() {
        return preparationId;
    }

    public UUID preparationMotId() {
        return preparationMotId;
    }

    public UUID imageId() {
        return imageId;
    }

    public UUID enseignantId() {
        return enseignantId;
    }

    public UUID albumId() {
        return albumId;
    }

    public Section section() {
        return section;
    }

    public String origine() {
        return origine;
    }

    public OffsetDateTime creeLe() {
        return creeLe;
    }
}
