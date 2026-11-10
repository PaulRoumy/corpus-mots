package fr.corpusmots.referentiels.persistance;

import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class ThemeRepository implements PanacheRepositoryBase<Theme, UUID> {

    /** Identifiant d'un nouveau Thème, tiré par PostgreSQL ({@code uuidv7()}). */
    public UUID nouvelIdentifiant() {
        return (UUID) getEntityManager().createNativeQuery("select uuidv7()").getSingleResult();
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
