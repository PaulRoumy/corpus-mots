package fr.corpusmots.vocabulaire.persistance;

import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class ImageFichierRepository implements PanacheRepositoryBase<ImageFichier, UUID> {

    /** Image réduite de l'Image {@code imageId}, sans charger sa miniature. */
    public Optional<FichierLu> octets(UUID imageId) {
        return lire("f.octets", imageId);
    }

    /** Miniature de l'Image {@code imageId}, sans charger l'image réduite. */
    public Optional<FichierLu> miniature(UUID imageId) {
        return lire("f.miniature", imageId);
    }

    /**
     * Remplace le fichier de l'Image {@code imageId} (image réduite, miniature, type MIME et dimensions), sans le
     * charger.
     *
     * @return nombre de lignes modifiées (0 si l'Image n'a pas de fichier)
     */
    public int remplacer(UUID imageId, byte[] octets, byte[] miniature, String typeMime, int largeur, int hauteur) {
        return update("octets = ?1, miniature = ?2, typeMime = ?3, largeur = ?4, hauteur = ?5 where imageId = ?6",
                octets, miniature, typeMime, largeur, hauteur, imageId);
    }

    private Optional<FichierLu> lire(String colonne, UUID imageId) {
        return getEntityManager().createQuery("select new " + FichierLu.class.getName() + "(" + colonne
                + ", f.typeMime) from ImageFichier f where f.imageId = :image", FichierLu.class)
                .setParameter("image", imageId)
                .getResultStream()
                .findFirst();
    }
}
