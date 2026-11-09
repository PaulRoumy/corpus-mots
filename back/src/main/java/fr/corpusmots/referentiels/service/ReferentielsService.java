package fr.corpusmots.referentiels.service;

import fr.corpusmots.commun.api.ErreurMetier;
import fr.corpusmots.commun.service.Pagination;
import fr.corpusmots.referentiels.persistance.AlbumRepository;
import fr.corpusmots.referentiels.persistance.AlbumTrouve;
import fr.corpusmots.referentiels.persistance.Module;
import fr.corpusmots.referentiels.persistance.ModuleRepository;
import fr.corpusmots.referentiels.persistance.Theme;
import fr.corpusmots.referentiels.persistance.ThemeRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Albums, Modules et Thèmes de l'école (FR-4, FR-5), en lecture : pour l'API de {@code referentiels} et pour
 * {@code preparations}, qui ne les connaît que par ces méthodes et leurs records {@code …Vue} (AD-1, AD-16). Chaque
 * méthode rejoint la transaction de l'appelant, ou en ouvre une (AD-17).
 */
@ApplicationScoped
public class ReferentielsService {

    /** Longueur minimale du texte cherché, une fois normalisé. */
    static final int LONGUEUR_MIN_RECHERCHE = 2;

    static final String CODE_INTROUVABLE = "ressource.introuvable";

    @Inject
    AlbumRepository albums;

    @Inject
    ModuleRepository modules;

    @Inject
    ThemeRepository themes;

    /**
     * Albums dont le titre normalisé ({@link TitresAlbums#normaliser}) contient {@code recherche} normalisée ou lui
     * ressemble, du plus proche au moins proche. Moins de {@value #LONGUEUR_MIN_RECHERCHE} caractères : aucun.
     */
    @Transactional
    public PageAlbumsVue rechercherAlbums(String recherche, Pagination pagination) {
        String texte = TitresAlbums.normaliser(recherche);
        if (texte.length() < LONGUEUR_MIN_RECHERCHE) {
            return new PageAlbumsVue(List.of(), 0);
        }
        List<AlbumVue> trouves = albums.rechercher(texte, pagination.decalage(), pagination.taille()).stream()
                .map(ReferentielsService::vue)
                .toList();
        return new PageAlbumsVue(trouves, albums.compter(texte));
    }

    /**
     * Modules de l'Album, dans leur ordre.
     *
     * @throws ErreurMetier {@code 404 ressource.introuvable} si l'Album n'existe pas
     */
    @Transactional
    public List<ModuleVue> modulesDeLAlbum(UUID albumId) {
        if (albumId == null || albums.findByIdOptional(albumId).isEmpty()) {
            throw new ErreurMetier(404, CODE_INTROUVABLE, "Aucun album ne porte cet identifiant");
        }
        return modules.deLAlbum(albumId).stream().map(ReferentielsService::vue).toList();
    }

    /** Tous les Thèmes de l'école, par nom. */
    @Transactional
    public List<ThemeVue> themes() {
        return themes.parNom().stream().map(ReferentielsService::vue).toList();
    }

    /** L'Album {@code id}, vide s'il n'existe pas. */
    @Transactional
    public Optional<AlbumVue> album(UUID id) {
        return id == null ? Optional.empty() : albums(Set.of(id)).values().stream().findFirst();
    }

    /** Albums de ces identifiants, par identifiant ; un identifiant inconnu est absent de la réponse. */
    @Transactional
    public Map<UUID, AlbumVue> albums(Collection<UUID> ids) {
        return albums.lire(Set.copyOf(ids)).stream()
                .map(ReferentielsService::vue)
                .collect(Collectors.toMap(AlbumVue::id, Function.identity()));
    }

    /** Le Module {@code id}, vide s'il n'existe pas. */
    @Transactional
    public Optional<ModuleVue> module(UUID id) {
        return id == null ? Optional.empty() : modules.findByIdOptional(id).map(ReferentielsService::vue);
    }

    /** Modules de ces identifiants, par identifiant ; un identifiant inconnu est absent de la réponse. */
    @Transactional
    public Map<UUID, ModuleVue> modules(Collection<UUID> ids) {
        return modules.lire(Set.copyOf(ids)).stream()
                .map(ReferentielsService::vue)
                .collect(Collectors.toMap(ModuleVue::id, Function.identity()));
    }

    /** Le Thème {@code id}, vide s'il n'existe pas. */
    @Transactional
    public Optional<ThemeVue> theme(UUID id) {
        return id == null ? Optional.empty() : themes.findByIdOptional(id).map(ReferentielsService::vue);
    }

    private static AlbumVue vue(AlbumTrouve album) {
        return new AlbumVue(album.id(), album.titre(), album.auteur(), album.editeur(), album.nombreModules());
    }

    private static ModuleVue vue(Module module) {
        return new ModuleVue(module.id(), module.albumId(), module.nom(), module.ordre());
    }

    private static ThemeVue vue(Theme theme) {
        return new ThemeVue(theme.id(), theme.nom());
    }
}
