package fr.corpusmots.preparations.service;

import fr.corpusmots.commun.api.ErreurMetier;
import fr.corpusmots.commun.service.EnseignantCourant;
import fr.corpusmots.commun.service.Pagination;
import fr.corpusmots.commun.service.Section;
import fr.corpusmots.preparations.persistance.MotEcarteRepository;
import fr.corpusmots.preparations.persistance.Preparation;
import fr.corpusmots.preparations.persistance.PreparationMot;
import fr.corpusmots.preparations.persistance.PreparationMotRepository;
import fr.corpusmots.preparations.persistance.PreparationRepository;
import fr.corpusmots.referentiels.service.AlbumVue;
import fr.corpusmots.referentiels.service.ModuleVue;
import fr.corpusmots.referentiels.service.ReferentielsService;
import fr.corpusmots.referentiels.service.ThemeVue;
import fr.corpusmots.vocabulaire.service.CategorieGrammaticale;
import fr.corpusmots.vocabulaire.service.ChangerSensCommande;
import fr.corpusmots.vocabulaire.service.CopierPreparationCommande;
import fr.corpusmots.vocabulaire.service.CreerSensCommande;
import fr.corpusmots.vocabulaire.service.DetectionMots;
import fr.corpusmots.vocabulaire.service.DetectionVue;
import fr.corpusmots.vocabulaire.service.ImageDetecteeVue;
import fr.corpusmots.vocabulaire.service.ImageVue;
import fr.corpusmots.vocabulaire.service.Images;
import fr.corpusmots.vocabulaire.service.Lexique;
import fr.corpusmots.vocabulaire.service.LierImageCommande;
import fr.corpusmots.vocabulaire.service.MotDejaIllustreVue;
import fr.corpusmots.vocabulaire.service.MotDetecteVue;
import fr.corpusmots.vocabulaire.service.MotVue;
import fr.corpusmots.vocabulaire.service.OrigineLien;
import fr.corpusmots.vocabulaire.service.RemplacerImageCommande;
import fr.corpusmots.vocabulaire.service.RetenirSensCommande;
import fr.corpusmots.vocabulaire.service.SensVue;
import fr.corpusmots.vocabulaire.service.TeleverserImageCommande;
import fr.corpusmots.vocabulaire.service.Usages;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Event;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Préparations de l'enseignant courant (FR-6) : seul point d'écriture de la table {@code preparation}. Le propriétaire
 * vient du jeton ({@link EnseignantCourant}) ; la Préparation d'un collègue est traitée comme inexistante (404) et
 * n'apparaît dans aucune liste. Albums, Modules et Thèmes sont lus par {@link ReferentielsService} (AD-1).
 *
 * <p>Mots d'une Préparation (story 2.3) : seul point d'écriture de {@code preparation_mot}. Le Mot est obtenu ou créé
 * par {@link Lexique} et son Sens retenu par {@link Usages}, dans la transaction ouverte ici (AD-14, AD-17).
 *
 * <p>Images des Mots (story 2.5) : une Image téléversée depuis la Carte d'un Mot, réduite avant la transaction par
 * {@code ReductionImages}, est créée par {@link Images} et liée au Mot par {@link Usages#lierImage}, dans la
 * transaction ouverte ici ; {@code preparations} ne stocke aucune donnée d'Image (AD-14).
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
    static final String CODE_IMAGE_INDISPONIBLE = "image.indisponible";
    static final String CODE_SENS_DIFFERENT = "image.sens_different";
    static final String CODE_NOM_TROP_LONG = "preparation.nom_trop_long";
    static final String CODE_MOT_DEJA_ILLUSTRE = "preparation.mot_deja_illustre";

    /** Longueur maximale du nom d'une Préparation, une fois nettoyé (contrainte {@code preparation_nom_longueur}). */
    public static final int NOM_MAXIMUM = 100;

    /**
     * Espaces du nettoyage d'un nom : blancs, espaces Unicode (insécables comprises) et U+FEFF, le même ensemble que
     * {@code \s} en JavaScript, pour que le front nettoie comme le back.
     */
    private static final String ESPACES = "[\\s\\p{Z}\\uFEFF]+";

    /** Borne haute du Temps passé : 100 heures (contrainte {@code preparation_temps_passe_borne}). */
    static final int TEMPS_PASSE_MAXIMUM_MINUTES = 6000;

    /** Pas du Temps passé : une demi-heure (même contrainte). */
    static final int PAS_TEMPS_PASSE_MINUTES = 30;

    @Inject
    PreparationRepository preparations;

    @Inject
    PreparationMotRepository preparationMots;

    @Inject
    MotEcarteRepository motsEcartes;

    @Inject
    ReferentielsService referentiels;

    @Inject
    Lexique lexique;

    @Inject
    Usages usages;

    @Inject
    Images images;

    @Inject
    DetectionMots detectionMots;

    @Inject
    EnseignantCourant enseignantCourant;

    @Inject
    Event<PreparationSupprimee> preparationSupprimee;

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
        return vue(preparation, album, module, theme, 0, 0);
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
        return vue(preparation, album, module, theme, nombreMots(preparation), nombreIllustres(preparation));
    }

    /** Préparations de l'enseignant courant, les plus récentes d'abord. */
    @Transactional
    public PageCartesPreparationVue mesPreparations(Pagination pagination) {
        UUID proprietaire = enseignantCourant.id();
        List<Preparation> page = preparations.duProprietaire(proprietaire, pagination.decalage(), pagination.taille());
        Map<UUID, AlbumVue> albums = referentiels.albums(page.stream().map(Preparation::albumId).toList());
        Map<UUID, ModuleVue> modules = referentiels.modules(
                page.stream().map(Preparation::moduleId).filter(Objects::nonNull).toList());
        List<UUID> ids = page.stream().map(Preparation::id).toList();
        Map<UUID, Integer> nombresMots = preparationMots.compter(ids);
        Map<UUID, Integer> nombresIllustres = usages.nombresIllustres(ids);
        List<CartePreparationVue> cartes = page.stream().map(preparation -> {
            ModuleVue module = preparation.moduleId() == null ? null : modules.get(preparation.moduleId());
            return carte(preparation, albumDe(preparation, albums.get(preparation.albumId())), module,
                    nombresMots.getOrDefault(preparation.id(), 0), nombresIllustres.getOrDefault(preparation.id(), 0));
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
        return vue(preparation, album, module, theme, nombreMots(preparation), nombreIllustres(preparation));
    }

    /**
     * Renomme la Préparation {@code id} de l'enseignant courant (story 2.10). Le nom est nettoyé (espaces aux bords
     * retirés, espaces consécutives réduites à une) ; un nom vide ou {@code null} l'efface, et le titre de l'Album
     * s'affiche de nouveau. Rien n'est modifié en cas de refus.
     *
     * @return la Carte de la Préparation renommée
     * @throws ErreurMetier {@code 404 ressource.introuvable} si la Préparation n'existe pas ou appartient à un
     *         collègue ; {@code 400 preparation.nom_trop_long} si le nom nettoyé dépasse {@value #NOM_MAXIMUM} caractères
     */
    @Transactional
    public CartePreparationVue renommer(UUID id, String nom) {
        Preparation preparation = verrouillee(id);
        String nettoye = nom == null ? "" : nom.replaceAll(ESPACES, " ").replaceAll("^ | $", "");
        if (nettoye.length() > NOM_MAXIMUM) {
            throw new ErreurMetier(400, CODE_NOM_TROP_LONG,
                    "Le nom de la préparation compte " + NOM_MAXIMUM + " caractères au plus");
        }
        preparation.renommer(nettoye.isEmpty() ? null : nettoye);
        preparations.flush();
        return carte(preparation);
    }

    /**
     * Duplique la Préparation {@code id} de l'enseignant courant pour la Section {@code section}, la même permise (une
     * autre année), story 2.10 : la copie a le même Album, le même nom, le même Module et le même Thème par défaut, et
     * pour chaque Mot sa place, son Thème et son Sens retenu ; chaque lien d'Image est copié vers la même Image avec
     * l'origine {@code reutilisee} ({@link Usages#copierPreparation}, AD-14). Aucune Image n'est copiée. Le Temps passé
     * et les Mots écartés de l'Encart ne sont pas copiés. Une seule transaction, Préparation source verrouillée.
     *
     * @return la Carte de la Préparation créée
     * @throws ErreurMetier {@code 404 ressource.introuvable} si la Préparation n'existe pas ou appartient à un collègue
     */
    @Transactional
    public CartePreparationVue dupliquer(UUID id, Section section) {
        Objects.requireNonNull(section, "section");
        Preparation source = verrouillee(id);
        Preparation copie = source.copie(preparations.nouvelIdentifiant(), section);
        preparations.persistAndFlush(copie);
        Map<UUID, UUID> motsCopies = new HashMap<>();
        for (PreparationMot ligne : preparationMots.deLaPreparation(source.id())) {
            PreparationMot copieLigne = PreparationMot.nouveau(preparationMots.nouvelIdentifiant(), copie.id(),
                    ligne.motId(), ligne.ordre(), ligne.themeId());
            preparationMots.persist(copieLigne);
            motsCopies.put(ligne.id(), copieLigne.id());
        }
        preparationMots.flush();
        usages.copierPreparation(new CopierPreparationCommande(source.id(), copie.id(), motsCopies, copie.albumId(),
                copie.section()));
        return carte(copie);
    }

    /**
     * Supprime la Préparation {@code id} de l'enseignant courant (story 2.10), Préparation verrouillée, dans une seule
     * transaction : ses usages sont d'abord libérés ({@link Usages#libererPreparation}), puis
     * {@link PreparationSupprimee} est émis de façon synchrone (AD-15), enfin sa ligne est supprimée, et avec elle, par
     * cascade, ses Mots de Préparation et ses Mots écartés. Aucune Image, aucun Mot ni aucun Sens n'est supprimé.
     *
     * @throws ErreurMetier {@code 404 ressource.introuvable} si la Préparation n'existe pas ou appartient à un collègue
     */
    @Transactional
    public void supprimer(UUID id) {
        Preparation preparation = verrouillee(id);
        usages.libererPreparation(preparation.id());
        preparationSupprimee.fire(new PreparationSupprimee(preparation.id(), preparation.proprietaireId()));
        preparations.delete(preparation);
        preparations.flush();
    }

    /** Carte de cette Préparation, avec ses compteurs relus. */
    private CartePreparationVue carte(Preparation preparation) {
        AlbumVue album = albumDe(preparation, referentiels.album(preparation.albumId()).orElse(null));
        ModuleVue module = preparation.moduleId() == null ? null
                : referentiels.module(preparation.moduleId()).orElse(null);
        return carte(preparation, album, module, nombreMots(preparation), nombreIllustres(preparation));
    }

    /**
     * Ajoute en fin de Préparation {@code id} de l'enseignant courant un Mot du Champ de saisie rapide, avec le Thème
     * par défaut de la Préparation à cet instant (stories 2.3 et 2.8) :
     * <ul>
     * <li>saisie seule : le Mot saisi, normalisé par {@link Lexique#normaliser} et obtenu ou créé, avec le Sens que
     * {@link Usages#retenirSens} retient pour lui ;</li>
     * <li>{@code sensId} : le Mot {@code motId} (à défaut, celui du Sens), avec ce Sens, qui doit en être un Sens visible
     * de l'enseignant ({@link DetectionMots#sensVisible}, AD-2) ;</li>
     * <li>{@code nouveauSens} : le Mot {@code motId} (à défaut, celui de la saisie, obtenu ou créé), avec le Sens tapé,
     * obtenu ou créé par {@link Lexique#obtenirOuCreerSensSaisi} (AD-19).</li>
     * </ul>
     * Le Mot arrive illustré s'il a une Image proposable (story 2.11, FR-9) : la première que
     * {@link DetectionMots#propositions} classe pour lui, dans ce Sens s'il est donné, est liée avec l'origine
     * {@code reutilisee}, sans copie (AD-5), et son Sens devient le Sens retenu. Une Image devenue indisponible avant son
     * verrou n'est pas liée et le Mot arrive « à illustrer », sans refus ({@link Usages#lierImageSiPossible}). Seul le
     * Mot ajouté compte, jamais un Mot de forme voisine (accents différents).
     * Une seule transaction, Préparation verrouillée : rien n'est écrit en cas de refus, ni Mot, ni Sens. Les ajouts à
     * une même Préparation passent un à un.
     *
     * @throws ErreurMetier {@code 404 ressource.introuvable} si la Préparation n'existe pas ou appartient à un
     *         collègue, ou si {@code motId} est inconnu ; {@code 400 preparation.mot_invalide} si la saisie normalisée
     *         est vide ou dépasse {@value Lexique#LONGUEUR_MAX_FORME} caractères ;
     *         {@code 400 preparation.sens_invalide} si {@code sensId} est inconnu, d'un autre Mot ou non visible ;
     *         {@code 400 sens.libelle_invalide} si le libellé du nouveau Sens est vide, trop long ou réservé ;
     *         {@code 409 preparation.mot_deja_present} si le Mot figure déjà dans la Préparation
     * @throws IllegalArgumentException si {@code sensId} et {@code nouveauSens} sont donnés ensemble, ou si la catégorie
     *         du nouveau Sens manque : l'appelant le vérifie avant
     */
    @Transactional
    public MotPreparationVue ajouterMot(UUID id, AjouterMotCommande commande) {
        if (commande.sensId() != null && commande.nouveauSens() != null) {
            throw new IllegalArgumentException("Sens existant et nouveau Sens donnés ensemble");
        }
        Preparation preparation = verrouillee(id);
        MotVue mot;
        if (commande.motId() != null && (commande.sensId() != null || commande.nouveauSens() != null)) {
            mot = lexique.mots(List.of(commande.motId())).get(commande.motId());
            if (mot == null) {
                throw new ErreurMetier(404, CODE_INTROUVABLE, "Aucun mot ne porte cet identifiant");
            }
        } else if (commande.sensId() != null) {
            mot = lexique.sens(commande.sensId())
                    .map(sens -> lexique.mots(List.of(sens.motId())).get(sens.motId()))
                    .orElseThrow(() -> new ErreurMetier(400, CODE_SENS_INVALIDE, "Aucun sens ne porte cet identifiant"));
        } else {
            mot = motSaisi(commande.saisie());
        }
        if (commande.sensId() != null && !detectionMots.sensVisible(mot.id(), commande.sensId())) {
            throw new ErreurMetier(400, CODE_SENS_INVALIDE, "Ce sens n'est pas un sens visible de ce mot");
        }
        if (preparationMots.contient(preparation.id(), mot.id())) {
            throw new ErreurMetier(409, CODE_MOT_DEJA_PRESENT, "Ce mot figure déjà dans la préparation");
        }
        UUID sensId = commande.nouveauSens() == null ? commande.sensId()
                : lexique.obtenirOuCreerSensSaisi(mot.id(), commande.nouveauSens().libelle(),
                        commande.nouveauSens().categorie()).id();
        // Story 2.11 (FR-9) : sans Image choisie, la première Image proposée, classée comme la détection, est retenue.
        Optional<ImageDetecteeVue> premiere = detectionMots.propositions(mot.id(), preparation.albumId(),
                preparation.section(), sensId).images().stream().findFirst();
        if (premiere.isPresent()) {
            sensId = premiere.get().sens().sens().id();
        }
        PreparationMot ligne = PreparationMot.nouveau(preparationMots.nouvelIdentifiant(), preparation.id(), mot.id(),
                preparationMots.dernierOrdre(preparation.id()) + 1, preparation.themeDefautId());
        preparationMots.persistAndFlush(ligne);
        SensVue sens = usages.retenirSens(new RetenirSensCommande(preparation.id(), ligne.id(), mot.id(),
                preparation.albumId(), preparation.section(), sensId));
        ImageVue image = premiere.isEmpty() ? null
                : usages.lierImageSiPossible(new LierImageCommande(preparation.id(), ligne.id(),
                        premiere.get().image().id(), preparation.albumId(), preparation.section(),
                        OrigineLien.REUTILISEE)).orElse(null);
        return vue(ligne, mot, sens, image);
    }

    /** Mot de la saisie, normalisée par {@link Lexique#normaliser}, obtenu ou créé. */
    private MotVue motSaisi(String saisie) {
        String forme = Lexique.normaliser(saisie);
        if (forme.isEmpty() || forme.length() > Lexique.LONGUEUR_MAX_FORME) {
            throw new ErreurMetier(400, CODE_MOT_INVALIDE,
                    "Le mot doit compter de 1 à " + Lexique.LONGUEUR_MAX_FORME + " caractères");
        }
        return lexique.obtenirOuCreerMot(saisie);
    }

    /**
     * Retire le Mot de Préparation {@code motPreparationId} de la Préparation {@code id} de l'enseignant courant : le
     * registre des usages le libère ({@link Usages#libererPreparationMot}), puis sa ligne est supprimée, dans une même
     * transaction. Le Mot et ses Sens restent dans le Lexique ; les places des autres Mots ne changent pas.
     *
     * @return le Mot retiré, avec le Sens, la place, le Thème et l'Image qu'il avait, pour le rétablir ; l'Image
     *         n'est pas supprimée, seulement déliée
     * @throws ErreurMetier {@code 404 ressource.introuvable} si la Préparation n'existe pas ou appartient à un
     *         collègue, ou si le Mot de Préparation n'existe pas ou appartient à une autre Préparation
     */
    @Transactional
    public MotPreparationVue retirerMot(UUID id, UUID motPreparationId) {
        Preparation preparation = verrouillee(id);
        PreparationMot ligne = deLaPreparation(preparation, motPreparationId);
        MotVue mot = motDe(ligne, lexique.mots(List.of(ligne.motId())));
        MotPreparationVue retire = vue(ligne, mot, lexique.sensRetenus(List.of(ligne.id())).get(ligne.id()),
                usages.imagesLiees(List.of(ligne.id())).get(ligne.id()));
        usages.libererPreparationMot(ligne.id());
        preparationMots.delete(ligne);
        preparationMots.flush();
        // Un Mot retiré redevient candidat de l'Encart « mots déjà illustrés » (story 2.9), même s'il avait été écarté.
        motsEcartes.retirer(preparation.id(), ligne.motId());
        return retire;
    }

    /**
     * Rétablit dans la Préparation {@code id} de l'enseignant courant un Mot retiré, avec le Sens et le Thème qu'il
     * avait, à sa place d'origine si elle est libre, sinon en fin ; un Thème supprimé entre-temps n'est pas repris.
     * L'Image qui lui était liée l'est de nouveau, avec l'origine {@code reutilisee} (AD-14), si elle lui est encore
     * proposable et illustre le Sens retenu ({@link Usages#lierImageSiPossible}) ; sinon le Mot revient « à illustrer »,
     * sans refus. Rien n'est ajouté en cas de refus.
     *
     * @return le Mot rétabli ; sans Image si celle qu'il avait n'a pas pu être liée de nouveau
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
        UUID themeId = commande.themeId() == null ? null
                : referentiels.theme(commande.themeId()).map(ThemeVue::id).orElse(null);
        PreparationMot ligne = PreparationMot.nouveau(preparationMots.nouvelIdentifiant(), preparation.id(), mot.id(),
                place, themeId);
        preparationMots.persistAndFlush(ligne);
        SensVue sens = usages.retenirSens(new RetenirSensCommande(preparation.id(), ligne.id(), mot.id(),
                preparation.albumId(), preparation.section(), commande.sensId()));
        ImageVue image = commande.imageId() == null ? null
                : usages.lierImageSiPossible(new LierImageCommande(preparation.id(), ligne.id(), commande.imageId(),
                        preparation.albumId(), preparation.section(), OrigineLien.REUTILISEE)).orElse(null);
        return vue(ligne, mot, sens, image);
    }

    /**
     * Ajoute en fin de Préparation {@code id} de l'enseignant courant le Mot d'une Image existante retenue dans le
     * Panneau de détection (story 2.7) : le Sens de l'Image devient le Sens retenu du Mot, le Thème est le Thème par
     * défaut de la Préparation, et l'Image lui est liée avec l'origine {@code reutilisee}, sans copie (AD-5), par
     * {@link Usages#lierImage} qui la verrouille et revérifie qu'elle est proposable et du Sens retenu. Une seule
     * transaction : rien n'est ajouté en cas de refus.
     *
     * @throws ErreurMetier {@code 404 ressource.introuvable} si la Préparation n'existe pas ou appartient à un
     *         collègue, ou si le Mot n'existe pas ; {@code 404 image.indisponible} si l'Image n'existe pas ou ne lui est
     *         pas proposable ; {@code 400 image.sens_different} si l'Image illustre un autre Mot ;
     *         {@code 409 preparation.mot_deja_present} si le Mot figure déjà dans la Préparation. Si l'Image change entre
     *         la lecture de son Sens et son verrou, {@code 404 image.indisponible} ou {@code 400 image.sens_different}
     *         ({@link Usages#lierImage})
     */
    @Transactional
    public MotPreparationVue reutiliserImage(UUID id, ReutiliserImageCommande commande) {
        Preparation preparation = verrouillee(id);
        MotVue mot = commande.motId() == null ? null : lexique.mots(List.of(commande.motId())).get(commande.motId());
        if (mot == null) {
            throw new ErreurMetier(404, CODE_INTROUVABLE, "Aucun mot ne porte cet identifiant");
        }
        UUID sensId = usages.sensDImageProposable(commande.imageId())
                .orElseThrow(() -> new ErreurMetier(404, CODE_IMAGE_INDISPONIBLE,
                        "Aucune image proposable ne porte cet identifiant"));
        if (lexique.sensDuMot(mot.id(), sensId).isEmpty()) {
            throw new ErreurMetier(400, CODE_SENS_DIFFERENT, "Cette image illustre un autre mot");
        }
        if (preparationMots.contient(preparation.id(), mot.id())) {
            throw new ErreurMetier(409, CODE_MOT_DEJA_PRESENT, "Ce mot figure déjà dans la préparation");
        }
        PreparationMot ligne = PreparationMot.nouveau(preparationMots.nouvelIdentifiant(), preparation.id(), mot.id(),
                preparationMots.dernierOrdre(preparation.id()) + 1, preparation.themeDefautId());
        preparationMots.persistAndFlush(ligne);
        SensVue sens = usages.retenirSens(new RetenirSensCommande(preparation.id(), ligne.id(), mot.id(),
                preparation.albumId(), preparation.section(), sensId));
        ImageVue image = usages.lierImage(new LierImageCommande(preparation.id(), ligne.id(), commande.imageId(),
                preparation.albumId(), preparation.section(), OrigineLien.REUTILISEE));
        return vue(ligne, mot, sens, image);
    }

    /**
     * « Utiliser dans une préparation » depuis la Banque (story 3.4) : l'Image {@code imageId}, proposable à
     * l'enseignant courant (la sienne ou celle, versée, d'un collègue), est liée avec l'origine {@code reutilisee},
     * sans copie (AD-5), au Mot qu'elle illustre dans la Préparation {@code id}. Le Mot est déduit de l'Image (Mot de son
     * Sens) :
     * <ul>
     * <li>absent de la Préparation, il est ajouté en fin, comme {@link #reutiliserImage}, avec le Sens de l'Image
     * retenu ;</li>
     * <li>présent et « à illustrer », l'Image lui est liée et le Sens retenu devient celui de l'Image
     * ({@link Usages#remplacerImage}) ;</li>
     * <li>présent et déjà illustré, la commande doit demander de remplacer l'Image : l'ancienne est seulement
     * déliée, jamais modifiée. Déjà illustré par cette même Image, rien ne change.</li>
     * </ul>
     * Un Mot écarté de l'Encart le reste : l'ajout explicite l'emporte, comme {@link #ajouterMot}. Une seule
     * transaction, Préparation verrouillée : rien n'est écrit en cas de refus.
     *
     * @return le Mot illustré, et s'il vient d'être ajouté
     * @throws ErreurMetier {@code 404 ressource.introuvable} si la Préparation n'existe pas ou appartient à un
     *         collègue ; {@code 404 image.indisponible} si l'Image n'existe pas ou ne lui est pas proposable, y compris
     *         si elle change avant son verrou ; {@code 400 image.sens_different} si son Sens change entre la lecture
     *         qui en déduit le Mot et son verrou ; {@code 409 preparation.mot_deja_illustre} si le Mot a déjà une
     *         autre Image et que la commande ne demande pas de la remplacer
     */
    @Transactional
    public UtilisationImageVue utiliserImage(UUID id, UtiliserImageCommande commande) {
        Preparation preparation = verrouillee(id);
        UUID sensId = usages.sensDImageProposable(commande.imageId())
                .orElseThrow(() -> new ErreurMetier(404, CODE_IMAGE_INDISPONIBLE,
                        "Aucune image proposable ne porte cet identifiant"));
        UUID motId = lexique.sens(sensId).map(SensVue::motId)
                .orElseThrow(() -> new IllegalStateException("Sens " + sensId + " introuvable"));
        Optional<PreparationMot> present = preparationMots.duMot(preparation.id(), motId);
        if (present.isEmpty()) {
            return new UtilisationImageVue(reutiliserImage(id, new ReutiliserImageCommande(motId,
                    commande.imageId())), true);
        }
        PreparationMot ligne = present.get();
        ImageVue actuelle = usages.imagesLiees(List.of(ligne.id())).get(ligne.id());
        if (actuelle != null && !actuelle.id().equals(commande.imageId()) && !commande.remplacer()) {
            throw new ErreurMetier(409, CODE_MOT_DEJA_ILLUSTRE, "Ce mot de préparation a déjà une image");
        }
        return new UtilisationImageVue(remplacerImage(id, ligne.id(), commande.imageId()), false);
    }

    /**
     * Mots déjà illustrés pour l'Album de la Préparation {@code id} de l'enseignant courant (Encart, story 2.9), calculés
     * par {@code vocabulaire} seul ({@link DetectionMots#motsDejaIllustres}, AD-2), sans les Mots déjà dans la
     * Préparation ni ceux qui en ont été écartés. Lecture seule, sans verrou : rien n'est écrit.
     *
     * @throws ErreurMetier {@code 404 ressource.introuvable} si la Préparation n'existe pas ou appartient à un collègue
     */
    @Transactional
    public List<MotDejaIllustreVue> reprises(UUID id) {
        Preparation preparation = mienne(id);
        return detectionMots.motsDejaIllustres(preparation.albumId(), preparation.section(), preparation.id(),
                exclusDesReprises(preparation));
    }

    /**
     * « Tout reprendre » (Encart, story 2.9) : parmi les Mots {@code motIds}, ceux qui sont encore candidats
     * ({@link #reprises}) sont ajoutés en fin de Préparation {@code id} de l'enseignant courant, dans l'ordre de l'Encart,
     * chacun avec le Sens de son Image proposée, recalculée, et cette Image liée avec l'origine {@code reutilisee}, comme
     * {@link #reutiliserImage}. Les autres (déjà présents, plus candidats, écartés) sont ignorés, ainsi qu'un Mot dont
     * l'Image cesse d'être proposable sous verrou. Une seule transaction, Préparation verrouillée.
     *
     * @return les Mots ajoutés, dans l'ordre
     * @throws ErreurMetier {@code 404 ressource.introuvable} si la Préparation n'existe pas ou appartient à un collègue
     */
    @Transactional
    public List<MotPreparationVue> reprendre(UUID id, Set<UUID> motIds) {
        Preparation preparation = verrouillee(id);
        List<MotPreparationVue> ajoutes = new ArrayList<>();
        for (MotDejaIllustreVue candidat : detectionMots.motsDejaIllustres(preparation.albumId(),
                preparation.section(), preparation.id(), exclusDesReprises(preparation))) {
            if (!motIds.contains(candidat.mot().id())) {
                continue;
            }
            PreparationMot ligne = PreparationMot.nouveau(preparationMots.nouvelIdentifiant(), preparation.id(),
                    candidat.mot().id(), preparationMots.dernierOrdre(preparation.id()) + 1,
                    preparation.themeDefautId());
            preparationMots.persistAndFlush(ligne);
            SensVue sens = usages.retenirSens(new RetenirSensCommande(preparation.id(), ligne.id(),
                    candidat.mot().id(), preparation.albumId(), preparation.section(), candidat.sens().id()));
            Optional<ImageVue> image = usages.lierImageSiPossible(new LierImageCommande(preparation.id(), ligne.id(),
                    candidat.image().image().id(), preparation.albumId(), preparation.section(),
                    OrigineLien.REUTILISEE));
            if (image.isEmpty()) {
                usages.libererPreparationMot(ligne.id());
                preparationMots.delete(ligne);
                preparationMots.flush();
                continue;
            }
            ajoutes.add(vue(ligne, candidat.mot(), sens, image.get()));
        }
        return ajoutes;
    }

    /**
     * Écarte le Mot {@code motId} de l'Encart « mots déjà illustrés » de la Préparation {@code id} de l'enseignant
     * courant (story 2.9) ; sans effet s'il l'est déjà. Rien n'est supprimé de la banque. Préparation verrouillée, comme
     * pour « Tout reprendre ».
     *
     * @throws ErreurMetier {@code 404 ressource.introuvable} si la Préparation n'existe pas ou appartient à un
     *         collègue, ou si le Mot n'existe pas
     */
    @Transactional
    public void ecarter(UUID id, UUID motId) {
        Preparation preparation = verrouillee(id);
        if (motId == null || !lexique.mots(List.of(motId)).containsKey(motId)) {
            throw new ErreurMetier(404, CODE_INTROUVABLE, "Aucun mot ne porte cet identifiant");
        }
        motsEcartes.ecarter(preparation.id(), motId);
    }

    /**
     * Rend le Mot {@code motId} à l'Encart « mots déjà illustrés » de la Préparation {@code id} de l'enseignant courant
     * (« Annuler », story 2.9) ; sans effet s'il n'était pas écarté. Préparation verrouillée.
     *
     * @throws ErreurMetier {@code 404 ressource.introuvable} si la Préparation n'existe pas ou appartient à un collègue
     */
    @Transactional
    public void annulerEcart(UUID id, UUID motId) {
        motsEcartes.retirer(verrouillee(id).id(), motId);
    }

    /** Mots que l'Encart ne propose pas pour cette Préparation : ceux qui y figurent déjà et ceux qui en sont écartés. */
    private Set<UUID> exclusDesReprises(Preparation preparation) {
        Set<UUID> exclus = new HashSet<>(motsEcartes.de(preparation.id()));
        preparationMots.deLaPreparation(preparation.id()).forEach(ligne -> exclus.add(ligne.motId()));
        return exclus;
    }

    /**
     * Téléverse une Image pour le Mot de Préparation {@code motPreparationId} de la Préparation {@code id} de
     * l'enseignant courant, à partir du fichier déjà réduit (hors transaction) : l'Image est créée ({@code privee},
     * Sens retenu du Mot, Section de la Préparation d'office (story 2.11) ; Album de la Préparation comme Album
     * d'origine pour une image d'album seulement, règle tenue par {@link Images#televerser}) et liée au Mot avec
     * l'origine {@code nouvelle}, dans une même transaction. Si la commande le demande
     * ({@link TeleverserImageMotCommande#remplacer}, Panneau de choix d'Image), l'Image créée remplace l'Image déjà
     * liée, qui est seulement déliée ({@link Usages#remplacerImage}). Rien n'est enregistré en cas de refus.
     *
     * @throws ErreurMetier {@code 404 ressource.introuvable} si la Préparation n'existe pas ou appartient à un
     *         collègue, ou si le Mot de Préparation n'existe pas ou appartient à une autre Préparation ;
     *         {@code 400 requete.invalide} si la licence ne peut pas être choisie pour ce type ;
     *         {@code 400 image.album_requis} ou {@code 400 image.album_introuvable} pour une image d'album dont la
     *         Préparation n'a pas d'Album existant ; {@code 409 preparation.mot_deja_illustre} si le Mot a déjà une
     *         Image et que la commande ne demande pas de la remplacer
     */
    @Transactional
    public MotPreparationVue televerserImage(UUID id, UUID motPreparationId, TeleverserImageMotCommande commande) {
        Preparation preparation = verrouillee(id);
        PreparationMot ligne = deLaPreparation(preparation, motPreparationId);
        SensVue sens = lexique.sensRetenus(List.of(ligne.id())).get(ligne.id());
        if (sens == null) {
            throw new IllegalStateException("Sens retenu du mot de préparation " + ligne.id() + " introuvable");
        }
        ImageVue creee = images.televerser(new TeleverserImageCommande(commande.fichier(), sens.id(), commande.typeImage(),
                commande.licence(), commande.source(), commande.auteur(), preparation.albumId(),
                preparation.section(), commande.arasaacId()));
        ImageVue liee = commande.remplacer()
                ? usages.remplacerImage(new RemplacerImageCommande(preparation.id(), ligne.id(), creee.id(),
                        preparation.albumId(), preparation.section(), OrigineLien.NOUVELLE))
                : usages.lierImage(new LierImageCommande(preparation.id(), ligne.id(), creee.id(),
                        preparation.albumId(), preparation.section(), OrigineLien.NOUVELLE));
        MotVue mot = motDe(ligne, lexique.mots(List.of(ligne.motId())));
        return vue(ligne, mot, sens, liee);
    }

    /**
     * Vérifie, sans verrou ni écriture, que le Mot de Préparation {@code motPreparationId} appartient à la Préparation
     * {@code id} de l'enseignant courant : appelé avant un appel sortant (pictogramme ARASAAC, story 2.4), pour qu'une
     * Préparation de collègue ou un Mot déjà illustré n'appelle jamais ARASAAC. L'écriture qui suit revérifie sous
     * verrou.
     *
     * @throws ErreurMetier {@code 404 ressource.introuvable} si la Préparation n'existe pas ou appartient à un
     *         collègue, ou si le Mot de Préparation n'existe pas ou appartient à une autre Préparation ;
     *         {@code 409 preparation.mot_deja_illustre} si le Mot a déjà une Image
     */
    @Transactional
    public void verifierMot(UUID id, UUID motPreparationId) {
        PreparationMot ligne = deLaPreparation(mienne(id), motPreparationId);
        if (usages.imagesLiees(List.of(ligne.id())).containsKey(ligne.id())) {
            throw new ErreurMetier(409, CODE_MOT_DEJA_ILLUSTRE, "Ce mot de préparation a déjà une image");
        }
    }

    /**
     * Illustre le Mot de Préparation {@code motPreparationId} de la Préparation {@code id} de l'enseignant courant avec
     * l'Image qu'il possède déjà pour le pictogramme ARASAAC {@code idArasaac} et le Sens retenu du Mot
     * ({@link Usages#imagePossedeeDuPictogramme}, story 2.11), s'il en a une : elle est liée avec l'origine
     * {@code reutilisee}, sans copie ni création (AD-5) ; son état, ses Sections et ses Thèmes ne changent pas, ni le
     * Sens retenu. Sans Image possédée, rien n'est écrit et le résultat est vide : l'appelant télécharge alors le
     * pictogramme hors transaction et crée l'Image ({@link #televerserImage}). Une seule transaction, Préparation
     * verrouillée : rien n'est écrit en cas de refus. Aucun appel sortant.
     *
     * @return le Mot illustré par l'Image possédée ; vide s'il n'y en a pas
     * @throws ErreurMetier {@code 404 ressource.introuvable} si la Préparation n'existe pas ou appartient à un
     *         collègue, ou si le Mot de Préparation n'existe pas ou appartient à une autre Préparation ;
     *         {@code 409 preparation.mot_deja_illustre} si le Mot a déjà une Image ;
     *         {@code 404 image.indisponible} si l'Image possédée cesse de lui être proposable avant son verrou
     */
    @Transactional
    public Optional<MotPreparationVue> lierImagePossedeeDuPictogramme(UUID id, UUID motPreparationId,
            long idArasaac) {
        Preparation preparation = verrouillee(id);
        PreparationMot ligne = deLaPreparation(preparation, motPreparationId);
        if (usages.imagesLiees(List.of(ligne.id())).containsKey(ligne.id())) {
            throw new ErreurMetier(409, CODE_MOT_DEJA_ILLUSTRE, "Ce mot de préparation a déjà une image");
        }
        Optional<UUID> possedee = usages.imagePossedeeDuPictogramme(ligne.id(), idArasaac);
        if (possedee.isEmpty()) {
            return Optional.empty();
        }
        ImageVue liee = usages.lierImage(new LierImageCommande(preparation.id(), ligne.id(), possedee.get(),
                preparation.albumId(), preparation.section(), OrigineLien.REUTILISEE));
        MotVue mot = motDe(ligne, lexique.mots(List.of(ligne.motId())));
        return Optional.of(vue(ligne, mot, lexique.sensRetenus(List.of(ligne.id())).get(ligne.id()), liee));
    }

    /**
     * Images proposées pour le Mot de Préparation {@code motPreparationId} de la Préparation {@code id} de l'enseignant
     * courant (Panneau de choix d'Image, stories 2.7 et 2.8) : les Images proposables du Mot, de tous ses Sens ou du seul
     * Sens {@code sensId} s'il est donné, classées par {@code vocabulaire} comme la détection
     * ({@link DetectionMots#propositions}) ; la liste des Sens visibles reste complète. Lecture seule, sans verrou.
     *
     * @throws ErreurMetier {@code 404 ressource.introuvable} si la Préparation n'existe pas ou appartient à un
     *         collègue, ou si le Mot de Préparation n'existe pas ou appartient à une autre Préparation
     */
    @Transactional
    public MotDetecteVue propositions(UUID id, UUID motPreparationId, UUID sensId) {
        Preparation preparation = mienne(id);
        PreparationMot ligne = deLaPreparation(preparation, motPreparationId);
        return detectionMots.propositions(ligne.motId(), preparation.albumId(), preparation.section(), sensId);
    }

    /**
     * Change le Sens retenu pour le Mot de Préparation {@code motPreparationId} de la Préparation {@code id} de
     * l'enseignant courant (Panneau de choix d'Image, story 2.8), par {@link Usages#changerSens} : le Sens doit être un
     * Sens visible du même Mot ; l'Image liée qui n'est pas de ce Sens est déliée et le Mot redevient « à illustrer ».
     * Choisir le Sens déjà retenu ne change rien. Une seule transaction, Préparation verrouillée : rien n'est modifié en
     * cas de refus.
     *
     * @throws ErreurMetier {@code 404 ressource.introuvable} si la Préparation n'existe pas ou appartient à un
     *         collègue, ou si le Mot de Préparation n'existe pas ou appartient à une autre Préparation ;
     *         {@code 400 preparation.sens_invalide} si le Sens n'existe pas, appartient à un autre Mot ou n'est pas
     *         visible de l'enseignant
     */
    @Transactional
    public MotPreparationVue changerSens(UUID id, UUID motPreparationId, UUID sensId) {
        Preparation preparation = verrouillee(id);
        PreparationMot ligne = deLaPreparation(preparation, motPreparationId);
        SensVue sens = usages.changerSens(new ChangerSensCommande(ligne.id(), sensId));
        MotVue mot = motDe(ligne, lexique.mots(List.of(ligne.motId())));
        return vue(ligne, mot, sens, usages.imagesLiees(List.of(ligne.id())).get(ligne.id()));
    }

    /**
     * Crée ou réutilise le Sens tapé par l'enseignant dans la Création de Sens du Panneau de choix d'Image (story 2.8)
     * pour le Mot de Préparation {@code motPreparationId} de la Préparation {@code id} de l'enseignant courant, et le
     * retient par {@link Usages#creerSens} : l'Image liée d'un autre Sens est déliée et le Mot redevient « à illustrer ».
     * Une seule transaction, Préparation verrouillée : rien n'est écrit en cas de refus, pas même le Sens.
     *
     * @throws ErreurMetier {@code 404 ressource.introuvable} si la Préparation n'existe pas ou appartient à un
     *         collègue, ou si le Mot de Préparation n'existe pas ou appartient à une autre Préparation ;
     *         {@code 400 sens.libelle_invalide} si le libellé est vide, trop long ou réservé
     * @throws IllegalArgumentException si la catégorie manque : l'appelant la vérifie avant
     */
    @Transactional
    public MotPreparationVue creerSens(UUID id, UUID motPreparationId, String libelle,
            CategorieGrammaticale categorie) {
        Preparation preparation = verrouillee(id);
        PreparationMot ligne = deLaPreparation(preparation, motPreparationId);
        SensVue sens = usages.creerSens(new CreerSensCommande(ligne.id(), libelle, categorie));
        MotVue mot = motDe(ligne, lexique.mots(List.of(ligne.motId())));
        return vue(ligne, mot, sens, usages.imagesLiees(List.of(ligne.id())).get(ligne.id()));
    }

    /**
     * Lie l'Image {@code imageId} au Mot de Préparation {@code motPreparationId} de la Préparation {@code id} de
     * l'enseignant courant, à la place de celle qu'il a s'il en a une (Panneau de choix d'Image, story 2.7), avec
     * l'origine {@code reutilisee}, par {@link Usages#remplacerImage} qui verrouille l'Image, revérifie qu'elle est
     * proposable et d'un Sens du Mot, et change le Sens retenu si besoin. L'Image remplacée est seulement déliée.
     * Choisir l'Image déjà liée ne change rien. Une seule transaction : rien n'est modifié en cas de refus.
     *
     * @throws ErreurMetier {@code 404 ressource.introuvable} si la Préparation n'existe pas ou appartient à un
     *         collègue, ou si le Mot de Préparation n'existe pas ou appartient à une autre Préparation ;
     *         {@code 404 image.indisponible} si l'Image n'existe pas ou ne lui est pas proposable ;
     *         {@code 400 image.sens_different} si l'Image illustre un autre Mot
     */
    @Transactional
    public MotPreparationVue remplacerImage(UUID id, UUID motPreparationId, UUID imageId) {
        Preparation preparation = verrouillee(id);
        PreparationMot ligne = deLaPreparation(preparation, motPreparationId);
        ImageVue image = usages.remplacerImage(new RemplacerImageCommande(preparation.id(), ligne.id(), imageId,
                preparation.albumId(), preparation.section(), OrigineLien.REUTILISEE));
        MotVue mot = motDe(ligne, lexique.mots(List.of(ligne.motId())));
        return vue(ligne, mot, lexique.sensRetenus(List.of(ligne.id())).get(ligne.id()), image);
    }

    /**
     * Remplace le Thème du Mot de Préparation {@code motPreparationId} de la Préparation {@code id} de l'enseignant
     * courant ; {@code null} le retire. Le Thème par défaut et les autres Mots ne changent pas. Rien n'est modifié en
     * cas de refus.
     *
     * @throws ErreurMetier {@code 404 ressource.introuvable} si la Préparation n'existe pas ou appartient à un
     *         collègue, ou si le Mot de Préparation n'existe pas ou appartient à une autre Préparation ;
     *         {@code 400 preparation.theme_introuvable} si le Thème n'existe pas
     */
    @Transactional
    public MotPreparationVue changerThemeMot(UUID id, UUID motPreparationId, UUID themeId) {
        Preparation preparation = verrouillee(id);
        PreparationMot ligne = deLaPreparation(preparation, motPreparationId);
        ThemeVue theme = themeId == null ? null
                : referentiels.theme(themeId).orElseThrow(() -> new ErreurMetier(400, CODE_THEME_INTROUVABLE,
                        "Aucun thème ne porte cet identifiant"));
        ligne.changerTheme(theme == null ? null : theme.id());
        preparationMots.flush();
        MotVue mot = motDe(ligne, lexique.mots(List.of(ligne.motId())));
        return vue(ligne, mot, lexique.sensRetenus(List.of(ligne.id())).get(ligne.id()),
                usages.imagesLiees(List.of(ligne.id())).get(ligne.id()));
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
        List<UUID> ids = lignes.stream().map(PreparationMot::id).toList();
        Map<UUID, SensVue> sens = lexique.sensRetenus(ids);
        Map<UUID, ImageVue> imagesLiees = usages.imagesLiees(ids);
        return lignes.stream()
                .map(ligne -> vue(ligne, motDe(ligne, mots), sens.get(ligne.id()), imagesLiees.get(ligne.id())))
                .toList();
    }

    /**
     * Détection pendant la frappe dans la Préparation {@code id} de l'enseignant courant (story 2.7) : {@code vocabulaire}
     * reçoit l'Album et la Section de la Préparation et décide seul de ce qui est visible et du classement
     * ({@link DetectionMots}). Lecture seule, sans verrou : rien n'est écrit.
     *
     * @throws ErreurMetier {@code 404 ressource.introuvable} si la Préparation n'existe pas ou appartient à un
     *         collègue ; {@code 400 requete.invalide} si la saisie normalisée compte moins de 2 ou plus de
     *         {@value Lexique#LONGUEUR_MAX_FORME} caractères
     */
    @Transactional
    public DetectionPreparationVue detecter(UUID id, String saisie) {
        Preparation preparation = mienne(id);
        DetectionVue detection = detectionMots.detecter(saisie, preparation.albumId(), preparation.section());
        Set<UUID> presents = detection.mots().stream()
                .map(mot -> mot.mot().id())
                .filter(motId -> preparationMots.contient(preparation.id(), motId))
                .collect(Collectors.toUnmodifiableSet());
        return new DetectionPreparationVue(detection, presents);
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

    /** Mot de Préparation {@code motPreparationId} de cette Préparation ; sinon {@code 404 ressource.introuvable}. */
    private PreparationMot deLaPreparation(Preparation preparation, UUID motPreparationId) {
        return (motPreparationId == null ? Optional.<PreparationMot>empty()
                : preparationMots.deLaPreparation(preparation.id(), motPreparationId))
                .orElseThrow(() -> new ErreurMetier(404, CODE_INTROUVABLE,
                        "Aucun mot de cette préparation ne porte cet identifiant"));
    }

    /** Mot du Lexique de ce Mot de Préparation ; son absence est une anomalie (un Mot n'est jamais supprimé). */
    private static MotVue motDe(PreparationMot ligne, Map<UUID, MotVue> mots) {
        MotVue mot = mots.get(ligne.motId());
        if (mot == null) {
            throw new IllegalStateException("Mot " + ligne.motId() + " du mot de préparation " + ligne.id()
                    + " introuvable");
        }
        return mot;
    }

    private static ErreurMetier introuvable() {
        return new ErreurMetier(404, CODE_INTROUVABLE, "Aucune préparation ne porte cet identifiant");
    }

    private int nombreMots(Preparation preparation) {
        return (int) preparationMots.compter(preparation.id());
    }

    private int nombreIllustres(Preparation preparation) {
        return usages.nombresIllustres(List.of(preparation.id())).getOrDefault(preparation.id(), 0);
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

    private static PreparationVue vue(Preparation preparation, AlbumVue album, ModuleVue module, ThemeVue theme,
            int nombreMots, int nombreIllustres) {
        return new PreparationVue(preparation.id(), preparation.nom(), album.id(), album.titre(), preparation.section(),
                module == null ? null : module.id(), module == null ? null : module.nom(),
                theme == null ? null : theme.id(), theme == null ? null : theme.nom(), preparation.tempsPasseMinutes(),
                nombreMots, nombreIllustres, preparation.creeLe());
    }

    private static CartePreparationVue carte(Preparation preparation, AlbumVue album, ModuleVue module,
            int nombreMots, int nombreIllustres) {
        return new CartePreparationVue(preparation.id(), preparation.nom(), album.id(), album.titre(),
                preparation.section(), module == null ? null : module.id(), module == null ? null : module.nom(),
                nombreMots, nombreMots - nombreIllustres, preparation.creeLe());
    }

    /**
     * Un Mot de Préparation a toujours un Sens retenu (même transaction) ; son absence est une anomalie. {@code image}
     * est l'Image liée, {@code null} pour un Mot « à illustrer ».
     */
    private static MotPreparationVue vue(PreparationMot ligne, MotVue mot, SensVue sens, ImageVue image) {
        if (sens == null) {
            throw new IllegalStateException("Sens retenu du mot de préparation " + ligne.id() + " introuvable");
        }
        return new MotPreparationVue(ligne.id(), mot.id(), mot.forme(), ligne.ordre(), sens.id(), sens.libelle(),
                sens.categorie(), ligne.themeId(), image);
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
