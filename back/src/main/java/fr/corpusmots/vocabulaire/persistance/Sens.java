package fr.corpusmots.vocabulaire.persistance;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.hibernate.annotations.Generated;
import org.hibernate.annotations.Immutable;

/**
 * Sens d'un Mot (AD-19), sans propriétaire ni modification par les enseignants. Lu seulement : la ligne est insérée
 * par {@link SensRepository#insererSiAbsent}. {@code categorie} est {@code null} pour un Sens « à compléter ».
 */
@Entity
@Immutable
@Table(name = "sens")
public class Sens {

    @Id
    private UUID id;

    @Column(name = "mot_id", nullable = false)
    private UUID motId;

    @Column(nullable = false)
    private String libelle;

    @Column(name = "libelle_cle", nullable = false)
    private String libelleCle;

    private String categorie;

    @Generated
    @Column(name = "cree_le", insertable = false, updatable = false)
    private OffsetDateTime creeLe;

    protected Sens() {
    }

    public UUID id() {
        return id;
    }

    public UUID motId() {
        return motId;
    }

    public String libelle() {
        return libelle;
    }

    public String libelleCle() {
        return libelleCle;
    }

    /** Catégorie grammaticale, {@code null} si elle reste à compléter. */
    public String categorie() {
        return categorie;
    }

    public OffsetDateTime creeLe() {
        return creeLe;
    }
}
