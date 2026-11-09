package fr.corpusmots.preparations.service;

import fr.corpusmots.commun.api.ErreurMetier;
import fr.corpusmots.commun.service.EnseignantCourant;
import fr.corpusmots.commun.service.Pagination;
import fr.corpusmots.commun.service.Section;
import fr.corpusmots.preparations.persistance.Preparation;
import fr.corpusmots.preparations.persistance.PreparationRepository;
import fr.corpusmots.referentiels.service.AlbumVue;
import fr.corpusmots.referentiels.service.ModuleVue;
import fr.corpusmots.referentiels.service.ReferentielsService;
import fr.corpusmots.referentiels.service.ThemeVue;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/**
 * Préparations de l'enseignant courant (FR-6) : seul point d'écriture de la table {@code preparation}. Le propriétaire
 * vient du jeton ({@link EnseignantCourant}) ; la Préparation d'un collègue est traitée comme inexistante (404) et
 * n'apparaît dans aucune liste. Albums, Modules et Thèmes sont lus par {@link ReferentielsService} (AD-1).
 */
@ApplicationScoped
public class PreparationsService {

    static final String CODE_SECTION_INVALIDE = "preparation.section_invalide";
    static final String CODE_ALBUM_INTROUVABLE = "preparation.album_introuvable";
    static final String CODE_MODULE_INVALIDE = "preparation.module_invalide";
    static final String CODE_THEME_INTROUVABLE = "preparation.theme_introuvable";
    static final String CODE_INTROUVABLE = "ressource.introuvable";

    @Inject
    PreparationRepository preparations;

    @Inject
    ReferentielsService referentiels;

    @Inject
    EnseignantCourant enseignantCourant;

    /**
     * Crée une Préparation de l'enseignant courant.
     *
     * @throws ErreurMetier {@code 400 preparation.section_invalide} si la Section n'est pas {@code ps}, {@code ms} ou
     *         {@code gs} ; {@code 400 preparation.album_introuvable} si l'Album manque ou n'existe pas ;
     *         {@code 400 preparation.module_invalide} si le Module n'existe pas ou appartient à un autre Album ;
     *         {@code 400 preparation.theme_introuvable} si le Thème par défaut n'existe pas
     */
    @Transactional
    public PreparationVue creer(NouvellePreparationCommande commande) {
        Section section = Section.deValeur(commande.section())
                .orElseThrow(() -> new ErreurMetier(400, CODE_SECTION_INVALIDE, "La section doit valoir ps, ms ou gs"));
        AlbumVue album = referentiels.album(commande.albumId())
                .orElseThrow(() -> new ErreurMetier(400, CODE_ALBUM_INTROUVABLE, "Aucun album ne porte cet identifiant"));
        ModuleVue module = null;
        if (commande.moduleId() != null) {
            module = referentiels.module(commande.moduleId())
                    .filter(trouve -> trouve.albumId().equals(album.id()))
                    .orElseThrow(() -> new ErreurMetier(400, CODE_MODULE_INVALIDE,
                            "Ce module n'existe pas ou appartient à un autre album"));
        }
        ThemeVue theme = null;
        if (commande.themeDefautId() != null) {
            theme = referentiels.theme(commande.themeDefautId())
                    .orElseThrow(() -> new ErreurMetier(400, CODE_THEME_INTROUVABLE,
                            "Aucun thème ne porte cet identifiant"));
        }
        Preparation preparation = Preparation.nouvelle(preparations.nouvelIdentifiant(), enseignantCourant.id(),
                album.id(), section, module == null ? null : module.id(), theme == null ? null : theme.id());
        preparations.persistAndFlush(preparation);
        return vue(preparation, album, module, theme);
    }

    /** Préparations de l'enseignant courant, les plus récentes d'abord. */
    @Transactional
    public PageCartesPreparationVue mesPreparations(Pagination pagination) {
        UUID proprietaire = enseignantCourant.id();
        List<Preparation> page = preparations.duProprietaire(proprietaire, pagination.decalage(), pagination.taille());
        Map<UUID, AlbumVue> albums = referentiels.albums(page.stream().map(Preparation::albumId).toList());
        Map<UUID, ModuleVue> modules = referentiels.modules(
                page.stream().map(Preparation::moduleId).filter(Objects::nonNull).toList());
        List<CartePreparationVue> cartes = page.stream().map(preparation -> {
            ModuleVue module = preparation.moduleId() == null ? null : modules.get(preparation.moduleId());
            return new CartePreparationVue(preparation.id(), preparation.albumId(),
                    albumDe(preparation, albums.get(preparation.albumId())).titre(), preparation.section(),
                    module == null ? null : module.id(), module == null ? null : module.nom(), 0, 0,
                    preparation.creeLe());
        }).toList();
        return new PageCartesPreparationVue(cartes, preparations.compterDuProprietaire(proprietaire));
    }

    /**
     * Préparation {@code id} de l'enseignant courant.
     *
     * @throws ErreurMetier {@code 404 ressource.introuvable} si elle n'existe pas ou appartient à un collègue
     */
    @Transactional
    public PreparationVue lire(UUID id) {
        Preparation preparation = (id == null ? Optional.<Preparation>empty()
                : preparations.duProprietaire(id, enseignantCourant.id()))
                .orElseThrow(() -> new ErreurMetier(404, CODE_INTROUVABLE, "Aucune préparation ne porte cet identifiant"));
        AlbumVue album = albumDe(preparation, referentiels.album(preparation.albumId()).orElse(null));
        ModuleVue module = preparation.moduleId() == null ? null
                : referentiels.module(preparation.moduleId()).orElse(null);
        ThemeVue theme = preparation.themeDefautId() == null ? null
                : referentiels.theme(preparation.themeDefautId()).orElse(null);
        return vue(preparation, album, module, theme);
    }

    /** Section de la Préparation la plus récente de l'enseignant courant, vide s'il n'en a aucune. */
    @Transactional
    public Optional<Section> derniereSection() {
        return preparations.plusRecente(enseignantCourant.id()).map(Preparation::section);
    }

    private static PreparationVue vue(Preparation preparation, AlbumVue album, ModuleVue module, ThemeVue theme) {
        return new PreparationVue(preparation.id(), album.id(), album.titre(), preparation.section(),
                module == null ? null : module.id(), module == null ? null : module.nom(),
                theme == null ? null : theme.id(), theme == null ? null : theme.nom(), 0, 0, preparation.creeLe());
    }

    /** Un Album n'est jamais supprimé (sa fusion, Epic 6, réécrira les Préparations) : son absence est une anomalie. */
    private static AlbumVue albumDe(Preparation preparation, AlbumVue album) {
        if (album == null) {
            throw new IllegalStateException("Album " + preparation.albumId() + " de la préparation "
                    + preparation.id() + " introuvable");
        }
        return album;
    }
}
