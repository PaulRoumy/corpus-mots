package fr.corpusmots.vocabulaire.persistance;

import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class ImageRepository implements PanacheRepositoryBase<Image, UUID> {

    /** Identifiant tiré par la base ({@code uuidv7()}), comme toute clé de l'application (conventions). */
    public UUID nouvelIdentifiant() {
        return (UUID) getEntityManager().createNativeQuery("select uuidv7()").getSingleResult();
    }

    /** Image {@code id}, verrouillée ({@code SELECT … FOR UPDATE}) jusqu'à la fin de la transaction (AD-17). */
    public Optional<Image> verrouillee(UUID id) {
        return find("id", id).withLock(LockModeType.PESSIMISTIC_WRITE).firstResultOptional();
    }

    /** Vrai si au moins une Image, de n'importe quel enseignant et à n'importe quel état, porte le Thème. */
    public boolean porteTheme(UUID themeId) {
        return (Boolean) getEntityManager()
                .createNativeQuery("select exists (select 1 from image_theme where theme_id = :theme)")
                .setParameter("theme", themeId)
                .getSingleResult();
    }

    /**
     * Retire le Module {@code moduleId} de toutes les Images qui l'avaient, de tous les enseignants, en incrémentant
     * leur version : une écriture concurrente de l'Image, lue avant, échoue au lieu de remettre l'ancien Module.
     */
    public void retirerModule(UUID moduleId) {
        update("moduleId = null, version = version + 1 where moduleId = ?1", moduleId);
    }
}
