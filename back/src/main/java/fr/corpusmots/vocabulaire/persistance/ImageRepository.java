package fr.corpusmots.vocabulaire.persistance;

import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.LockModeType;
import org.hibernate.query.NativeQuery;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class ImageRepository implements PanacheRepositoryBase<Image, UUID> {

    /** Identifiant tiré par la base ({@code uuidv7()}), comme toute clé de l'application (conventions). */
    public UUID nouvelIdentifiant() {
        return (UUID) getEntityManager().createNativeQuery("select uuidv7()").getSingleResult();
    }

    /** Image {@code id}, verrouillée ({@code SELECT … FOR UPDATE}) jusqu'à la fin de la transaction (AD-17). */
    public Optional<Image> verrouillee(UUID id) {
        return find("id", id).withLock(LockModeType.PESSIMISTIC_WRITE).firstResultOptional();
    }

    /**
     * Images {@code ids} qui existent, verrouillées ({@code SELECT … FOR UPDATE}) jusqu'à la fin de la transaction en
     * une seule requête, dans l'ordre des identifiants de PostgreSQL : deux lots qui se recouvrent prennent leurs
     * verrous dans le même ordre (AD-17). Une Image absente est simplement omise.
     */
    public List<Image> verrouillees(Collection<UUID> ids) {
        if (ids.isEmpty()) {
            return List.of();
        }
        // Liste liée par setParameterList : le paramètre est développé en (?, ?, …), jamais collé dans le SQL.
        @SuppressWarnings("unchecked")
        NativeQuery<Image> requete = getEntityManager()
                .createNativeQuery("select i.* from image i where i.id in (:ids) order by i.id for update", Image.class)
                .unwrap(NativeQuery.class);
        return requete.setParameterList("ids", ids, UUID.class).getResultList();
    }

    /**
     * Sens, propriétaire et état de l'Image {@code id}, lus sans verrou et sans charger l'entité dans le contexte de
     * persistance : une lecture verrouillée plus tard dans la même transaction relit l'Image en base. L'appelant décide
     * de la visibilité par {@code VisibiliteImages} (AD-2).
     */
    public Optional<Object[]> sensProprietaireEtat(UUID id) {
        return getEntityManager()
                .createQuery("select i.sensId, i.proprietaireId, i.etat from Image i where i.id = :id", Object[].class)
                .setParameter("id", id)
                .getResultStream()
                .findFirst();
    }

    /**
     * Images qui illustrent l'un de ces Sens, de tous les enseignants et à tous les états : l'appelant les filtre par
     * {@code VisibiliteImages} (AD-2).
     */
    public List<Image> deSens(Collection<UUID> sensIds) {
        return sensIds.isEmpty() ? List.of() : list("sensId in ?1", sensIds);
    }

    /**
     * Comme {@link #deSens}, avec les Sections de chaque Image chargées dans la même requête (aucune requête par
     * Image) ; l'appelant les filtre par {@code VisibiliteImages} (AD-2).
     */
    public List<Image> deSensAvecSections(Collection<UUID> sensIds) {
        if (sensIds.isEmpty()) {
            return List.of();
        }
        return getEntityManager().createQuery(
                "select distinct i from Image i left join fetch i.sections where i.sensId in :sens", Image.class)
                .setParameter("sens", sensIds)
                .getResultList();
    }

    /**
     * Images dont l'Album d'origine est {@code albumId} (images d'album seulement), avec leurs Sections chargées dans la
     * même requête, de tous les enseignants et à tous les états : l'appelant les filtre par {@code VisibiliteImages}
     * (AD-2).
     */
    public List<Image> dAlbumDOrigineAvecSections(UUID albumId, String typeImageAlbum) {
        return getEntityManager().createQuery(
                "select distinct i from Image i left join fetch i.sections where i.albumId = :album"
                        + " and i.typeImage = :type", Image.class)
                .setParameter("album", albumId)
                .setParameter("type", typeImageAlbum)
                .getResultList();
    }

    /**
     * Page de la Banque, réservée à {@code vocabulaire.service.Images} (règle ArchUnit) : les Images qui satisfont
     * {@code condition} (SQL sur {@code image} sous l'alias {@code i} : critère de visibilité écrit par
     * {@code VisibiliteImages} et jamais ailleurs, AD-2, suivi en ET des filtres paramétrés de {@code Images}) avec ses
     * {@code parametres}, filtrées et paginées en base, avec Mot, Sens et Sections dans la même
     * requête (aucune requête par Image). Ordre : forme du Mot (sans tenir compte de la casse ni des accents, clés
     * comparées en collation {@code C} : même ordre sur tout hôte), puis Sens, puis Image la plus récente d'abord, puis
     * identifiant ; les Images d'un même Sens restent contiguës d'une page à l'autre.
     *
     * @throws IllegalArgumentException si un paramètre du critère s'appelle {@code decalage} ou {@code taille}
     */
    public List<ImageBanqueLigne> pageBanque(String condition, Map<String, Object> parametres, int decalage,
            int taille) {
        verifierParametres(parametres);
        var requete = getEntityManager().createNativeQuery(
                "select i.id, i.proprietaire_id, i.etat, i.type_image, i.licence, i.source,"
                        + " (select string_agg(se.section, ',') from image_section se where se.image_id = i.id),"
                        + " m.id, m.forme, s.id, s.libelle, s.categorie, i.retrait_admin_motif is not null"
                        + " from image i join sens s on s.id = i.sens_id join mot m on m.id = s.mot_id"
                        + " where " + condition
                        + " order by m.forme_recherche collate \"C\", m.forme_cle collate \"C\", m.id,"
                        + " unaccent(lower(s.libelle)) collate \"C\", s.libelle_cle collate \"C\", s.id,"
                        + " i.cree_le desc, i.id"
                        + " offset :decalage limit :taille");
        parametres.forEach(requete::setParameter);
        @SuppressWarnings("unchecked")
        List<Object[]> lignes = requete.setParameter("decalage", decalage).setParameter("taille", taille)
                .getResultList();
        return lignes.stream()
                .map(ligne -> new ImageBanqueLigne((UUID) ligne[0], (UUID) ligne[1], (String) ligne[2],
                        (String) ligne[3], (String) ligne[4], (String) ligne[5], (String) ligne[6], (UUID) ligne[7],
                        (String) ligne[8], (UUID) ligne[9], (String) ligne[10], (String) ligne[11],
                        (Boolean) ligne[12]))
                .toList();
    }

    /** Nombre d'Images qui satisfont {@code condition} (voir {@link #pageBanque}), compté en base. */
    public long nombreBanque(String condition, Map<String, Object> parametres) {
        verifierParametres(parametres);
        var requete = getEntityManager().createNativeQuery("select count(*) from image i where " + condition);
        parametres.forEach(requete::setParameter);
        return ((Number) requete.getSingleResult()).longValue();
    }

    /**
     * Propriétaires distincts des Images qui satisfont {@code condition} (SQL sur {@code image} sous l'alias {@code i},
     * écrite par {@code VisibiliteImages}, AD-2), réservé à {@code vocabulaire.service.Images} (règle ArchUnit), par
     * identifiant croissant.
     */
    public List<UUID> proprietairesBanque(String condition, Map<String, Object> parametres) {
        var requete = getEntityManager().createNativeQuery(
                "select distinct i.proprietaire_id from image i where " + condition + " order by i.proprietaire_id");
        parametres.forEach(requete::setParameter);
        @SuppressWarnings("unchecked")
        List<UUID> proprietaires = requete.getResultList();
        return proprietaires;
    }

    /** Refuse un paramètre du critère qui porterait le nom d'un paramètre de pagination de la requête. */
    private static void verifierParametres(Map<String, Object> parametres) {
        if (parametres.containsKey("decalage") || parametres.containsKey("taille")) {
            throw new IllegalArgumentException("Paramètre de critère réservé à la pagination : decalage ou taille");
        }
    }

    /** Vrai si au moins une Image, de n'importe quel enseignant et à n'importe quel état, porte le Thème. */
    public boolean porteTheme(UUID themeId) {
        return (Boolean) getEntityManager()
                .createNativeQuery("select exists (select 1 from image_theme where theme_id = :theme)")
                .setParameter("theme", themeId)
                .getSingleResult();
    }

    /**
     * Retire le Module {@code moduleId} de toutes les Images qui l'avaient, de tous les enseignants, en incrémentant
     * leur version : une écriture concurrente de l'Image, lue avant, échoue au lieu de remettre l'ancien Module.
     */
    public void retirerModule(UUID moduleId) {
        update("moduleId = null, version = version + 1 where moduleId = ?1", moduleId);
    }
}
