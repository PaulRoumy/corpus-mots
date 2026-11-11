package fr.corpusmots.referentiels.service;

import fr.corpusmots.commun.api.ErreurMetier;
import fr.corpusmots.commun.service.EnseignantCourant;
import fr.corpusmots.commun.service.Pagination;
import fr.corpusmots.referentiels.persistance.Album;
import fr.corpusmots.referentiels.persistance.AlbumRepository;
import fr.corpusmots.referentiels.persistance.AlbumTrouve;
import fr.corpusmots.referentiels.persistance.Module;
import fr.corpusmots.referentiels.persistance.ModuleRepository;
import fr.corpusmots.referentiels.persistance.Theme;
import fr.corpusmots.referentiels.persistance.ThemeRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Event;
import jakarta.enterprise.inject.Instance;
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
 * Albums, Modules et Thèmes de l'école (FR-4, FR-5) : pour l'API de {@code referentiels} et pour
 * {@code preparations}, qui ne les connaît que par ces méthodes et leurs records {@code …Vue} (AD-1, AD-16). Chaque
 * méthode rejoint la transaction de l'appelant, ou en ouvre une (AD-17). Un Album créé est visible de toute l'école
 * aussitôt.
 */
@ApplicationScoped
public class ReferentielsService {

    /** Longueur minimale du texte cherché, une fois normalisé. */
    static final int LONGUEUR_MIN_RECHERCHE = 2;

    /** Nombre maximal de titres proches renvoyés. */
    static final int NOMBRE_MAX_PROCHES = 5;

    /** Longueur maximale du titre, de l'auteur et de l'éditeur, une fois nettoyés. */
    static final int LONGUEUR_MAX_CHAMP = 200;

    static final String CODE_INTROUVABLE = "ressource.introuvable";
    static final String CODE_TITRE_INVALIDE = "album.titre_invalide";
    static final String CODE_AUTEUR_INVALIDE = "album.auteur_invalide";
    static final String CODE_EDITEUR_INVALIDE = "album.editeur_invalide";
    static final String CODE_DEJA_EXISTANT = "album.deja_existant";
    static final String CODE_ALBUM_RESERVE_AU_CREATEUR = "album.reserve_au_createur";
    static final String CODE_NOM_MODULE_INVALIDE = "module.nom_invalide";
    static final String CODE_MODULE_DEJA_EXISTANT = "module.deja_existant";
    static final String CODE_MODULE_RESERVE_AU_CREATEUR = "module.reserve_au_createur";
    static final String CODE_NOM_THEME_INVALIDE = "theme.nom_invalide";
    static final String CODE_THEME_DEJA_EXISTANT = "theme.deja_existant";
    static final String CODE_THEME_RESERVE_AU_CREATEUR = "theme.reserve_au_createur";
    static final String CODE_THEME_UTILISE = "theme.utilise";

    @Inject
    EnseignantCourant enseignantCourant;

    @Inject
    AlbumRepository albums;

    @Inject
    ModuleRepository modules;

    @Inject
    ThemeRepository themes;

    @Inject
    Event<ModuleSupprime> moduleSupprime;

    @Inject
    Event<ThemeSupprime> themeSupprime;

    /** Modules aval qui utilisent des Thèmes (AD-15) ; aucun avant la story 2.6. */
    @Inject
    Instance<UtilisationThemes> utilisationsThemes;

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
     * Au plus {@value #NOMBRE_MAX_PROCHES} Albums dont le titre normalisé est celui de {@code titre} ou lui est proche
     * (similarité trigramme d'au moins 0,4), du plus proche au moins proche : signalés avant de créer un Album.
     * Moins de {@value #LONGUEUR_MIN_RECHERCHE} caractères une fois normalisé : aucun.
     */
    @Transactional
    public List<AlbumVue> titresProches(String titre) {
        String texte = TitresAlbums.normaliser(titre);
        if (texte.length() < LONGUEUR_MIN_RECHERCHE) {
            return List.of();
        }
        return albums.proches(texte, NOMBRE_MAX_PROCHES).stream().map(ReferentielsService::vue).toList();
    }

    /**
     * Crée un Album, dont le créateur est l'enseignant courant. Titre, auteur et éditeur sont enregistrés espaces
     * réduites et rognées ; un éditeur vide est enregistré absent.
     *
     * @throws ErreurMetier {@code 400 album.titre_invalide}, {@code album.auteur_invalide} (vide ou de plus de
     *         {@value #LONGUEUR_MAX_CHAMP} caractères), {@code album.editeur_invalide} (plus de
     *         {@value #LONGUEUR_MAX_CHAMP} caractères) ; {@code 409 album.deja_existant} si un Album de même titre et
     *         de même auteur, une fois normalisés, existe déjà
     */
    @Transactional
    public AlbumVue creerAlbum(NouvelAlbumCommande commande) {
        ChampsAlbum champs = champsAlbum(commande.titre(), commande.auteur(), commande.editeur());
        verifierAlbumUnique(champs, null);
        Album album = Album.nouveau(albums.nouvelIdentifiant(), champs.titre(), champs.titreRecherche(),
                champs.auteur(), champs.editeur(), enseignantCourant.id());
        albums.persistAndFlush(album);
        return new AlbumVue(album.id(), album.titre(), album.auteur(), album.editeur(), album.createurId(), 0);
    }

    /**
     * L'Album {@code id}, avec son créateur.
     *
     * @throws ErreurMetier {@code 404 ressource.introuvable} si l'Album n'existe pas
     */
    @Transactional
    public AlbumVue lireAlbum(UUID id) {
        return album(id).orElseThrow(ReferentielsService::albumIntrouvable);
    }

    /**
     * Corrige le titre, l'auteur et l'éditeur de l'Album {@code id}, avec les règles de {@link #creerAlbum} ; la
     * correction se voit aussitôt partout, les autres modules lisant l'Album par ce service. Garder son titre et son
     * auteur est accepté. Rien n'est modifié en cas de refus.
     *
     * @throws ErreurMetier {@code 404 ressource.introuvable} si l'Album n'existe pas ;
     *         {@code 403 album.reserve_au_createur} si l'enseignant courant n'est ni son créateur ni administrateur ;
     *         {@code 400} et {@code 409 album.deja_existant} (un autre Album) comme {@link #creerAlbum}
     */
    @Transactional
    public AlbumVue corrigerAlbum(UUID id, CorrectionAlbumCommande commande) {
        Album album = (id == null ? Optional.<Album>empty() : albums.findByIdOptional(id))
                .orElseThrow(ReferentielsService::albumIntrouvable);
        if (!album.createurId().equals(enseignantCourant.id()) && !enseignantCourant.administrateur()) {
            throw new ErreurMetier(403, CODE_ALBUM_RESERVE_AU_CREATEUR,
                    "Seuls le créateur de l'album et l'administrateur peuvent le corriger");
        }
        ChampsAlbum champs = champsAlbum(commande.titre(), commande.auteur(), commande.editeur());
        verifierAlbumUnique(champs, album.id());
        album.corriger(champs.titre(), champs.titreRecherche(), champs.auteur(), champs.editeur());
        albums.flush();
        return lireAlbum(album.id());
    }

    /** Titre, auteur et éditeur d'un Album nettoyés et validés ; éditeur vide rendu {@code null}. */
    private static ChampsAlbum champsAlbum(String titreSaisi, String auteurSaisi, String editeurSaisi) {
        String titre = TitresAlbums.nettoyer(titreSaisi);
        if (titre.isEmpty() || titre.length() > LONGUEUR_MAX_CHAMP) {
            throw new ErreurMetier(400, CODE_TITRE_INVALIDE, "Le titre doit compter de 1 à 200 caractères");
        }
        String auteur = TitresAlbums.nettoyer(auteurSaisi);
        if (auteur.isEmpty() || auteur.length() > LONGUEUR_MAX_CHAMP) {
            throw new ErreurMetier(400, CODE_AUTEUR_INVALIDE, "L'auteur doit compter de 1 à 200 caractères");
        }
        String editeur = TitresAlbums.nettoyer(editeurSaisi);
        if (editeur.length() > LONGUEUR_MAX_CHAMP) {
            throw new ErreurMetier(400, CODE_EDITEUR_INVALIDE, "L'éditeur doit compter 200 caractères au plus");
        }
        return new ChampsAlbum(titre, TitresAlbums.normaliser(titre), auteur, editeur.isEmpty() ? null : editeur);
    }

    /**
     * Aucun autre Album que {@code albumId} n'a même titre et même auteur, une fois normalisés. Sans contrainte
     * d'unicité : deux écritures simultanées peuvent passer, la fusion (Epic 6) corrigera.
     */
    private void verifierAlbumUnique(ChampsAlbum champs, UUID albumId) {
        String auteurRecherche = TitresAlbums.normaliser(champs.auteur());
        boolean existe = albums.memeTitre(champs.titreRecherche()).stream()
                .anyMatch(album -> !album.id().equals(albumId)
                        && TitresAlbums.normaliser(album.auteur()).equals(auteurRecherche));
        if (existe) {
            throw new ErreurMetier(409, CODE_DEJA_EXISTANT, "Un album de même titre et de même auteur existe déjà");
        }
    }

    private static ErreurMetier albumIntrouvable() {
        return new ErreurMetier(404, CODE_INTROUVABLE, "Aucun album ne porte cet identifiant");
    }

    /** Champs d'un Album nettoyés ; {@code titreRecherche} vaut {@code TitresAlbums.normaliser(titre)}. */
    private record ChampsAlbum(String titre, String titreRecherche, String auteur, String editeur) {
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

    /**
     * Crée un Module de l'Album, après son dernier Module, dont le créateur est l'enseignant courant ; il est visible
     * de toute l'école aussitôt. L'Album est verrouillé le temps de la création : deux créations simultanées prennent
     * deux places distinctes et ne portent pas le même nom.
     *
     * @throws ErreurMetier {@code 404 ressource.introuvable} si l'Album n'existe pas ; {@code 400 module.nom_invalide}
     *         si le nom, espaces réduites et rognées, est vide ou dépasse {@value #LONGUEUR_MAX_CHAMP} caractères ;
     *         {@code 409 module.deja_existant} si un Module de l'Album porte déjà ce nom, à la casse, aux accents et
     *         aux espaces près
     */
    @Transactional
    public ModuleVue creerModule(UUID albumId, NouveauModuleCommande commande) {
        if (albumId == null || albums.verrouiller(albumId).isEmpty()) {
            throw new ErreurMetier(404, CODE_INTROUVABLE, "Aucun album ne porte cet identifiant");
        }
        String nom = nomDeModule(commande.nom());
        verifierNomLibre(albumId, nom, null);
        Module module = Module.nouveau(modules.nouvelIdentifiant(), albumId, nom, modules.dernierOrdre(albumId) + 1,
                enseignantCourant.id());
        modules.persistAndFlush(module);
        return vue(module);
    }

    /**
     * Renomme le Module {@code id} ; le renommer en son propre nom est accepté. Rien n'est modifié en cas de refus.
     *
     * @throws ErreurMetier {@code 404 ressource.introuvable} si le Module n'existe pas ;
     *         {@code 403 module.reserve_au_createur} si l'enseignant courant n'est ni son créateur ni administrateur ;
     *         {@code 400 module.nom_invalide} et {@code 409 module.deja_existant} comme {@link #creerModule}
     */
    @Transactional
    public ModuleVue renommerModule(UUID id, String nom) {
        Module module = moduleGerable(id);
        String nettoye = nomDeModule(nom);
        albums.verrouiller(module.albumId());
        verifierNomLibre(module.albumId(), nettoye, module.id());
        module.renommer(nettoye);
        modules.flush();
        return vue(module);
    }

    /**
     * Supprime le Module {@code id}. {@link ModuleSupprime} est d'abord émis, de façon synchrone, pour que les modules
     * aval le retirent dans cette même transaction (AD-15) : les Préparations qui l'avaient n'ont plus de Module.
     *
     * @throws ErreurMetier {@code 404 ressource.introuvable} si le Module n'existe pas ;
     *         {@code 403 module.reserve_au_createur} si l'enseignant courant n'est ni son créateur ni administrateur
     */
    @Transactional
    public void supprimerModule(UUID id) {
        Module module = moduleGerable(id);
        moduleSupprime.fire(new ModuleSupprime(module.id(), module.albumId()));
        modules.delete(module);
        modules.flush();
    }

    /**
     * Module {@code id}, si l'enseignant courant en est le créateur ou est administrateur. Un Module sans créateur
     * n'est géré que par l'administrateur.
     */
    private Module moduleGerable(UUID id) {
        Module module = (id == null ? Optional.<Module>empty() : modules.findByIdOptional(id))
                .orElseThrow(() -> new ErreurMetier(404, CODE_INTROUVABLE, "Aucun module ne porte cet identifiant"));
        boolean createur = module.createurId() != null && module.createurId().equals(enseignantCourant.id());
        if (!createur && !enseignantCourant.administrateur()) {
            throw new ErreurMetier(403, CODE_MODULE_RESERVE_AU_CREATEUR,
                    "Seuls le créateur du module et l'administrateur peuvent le modifier");
        }
        return module;
    }

    /** Nom de Module, espaces réduites et rognées. */
    private static String nomDeModule(String nom) {
        String nettoye = TitresAlbums.nettoyer(nom);
        if (nettoye.isEmpty() || nettoye.length() > LONGUEUR_MAX_CHAMP) {
            throw new ErreurMetier(400, CODE_NOM_MODULE_INVALIDE,
                    "Le nom du module doit compter de 1 à 200 caractères");
        }
        return nettoye;
    }

    /**
     * Aucun autre Module de l'Album que {@code moduleId} ne porte {@code nom}, comparé par
     * {@link TitresAlbums#normaliser} (casse, accents, espaces et article initial). L'Album est déjà
     * verrouillé par l'appelant.
     */
    private void verifierNomLibre(UUID albumId, String nom, UUID moduleId) {
        String cherche = TitresAlbums.normaliser(nom);
        boolean pris = modules.deLAlbum(albumId).stream()
                .anyMatch(autre -> !autre.id().equals(moduleId)
                        && TitresAlbums.normaliser(autre.nom()).equals(cherche));
        if (pris) {
            throw new ErreurMetier(409, CODE_MODULE_DEJA_EXISTANT, "Un module de ce nom existe déjà pour cet album");
        }
    }

    /** Tous les Thèmes de l'école, par nom. */
    @Transactional
    public List<ThemeVue> themes() {
        return themes.parNom().stream().map(ReferentielsService::vue).toList();
    }

    /**
     * Crée un Thème, dont le créateur est l'enseignant courant ; il est visible de toute l'école aussitôt. Les créations
     * et renommages de Thèmes passent un à un ({@link ThemeRepository#verrouillerNoms}) : deux créations simultanées ne
     * portent pas le même nom.
     *
     * @throws ErreurMetier {@code 400 theme.nom_invalide} si le nom, espaces réduites et rognées, est vide ou dépasse
     *         {@value #LONGUEUR_MAX_CHAMP} caractères ; {@code 409 theme.deja_existant} si un Thème porte déjà ce nom,
     *         comparé par {@link TitresAlbums#normaliser}
     */
    @Transactional
    public ThemeVue creerTheme(String nom) {
        String nettoye = nomDeTheme(nom);
        themes.verrouillerNoms();
        verifierNomDeThemeLibre(nettoye, null);
        Theme theme = Theme.nouveau(themes.nouvelIdentifiant(), nettoye, enseignantCourant.id());
        themes.persistAndFlush(theme);
        return vue(theme);
    }

    /**
     * Renomme le Thème {@code id} ; le renommer en son propre nom est accepté. Rien n'est modifié en cas de refus.
     *
     * @throws ErreurMetier {@code 404 ressource.introuvable} si le Thème n'existe pas ;
     *         {@code 403 theme.reserve_au_createur} si l'enseignant courant n'est ni son créateur ni administrateur ;
     *         {@code 400 theme.nom_invalide} et {@code 409 theme.deja_existant} comme {@link #creerTheme}
     */
    @Transactional
    public ThemeVue renommerTheme(UUID id, String nom) {
        Theme theme = themeGerable(id);
        String nettoye = nomDeTheme(nom);
        themes.verrouillerNoms();
        verifierNomDeThemeLibre(nettoye, theme.id());
        theme.renommer(nettoye);
        themes.flush();
        return vue(theme);
    }

    /**
     * Supprime le Thème {@code id}, s'il n'est utilisé par aucun module aval ({@link UtilisationThemes}).
     * {@link ThemeSupprime} est d'abord émis, de façon synchrone, pour que les modules aval le retirent dans cette même
     * transaction (AD-15) : les Préparations qui l'avaient pour Thème par défaut n'en ont plus, ni les Mots de
     * Préparation qui le portaient.
     *
     * @throws ErreurMetier {@code 404 ressource.introuvable} si le Thème n'existe pas ;
     *         {@code 403 theme.reserve_au_createur} si l'enseignant courant n'est ni son créateur ni administrateur ;
     *         {@code 409 theme.utilise} si un module aval l'utilise
     */
    @Transactional
    public void supprimerTheme(UUID id) {
        Theme theme = themeGerable(id);
        for (UtilisationThemes utilisation : utilisationsThemes) {
            if (utilisation.utilise(theme.id())) {
                throw new ErreurMetier(409, CODE_THEME_UTILISE,
                        "Ce thème est utilisé par des images : réaffectez-les avant de le supprimer");
            }
        }
        themeSupprime.fire(new ThemeSupprime(theme.id()));
        themes.delete(theme);
        themes.flush();
    }

    /**
     * Thème {@code id}, si l'enseignant courant en est le créateur ou est administrateur. Un Thème sans créateur n'est
     * géré que par l'administrateur.
     */
    private Theme themeGerable(UUID id) {
        Theme theme = (id == null ? Optional.<Theme>empty() : themes.findByIdOptional(id))
                .orElseThrow(() -> new ErreurMetier(404, CODE_INTROUVABLE, "Aucun thème ne porte cet identifiant"));
        boolean createur = theme.createurId() != null && theme.createurId().equals(enseignantCourant.id());
        if (!createur && !enseignantCourant.administrateur()) {
            throw new ErreurMetier(403, CODE_THEME_RESERVE_AU_CREATEUR,
                    "Seuls le créateur du thème et l'administrateur peuvent le modifier");
        }
        return theme;
    }

    /** Nom de Thème, espaces réduites et rognées. */
    private static String nomDeTheme(String nom) {
        String nettoye = TitresAlbums.nettoyer(nom);
        if (nettoye.isEmpty() || nettoye.length() > LONGUEUR_MAX_CHAMP) {
            throw new ErreurMetier(400, CODE_NOM_THEME_INVALIDE, "Le nom du thème doit compter de 1 à 200 caractères");
        }
        return nettoye;
    }

    /**
     * Aucun autre Thème que {@code themeId} ne porte {@code nom}, comparé par {@link TitresAlbums#normaliser} (casse,
     * accents, espaces et article initial). Le verrou des Thèmes est déjà pris par l'appelant.
     */
    private void verifierNomDeThemeLibre(String nom, UUID themeId) {
        String cherche = TitresAlbums.normaliser(nom);
        boolean pris = themes.parNom().stream()
                .anyMatch(autre -> !autre.id().equals(themeId) && TitresAlbums.normaliser(autre.nom()).equals(cherche));
        if (pris) {
            throw new ErreurMetier(409, CODE_THEME_DEJA_EXISTANT, "Un thème de ce nom existe déjà");
        }
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
        return new AlbumVue(album.id(), album.titre(), album.auteur(), album.editeur(), album.createurId(),
                album.nombreModules());
    }

    private static ModuleVue vue(Module module) {
        return new ModuleVue(module.id(), module.albumId(), module.nom(), module.ordre(), module.createurId());
    }

    private static ThemeVue vue(Theme theme) {
        return new ThemeVue(theme.id(), theme.nom(), theme.createurId());
    }
}
