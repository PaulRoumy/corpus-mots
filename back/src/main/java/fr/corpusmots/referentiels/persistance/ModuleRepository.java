package fr.corpusmots.referentiels.persistance;

import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class ModuleRepository implements PanacheRepositoryBase<Module, UUID> {

    /** Modules de l'Album, dans leur ordre. */
    public List<Module> deLAlbum(UUID albumId) {
        return list("albumId = ?1 order by ordre", albumId);
    }

    /** Modules de ces identifiants ; les identifiants inconnus sont ignorés. */
    public List<Module> lire(Collection<UUID> ids) {
        return ids.isEmpty() ? List.of() : list("id in ?1", ids);
    }
}
