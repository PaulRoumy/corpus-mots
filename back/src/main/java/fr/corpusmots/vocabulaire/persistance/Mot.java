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
 * Mot du Lexique (AD-10), sans propriétaire ni modification par les enseignants (AD-19). Lu seulement : la ligne est
 * insérée par {@link MotRepository#insererSiAbsent}, qui calcule aussi {@code forme_recherche}, non mappée ici.
 */
@Entity
@Immutable
@Table(name = "mot")
public class Mot {

    @Id
    private UUID id;

    @Column(nullable = false)
    private String forme;

    @Column(name = "forme_cle", nullable = false)
    private String formeCle;

    @Generated
    @Column(name = "cree_le", insertable = false, updatable = false)
    private OffsetDateTime creeLe;

    protected Mot() {
    }

    public UUID id() {
        return id;
    }

    /** Première forme saisie dans l'école, normalisée par {@code Lexique.normaliser}. */
    public String forme() {
        return forme;
    }

    public String formeCle() {
        return formeCle;
    }

    public OffsetDateTime creeLe() {
        return creeLe;
    }
}
