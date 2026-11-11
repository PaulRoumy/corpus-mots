package fr.corpusmots.vocabulaire.persistance;

import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class MotRepository implements PanacheRepositoryBase<Mot, UUID> {

    /**
     * Insère le Mot de clé {@code formeCle} s'il n'existe pas encore ({@code ON CONFLICT DO NOTHING}) : jamais d'erreur
     * de doublon, même face à une insertion concurrente, qui fait attendre cette requête jusqu'à sa fin.
     * {@code forme_recherche} vaut {@code unaccent(forme_cle)} (AD-10).
     */
    public void insererSiAbsent(String forme, String formeCle) {
        getEntityManager().createNativeQuery(
                "insert into mot (forme, forme_cle, forme_recherche) values (:forme, :cle, unaccent(:cle))"
                        + " on conflict (forme_cle) do nothing")
                .setParameter("forme", forme)
                .setParameter("cle", formeCle)
                .executeUpdate();
    }

    public Optional<Mot> parCle(String formeCle) {
        return find("formeCle", formeCle).firstResultOptional();
    }

    /** Mots de ces identifiants ; les identifiants inconnus sont ignorés. */
    public List<Mot> lire(Collection<UUID> ids) {
        return ids.isEmpty() ? List.of() : list("id in ?1", ids);
    }
}
