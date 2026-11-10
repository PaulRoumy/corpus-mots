package fr.corpusmots.referentiels.api;

import fr.corpusmots.referentiels.service.TitresAlbums;
import io.quarkus.narayana.jta.QuarkusTransaction;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import java.util.List;
import java.util.UUID;

/**
 * Albums, Modules et Thèmes des {@code @QuarkusTest}, insérés et lus en SQL. Chaque méthode s'exécute dans sa propre
 * transaction.
 */
@ApplicationScoped
public class ReferentielsDeTest {

    /** Créateur des Albums de test (aucune clé étrangère vers {@code enseignant}, AD-22). */
    static final UUID CREATEUR = UUID.fromString("0190f0a0-0000-7000-8000-000000000999");

    @Inject
    EntityManager entityManager;

    /** Efface tous les Modules, Albums et Thèmes. */
    public void effacer() {
        QuarkusTransaction.requiringNew().run(() -> {
            entityManager.createNativeQuery("delete from module").executeUpdate();
            entityManager.createNativeQuery("delete from album").executeUpdate();
            entityManager.createNativeQuery("delete from theme").executeUpdate();
        });
    }

    /** Insère un Album ; {@code titre_recherche} est calculé par {@link TitresAlbums#normaliser}, comme en production. */
    public UUID album(String titre, String auteur) {
        return album(titre, auteur, CREATEUR);
    }

    /** Insère un Album créé par {@code createur}. */
    public UUID album(String titre, String auteur, UUID createur) {
        return QuarkusTransaction.requiringNew().call(() -> (UUID) entityManager.createNativeQuery(
                "insert into album (titre, titre_recherche, auteur, createur_id) values (:titre, :recherche, :auteur,"
                        + " :createur) returning id")
                .setParameter("titre", titre)
                .setParameter("recherche", TitresAlbums.normaliser(titre))
                .setParameter("auteur", auteur)
                .setParameter("createur", createur)
                .getSingleResult());
    }

    /**
     * Exécute {@code pendant} en tenant la ligne de l'Album verrouillée ({@code SELECT … FOR UPDATE}) : les requêtes
     * lancées pendant ce temps qui touchent l'Album attendent toutes la fin de {@code pendant}, puis repartent ensemble.
     */
    public void pendantVerrouAlbum(UUID albumId, Runnable pendant) {
        QuarkusTransaction.requiringNew().run(() -> {
            entityManager.createNativeQuery("select id from album where id = :id for update")
                    .setParameter("id", albumId)
                    .getSingleResult();
            pendant.run();
        });
    }

    /** Nombre d'Albums en base. */
    public long nombreAlbums() {
        return QuarkusTransaction.requiringNew().call(() -> ((Number) entityManager
                .createNativeQuery("select count(*) from album").getSingleResult()).longValue());
    }

    /** {@code createur_id} de l'Album. */
    public UUID createur(UUID albumId) {
        return QuarkusTransaction.requiringNew().call(() -> (UUID) entityManager
                .createNativeQuery("select createur_id from album where id = :id")
                .setParameter("id", albumId)
                .getSingleResult());
    }

    /** Album en base, en « titre|titre_recherche|auteur|editeur|createur_id ». */
    public String ligneAlbum(UUID albumId) {
        return QuarkusTransaction.requiringNew().call(() -> {
            Object[] ligne = (Object[]) entityManager
                    .createNativeQuery("select titre, titre_recherche, auteur, editeur, createur_id from album"
                            + " where id = :id")
                    .setParameter("id", albumId)
                    .getSingleResult();
            return ligne[0] + "|" + ligne[1] + "|" + ligne[2] + "|" + ligne[3] + "|" + ligne[4];
        });
    }

    /** {@code editeur} de l'Album, {@code null} s'il est absent. */
    public String editeur(UUID albumId) {
        return QuarkusTransaction.requiringNew().call(() -> (String) entityManager
                .createNativeQuery("select editeur from album where id = :id")
                .setParameter("id", albumId)
                .getSingleResult());
    }

    /** Insère un Module sans créateur, comme avant la story 2.2 : seul l'administrateur le gère. */
    public UUID module(UUID albumId, String nom, int ordre) {
        return module(albumId, nom, ordre, null);
    }

    /** Insère un Module ; {@code createur} peut être {@code null}. */
    public UUID module(UUID albumId, String nom, int ordre, String createur) {
        return QuarkusTransaction.requiringNew().call(() -> (UUID) entityManager.createNativeQuery(
                "insert into module (album_id, nom, ordre, createur_id) values (:album, :nom, :ordre,"
                        + " cast(:createur as uuid)) returning id")
                .setParameter("album", albumId)
                .setParameter("nom", nom)
                .setParameter("ordre", ordre)
                .setParameter("createur", createur)
                .getSingleResult());
    }

    /** Modules de l'Album en base, dans leur ordre, chacun en « nom:ordre ». */
    public List<String> modules(UUID albumId) {
        return QuarkusTransaction.requiringNew().call(() -> {
            @SuppressWarnings("unchecked")
            List<Object[]> lignes = entityManager
                    .createNativeQuery("select nom, ordre from module where album_id = :album order by ordre")
                    .setParameter("album", albumId)
                    .getResultList();
            return lignes.stream().map(ligne -> ligne[0] + ":" + ligne[1]).toList();
        });
    }

    /** Insère un Thème sans créateur, comme avant la story 2.2, partie 3 : seul l'administrateur le gère. */
    public UUID theme(String nom) {
        return theme(nom, null);
    }

    /** Insère un Thème ; {@code createur} peut être {@code null}. */
    public UUID theme(String nom, String createur) {
        return QuarkusTransaction.requiringNew().call(() -> (UUID) entityManager.createNativeQuery(
                "insert into theme (nom, createur_id) values (:nom, cast(:createur as uuid)) returning id")
                .setParameter("nom", nom)
                .setParameter("createur", createur)
                .getSingleResult());
    }

    /** Noms des Thèmes en base, par nom. */
    public List<String> themes() {
        return QuarkusTransaction.requiringNew().call(() -> {
            @SuppressWarnings("unchecked")
            List<String> noms = entityManager.createNativeQuery("select nom from theme order by nom").getResultList();
            return noms;
        });
    }

    /**
     * Exécute {@code pendant} en tenant le verrou consultatif des Thèmes : les créations et renommages lancés pendant
     * ce temps l'attendent tous, puis repartent ensemble.
     */
    public void pendantVerrouThemes(Runnable pendant) {
        QuarkusTransaction.requiringNew().run(() -> {
            entityManager.createNativeQuery(
                    "select count(*) from (select pg_advisory_xact_lock(hashtext('referentiels.themes'))) verrou")
                    .getSingleResult();
            pendant.run();
        });
    }
}
