package fr.corpusmots.referentiels.api;

import fr.corpusmots.referentiels.service.TitresAlbums;
import io.quarkus.narayana.jta.QuarkusTransaction;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import java.util.UUID;

/**
 * Albums, Modules et Thèmes des {@code @QuarkusTest}, insérés en SQL (leur création arrive avec la story 2.1,
 * partie 2, et la story 2.2). Chaque méthode s'exécute dans sa propre transaction.
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
        return QuarkusTransaction.requiringNew().call(() -> (UUID) entityManager.createNativeQuery(
                "insert into album (titre, titre_recherche, auteur, createur_id) values (:titre, :recherche, :auteur,"
                        + " :createur) returning id")
                .setParameter("titre", titre)
                .setParameter("recherche", TitresAlbums.normaliser(titre))
                .setParameter("auteur", auteur)
                .setParameter("createur", CREATEUR)
                .getSingleResult());
    }

    public UUID module(UUID albumId, String nom, int ordre) {
        return QuarkusTransaction.requiringNew().call(() -> (UUID) entityManager.createNativeQuery(
                "insert into module (album_id, nom, ordre) values (:album, :nom, :ordre) returning id")
                .setParameter("album", albumId)
                .setParameter("nom", nom)
                .setParameter("ordre", ordre)
                .getSingleResult());
    }

    public UUID theme(String nom) {
        return QuarkusTransaction.requiringNew().call(() -> (UUID) entityManager.createNativeQuery(
                "insert into theme (nom) values (:nom) returning id")
                .setParameter("nom", nom)
                .getSingleResult());
    }
}
