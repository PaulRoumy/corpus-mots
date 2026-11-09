package fr.corpusmots.referentiels.persistance;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.hibernate.annotations.Generated;

/** Thème de l'école (FR-5), de nom unique ; la création arrive avec la story 2.2. */
@Entity
@Table(name = "theme")
public class Theme {

    @Id
    private UUID id;

    @Column(nullable = false)
    private String nom;

    @Generated
    @Column(name = "cree_le", insertable = false, updatable = false)
    private OffsetDateTime creeLe;

    protected Theme() {
    }

    public UUID id() {
        return id;
    }

    public String nom() {
        return nom;
    }

    public OffsetDateTime creeLe() {
        return creeLe;
    }
}
