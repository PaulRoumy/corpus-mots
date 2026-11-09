package fr.corpusmots.preparations.persistance;

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
 * Préparation d'un Album pour une Section (FR-6), propriété d'un seul enseignant. Album, Module et Thème par défaut
 * appartiennent à {@code referentiels} et le propriétaire à {@code comptes} : tous sont référencés par UUID (AD-1).
 */
@Entity
@Table(name = "preparation")
public class Preparation {

    @Id
    private UUID id;

    @Column(name = "proprietaire_id", nullable = false, updatable = false)
    private UUID proprietaireId;

    @Column(name = "album_id", nullable = false)
    private UUID albumId;

    @Convert(converter = SectionConverter.class)
    @Column(nullable = false)
    private Section section;

    @Column(name = "module_id")
    private UUID moduleId;

    @Column(name = "theme_defaut_id")
    private UUID themeDefautId;

    @Column(name = "temps_passe_minutes")
    private Integer tempsPasseMinutes;

    @Generated
    @Column(name = "cree_le", insertable = false, updatable = false)
    private OffsetDateTime creeLe;

    protected Preparation() {
    }

    /** Nouvelle Préparation d'identifiant {@code id}, tiré par la base ({@link PreparationRepository#nouvelIdentifiant}). */
    public static Preparation nouvelle(UUID id, UUID proprietaireId, UUID albumId, Section section, UUID moduleId,
            UUID themeDefautId) {
        Preparation preparation = new Preparation();
        preparation.id = id;
        preparation.proprietaireId = proprietaireId;
        preparation.albumId = albumId;
        preparation.section = section;
        preparation.moduleId = moduleId;
        preparation.themeDefautId = themeDefautId;
        return preparation;
    }

    /**
     * Remplace les réglages de l'En-tête ; {@code null} retire la valeur. Les vérifications (Module de l'Album, Thème
     * existant, bornes du Temps passé) sont faites par {@code preparations.service}.
     */
    public void regler(UUID moduleId, UUID themeDefautId, Integer tempsPasseMinutes) {
        this.moduleId = moduleId;
        this.themeDefautId = themeDefautId;
        this.tempsPasseMinutes = tempsPasseMinutes;
    }

    public UUID id() {
        return id;
    }

    public UUID proprietaireId() {
        return proprietaireId;
    }

    public UUID albumId() {
        return albumId;
    }

    public Section section() {
        return section;
    }

    public UUID moduleId() {
        return moduleId;
    }

    public UUID themeDefautId() {
        return themeDefautId;
    }

    /** Temps passé en minutes, {@code null} s'il n'est pas renseigné. */
    public Integer tempsPasseMinutes() {
        return tempsPasseMinutes;
    }

    public OffsetDateTime creeLe() {
        return creeLe;
    }
}
