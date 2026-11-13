package fr.corpusmots.vocabulaire.api;

import io.quarkus.narayana.jta.QuarkusTransaction;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import java.util.List;
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

    /** Remplace le fichier de l'Image par ces octets (et cette miniature), de {@code largeur} × {@code hauteur} px. */
    public void fichier(UUID imageId, byte[] octets, byte[] miniature, String typeMime, int largeur, int hauteur) {
        QuarkusTransaction.requiringNew().run(() -> entityManager.createNativeQuery(
                "update image_fichier set octets = :octets, miniature = :miniature, type_mime = :type,"
                        + " largeur = :largeur, hauteur = :hauteur where image_id = :id")
                .setParameter("octets", octets)
                .setParameter("miniature", miniature)
                .setParameter("type", typeMime)
                .setParameter("largeur", largeur)
                .setParameter("hauteur", hauteur)
                .setParameter("id", imageId)
                .executeUpdate());
    }

    /** Image réduite enregistrée de l'Image. */
    public byte[] octets(UUID imageId) {
        return QuarkusTransaction.requiringNew().call(() -> (byte[]) entityManager.createNativeQuery(
                "select octets from image_fichier where image_id = :id")
                .setParameter("id", imageId)
                .getSingleResult());
    }

    /** Miniature enregistrée de l'Image. */
    public byte[] miniature(UUID imageId) {
        return QuarkusTransaction.requiringNew().call(() -> (byte[]) entityManager.createNativeQuery(
                "select miniature from image_fichier where image_id = :id")
                .setParameter("id", imageId)
                .getSingleResult());
    }

    /** Largeur et hauteur enregistrées du fichier de l'Image. */
    public int[] dimensions(UUID imageId) {
        return QuarkusTransaction.requiringNew().call(() -> {
            Object[] ligne = (Object[]) entityManager.createNativeQuery(
                    "select largeur, hauteur from image_fichier where image_id = :id")
                    .setParameter("id", imageId)
                    .getSingleResult();
            return new int[] { ((Number) ligne[0]).intValue(), ((Number) ligne[1]).intValue() };
        });
    }

    /** Type, licence, source et Album d'origine de l'Image, séparés par {@code |} ({@code null} pour une absence). */
    public String description(UUID imageId) {
        return QuarkusTransaction.requiringNew().call(() -> {
            Object[] ligne = (Object[]) entityManager.createNativeQuery(
                    "select type_image, licence, source, album_id from image where id = :id")
                    .setParameter("id", imageId)
                    .getSingleResult();
            return ligne[0] + "|" + ligne[1] + "|" + ligne[2] + "|" + ligne[3];
        });
    }

    /** Donne à l'Image ce Module ({@code null} : aucun), ces Thèmes et ces Sections ({@code ps}, {@code ms}, {@code gs}). */
    public void classer(UUID imageId, UUID moduleId, List<UUID> themeIds, List<String> sections) {
        QuarkusTransaction.requiringNew().run(() -> {
            // Une valeur absente est écrite en NULL littéral : aucun paramètre nul à typer.
            var module = entityManager.createNativeQuery("update image set module_id = "
                    + (moduleId == null ? "null" : ":module") + " where id = :id")
                    .setParameter("id", imageId);
            if (moduleId != null) {
                module.setParameter("module", moduleId);
            }
            module.executeUpdate();
            for (UUID themeId : themeIds) {
                entityManager.createNativeQuery("insert into image_theme (image_id, theme_id) values (:id, :theme)")
                        .setParameter("id", imageId)
                        .setParameter("theme", themeId)
                        .executeUpdate();
            }
            for (String section : sections) {
                entityManager.createNativeQuery("insert into image_section (image_id, section) values (:id, :section)")
                        .setParameter("id", imageId)
                        .setParameter("section", section)
                        .executeUpdate();
            }
        });
    }

    /**
     * Classement enregistré de l'Image : « sections triées|module_id|thèmes triés » ({@code null} sans Module), par
     * exemple {@code gs,ms|null|}.
     */
    public String classement(UUID imageId) {
        return QuarkusTransaction.requiringNew().call(() -> {
            @SuppressWarnings("unchecked")
            List<String> sections = entityManager.createNativeQuery(
                    "select section from image_section where image_id = :id order by section")
                    .setParameter("id", imageId)
                    .getResultList();
            Object module = entityManager.createNativeQuery("select module_id from image where id = :id")
                    .setParameter("id", imageId)
                    .getSingleResult();
            @SuppressWarnings("unchecked")
            List<Object> themes = entityManager.createNativeQuery(
                    "select theme_id from image_theme where image_id = :id order by theme_id")
                    .setParameter("id", imageId)
                    .getResultList();
            return String.join(",", sections) + "|" + module + "|"
                    + String.join(",", themes.stream().map(String::valueOf).toList());
        });
    }

    /** Version enregistrée de l'Image. */
    public long version(UUID imageId) {
        return QuarkusTransaction.requiringNew().call(() -> ((Number) entityManager.createNativeQuery(
                "select version from image where id = :id")
                .setParameter("id", imageId)
                .getSingleResult()).longValue());
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
