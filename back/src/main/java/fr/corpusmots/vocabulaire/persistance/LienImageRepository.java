package fr.corpusmots.vocabulaire.persistance;

import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@ApplicationScoped
public class LienImageRepository implements PanacheRepositoryBase<LienImage, UUID> {

    /** Identifiant tiré par la base ({@code uuidv7()}), comme toute clé de l'application (conventions). */
    public UUID nouvelIdentifiant() {
        return (UUID) getEntityManager().createNativeQuery("select uuidv7()").getSingleResult();
    }

    /** Vrai si ce Mot de Préparation a déjà une Image liée. */
    public boolean existePourMot(UUID preparationMotId) {
        return count("preparationMotId", preparationMotId) > 0;
    }

    /** Vrai si l'enseignant a un lien vers cette Image, dans l'une quelconque de ses Préparations. */
    public boolean existe(UUID imageId, UUID enseignantId) {
        return count("imageId = ?1 and enseignantId = ?2", imageId, enseignantId) > 0;
    }

    /** Image liée à chacun de ces Mots de Préparation ; ceux qui n'en ont pas sont absents. */
    public Map<UUID, Image> imagesDe(Collection<UUID> preparationMotIds) {
        if (preparationMotIds.isEmpty()) {
            return Map.of();
        }
        List<Object[]> lignes = getEntityManager().createQuery(
                "select l.preparationMotId, i from LienImage l, Image i where i.id = l.imageId"
                        + " and l.preparationMotId in :ids", Object[].class)
                .setParameter("ids", preparationMotIds)
                .getResultList();
        Map<UUID, Image> parMot = new LinkedHashMap<>();
        lignes.forEach(ligne -> parMot.put((UUID) ligne[0], (Image) ligne[1]));
        return parMot;
    }

    /** Nombre de Mots illustrés (liens) de chacune de ces Préparations ; une Préparation sans lien est absente. */
    public Map<UUID, Integer> compterParPreparation(Collection<UUID> preparationIds) {
        if (preparationIds.isEmpty()) {
            return Map.of();
        }
        List<Object[]> lignes = getEntityManager().createQuery(
                "select l.preparationId, count(l) from LienImage l where l.preparationId in :ids"
                        + " group by l.preparationId", Object[].class)
                .setParameter("ids", preparationIds)
                .getResultList();
        Map<UUID, Integer> nombres = new HashMap<>();
        lignes.forEach(ligne -> nombres.put((UUID) ligne[0], ((Number) ligne[1]).intValue()));
        return nombres;
    }

    /** Supprime le lien d'Image de ce Mot de Préparation, s'il en a un ; l'Image reste. */
    public void supprimerDe(UUID preparationMotId) {
        delete("preparationMotId", preparationMotId);
    }
}
