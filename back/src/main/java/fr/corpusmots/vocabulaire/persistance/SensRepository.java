package fr.corpusmots.vocabulaire.persistance;

import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class SensRepository implements PanacheRepositoryBase<Sens, UUID> {

    /**
     * Insère le Sens de clé {@code libelleCle} du Mot s'il n'existe pas encore ({@code ON CONFLICT DO NOTHING}) : jamais
     * d'erreur de doublon, même face à une insertion concurrente. Un Sens existant garde sa catégorie.
     */
    public void insererSiAbsent(UUID motId, String libelle, String libelleCle, String categorie) {
        getEntityManager().createNativeQuery(
                "insert into sens (mot_id, libelle, libelle_cle, categorie)"
                        + " values (:mot, :libelle, :cle, cast(:categorie as text))"
                        + " on conflict (mot_id, libelle_cle) do nothing")
                .setParameter("mot", motId)
                .setParameter("libelle", libelle)
                .setParameter("cle", libelleCle)
                .setParameter("categorie", categorie)
                .executeUpdate();
    }

    public Optional<Sens> parCle(UUID motId, String libelleCle) {
        return find("motId = ?1 and libelleCle = ?2", motId, libelleCle).firstResultOptional();
    }

    /** Sens du Mot {@code motId}, tous enseignants confondus : l'appelant ne révèle que ceux qui lui sont visibles. */
    public List<Sens> duMot(UUID motId) {
        return list("motId", motId);
    }

    /** Sens de ces Mots, tous enseignants confondus : l'appelant ne révèle que ceux qui lui sont visibles. */
    public List<Sens> deMots(Collection<UUID> motIds) {
        return motIds.isEmpty() ? List.of() : list("motId in ?1", motIds);
    }

    /** Sens de ces identifiants ; ceux qui n'existent pas sont absents. */
    public List<Sens> lire(Collection<UUID> ids) {
        return ids.isEmpty() ? List.of() : list("id in ?1", ids);
    }
}
