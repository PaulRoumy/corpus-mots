package fr.corpusmots.vocabulaire.persistance;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

/**
 * Fichier d'une Image (AD-8, AD-23) : l'image réduite ({@code octets}) et sa miniature, au même format
 * ({@code typeMime}), produites par {@code vocabulaire.service.ReductionImages}. Lu uniquement par
 * {@code vocabulaire.service.FichiersImages}.
 */
@Entity
@Table(name = "image_fichier")
public class ImageFichier {

    @Id
    @Column(name = "image_id")
    private UUID imageId;

    @Column(nullable = false)
    private byte[] octets;

    @Column(nullable = false)
    private byte[] miniature;

    @Column(name = "type_mime", nullable = false)
    private String typeMime;

    @Column(nullable = false)
    private int largeur;

    @Column(nullable = false)
    private int hauteur;

    protected ImageFichier() {
    }

    public static ImageFichier nouveau(UUID imageId, byte[] octets, byte[] miniature, String typeMime, int largeur,
            int hauteur) {
        ImageFichier fichier = new ImageFichier();
        fichier.imageId = imageId;
        fichier.octets = octets;
        fichier.miniature = miniature;
        fichier.typeMime = typeMime;
        fichier.largeur = largeur;
        fichier.hauteur = hauteur;
        return fichier;
    }

    public UUID imageId() {
        return imageId;
    }

    public String typeMime() {
        return typeMime;
    }

    public int largeur() {
        return largeur;
    }

    public int hauteur() {
        return hauteur;
    }
}
