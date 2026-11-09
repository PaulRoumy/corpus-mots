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
    static final String CODE_TEMPS_PASSE_INVALIDE = "preparation.temps_passe_invalide";
    static final String CODE_INTROUVABLE = "ressource.introuvable";

    /** Borne haute du Temps passé : 100 heures (contrainte {@code preparation_temps_passe_borne}). */
    static final int TEMPS_PASSE_MAXIMUM_MINUTES = 6000;

    /** Pas du Temps passé : une demi-heure (même contrainte). */
    static final int PAS_TEMPS_PASSE_MINUTES = 30;

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
        ModuleVue module = moduleDeLAlbum(commande.moduleId(), album.id());
        ThemeVue theme = themeExistant(commande.themeDefautId());
        Preparation preparation = Preparation.nouvelle(preparations.nouvelIdentifiant(), enseignantCourant.id(),
                album.id(), section, module == null ? null : module.id(), theme == null ? null : theme.id());
        preparations.persistAndFlush(preparation);
        return vue(preparation, album, module, theme);
    }

    /**
     * Remplace les réglages (Module, Thème par défaut, Temps passé) de la Préparation {@code id} de l'enseignant
     * courant ; {@code null} retire la valeur. Rien n'est modifié en cas de refus.
     *
     * @throws ErreurMetier {@code 404 ressource.introuvable} si la Préparation n'existe pas ou appartient à un
     *         collègue ; {@code 400 preparation.module_invalide} si le Module n'existe pas ou appartient à un autre
     *         Album ; {@code 400 preparation.theme_introuvable} si le Thème n'existe pas ;
     *         {@code 400 preparation.temps_passe_invalide} si le Temps passé n'est pas un multiple
     *         de 30 minutes entre 0 et 6000
     */
    @Transactional
    public PreparationVue regler(UUID id, ReglagesPreparationCommande commande) {
        Preparation preparation = mienne(id);
        AlbumVue album = albumDe(preparation, referentiels.album(preparation.albumId()).orElse(null));
        ModuleVue module = moduleDeLAlbum(commande.moduleId(), album.id());
        ThemeVue theme = themeExistant(commande.themeDefautId());
        Integer temps = commande.tempsPasseMinutes();
        if (temps != null
                && (temps < 0 || temps > TEMPS_PASSE_MAXIMUM_MINUTES || temps % PAS_TEMPS_PASSE_MINUTES != 0)) {
            throw new ErreurMetier(400, CODE_TEMPS_PASSE_INVALIDE,
                    "Le temps passé doit être un multiple de " + PAS_TEMPS_PASSE_MINUTES + " minutes entre 0 et "
                            + TEMPS_PASSE_MAXIMUM_MINUTES);
        }
        preparation.regler(module == null ? null : module.id(), theme == null ? null : theme.id(), temps);
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
        Preparation preparation = mienne(id);
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

    /** Préparation {@code id} de l'enseignant courant ; celle d'un collègue est traitée comme inexistante. */
    private Preparation mienne(UUID id) {
        return (id == null ? Optional.<Preparation>empty() : preparations.duProprietaire(id, enseignantCourant.id()))
                .orElseThrow(() -> new ErreurMetier(404, CODE_INTROUVABLE, "Aucune préparation ne porte cet identifiant"));
    }

    /** Module {@code moduleId} s'il appartient à l'Album, {@code null} si {@code moduleId} est nul. */
    private ModuleVue moduleDeLAlbum(UUID moduleId, UUID albumId) {
        if (moduleId == null) {
            return null;
        }
        return referentiels.module(moduleId)
                .filter(trouve -> trouve.albumId().equals(albumId))
                .orElseThrow(() -> new ErreurMetier(400, CODE_MODULE_INVALIDE,
                        "Ce module n'existe pas ou appartient à un autre album"));
    }

    /** Thème {@code themeId}, {@code null} si {@code themeId} est nul. */
    private ThemeVue themeExistant(UUID themeId) {
        if (themeId == null) {
            return null;
        }
        return referentiels.theme(themeId)
                .orElseThrow(() -> new ErreurMetier(400, CODE_THEME_INTROUVABLE, "Aucun thème ne porte cet identifiant"));
    }

    private static PreparationVue vue(Preparation preparation, AlbumVue album, ModuleVue module, ThemeVue theme) {
        return new PreparationVue(preparation.id(), album.id(), album.titre(), preparation.section(),
                module == null ? null : module.id(), module == null ? null : module.nom(),
                theme == null ? null : theme.id(), theme == null ? null : theme.nom(), preparation.tempsPasseMinutes(),
                0, 0, preparation.creeLe());
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
