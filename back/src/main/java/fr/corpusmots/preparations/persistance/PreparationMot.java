package fr.corpusmots.preparations.persistance;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.hibernate.annotations.Generated;

/**
 * Mot d'une Préparation, à sa place {@code ordre} (ordre de saisie). Le Mot appartient à {@code vocabulaire} et est
 * référencé par UUID (AD-1) ; son Sens retenu et ses Images liées sont dans le registre de {@code vocabulaire}
 * (AD-14). Son Thème facultatif {@code themeId} appartient à {@code referentiels}, référencé lui aussi par UUID.
 */
@Entity
@Table(name = "preparation_mot")
public class PreparationMot {

    @Id
    private UUID id;

    @Column(name = "preparation_id", nullable = false, updatable = false)
    private UUID preparationId;

    @Column(name = "mot_id", nullable = false, updatable = false)
    private UUID motId;

    @Column(nullable = false)
    private int ordre;

    /** Thème du Mot dans cette Préparation, référencé par UUID (AD-1) ; {@code null} : sans thème. */
    @Column(name = "theme_id")
    private UUID themeId;

    @Generated
    @Column(name = "cree_le", insertable = false, updatable = false)
    private OffsetDateTime creeLe;

    protected PreparationMot() {
    }

    /** Nouveau Mot de Préparation d'identifiant {@code id}, tiré par la base ({@link PreparationMotRepository#nouvelIdentifiant}). */
    public static PreparationMot nouveau(UUID id, UUID preparationId, UUID motId, int ordre, UUID themeId) {
        PreparationMot mot = new PreparationMot();
        mot.id = id;
        mot.preparationId = preparationId;
        mot.motId = motId;
        mot.ordre = ordre;
        mot.themeId = themeId;
        return mot;
    }

    /** Remplace le Thème du Mot ; {@code null} le retire. */
    public void changerTheme(UUID themeId) {
        this.themeId = themeId;
    }

    public UUID id() {
        return id;
    }

    public UUID preparationId() {
        return preparationId;
    }

    public UUID motId() {
        return motId;
    }

    public int ordre() {
        return ordre;
    }

    public UUID themeId() {
        return themeId;
    }

    public OffsetDateTime creeLe() {
        return creeLe;
    }
}
