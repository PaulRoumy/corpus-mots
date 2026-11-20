package fr.corpusmots.preparations.persistance;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Mots écartés de l'Encart « mots déjà illustrés » d'une Préparation (table {@code mot_ecarte}, story 2.9), lus et
 * écrits en SQL : une ligne n'est qu'un couple d'identifiants, sans entité.
 */
@ApplicationScoped
public class MotEcarteRepository {

    @Inject
    EntityManager entityManager;

    /** Écarte le Mot de la Préparation ; sans effet s'il l'est déjà. */
    public void ecarter(UUID preparationId, UUID motId) {
        entityManager.createNativeQuery("insert into mot_ecarte (preparation_id, mot_id) values (:preparation, :mot)"
                + " on conflict do nothing")
                .setParameter("preparation", preparationId)
                .setParameter("mot", motId)
                .executeUpdate();
    }

    /** Retire le Mot des écartés de la Préparation ; sans effet s'il ne l'est pas. */
    public void retirer(UUID preparationId, UUID motId) {
        entityManager.createNativeQuery("delete from mot_ecarte where preparation_id = :preparation and mot_id = :mot")
                .setParameter("preparation", preparationId)
                .setParameter("mot", motId)
                .executeUpdate();
    }

    /** Mots écartés de la Préparation. */
    public Set<UUID> de(UUID preparationId) {
        @SuppressWarnings("unchecked")
        List<UUID> mots = entityManager
                .createNativeQuery("select mot_id from mot_ecarte where preparation_id = :preparation", UUID.class)
                .setParameter("preparation", preparationId)
                .getResultList();
        return Set.copyOf(mots);
    }
}
