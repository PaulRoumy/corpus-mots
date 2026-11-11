package fr.corpusmots.preparations.service;

import fr.corpusmots.commun.api.ErreurMetier;
import fr.corpusmots.commun.service.EnseignantCourant;
import fr.corpusmots.commun.service.Pagination;
import fr.corpusmots.commun.service.Section;
import fr.corpusmots.preparations.persistance.Preparation;
import fr.corpusmots.preparations.persistance.PreparationMot;
import fr.corpusmots.preparations.persistance.PreparationMotRepository;
import fr.corpusmots.preparations.persistance.PreparationRepository;
import fr.corpusmots.referentiels.service.AlbumVue;
import fr.corpusmots.referentiels.service.ModuleVue;
import fr.corpusmots.referentiels.service.ReferentielsService;
import fr.corpusmots.referentiels.service.ThemeVue;
import fr.corpusmots.vocabulaire.service.Lexique;
import fr.corpusmots.vocabulaire.service.MotVue;
import fr.corpusmots.vocabulaire.service.RetenirSensCommande;
import fr.corpusmots.vocabulaire.service.SensVue;
import fr.corpusmots.vocabulaire.service.Usages;
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
 *
 * <p>Mots d'une Préparation (story 2.3) : seul point d'écriture de {@code preparation_mot}. Le Mot est obtenu ou créé
 * par {@link Lexique} et son Sens retenu par {@link Usages}, dans la transaction ouverte ici (AD-14, AD-17).
 */
@ApplicationScoped
public class PreparationsService {

    static final String CODE_SECTION_INVALIDE = "preparation.section_invalide";
    static final String CODE_ALBUM_INTROUVABLE = "preparation.album_introuvable";
    static final String CODE_MODULE_INVALIDE = "preparation.module_invalide";
    static final String CODE_THEME_INTROUVABLE = "preparation.theme_introuvable";
    static final String CODE_TEMPS_PASSE_INVALIDE = "preparation.temps_passe_invalide";
    static final String CODE_MOT_INVALIDE = "preparation.mot_invalide";
    static final String CODE_MOT_DEJA_PRESENT = "preparation.mot_deja_present";
    static final String CODE_SENS_INVALIDE = "preparation.sens_invalide";
    static final String CODE_INTROUVABLE = "ressource.introuvable";

    /** Borne haute du Temps passé : 100 heures (contrainte {@code preparation_temps_passe_borne}). */
    static final int TEMPS_PASSE_MAXIMUM_MINUTES = 6000;

    /** Pas du Temps passé : une demi-heure (même contrainte). */
    static final int PAS_TEMPS_PASSE_MINUTES = 30;

    @Inject
    PreparationRepository preparations;

    @Inject
    PreparationMotRepository preparationMots;

    @Inject
    ReferentielsService referentiels;

    @Inject
    Lexique lexique;

    @Inject
    Usages usages;

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
        return vue(preparation, album, module, theme, 0);
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
        return vue(preparation, album, module, theme, nombreMots(preparation));
    }

    /** Préparations de l'enseignant courant, les plus récentes d'abord. */
    @Transactional
    public PageCartesPreparationVue mesPreparations(Pagination pagination) {
        UUID proprietaire = enseignantCourant.id();
        List<Preparation> page = preparations.duProprietaire(proprietaire, pagination.decalage(), pagination.taille());
        Map<UUID, AlbumVue> albums = referentiels.albums(page.stream().map(Preparation::albumId).toList());
        Map<UUID, ModuleVue> modules = referentiels.modules(
                page.stream().map(Preparation::moduleId).filter(Objects::nonNull).toList());
        Map<UUID, Integer> nombresMots = preparationMots.compter(page.stream().map(Preparation::id).toList());
        List<CartePreparationVue> cartes = page.stream().map(preparation -> {
            ModuleVue module = preparation.moduleId() == null ? null : modules.get(preparation.moduleId());
            int nombreMots = nombresMots.getOrDefault(preparation.id(), 0);
            // Aucun Mot n'a encore d'Image avant la story 2.4 : tous sont à illustrer.
            return new CartePreparationVue(preparation.id(), preparation.albumId(),
                    albumDe(preparation, albums.get(preparation.albumId())).titre(), preparation.section(),
                    module == null ? null : module.id(), module == null ? null : module.nom(), nombreMots,
                    nombreMots, preparation.creeLe());
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
        return vue(preparation, album, module, theme, nombreMots(preparation));
    }

    /**
     * Ajoute en fin de Préparation {@code id} de l'enseignant courant le Mot saisi, normalisé par
     * {@link Lexique#normaliser}, avec le Sens que {@link Usages#retenirSens} retient pour lui. Rien n'est ajouté en cas
     * de refus. Les ajouts à une même Préparation passent un à un (Préparation verrouillée).
     *
     * @throws ErreurMetier {@code 404 ressource.introuvable} si la Préparation n'existe pas ou appartient à un
     *         collègue ; {@code 400 preparation.mot_invalide} si la saisie normalisée est vide ou dépasse
     *         {@value Lexique#LONGUEUR_MAX_FORME} caractères ; {@code 409 preparation.mot_deja_present} si le Mot
     *         figure déjà dans la Préparation
     */
    @Transactional
    public MotPreparationVue ajouterMot(UUID id, String saisie) {
        Preparation preparation = verrouillee(id);
        String forme = Lexique.normaliser(saisie);
        if (forme.isEmpty() || forme.length() > Lexique.LONGUEUR_MAX_FORME) {
            throw new ErreurMetier(400, CODE_MOT_INVALIDE,
                    "Le mot doit compter de 1 à " + Lexique.LONGUEUR_MAX_FORME + " caractères");
        }
        MotVue mot = lexique.obtenirOuCreerMot(saisie);
        if (preparationMots.contient(preparation.id(), mot.id())) {
            throw new ErreurMetier(409, CODE_MOT_DEJA_PRESENT, "Ce mot figure déjà dans la préparation");
        }
        PreparationMot ligne = PreparationMot.nouveau(preparationMots.nouvelIdentifiant(), preparation.id(), mot.id(),
                preparationMots.dernierOrdre(preparation.id()) + 1);
        preparationMots.persistAndFlush(ligne);
        SensVue sens = usages.retenirSens(new RetenirSensCommande(preparation.id(), ligne.id(), mot.id(),
                preparation.albumId(), preparation.section()));
        return vue(ligne, mot, sens);
    }

    /**
     * Retire le Mot de Préparation {@code motPreparationId} de la Préparation {@code id} de l'enseignant courant : le
     * registre des usages le libère ({@link Usages#libererPreparationMot}), puis sa ligne est supprimée, dans une même
     * transaction. Le Mot et ses Sens restent dans le Lexique ; les places des autres Mots ne changent pas.
     *
     * @return le Mot retiré, avec le Sens et la place qu'il avait, pour le rétablir
     * @throws ErreurMetier {@code 404 ressource.introuvable} si la Préparation n'existe pas ou appartient à un
     *         collègue, ou si le Mot de Préparation n'existe pas ou appartient à une autre Préparation
     */
    @Transactional
    public MotPreparationVue retirerMot(UUID id, UUID motPreparationId) {
        Preparation preparation = verrouillee(id);
        PreparationMot ligne = (motPreparationId == null ? Optional.<PreparationMot>empty()
                : preparationMots.deLaPreparation(preparation.id(), motPreparationId))
                .orElseThrow(() -> new ErreurMetier(404, CODE_INTROUVABLE,
                        "Aucun mot de cette préparation ne porte cet identifiant"));
        MotVue mot = lexique.mots(List.of(ligne.motId())).get(ligne.motId());
        if (mot == null) {
            throw new IllegalStateException("Mot " + ligne.motId() + " du mot de préparation " + ligne.id()
                    + " introuvable");
        }
        MotPreparationVue retire = vue(ligne, mot, lexique.sensRetenus(List.of(ligne.id())).get(ligne.id()));
        usages.libererPreparationMot(ligne.id());
        preparationMots.delete(ligne);
        preparationMots.flush();
        return retire;
    }

    /**
     * Rétablit dans la Préparation {@code id} de l'enseignant courant un Mot retiré, avec le Sens qu'il avait, à sa
     * place d'origine si elle est libre, sinon en fin. Rien n'est ajouté en cas de refus.
     *
     * @throws ErreurMetier {@code 404 ressource.introuvable} si la Préparation n'existe pas ou appartient à un
     *         collègue, ou si le Mot n'existe pas ; {@code 400 preparation.sens_invalide} si le Sens n'est pas un Sens
     *         de ce Mot ; {@code 409 preparation.mot_deja_present} si le Mot figure de nouveau dans la Préparation
     */
    @Transactional
    public MotPreparationVue retablirMot(UUID id, RetablirMotCommande commande) {
        Preparation preparation = verrouillee(id);
        MotVue mot = (commande.motId() == null ? null : lexique.mots(List.of(commande.motId())).get(commande.motId()));
        if (mot == null) {
            throw new ErreurMetier(404, CODE_INTROUVABLE, "Aucun mot ne porte cet identifiant");
        }
        if (lexique.sensDuMot(mot.id(), commande.sensId()).isEmpty()) {
            throw new ErreurMetier(400, CODE_SENS_INVALIDE, "Ce sens n'appartient pas à ce mot");
        }
        if (preparationMots.contient(preparation.id(), mot.id())) {
            throw new ErreurMetier(409, CODE_MOT_DEJA_PRESENT, "Ce mot figure déjà dans la préparation");
        }
        Integer ordre = commande.ordre();
        int place = ordre != null && ordre > 0 && !preparationMots.ordreOccupe(preparation.id(), ordre) ? ordre
                : preparationMots.dernierOrdre(preparation.id()) + 1;
        PreparationMot ligne = PreparationMot.nouveau(preparationMots.nouvelIdentifiant(), preparation.id(), mot.id(),
                place);
        preparationMots.persistAndFlush(ligne);
        SensVue sens = usages.retenirSens(new RetenirSensCommande(preparation.id(), ligne.id(), mot.id(),
                preparation.albumId(), preparation.section(), commande.sensId()));
        return vue(ligne, mot, sens);
    }

    /**
     * Mots de la Préparation {@code id} de l'enseignant courant, dans l'ordre de saisie.
     *
     * @throws ErreurMetier {@code 404 ressource.introuvable} si elle n'existe pas ou appartient à un collègue
     */
    @Transactional
    public List<MotPreparationVue> motsDe(UUID id) {
        Preparation preparation = mienne(id);
        List<PreparationMot> lignes = preparationMots.deLaPreparation(preparation.id());
        Map<UUID, MotVue> mots = lexique.mots(lignes.stream().map(PreparationMot::motId).toList());
        Map<UUID, SensVue> sens = lexique.sensRetenus(lignes.stream().map(PreparationMot::id).toList());
        return lignes.stream().map(ligne -> {
            MotVue mot = mots.get(ligne.motId());
            if (mot == null) {
                throw new IllegalStateException("Mot " + ligne.motId() + " du mot de préparation " + ligne.id()
                        + " introuvable");
            }
            return vue(ligne, mot, sens.get(ligne.id()));
        }).toList();
    }

    /** Section de la Préparation la plus récente de l'enseignant courant, vide s'il n'en a aucune. */
    @Transactional
    public Optional<Section> derniereSection() {
        return preparations.plusRecente(enseignantCourant.id()).map(Preparation::section);
    }

    /** Préparation {@code id} de l'enseignant courant ; celle d'un collègue est traitée comme inexistante. */
    private Preparation mienne(UUID id) {
        return (id == null ? Optional.<Preparation>empty() : preparations.duProprietaire(id, enseignantCourant.id()))
                .orElseThrow(PreparationsService::introuvable);
    }

    /**
     * Préparation {@code id} de l'enseignant courant, verrouillée ({@code SELECT … FOR UPDATE}) : les changements de
     * ses Mots passent un à un (places et doublons sûrs).
     */
    private Preparation verrouillee(UUID id) {
        return (id == null ? Optional.<Preparation>empty() : preparations.verrouillee(id, enseignantCourant.id()))
                .orElseThrow(PreparationsService::introuvable);
    }

    private static ErreurMetier introuvable() {
        return new ErreurMetier(404, CODE_INTROUVABLE, "Aucune préparation ne porte cet identifiant");
    }

    private int nombreMots(Preparation preparation) {
        return (int) preparationMots.compter(preparation.id());
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

    /** Aucun Mot n'a encore d'Image avant la story 2.4 : {@code nombreIllustres} vaut 0. */
    private static PreparationVue vue(Preparation preparation, AlbumVue album, ModuleVue module, ThemeVue theme,
            int nombreMots) {
        return new PreparationVue(preparation.id(), album.id(), album.titre(), preparation.section(),
                module == null ? null : module.id(), module == null ? null : module.nom(),
                theme == null ? null : theme.id(), theme == null ? null : theme.nom(), preparation.tempsPasseMinutes(),
                nombreMots, 0, preparation.creeLe());
    }

    /** Un Mot de Préparation a toujours un Sens retenu (même transaction) ; son absence est une anomalie. */
    private static MotPreparationVue vue(PreparationMot ligne, MotVue mot, SensVue sens) {
        if (sens == null) {
            throw new IllegalStateException("Sens retenu du mot de préparation " + ligne.id() + " introuvable");
        }
        return new MotPreparationVue(ligne.id(), mot.id(), mot.forme(), ligne.ordre(), sens.id(), sens.libelle(),
                sens.categorie(), false);
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
