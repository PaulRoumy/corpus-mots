package fr.corpusmots.comptes.persistance;

import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.UUID;

@ApplicationScoped
public class EnseignantRepository implements PanacheRepositoryBase<Enseignant, UUID> {
}
