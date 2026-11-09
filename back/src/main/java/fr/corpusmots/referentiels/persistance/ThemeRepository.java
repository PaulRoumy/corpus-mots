package fr.corpusmots.referentiels.persistance;

import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class ThemeRepository implements PanacheRepositoryBase<Theme, UUID> {

    /** Tous les Thèmes de l'école, par nom. */
    public List<Theme> parNom() {
        return list("order by nom");
    }
}
