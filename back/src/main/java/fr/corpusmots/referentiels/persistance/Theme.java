package fr.corpusmots.referentiels.persistance;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.hibernate.annotations.Generated;

/**
 * Thème de l'école (FR-5), de nom unique. {@code createurId} désigne un Enseignant par son UUID (AD-1) ; il est
 * {@code null} pour un Thème inséré avant la story 2.2, partie 3.
 */
@Entity
@Table(name = "theme")
public class Theme {

    @Id
    private UUID id;

    @Column(nullable = false)
    private String nom;

    @Column(name = "createur_id", updatable = false)
    private UUID createurId;

    @Generated
    @Column(name = "cree_le", insertable = false, updatable = false)
    private OffsetDateTime creeLe;

    protected Theme() {
    }

    /** Nouveau Thème ; {@code nom} est déjà nettoyé et vérifié par {@code referentiels.service}. */
    public static Theme nouveau(UUID id, String nom, UUID createurId) {
        Theme theme = new Theme();
        theme.id = id;
        theme.nom = nom;
        theme.createurId = createurId;
        return theme;
    }

    /** Remplace le nom, déjà nettoyé et vérifié par {@code referentiels.service}. */
    public void renommer(String nom) {
        this.nom = nom;
    }

    public UUID id() {
        return id;
    }

    public String nom() {
        return nom;
    }

    public UUID createurId() {
        return createurId;
    }

    public OffsetDateTime creeLe() {
        return creeLe;
    }
}
