package fr.corpusmots.referentiels.persistance;

import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class ModuleRepository implements PanacheRepositoryBase<Module, UUID> {

    /** Identifiant d'un nouveau Module, tiré par PostgreSQL ({@code uuidv7()}). */
    public UUID nouvelIdentifiant() {
        return (UUID) getEntityManager().createNativeQuery("select uuidv7()").getSingleResult();
    }

    /** Modules de l'Album, dans leur ordre. */
    public List<Module> deLAlbum(UUID albumId) {
        return list("albumId = ?1 order by ordre", albumId);
    }

    /**
     * Plus grand {@code ordre} des Modules de l'Album, {@code 0} s'il n'en a aucun. Pour une place sûre en fin
     * d'Album, l'appelant a d'abord verrouillé l'Album ({@link AlbumRepository#verrouiller}).
     */
    public int dernierOrdre(UUID albumId) {
        return ((Number) getEntityManager()
                .createQuery("select coalesce(max(m.ordre), 0) from Module m where m.albumId = :album")
                .setParameter("album", albumId)
                .getSingleResult()).intValue();
    }

    /**
     * Module {@code id} verrouillé jusqu'à la fin de la transaction ({@code SELECT … FOR UPDATE}) : sa suppression
     * attend les affectations en cours, qui le lisent par {@link #lirePartage}. Vide s'il n'existe pas.
     */
    public Optional<Module> verrouiller(UUID id) {
        return findByIdOptional(id, LockModeType.PESSIMISTIC_WRITE);
    }

    /**
     * Module {@code id} lu en verrou partagé ({@code SELECT … FOR SHARE}) jusqu'à la fin de la transaction : il ne
     * peut pas être supprimé tant qu'elle dure. Vide s'il n'existe pas.
     */
    public Optional<Module> lirePartage(UUID id) {
        return findByIdOptional(id, LockModeType.PESSIMISTIC_READ);
    }

    /** Modules de ces identifiants ; les identifiants inconnus sont ignorés. */
    public List<Module> lire(Collection<UUID> ids) {
        return ids.isEmpty() ? List.of() : list("id in ?1", ids);
    }
}
