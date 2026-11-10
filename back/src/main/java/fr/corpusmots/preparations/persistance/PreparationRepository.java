package fr.corpusmots.preparations.persistance;

import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class PreparationRepository implements PanacheRepositoryBase<Preparation, UUID> {

    private static final String DU_PROPRIETAIRE = "proprietaireId = ?1";
    private static final String PLUS_RECENTES_D_ABORD = " order by creeLe desc, id desc";

    /** Identifiant tiré par la base ({@code uuidv7()}), comme toute clé de l'application (conventions). */
    public UUID nouvelIdentifiant() {
        return (UUID) getEntityManager().createNativeQuery("select uuidv7()").getSingleResult();
    }

    /** Préparations de l'enseignant, les plus récentes d'abord. */
    public List<Preparation> duProprietaire(UUID proprietaireId, int decalage, int taille) {
        return find(DU_PROPRIETAIRE + PLUS_RECENTES_D_ABORD, proprietaireId).range(decalage, decalage + taille - 1)
                .list();
    }

    public long compterDuProprietaire(UUID proprietaireId) {
        return count(DU_PROPRIETAIRE, proprietaireId);
    }

    /** Préparation {@code id} si elle appartient à cet enseignant. */
    public Optional<Preparation> duProprietaire(UUID id, UUID proprietaireId) {
        return find("id = ?1 and proprietaireId = ?2", id, proprietaireId).firstResultOptional();
    }

    /** Retire le Module {@code moduleId} de toutes les Préparations qui l'avaient, de tous les enseignants. */
    public void retirerModule(UUID moduleId) {
        update("moduleId = null where moduleId = ?1", moduleId);
    }

    /** Préparation la plus récente de l'enseignant. */
    public Optional<Preparation> plusRecente(UUID proprietaireId) {
        return find(DU_PROPRIETAIRE + PLUS_RECENTES_D_ABORD, proprietaireId).firstResultOptional();
    }
}
