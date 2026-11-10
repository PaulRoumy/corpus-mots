package fr.corpusmots.referentiels.persistance;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.hibernate.annotations.Generated;

/**
 * Module d'un Album (FR-5), à sa place {@code ordre}. {@code createurId} désigne un Enseignant par son UUID (AD-1) ; il
 * est {@code null} pour un Module inséré avant la story 2.2.
 */
@Entity
@Table(name = "module")
public class Module {

    @Id
    private UUID id;

    @Column(name = "album_id", nullable = false, updatable = false)
    private UUID albumId;

    @Column(nullable = false)
    private String nom;

    @Column(nullable = false)
    private int ordre;

    @Column(name = "createur_id", updatable = false)
    private UUID createurId;

    @Generated
    @Column(name = "cree_le", insertable = false, updatable = false)
    private OffsetDateTime creeLe;

    protected Module() {
    }

    /** Nouveau Module ; {@code nom} est déjà nettoyé et vérifié par {@code referentiels.service}. */
    public static Module nouveau(UUID id, UUID albumId, String nom, int ordre, UUID createurId) {
        Module module = new Module();
        module.id = id;
        module.albumId = albumId;
        module.nom = nom;
        module.ordre = ordre;
        module.createurId = createurId;
        return module;
    }

    /** Remplace le nom, déjà nettoyé et vérifié par {@code referentiels.service}. */
    public void renommer(String nom) {
        this.nom = nom;
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

    public UUID createurId() {
        return createurId;
    }

    public OffsetDateTime creeLe() {
        return creeLe;
    }
}
