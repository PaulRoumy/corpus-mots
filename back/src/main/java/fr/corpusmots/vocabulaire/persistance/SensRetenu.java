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
 * Sens retenu pour un Mot d'une Préparation (registre des usages, AD-14), écrit uniquement par
 * {@code vocabulaire.service.Usages}. Préparation, Mot de Préparation, enseignant et Album appartiennent à d'autres
 * modules et sont référencés par UUID (AD-1) ; Album et Section sont copiés pour que le classement des propositions ne
 * lise pas les tables de {@code preparations}.
 */
@Entity
@Table(name = "sens_retenu")
public class SensRetenu {

    @Id
    private UUID id;

    @Column(name = "preparation_id", nullable = false, updatable = false)
    private UUID preparationId;

    @Column(name = "preparation_mot_id", nullable = false, updatable = false)
    private UUID preparationMotId;

    @Column(name = "sens_id", nullable = false)
    private UUID sensId;

    @Column(name = "enseignant_id", nullable = false, updatable = false)
    private UUID enseignantId;

    @Column(name = "album_id", nullable = false)
    private UUID albumId;

    @Convert(converter = SectionConverter.class)
    @Column(nullable = false)
    private Section section;

    @Generated
    @Column(name = "cree_le", insertable = false, updatable = false)
    private OffsetDateTime creeLe;

    protected SensRetenu() {
    }

    /** Nouveau Sens retenu d'identifiant {@code id}, tiré par la base ({@link SensRetenuRepository#nouvelIdentifiant}). */
    public static SensRetenu nouveau(UUID id, UUID preparationId, UUID preparationMotId, UUID sensId,
            UUID enseignantId, UUID albumId, Section section) {
        SensRetenu retenu = new SensRetenu();
        retenu.id = id;
        retenu.preparationId = preparationId;
        retenu.preparationMotId = preparationMotId;
        retenu.sensId = sensId;
        retenu.enseignantId = enseignantId;
        retenu.albumId = albumId;
        retenu.section = section;
        return retenu;
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

    public UUID sensId() {
        return sensId;
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

    public OffsetDateTime creeLe() {
        return creeLe;
    }
}
