package fr.corpusmots.vocabulaire.persistance;

import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
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

    /** Identifiant de l'Image liée à ce Mot de Préparation, vide s'il n'en a pas. */
    public Optional<UUID> imageIdDe(UUID preparationMotId) {
        return find("preparationMotId", preparationMotId).firstResultOptional().map(LienImage::imageId);
    }

    /** Vrai si l'enseignant a un lien vers cette Image, dans l'une quelconque de ses Préparations. */
    public boolean existe(UUID imageId, UUID enseignantId) {
        return count("imageId = ?1 and enseignantId = ?2", imageId, enseignantId) > 0;
    }

    /** Vrai si au moins un enseignant, propriétaire compris, a un lien vers cette Image (AD-5). */
    public boolean existePourImage(UUID imageId) {
        return count("imageId", imageId) > 0;
    }

    /** Celles de ces Images qui ont un lien, de n'importe quel enseignant, dans un autre Album que {@code albumId}. */
    public Set<UUID> lieesHorsAlbum(Collection<UUID> imageIds, UUID albumId) {
        if (imageIds.isEmpty()) {
            return Set.of();
        }
        return Set.copyOf(getEntityManager().createQuery(
                "select distinct l.imageId from LienImage l where l.imageId in :images and l.albumId <> :album",
                UUID.class)
                .setParameter("images", imageIds)
                .setParameter("album", albumId)
                .getResultList());
    }

    /** Celles de ces Images que l'enseignant a liées, dans l'une quelconque de ses Préparations. */
    public Set<UUID> lieesPar(Collection<UUID> imageIds, UUID enseignantId) {
        if (imageIds.isEmpty()) {
            return Set.of();
        }
        return Set.copyOf(getEntityManager().createQuery(
                "select distinct l.imageId from LienImage l where l.imageId in :images and l.enseignantId = :enseignant",
                UUID.class)
                .setParameter("images", imageIds)
                .setParameter("enseignant", enseignantId)
                .getResultList());
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

    /** Liens d'Image des Mots de cette Préparation. */
    public List<LienImage> deLaPreparation(UUID preparationId) {
        return list("preparationId", preparationId);
    }

    /** Supprime les liens d'Image de tous les Mots de cette Préparation ; les Images restent. */
    public void supprimerDeLaPreparation(UUID preparationId) {
        delete("preparationId", preparationId);
    }
}
