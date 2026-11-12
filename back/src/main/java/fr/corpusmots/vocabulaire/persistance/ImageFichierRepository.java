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

    private Optional<FichierLu> lire(String colonne, UUID imageId) {
        return getEntityManager().createQuery("select new " + FichierLu.class.getName() + "(" + colonne
                + ", f.typeMime) from ImageFichier f where f.imageId = :image", FichierLu.class)
                .setParameter("image", imageId)
                .getResultStream()
                .findFirst();
    }
}
