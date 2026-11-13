package fr.corpusmots.vocabulaire.persistance;

import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@ApplicationScoped
public class SensRetenuRepository implements PanacheRepositoryBase<SensRetenu, UUID> {

    /** Identifiant tiré par la base ({@code uuidv7()}), comme toute clé de l'application (conventions). */
    public UUID nouvelIdentifiant() {
        return (UUID) getEntityManager().createNativeQuery("select uuidv7()").getSingleResult();
    }

    /** Sens que l'enseignant a retenu le plus récemment pour ce Mot, dans l'une quelconque de ses Préparations. */
    public Optional<Sens> dernierRetenu(UUID enseignantId, UUID motId) {
        return getEntityManager().createQuery(
                "select s from SensRetenu r, Sens s where s.id = r.sensId and r.enseignantId = :enseignant"
                        + " and s.motId = :mot order by r.creeLe desc, r.id desc", Sens.class)
                .setParameter("enseignant", enseignantId)
                .setParameter("mot", motId)
                .setMaxResults(1)
                .getResultStream()
                .findFirst();
    }

    /** Identifiants des Sens de ce Mot que l'enseignant a retenus, dans l'une quelconque de ses Préparations. */
    public Set<UUID> sensRetenusDuMot(UUID enseignantId, UUID motId) {
        return Set.copyOf(getEntityManager().createQuery(
                "select distinct s.id from SensRetenu r, Sens s where s.id = r.sensId and r.enseignantId = :enseignant"
                        + " and s.motId = :mot", UUID.class)
                .setParameter("enseignant", enseignantId)
                .setParameter("mot", motId)
                .getResultList());
    }

    /** Sens retenu de chacun de ces Mots de Préparation ; ceux qui n'en ont pas sont absents. */
    public Map<UUID, Sens> sensDe(Collection<UUID> preparationMotIds) {
        if (preparationMotIds.isEmpty()) {
            return Map.of();
        }
        List<Object[]> lignes = getEntityManager().createQuery(
                "select r.preparationMotId, s from SensRetenu r, Sens s where s.id = r.sensId"
                        + " and r.preparationMotId in :ids", Object[].class)
                .setParameter("ids", preparationMotIds)
                .getResultList();
        Map<UUID, Sens> parMot = new LinkedHashMap<>();
        lignes.forEach(ligne -> parMot.put((UUID) ligne[0], (Sens) ligne[1]));
        return parMot;
    }

    /** Identifiant du Sens retenu pour ce Mot de Préparation, vide s'il n'en a pas. */
    public Optional<UUID> sensIdDe(UUID preparationMotId) {
        return find("preparationMotId", preparationMotId).firstResultOptional().map(SensRetenu::sensId);
    }

    /** Supprime le Sens retenu de ce Mot de Préparation, s'il en a un. */
    public void supprimerDe(UUID preparationMotId) {
        delete("preparationMotId", preparationMotId);
    }
}
