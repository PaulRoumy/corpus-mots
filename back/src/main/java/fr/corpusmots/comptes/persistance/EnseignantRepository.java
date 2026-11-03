package fr.corpusmots.comptes.persistance;

import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.UUID;

@ApplicationScoped
public class EnseignantRepository implements PanacheRepositoryBase<Enseignant, UUID> {

    /**
     * Prend le verrou consultatif des administrateurs ({@code pg_advisory_xact_lock}), rendu à la fin de la transaction
     * courante : deux actions qui pourraient retirer le dernier administrateur actif passent l'une après l'autre (AD-6).
     */
    public void verrouillerAdministrateurs() {
        // La fonction renvoie void : la sous-requête la fait exécuter sans lire de valeur de ce type.
        getEntityManager()
                .createNativeQuery("select count(*) from (select pg_advisory_xact_lock(hashtext('comptes.administrateurs'))) verrou")
                .getSingleResult();
    }
}
