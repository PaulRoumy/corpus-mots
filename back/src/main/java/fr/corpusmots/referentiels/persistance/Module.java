package fr.corpusmots.referentiels.persistance;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.hibernate.annotations.Generated;

/** Module d'un Album (FR-5), à sa place {@code ordre} ; la création arrive avec la story 2.2. */
@Entity
@Table(name = "module")
public class Module {

    @Id
    private UUID id;

    @Column(name = "album_id", nullable = false)
    private UUID albumId;

    @Column(nullable = false)
    private String nom;

    @Column(nullable = false)
    private int ordre;

    @Generated
    @Column(name = "cree_le", insertable = false, updatable = false)
    private OffsetDateTime creeLe;

    protected Module() {
    }

    public UUID id() {
        return id;
    }

    public UUID albumId() {
        return albumId;
    }

    public String nom() {
        return nom;
    }

    public int ordre() {
        return ordre;
    }

    public OffsetDateTime creeLe() {
        return creeLe;
    }
}
