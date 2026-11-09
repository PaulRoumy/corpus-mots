package fr.corpusmots.commun.api;

import io.quarkus.narayana.jta.QuarkusTransaction;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import java.util.UUID;

/**
 * Enseignants des {@code @QuarkusTest} : chaque requête d'un test passe par le filtre de {@code comptes}, qui exige un
 * Enseignant {@code actif} pour le {@code sub} du jeton. Chaque méthode s'exécute dans sa propre transaction, validée
 * avant la requête du test.
 */
@ApplicationScoped
public class EnseignantsDeTest {

    @Inject
    EntityManager entityManager;

    /** Efface tous les Enseignants, puis insère ceux-ci, actifs, nommés « Enseignant 1 », « Enseignant 2 »… */
    public void seulsActifs(String... ids) {
        QuarkusTransaction.requiringNew().run(() -> {
            effacerDansLaTransaction();
            for (int rang = 0; rang < ids.length; rang++) {
                insererDansLaTransaction(ids[rang], "Enseignant " + (rang + 1), "actif");
            }
        });
    }

    /** Insère un Enseignant ; {@code nomAffiche} peut être {@code null} (invité). */
    public void inserer(String id, String nomAffiche, String statut) {
        QuarkusTransaction.requiringNew().run(() -> insererDansLaTransaction(id, nomAffiche, statut));
    }

    /** Efface tous les Enseignants. */
    public void effacer() {
        QuarkusTransaction.requiringNew().run(this::effacerDansLaTransaction);
    }

    private void effacerDansLaTransaction() {
        entityManager.createNativeQuery("delete from enseignant").executeUpdate();
    }

    private void insererDansLaTransaction(String id, String nomAffiche, String statut) {
        entityManager.createNativeQuery(
                "insert into enseignant (id, nom_affiche, statut) values (:id, cast(:nom as text), :statut)")
                .setParameter("id", UUID.fromString(id))
                .setParameter("nom", nomAffiche)
                .setParameter("statut", statut)
                .executeUpdate();
    }
}
