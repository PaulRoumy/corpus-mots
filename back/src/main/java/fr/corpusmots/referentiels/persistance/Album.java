package fr.corpusmots.referentiels.persistance;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.hibernate.annotations.Generated;

/**
 * Album jeunesse partagé par toute l'école (FR-4). {@code titreRecherche} est le titre passé par
 * {@code TitresAlbums.normaliser}, sur lequel porte la recherche ; {@code createurId} désigne un Enseignant par son
 * UUID (AD-1). La création arrive avec la story 2.1, partie 2.
 */
@Entity
@Table(name = "album")
public class Album {

    @Id
    private UUID id;

    @Column(nullable = false)
    private String titre;

    @Column(name = "titre_recherche", nullable = false)
    private String titreRecherche;

    @Column(nullable = false)
    private String auteur;

    private String editeur;

    @Column(name = "createur_id", nullable = false)
    private UUID createurId;

    @Generated
    @Column(name = "cree_le", insertable = false, updatable = false)
    private OffsetDateTime creeLe;

    protected Album() {
    }

    public UUID id() {
        return id;
    }

    public String titre() {
        return titre;
    }

    public String titreRecherche() {
        return titreRecherche;
    }

    public String auteur() {
        return auteur;
    }

    public String editeur() {
        return editeur;
    }

    public UUID createurId() {
        return createurId;
    }

    public OffsetDateTime creeLe() {
        return creeLe;
    }
}
