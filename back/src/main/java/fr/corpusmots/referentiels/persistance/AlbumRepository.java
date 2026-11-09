package fr.corpusmots.referentiels.persistance;

import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class AlbumRepository implements PanacheRepositoryBase<Album, UUID> {

    /** Seuil de similarité trigramme ({@code pg_trgm}) à partir duquel un titre « ressemble » à la recherche. */
    static final double SEUIL_SIMILARITE = 0.3;

    private static final String CORRESPONDANCE = " from album a"
            + " where a.titre_recherche like :motif escape '!' or similarity(a.titre_recherche, :texte) >= :seuil";

    private static final String COLONNES = "select a.id, a.titre, a.auteur, a.editeur,"
            + " (select count(*) from module m where m.album_id = a.id) as nombre_modules";

    /**
     * Albums dont le titre normalisé contient {@code texte} ou lui ressemble (similarité trigramme d'au moins
     * {@value #SEUIL_SIMILARITE}), du plus proche au moins proche, puis par titre. {@code texte} est déjà normalisé.
     */
    public List<AlbumTrouve> rechercher(String texte, int decalage, int taille) {
        @SuppressWarnings("unchecked")
        List<Object[]> lignes = getEntityManager()
                .createNativeQuery(COLONNES + CORRESPONDANCE
                        + " order by similarity(a.titre_recherche, :texte) desc, a.titre, a.id")
                .setParameter("motif", motifContient(texte))
                .setParameter("texte", texte)
                .setParameter("seuil", SEUIL_SIMILARITE)
                .setFirstResult(decalage)
                .setMaxResults(taille)
                .getResultList();
        return lignes.stream().map(AlbumRepository::album).toList();
    }

    /** Nombre total d'Albums que trouve {@link #rechercher}. */
    public long compter(String texte) {
        return ((Number) getEntityManager()
                .createNativeQuery("select count(*)" + CORRESPONDANCE)
                .setParameter("motif", motifContient(texte))
                .setParameter("texte", texte)
                .setParameter("seuil", SEUIL_SIMILARITE)
                .getSingleResult()).longValue();
    }

    /** Albums de ces identifiants, avec leur nombre de Modules ; les identifiants inconnus sont ignorés. */
    public List<AlbumTrouve> lire(Collection<UUID> ids) {
        if (ids.isEmpty()) {
            return List.of();
        }
        @SuppressWarnings("unchecked")
        List<Object[]> lignes = getEntityManager()
                .createNativeQuery(COLONNES + " from album a where a.id in (:ids)")
                .setParameter("ids", ids)
                .getResultList();
        return lignes.stream().map(AlbumRepository::album).toList();
    }

    private static AlbumTrouve album(Object[] ligne) {
        return new AlbumTrouve((UUID) ligne[0], (String) ligne[1], (String) ligne[2], (String) ligne[3],
                ((Number) ligne[4]).longValue());
    }

    /** {@code %texte%}, les caractères spéciaux de LIKE ({@code % _}) et l'échappement {@code !} pris littéralement. */
    private static String motifContient(String texte) {
        return "%" + texte.replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%";
    }
}
