package fr.corpusmots.preparations.persistance;

import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@ApplicationScoped
public class PreparationMotRepository implements PanacheRepositoryBase<PreparationMot, UUID> {

    /** Identifiant tiré par la base ({@code uuidv7()}), comme toute clé de l'application (conventions). */
    public UUID nouvelIdentifiant() {
        return (UUID) getEntityManager().createNativeQuery("select uuidv7()").getSingleResult();
    }

    /** Mots de la Préparation, dans l'ordre de saisie. */
    public List<PreparationMot> deLaPreparation(UUID preparationId) {
        return list("preparationId = ?1 order by ordre", preparationId);
    }

    /** Vrai si le Mot figure déjà dans la Préparation. */
    public boolean contient(UUID preparationId, UUID motId) {
        return count("preparationId = ?1 and motId = ?2", preparationId, motId) > 0;
    }

    /**
     * Plus grand {@code ordre} des Mots de la Préparation, {@code 0} s'il n'en a aucun. Pour une place sûre en fin de
     * Préparation, l'appelant a d'abord verrouillé la Préparation ({@link PreparationRepository#verrouillee}).
     */
    public int dernierOrdre(UUID preparationId) {
        return ((Number) getEntityManager()
                .createQuery("select coalesce(max(m.ordre), 0) from PreparationMot m where m.preparationId = :preparation")
                .setParameter("preparation", preparationId)
                .getSingleResult()).intValue();
    }

    public long compter(UUID preparationId) {
        return count("preparationId", preparationId);
    }

    /** Nombre de Mots de chacune de ces Préparations ; une Préparation sans Mot est absente. */
    public Map<UUID, Integer> compter(Collection<UUID> preparationIds) {
        if (preparationIds.isEmpty()) {
            return Map.of();
        }
        List<Object[]> lignes = getEntityManager().createQuery(
                "select m.preparationId, count(m) from PreparationMot m where m.preparationId in :ids"
                        + " group by m.preparationId", Object[].class)
                .setParameter("ids", preparationIds)
                .getResultList();
        Map<UUID, Integer> nombres = new HashMap<>();
        lignes.forEach(ligne -> nombres.put((UUID) ligne[0], ((Number) ligne[1]).intValue()));
        return nombres;
    }
}
