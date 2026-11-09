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
 * UUID (AD-1).
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

    /**
     * Nouvel Album ; {@code titreRecherche} vaut {@code TitresAlbums.normaliser(titre)}, {@code editeur} peut être
     * {@code null}.
     */
    public static Album nouveau(UUID id, String titre, String titreRecherche, String auteur, String editeur,
            UUID createurId) {
        Album album = new Album();
        album.id = id;
        album.titre = titre;
        album.titreRecherche = titreRecherche;
        album.auteur = auteur;
        album.editeur = editeur;
        album.createurId = createurId;
        return album;
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
