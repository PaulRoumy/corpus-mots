package fr.corpusmots.referentiels.persistance;

import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.Collection;
import java.util.List;
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

    /** Modules de ces identifiants ; les identifiants inconnus sont ignorés. */
    public List<Module> lire(Collection<UUID> ids) {
        return ids.isEmpty() ? List.of() : list("id in ?1", ids);
    }
}
