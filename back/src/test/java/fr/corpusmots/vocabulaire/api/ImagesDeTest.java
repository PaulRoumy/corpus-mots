package fr.corpusmots.vocabulaire.api;

import io.quarkus.narayana.jta.QuarkusTransaction;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import java.util.UUID;

/**
 * Images et liens d'Image des {@code @QuarkusTest}, insérés et lus en SQL. Chaque méthode s'exécute dans sa propre
 * transaction.
 */
@ApplicationScoped
public class ImagesDeTest {

    @Inject
    EntityManager entityManager;

    /** Efface tous les liens d'Image, les fichiers et les Images. */
    public void effacer() {
        QuarkusTransaction.requiringNew().run(() -> {
            entityManager.createNativeQuery("delete from lien_image").executeUpdate();
            entityManager.createNativeQuery("delete from image_fichier").executeUpdate();
            entityManager.createNativeQuery("delete from image").executeUpdate();
        });
    }

    /** Insère une Image image libre de ce propriétaire, à cet état, avec son fichier ({@code image/png}). */
    public UUID image(UUID proprietaire, UUID sensId, String etat, byte[] octets, byte[] miniature) {
        return QuarkusTransaction.requiringNew().call(() -> {
            UUID id = (UUID) entityManager.createNativeQuery(
                    "insert into image (proprietaire_id, sens_id, type_image, licence, source, etat)"
                            + " values (:proprietaire, :sens, 'image_libre', 'cc0_domaine_public', 'test', :etat)"
                            + " returning id")
                    .setParameter("proprietaire", proprietaire)
                    .setParameter("sens", sensId)
                    .setParameter("etat", etat)
                    .getSingleResult();
            entityManager.createNativeQuery(
                    "insert into image_fichier (image_id, octets, miniature, type_mime, largeur, hauteur)"
                            + " values (:id, :octets, :miniature, 'image/png', 10, 10)")
                    .setParameter("id", id)
                    .setParameter("octets", octets)
                    .setParameter("miniature", miniature)
                    .executeUpdate();
            return id;
        });
    }

    /**
     * Insère une Image de ce propriétaire, à cet état, avec sa Carte d'identité (licence, source, auteur et Album
     * d'origine facultatifs) et son fichier ({@code image/png}).
     */
    public UUID image(UUID proprietaire, UUID sensId, String etat, String typeImage, String licence, String source,
            String auteur, UUID albumId) {
        UUID id = image(proprietaire, sensId, etat, new byte[] { 1 }, new byte[] { 2 });
        // Une valeur absente est écrite en NULL littéral : aucun paramètre nul à typer.
        QuarkusTransaction.requiringNew().run(() -> {
            var requete = entityManager.createNativeQuery("update image set type_image = :type"
                    + ", licence = " + (licence == null ? "null" : ":licence")
                    + ", source = " + (source == null ? "null" : ":source")
                    + ", auteur = " + (auteur == null ? "null" : ":auteur")
                    + ", album_id = " + (albumId == null ? "null" : ":album")
                    + " where id = :id")
                    .setParameter("type", typeImage)
                    .setParameter("id", id);
            if (licence != null) {
                requete.setParameter("licence", licence);
            }
            if (source != null) {
                requete.setParameter("source", source);
            }
            if (auteur != null) {
                requete.setParameter("auteur", auteur);
            }
            if (albumId != null) {
                requete.setParameter("album", albumId);
            }
            requete.executeUpdate();
        });
        return id;
    }

    /** Insère un lien de cette Image vers un Mot de Préparation (identifiants quelconques) de cet enseignant. */
    public void lien(UUID imageId, UUID enseignant, UUID albumId) {
        QuarkusTransaction.requiringNew().run(() -> entityManager.createNativeQuery(
                "insert into lien_image (preparation_id, preparation_mot_id, image_id, enseignant_id, album_id,"
                        + " section, origine) values (uuidv7(), uuidv7(), :image, :enseignant, :album, 'ms',"
                        + " 'reutilisee')")
                .setParameter("image", imageId)
                .setParameter("enseignant", enseignant)
                .setParameter("album", albumId)
                .executeUpdate());
    }

    /** Passe la version de l'Image à {@code version}. */
    public void version(UUID imageId, long version) {
        QuarkusTransaction.requiringNew().run(() -> entityManager.createNativeQuery(
                "update image set version = :version where id = :id")
                .setParameter("version", version)
                .setParameter("id", imageId)
                .executeUpdate());
    }
}
