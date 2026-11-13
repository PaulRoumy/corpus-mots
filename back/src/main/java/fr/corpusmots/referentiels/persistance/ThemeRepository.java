package fr.corpusmots.referentiels.persistance;

import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class ThemeRepository implements PanacheRepositoryBase<Theme, UUID> {

    /** Identifiant d'un nouveau Thème, tiré par PostgreSQL ({@code uuidv7()}). */
    public UUID nouvelIdentifiant() {
        return (UUID) getEntityManager().createNativeQuery("select uuidv7()").getSingleResult();
    }

    /**
     * Thème {@code id} verrouillé jusqu'à la fin de la transaction ({@code SELECT … FOR UPDATE}) : sa suppression
     * attend les affectations en cours, qui le lisent par {@link #lirePartage}. Vide s'il n'existe pas.
     */
    public Optional<Theme> verrouiller(UUID id) {
        return findByIdOptional(id, LockModeType.PESSIMISTIC_WRITE);
    }

    /**
     * Thèmes de ces identifiants, lus en verrou partagé ({@code SELECT … FOR SHARE}) jusqu'à la fin de la
     * transaction : ils ne peuvent pas être supprimés tant qu'elle dure. Les identifiants inconnus sont ignorés.
     */
    public List<Theme> lirePartage(Collection<UUID> ids) {
        return ids.isEmpty() ? List.of() : find("id in ?1", ids).withLock(LockModeType.PESSIMISTIC_READ).list();
    }

    /** Thèmes de ces identifiants ; les identifiants inconnus sont ignorés. */
    public List<Theme> lire(Collection<UUID> ids) {
        return ids.isEmpty() ? List.of() : list("id in ?1", ids);
    }

    /** Tous les Thèmes de l'école, par nom. */
    public List<Theme> parNom() {
        return list("order by nom");
    }

    /**
     * Prend le verrou consultatif des Thèmes ({@code pg_advisory_xact_lock}), rendu à la fin de la transaction
     * courante : les créations et renommages de Thèmes passent un à un, pour l'unicité du nom normalisé, que la
     * contrainte {@code theme_nom_unique} ne couvre qu'au nom exact.
     */
    public void verrouillerNoms() {
        // La fonction renvoie void : la sous-requête la fait exécuter sans lire de valeur de ce type.
        getEntityManager()
                .createNativeQuery("select count(*) from (select pg_advisory_xact_lock(hashtext('referentiels.themes'))) verrou")
                .getSingleResult();
    }
}
