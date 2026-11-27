package fr.corpusmots.vocabulaire.service;

import fr.corpusmots.commun.api.ErreurMetier;
import fr.corpusmots.commun.service.EnseignantCourant;
import fr.corpusmots.commun.service.Pagination;
import fr.corpusmots.commun.service.Section;
import fr.corpusmots.referentiels.service.AlbumVue;
import fr.corpusmots.referentiels.service.ModuleVue;
import fr.corpusmots.referentiels.service.ReferentielsService;
import fr.corpusmots.referentiels.service.ThemeVue;
import fr.corpusmots.vocabulaire.persistance.FichierLu;
import fr.corpusmots.vocabulaire.persistance.Image;
import fr.corpusmots.vocabulaire.persistance.ImageBanqueLigne;
import fr.corpusmots.vocabulaire.persistance.ImageFichier;
import fr.corpusmots.vocabulaire.persistance.ImageFichierRepository;
import fr.corpusmots.vocabulaire.persistance.ImageRepository;
import fr.corpusmots.vocabulaire.persistance.LienImageRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.text.Collator;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Images de l'enseignant courant (FR-13) : seul point de création des lignes {@code image} et {@code image_fichier}.
 * Une Image naît {@code privee}, propriété de l'enseignant courant (AD-3). Rejoint la transaction de l'appelant
 * (AD-17).
 */
@ApplicationScoped
public class Images {

    static final String CODE_ALBUM_REQUIS = "image.album_requis";
    static final String CODE_ALBUM_INTROUVABLE = "image.album_introuvable";
    static final String CODE_MOT_INVALIDE = "image.mot_invalide";
    static final String CODE_REQUETE_INVALIDE = "requete.invalide";
    static final String CODE_RESSOURCE_INTROUVABLE = "ressource.introuvable";
    static final String CODE_RESERVEE_AU_PROPRIETAIRE = "image.reservee_au_proprietaire";
    static final String CODE_THEME_INTROUVABLE = "image.theme_introuvable";
    static final String CODE_MODULE_INTROUVABLE = "image.module_introuvable";
    static final String CODE_SENS_INVALIDE = "image.sens_invalide";
    static final String CODE_SENS_NON_MODIFIABLE = "image.sens_non_modifiable";
    static final String TYPE_MEDIA_IMAGE = "image";

    /** Longueur maximale de la source et de l'auteur d'une Image. */
    public static final int LONGUEUR_MAX_TEXTE = 500;

    @Inject
    ImageRepository images;

    @Inject
    ImageFichierRepository fichiers;

    @Inject
    VisibiliteImages visibilite;

    @Inject
    EnseignantCourant enseignantCourant;

    @Inject
    Lexique lexique;

    @Inject
    Usages usages;

    @Inject
    ReferentielsService referentiels;

    @Inject
    LienImageRepository liens;

    @Inject
    ReductionImages reduction;

    /**
     * Carte d'identité de l'Image {@code imageId}, si l'enseignant courant peut la consulter
     * ({@link VisibiliteImages#consultable}, lien compris, comme {@link FichiersImages#lire}) ; vide si elle n'existe
     * pas ou ne lui est pas consultable. Le rôle {@code admin} n'élargit rien. Lecture seule : rien n'est écrit.
     * L'Album d'origine, celui d'une image d'album seulement, est lu par {@code referentiels} (AD-1).
     */
    @Transactional
    public Optional<CarteIdentiteImageVue> carteIdentite(UUID imageId) {
        UUID enseignantId = enseignantCourant.id();
        if (imageId == null || enseignantId == null) {
            return Optional.empty();
        }
        return images.findByIdOptional(imageId)
                .filter(image -> visibilite.consultable(image, enseignantId, liens.existe(image.id(), enseignantId)))
                .map(image -> carteIdentite(image, enseignantId));
    }

    /**
     * Remplace d'un coup le type, la licence, la source, l'auteur et l'Album d'origine de l'Image {@code imageId}, par
     * son seul propriétaire (FR-14), avec les règles de {@link #televerser} : licence imposée par le type ou choisie
     * dans le Sélecteur, Album d'origine pour une image d'album seulement. Passer d'une licence imposée à une image
     * libre ou inconnue laisse la licence vide si aucune n'est choisie ; quitter l'image d'album efface l'Album
     * d'origine, le fichier restant en basse résolution. Passer en image d'album réduit aussitôt le fichier et sa
     * miniature à {@value ReductionImages#COTE_MAX_ALBUM} px au plus, dans la même transaction. L'état ne change pas
     * (AD-3) ; {@code @Version} protège contre deux écritures concurrentes. Un retrait par l'administrateur est vidé
     * si la description change (AD-3). Rien n'est modifié en cas de refus.
     *
     * @return la Carte d'identité à jour
     * @throws ErreurMetier {@code 404 ressource.introuvable} si l'Image n'existe pas ou n'est pas consultable par
     *         l'enseignant courant ; {@code 403 image.reservee_au_proprietaire} s'il n'en est pas le propriétaire,
     *         administrateur compris ; et les refus de {@link #televerser} (type, licence, textes, Album d'origine)
     */
    @Transactional
    public CarteIdentiteImageVue modifierDescription(UUID imageId, ModifierDescriptionImageCommande commande) {
        UUID enseignantId = enseignantCourant.id();
        Image image = imageDuProprietaire(imageId, enseignantId);
        TypeImage type = commande == null ? null : commande.typeImage();
        if (type == null) {
            throw new ErreurMetier(400, CODE_REQUETE_INVALIDE, "Le type d'image est obligatoire");
        }
        UUID albumId = albumDOrigine(type, commande.albumId());
        Licence licence = licence(type, commande.licence());
        String source = texte(commande.source(), "source");
        String auteur = texte(commande.auteur(), "auteur");
        boolean devientImageAlbum = type == TypeImage.IMAGE_ALBUM
                && !TypeImage.IMAGE_ALBUM.valeur().equals(image.typeImage());
        if (devientImageAlbum) {
            reduireEnImageAlbum(image.id());
        }
        String valeurLicence = licence == null ? null : licence.valeur();
        boolean modifiee = !type.valeur().equals(image.typeImage()) || !Objects.equals(valeurLicence, image.licence())
                || !Objects.equals(source, image.source()) || !Objects.equals(auteur, image.auteur())
                || !Objects.equals(albumId, image.albumId());
        image.decrire(type.valeur(), valeurLicence, source, auteur, albumId);
        carteEnregistree(image, modifiee);
        return carteIdentite(image, enseignantId);
    }

    /**
     * Remplace d'un coup les Sections, le Module et les Thèmes de l'Image {@code imageId}, par son seul propriétaire
     * (FR-14). Les Sections sont cochées librement ; le Module, facultatif, peut être celui de n'importe quel Album,
     * quels que soient le type et l'Album d'origine ; les Thèmes sont sans limite. Doublons ignorés. Thèmes et Module
     * sont relus par {@code referentiels} en verrou partagé avant l'écriture : ils ne peuvent pas être supprimés
     * pendant l'affectation (AD-15, AD-17). L'état ne change pas (AD-3) ; {@code @Version} est incrémentée si le
     * classement change. Un retrait par l'administrateur est vidé si le classement change (AD-3). Rien n'est modifié
     * en cas de refus.
     *
     * @return la Carte d'identité à jour
     * @throws ErreurMetier {@code 404 ressource.introuvable} si l'Image n'existe pas ou n'est pas consultable par
     *         l'enseignant courant ; {@code 403 image.reservee_au_proprietaire} s'il n'en est pas le propriétaire,
     *         administrateur compris ; {@code 400 requete.invalide} si les Sections ou les Thèmes manquent ou
     *         contiennent une valeur nulle ; {@code 400 image.theme_introuvable} si un Thème n'existe pas ;
     *         {@code 400 image.module_introuvable} si le Module n'existe pas
     */
    @Transactional
    public CarteIdentiteImageVue classer(UUID imageId, ClasserImageCommande commande) {
        UUID enseignantId = enseignantCourant.id();
        Image image = imageDuProprietaire(imageId, enseignantId);
        if (commande == null || commande.sections() == null || commande.themeIds() == null
                || commande.sections().stream().anyMatch(Objects::isNull)
                || commande.themeIds().stream().anyMatch(Objects::isNull)) {
            throw new ErreurMetier(400, CODE_REQUETE_INVALIDE, "Les sections et les thèmes sont obligatoires");
        }
        Set<Section> sections = EnumSet.noneOf(Section.class);
        sections.addAll(commande.sections());
        Set<UUID> themeIds = new HashSet<>(commande.themeIds());
        if (referentiels.themesVerrouilles(themeIds).size() != themeIds.size()) {
            throw new ErreurMetier(400, CODE_THEME_INTROUVABLE, "Un des thèmes n'existe pas");
        }
        UUID moduleId = commande.moduleId();
        if (moduleId != null && referentiels.moduleVerrouille(moduleId).isEmpty()) {
            throw new ErreurMetier(400, CODE_MODULE_INTROUVABLE, "Aucun module ne porte cet identifiant");
        }
        boolean modifie = !sections.equals(image.sections()) || !Objects.equals(moduleId, image.moduleId())
                || !themeIds.equals(image.themeIds());
        image.classer(sections, moduleId, themeIds);
        carteEnregistree(image, modifie);
        return carteIdentite(image, enseignantId);
    }

    /**
     * Sens que le propriétaire peut donner à l'Image {@code imageId} (FR-14) : les Sens de son Mot qui lui sont visibles,
     * c'est-à-dire qui portent une Image qui lui est {@link VisibiliteImages#proposable proposable} ou qu'il a retenus
     * dans l'une de ses Préparations (AD-2), plus le Sens actuel de l'Image ; « à compléter » d'abord, puis par libellé.
     * Lecture seule.
     *
     * @throws ErreurMetier {@code 404 ressource.introuvable} si l'Image n'existe pas ou n'est pas consultable par
     *         l'enseignant courant ; {@code 403 image.reservee_au_proprietaire} s'il n'en est pas le propriétaire,
     *         administrateur compris
     */
    @Transactional
    public List<SensProposeVue> sensProposes(UUID imageId) {
        UUID enseignantId = enseignantCourant.id();
        Image image = imageDuProprietaire(imageId, enseignantId, false);
        Collator collation = Collator.getInstance(Locale.FRENCH);
        return sensVisibles(image, enseignantId).stream()
                .map(sens -> new SensProposeVue(sens, Usages.aCompleter(sens)))
                .sorted(Comparator.comparing((SensProposeVue propose) -> !propose.aCompleter())
                        .thenComparing(propose -> propose.sens().libelle(), collation)
                        .thenComparing(propose -> propose.sens().id()))
                .toList();
    }

    /**
     * Remplace le Sens de l'Image {@code imageId}, par son seul propriétaire (FR-14), par un autre Sens du même Mot
     * parmi ceux de {@link #sensProposes}. Le Mot et le Sens ne sont jamais modifiés (AD-19) : la catégorie suit le Sens
     * choisi. L'Image est verrouillée ({@code SELECT … FOR UPDATE}, comme {@link Usages#lierImage}) avant de vérifier
     * qu'aucun enseignant, propriétaire compris, n'a de lien vers elle : aucun lien ne peut être créé entre-temps, et
     * l'invariant Sens de l'Image = Sens retenu tient (AD-5, AD-17). Le même Sens ne change rien, pas même le
     * retrait par l'administrateur, qu'un nouveau Sens vide (AD-3). L'état ne change pas (AD-3). Rien n'est modifié en
     * cas de refus.
     *
     * @return la Carte d'identité à jour
     * @throws ErreurMetier {@code 404 ressource.introuvable} si l'Image n'existe pas ou n'est pas consultable par
     *         l'enseignant courant ; {@code 403 image.reservee_au_proprietaire} s'il n'en est pas le propriétaire,
     *         administrateur compris ; {@code 409 image.sens_non_modifiable} si l'Image a au moins un lien ;
     *         {@code 400 image.sens_invalide} si le Sens n'existe pas, est d'un autre Mot ou ne lui est pas visible
     */
    @Transactional
    public CarteIdentiteImageVue changerSens(UUID imageId, UUID sensId) {
        UUID enseignantId = enseignantCourant.id();
        Image image = imageDuProprietaire(imageId, enseignantId, true);
        if (image.sensId().equals(sensId)) {
            return carteIdentite(image, enseignantId);
        }
        if (liens.existePourImage(image.id())) {
            throw new ErreurMetier(409, CODE_SENS_NON_MODIFIABLE,
                    "Cette image est utilisée dans une préparation : son sens ne peut plus changer");
        }
        boolean visible = sensId != null
                && sensVisibles(image, enseignantId).stream().anyMatch(sens -> sens.id().equals(sensId));
        if (!visible) {
            throw new ErreurMetier(400, CODE_SENS_INVALIDE, "Ce sens n'est pas un sens proposé pour le mot de l'image");
        }
        image.changerSens(sensId);
        carteEnregistree(image, true);
        return carteIdentite(image, enseignantId);
    }

    /**
     * Donne à l'Image {@code imageId}, par son seul propriétaire, le Sens qu'il vient de taper dans la Création de Sens
     * (Carte d'identité, story 2.8) : obtenu ou créé par {@link Lexique#obtenirOuCreerSensSaisi} pour le Mot de l'Image,
     * il devient le Sens de l'Image. Un libellé déjà connu pour ce Mot réutilise ce Sens, avec sa catégorie (AD-19).
     * Mêmes verrou et refus que {@link #changerSens} : l'Image verrouillée ne doit avoir aucun lien. Un retrait par
     * l'administrateur est vidé (AD-3) si le Sens obtenu n'est pas le Sens actuel. Rien n'est écrit en cas de refus, pas
     * même le Sens.
     *
     * @return la Carte d'identité à jour
     * @throws ErreurMetier {@code 404 ressource.introuvable} si l'Image n'existe pas ou n'est pas consultable par
     *         l'enseignant courant ; {@code 403 image.reservee_au_proprietaire} s'il n'en est pas le propriétaire,
     *         administrateur compris ; {@code 409 image.sens_non_modifiable} si l'Image a au moins un lien ;
     *         {@code 400 sens.libelle_invalide} si le libellé est vide, trop long ou réservé
     * @throws IllegalArgumentException si la catégorie manque : l'appelant la vérifie avant
     */
    @Transactional
    public CarteIdentiteImageVue creerSens(UUID imageId, String libelle, CategorieGrammaticale categorie) {
        UUID enseignantId = enseignantCourant.id();
        Image image = imageDuProprietaire(imageId, enseignantId, true);
        if (liens.existePourImage(image.id())) {
            throw new ErreurMetier(409, CODE_SENS_NON_MODIFIABLE,
                    "Cette image est utilisée dans une préparation : son sens ne peut plus changer");
        }
        SensVue actuel = lexique.sens(image.sensId())
                .orElseThrow(() -> new IllegalStateException("Sens introuvable de l'Image " + image.id()));
        SensVue nouveau = lexique.obtenirOuCreerSensSaisi(actuel.motId(), libelle, categorie);
        boolean modifiee = !nouveau.id().equals(actuel.id());
        if (modifiee) {
            image.changerSens(nouveau.id());
        }
        carteEnregistree(image, modifiee);
        return carteIdentite(image, enseignantId);
    }

    /**
     * Sens du Mot de l'Image visibles de l'enseignant (AD-2) : ceux qui portent une Image qui lui est proposable, ceux
     * qu'il a retenus, et le Sens actuel de l'Image.
     */
    private List<SensVue> sensVisibles(Image image, UUID enseignantId) {
        SensVue actuel = lexique.sens(image.sensId())
                .orElseThrow(() -> new IllegalStateException("Sens introuvable de l'Image " + image.id()));
        List<SensVue> duMot = lexique.sensDe(actuel.motId());
        Set<UUID> visibles = new HashSet<>(usages.sensRetenusDuMot(actuel.motId()));
        visibles.add(actuel.id());
        images.deSens(duMot.stream().map(SensVue::id).toList()).stream()
                .filter(illustration -> visibilite.proposable(illustration, enseignantId))
                .forEach(illustration -> visibles.add(illustration.sensId()));
        return duMot.stream().filter(sens -> visibles.contains(sens.id())).toList();
    }

    /**
     * Image {@code imageId}, si l'enseignant courant peut la consulter et en est le propriétaire.
     *
     * @throws ErreurMetier {@code 404 ressource.introuvable} si elle n'existe pas ou ne lui est pas consultable ;
     *         {@code 403 image.reservee_au_proprietaire} s'il n'en est pas le propriétaire, administrateur compris
     */
    private Image imageDuProprietaire(UUID imageId, UUID enseignantId) {
        return imageDuProprietaire(imageId, enseignantId, false);
    }

    /**
     * Image {@code imageId}, si l'enseignant courant peut la consulter et en est le propriétaire ; verrouillée
     * ({@code SELECT … FOR UPDATE}) jusqu'à la fin de la transaction si {@code verrouiller}, avant toute vérification.
     */
    private Image imageDuProprietaire(UUID imageId, UUID enseignantId, boolean verrouiller) {
        Image image = (imageId == null || enseignantId == null ? Optional.<Image>empty()
                : verrouiller ? images.verrouillee(imageId) : images.findByIdOptional(imageId))
                .filter(trouvee -> visibilite.consultable(trouvee, enseignantId,
                        liens.existe(trouvee.id(), enseignantId)))
                .orElseThrow(() -> new ErreurMetier(404, CODE_RESSOURCE_INTROUVABLE,
                        "Aucune image consultable ne porte cet identifiant"));
        if (!image.proprietaireId().equals(enseignantId)) {
            throw new ErreurMetier(403, CODE_RESERVEE_AU_PROPRIETAIRE,
                    "Seul le propriétaire de l'image peut modifier sa carte d'identité");
        }
        return image;
    }

    /**
     * Enregistre une modification de la Carte d'identité par le propriétaire, seul chemin des quatre modifications
     * (description, classement, changement et création de Sens) : si elle a changé quelque chose ({@code modifiee}),
     * le retrait par l'administrateur est vidé (AD-3, « jusqu'à ce que le propriétaire modifie la Carte ») ; une
     * modification qui ne change rien le laisse en place.
     */
    private void carteEnregistree(Image image, boolean modifiee) {
        if (modifiee) {
            image.effacerRetraitAdmin();
        }
        images.flush();
    }

    /** Réduit le fichier de l'Image et sa miniature à la taille d'une image d'album. */
    private void reduireEnImageAlbum(UUID imageId) {
        FichierLu actuel = fichiers.octets(imageId)
                .orElseThrow(() -> new IllegalStateException("Fichier introuvable de l'Image " + imageId));
        ImageReduiteVue reduit = reduction.reduire(actuel.octets(), TypeImage.IMAGE_ALBUM);
        fichiers.remplacer(imageId, reduit.octets(), reduit.miniature(), reduit.typeMime(), reduit.largeur(),
                reduit.hauteur());
    }

    /** Carte d'identité de l'Image, lue par l'enseignant {@code enseignantId} (visibilité vérifiée par l'appelant). */
    CarteIdentiteImageVue carteIdentite(Image image, UUID enseignantId) {
        SensVue sens = lexique.sens(image.sensId())
                .orElseThrow(() -> new IllegalStateException("Sens introuvable de l'Image " + image.id()));
        MotVue mot = lexique.mots(Set.of(sens.motId())).get(sens.motId());
        if (mot == null) {
            throw new IllegalStateException("Mot introuvable du Sens " + sens.id());
        }
        Licence licence = image.licence() == null ? null
                : Licence.deValeur(image.licence())
                        .orElseThrow(() -> new IllegalStateException("Licence inconnue de l'Image " + image.id()));
        ImageVue vue = vue(image, enseignantId, visibilite);
        // Seule une image d'album a un Album d'origine, même si une autre ligne porte un album_id.
        AlbumVue album = vue.typeImage() == TypeImage.IMAGE_ALBUM
                ? referentiels.album(image.albumId()).orElse(null)
                : null;
        List<Section> sections = image.sections().stream().sorted().toList();
        ModuleVue module = image.moduleId() == null ? null
                : referentiels.modules(Set.of(image.moduleId())).get(image.moduleId());
        AlbumVue albumModule = module == null ? null : referentiels.album(module.albumId()).orElse(null);
        Collator collation = Collator.getInstance(Locale.FRENCH);
        List<ThemeVue> themes = referentiels.themes(image.themeIds()).values().stream()
                .sorted(Comparator.comparing(ThemeVue::nom, collation).thenComparing(ThemeVue::id))
                .toList();
        boolean sensModifiable = image.proprietaireId().equals(enseignantId) && !liens.existePourImage(image.id());
        return new CarteIdentiteImageVue(vue, mot, sens, Usages.aCompleter(sens), album, licence, image.source(),
                image.auteur(), sections, albumModule == null ? null : module, albumModule, themes, sensModifiable);
    }

    /**
     * Ajoute une Image dans Mes mots de l'enseignant courant, sans aucun lien vers une Préparation (FR-13) : le Mot
     * saisi est obtenu ou créé par {@link Lexique#obtenirOuCreerMot}, qui le normalise (une seule fois, comme en
     * Préparation), l'Image illustre son {@link Usages#sensParDefaut Sens par défaut} et elle est créée par
     * {@link #televerser}, qui applique la règle de l'Album d'origine. Aucun Sens retenu ni lien d'Image n'est écrit.
     * Rien n'est enregistré en cas de refus.
     *
     * @throws ErreurMetier {@code 400 image.mot_invalide} si la saisie normalisée par {@link Lexique#normaliser} est
     *         vide ou dépasse {@value Lexique#LONGUEUR_MAX_FORME} caractères (comme en Préparation : un article seul
     *         est un Mot) ; et les refus de {@link #televerser}, dont ceux de l'Album d'origine
     */
    @Transactional
    public ImageMesMotsVue ajouterDansMesMots(AjouterImageCommande commande) {
        TypeImage type = commande.typeImage();
        if (type == null) {
            throw new ErreurMetier(400, CODE_REQUETE_INVALIDE, "Le type d'image est obligatoire");
        }
        String forme = Lexique.normaliser(commande.mot());
        if (forme.isEmpty() || forme.length() > Lexique.LONGUEUR_MAX_FORME) {
            throw new ErreurMetier(400, CODE_MOT_INVALIDE,
                    "Le mot doit compter de 1 à " + Lexique.LONGUEUR_MAX_FORME + " caractères");
        }
        MotVue mot = lexique.obtenirOuCreerMot(commande.mot());
        SensVue sens = usages.sensParDefaut(mot.id());
        // Sans Préparation, aucune Section d'office (story 2.11).
        ImageVue image = televerser(new TeleverserImageCommande(commande.fichier(), sens.id(), type,
                commande.licence(), commande.source(), commande.auteur(), commande.albumId(), null, null));
        return new ImageMesMotsVue(image, mot, sens);
    }

    /**
     * Crée l'Image téléversée et son fichier, déjà réduit. La licence suit le type : {@code droits_auteur_enseignant}
     * pour une photo personnelle, {@code usage_pedagogique_album} pour une image d'album ; pour une image libre ou de
     * type inconnu, celle de la commande, facultative, parmi les six du Sélecteur de licence. Une image libre sans
     * source ou sans licence est enregistrée, marquée {@code aCompleter}. Seule une image d'album reçoit un Album
     * d'origine, qui doit exister ({@code referentiels}) ; l'Album de la commande est ignoré pour un autre type.
     * L'Image vise d'office la Section de la commande, s'il y en a une (story 2.11), modifiable ensuite par
     * {@link #classer}. Une Image créée depuis un pictogramme ARASAAC garde son identifiant ARASAAC
     * ({@link TeleverserImageCommande#arasaacId}), qui ne change plus ensuite (story 2.11).
     *
     * @throws ErreurMetier {@code 400 requete.invalide} si le type manque, si la licence ne peut pas être choisie pour
     *         ce type, ou si la source ou l'auteur dépassent {@value #LONGUEUR_MAX_TEXTE} caractères ;
     *         {@code 400 image.album_requis} pour une image d'album sans Album d'origine ;
     *         {@code 400 image.album_introuvable} si cet Album n'existe pas
     * @throws IllegalArgumentException si le fichier manque ou n'a pas été réduit pour ce type
     */
    @Transactional
    public ImageVue televerser(TeleverserImageCommande commande) {
        TypeImage type = commande.typeImage();
        if (type == null) {
            throw new ErreurMetier(400, CODE_REQUETE_INVALIDE, "Le type d'image est obligatoire");
        }
        ImageReduiteVue fichier = commande.fichier();
        if (fichier == null || Math.max(fichier.largeur(), fichier.hauteur()) > ReductionImages.coteMaximal(type)) {
            throw new IllegalArgumentException("Fichier absent ou non réduit par ReductionImages pour le type " + type);
        }
        UUID albumId = albumDOrigine(type, commande.albumId());
        Licence licence = licence(type, commande.licence());
        String source = texte(commande.source(), "source");
        String auteur = texte(commande.auteur(), "auteur");
        UUID proprietaire = enseignantCourant.id();
        Image image = Image.nouvelle(images.nouvelIdentifiant(), proprietaire, commande.sensId(), TYPE_MEDIA_IMAGE,
                type.valeur(), licence == null ? null : licence.valeur(), source, auteur, albumId,
                EtatImage.PRIVEE.valeur(), commande.arasaacId());
        if (commande.section() != null) {
            image.classer(Set.of(commande.section()), null, Set.of());
        }
        images.persist(image);
        fichiers.persist(ImageFichier.nouveau(image.id(), fichier.octets(), fichier.miniature(), fichier.typeMime(),
                fichier.largeur(), fichier.hauteur()));
        images.flush();
        return vue(image, proprietaire, visibilite);
    }

    /**
     * Album d'origine d'une Image de ce type : celui demandé pour une image d'album, après vérification de son
     * existence ; {@code null} pour tout autre type, quel que soit l'Album demandé.
     *
     * @throws ErreurMetier {@code 400 image.album_requis} pour une image d'album sans Album ;
     *         {@code 400 image.album_introuvable} si cet Album n'existe pas
     */
    private UUID albumDOrigine(TypeImage type, UUID albumId) {
        if (type != TypeImage.IMAGE_ALBUM) {
            return null;
        }
        if (albumId == null) {
            throw new ErreurMetier(400, CODE_ALBUM_REQUIS, "Une image d'album exige son Album d'origine");
        }
        return referentiels.album(albumId)
                .orElseThrow(() -> new ErreurMetier(400, CODE_ALBUM_INTROUVABLE,
                        "Aucun album ne porte cet identifiant"))
                .id();
    }

    /** Licence d'une Image de ce type : imposée par le type, ou choisie dans le Sélecteur de licence. */
    private static Licence licence(TypeImage type, Licence demandee) {
        return switch (type) {
            case PHOTO_PERSONNELLE -> Licence.DROITS_AUTEUR_ENSEIGNANT;
            case IMAGE_ALBUM -> Licence.USAGE_PEDAGOGIQUE_ALBUM;
            case IMAGE_LIBRE, INCONNU -> {
                if (demandee != null && !demandee.choisissable()) {
                    throw new ErreurMetier(400, CODE_REQUETE_INVALIDE,
                            "La licence " + demandee.valeur() + " ne se choisit pas pour le type " + type.valeur());
                }
                yield demandee;
            }
        };
    }

    /** Texte rogné, {@code null} s'il est vide. */
    private static String texte(String saisie, String champ) {
        if (saisie == null || saisie.isBlank()) {
            return null;
        }
        String rogne = saisie.strip();
        if (rogne.length() > LONGUEUR_MAX_TEXTE) {
            throw new ErreurMetier(400, CODE_REQUETE_INVALIDE,
                    "Le champ " + champ + " dépasse " + LONGUEUR_MAX_TEXTE + " caractères");
        }
        return rogne;
    }

    /**
     * Page de la Banque de l'enseignant courant pour la provenance {@code provenance} (FR-18) : les Images retenues par
     * le critère de {@link VisibiliteImages#critereBanque} (AD-2) et par les {@code filtres} (FR-15, voir
     * {@link #conditionFiltres}), filtrées, comptées et paginées en base, avec leur Mot, leur Sens et leurs Sections lus
     * dans la même requête. Les filtres ne font que restreindre ce que la provenance montre. Ordre : forme du Mot (sans
     * casse ni accents), Sens, Image la plus récente d'abord, identifiant. Lecture seule ; n'appelle aucun autre module.
     */
    @Transactional
    public PageImagesBanqueVue banque(ProvenanceImages provenance, FiltresBanqueCommande filtres,
            Pagination pagination) {
        UUID enseignantId = enseignantCourant.id();
        if (enseignantId == null || provenance == null) {
            return new PageImagesBanqueVue(List.of(), 0);
        }
        VisibiliteImages.CritereImages critere = visibilite.critereBanque(provenance, enseignantId);
        ConditionFiltres restriction = conditionFiltres(provenance,
                filtres == null ? FiltresBanqueCommande.AUCUN : filtres, enseignantId);
        String condition = restriction.condition().isEmpty() ? critere.condition()
                : critere.condition() + " and " + restriction.condition();
        // conditionFiltres entoure son bloc de parenthèses : aucun « or » d'un filtre n'élargit la visibilité (AD-2).
        Map<String, Object> parametres = new HashMap<>(critere.parametres());
        restriction.parametres().forEach((nom, valeur) -> {
            if (parametres.putIfAbsent(nom, valeur) != null) {
                throw new IllegalStateException("Paramètre de filtre homonyme d'un paramètre de visibilité : " + nom);
            }
        });
        long total = images.nombreBanque(condition, parametres);
        if (total <= pagination.decalage()) {
            return new PageImagesBanqueVue(List.of(), total);
        }
        List<ImageBanqueVue> elements = images.pageBanque(condition, parametres, pagination.decalage(),
                pagination.taille()).stream()
                .map(ligne -> imageBanque(ligne, enseignantId))
                .toList();
        return new PageImagesBanqueVue(elements, total);
    }

    /**
     * Propriétaires proposables dans le filtre propriétaire de la Banque (FR-15), par identifiant, sans nom (AD-20) :
     * l'enseignant courant d'abord, toujours, puis les collègues qui ont au moins une Image {@code versee}
     * ({@link VisibiliteImages#critereAyantVerse}). Un collègue qui n'a rien versé n'est jamais nommé. Lecture seule.
     */
    @Transactional
    public List<UUID> proprietairesBanque() {
        UUID enseignantId = enseignantCourant.id();
        if (enseignantId == null) {
            return List.of();
        }
        VisibiliteImages.CritereImages critere = visibilite.critereAyantVerse();
        List<UUID> proprietaires = new ArrayList<>();
        proprietaires.add(enseignantId);
        images.proprietairesBanque(critere.condition(), critere.parametres()).stream()
                .filter(proprietaire -> !proprietaire.equals(enseignantId))
                .forEach(proprietaires::add);
        return List.copyOf(proprietaires);
    }

    /**
     * Conditions SQL des filtres de la Banque (FR-15), sur la table {@code image} sous l'alias {@code i}, combinées en ET
     * et entourées de parenthèses, avec leurs paramètres nommés {@code filtre…} ; condition vide si aucun filtre. Aucun texte saisi n'entre dans le
     * SQL : toute valeur passe par un paramètre. Ces conditions s'ajoutent en ET au critère de visibilité et ne
     * l'élargissent jamais (AD-2).
     * <ul>
     *   <li>Mot : le Mot exact de la saisie, avec la tolérance de la détection ({@link Lexique#cleDeRecherche}, comparée
     *       à {@code mot.forme_recherche} par {@code unaccent}) ; une saisie vide ou réduite à un article ne filtre
     *       pas.</li>
     *   <li>Section : cochée sur l'Image ; sous Mes mots, ou celle d'un lien de l'enseignant vers l'Image (Préparation
     *       de cette Section). Le lien d'un collègue ne compte jamais.</li>
     *   <li>Album : Album d'origine d'une image d'album, ou celui d'un lien de l'enseignant vers l'Image (Préparation
     *       de cet Album), sous toute provenance (story 3.7). Le lien d'un collègue ne compte jamais.</li>
     *   <li>Module, Thème, type, propriétaire, Sens et catégorie du Sens : égalité.</li>
     * </ul>
     */
    static ConditionFiltres conditionFiltres(ProvenanceImages provenance, FiltresBanqueCommande filtres,
            UUID enseignantId) {
        List<String> conditions = new ArrayList<>();
        Map<String, Object> parametres = new HashMap<>();
        Lexique.cleDeRecherche(filtres.mot()).ifPresent(cle -> {
            conditions.add("exists (select 1 from sens fs join mot fm on fm.id = fs.mot_id"
                    + " where fs.id = i.sens_id and fm.forme_recherche = unaccent(:filtreMot))");
            parametres.put("filtreMot", cle);
        });
        if (filtres.sensId() != null) {
            conditions.add("i.sens_id = :filtreSens");
            parametres.put("filtreSens", filtres.sensId());
        }
        if (filtres.section() != null) {
            String cochee = "exists (select 1 from image_section fse where fse.image_id = i.id"
                    + " and fse.section = :filtreSection)";
            if (provenance == ProvenanceImages.MES_MOTS) {
                conditions.add("(" + cochee + " or exists (select 1 from lien_image fl where fl.image_id = i.id"
                        + " and fl.enseignant_id = :filtreEnseignant and fl.section = :filtreSection))");
                parametres.put("filtreEnseignant", enseignantId);
            } else {
                conditions.add(cochee);
            }
            parametres.put("filtreSection", filtres.section().valeur());
        }
        if (filtres.albumId() != null) {
            // Album d'origine d'une image d'album, ou lien de l'enseignant dans une Préparation de cet Album, quelle
            // que soit la provenance (story 3.7) ; le lien d'un collègue ne compte jamais.
            conditions.add("((i.album_id = :filtreAlbum and i.type_image = :filtreTypeAlbum)"
                    + " or exists (select 1 from lien_image fla where fla.image_id = i.id"
                    + " and fla.enseignant_id = :filtreEnseignant and fla.album_id = :filtreAlbum))");
            parametres.put("filtreEnseignant", enseignantId);
            parametres.put("filtreAlbum", filtres.albumId());
            parametres.put("filtreTypeAlbum", TypeImage.IMAGE_ALBUM.valeur());
        }
        if (filtres.moduleId() != null) {
            conditions.add("i.module_id = :filtreModule");
            parametres.put("filtreModule", filtres.moduleId());
        }
        if (filtres.themeId() != null) {
            conditions.add("exists (select 1 from image_theme fth where fth.image_id = i.id"
                    + " and fth.theme_id = :filtreTheme)");
            parametres.put("filtreTheme", filtres.themeId());
        }
        if (filtres.categorie() != null) {
            conditions.add("exists (select 1 from sens fsc where fsc.id = i.sens_id"
                    + " and fsc.categorie = :filtreCategorie)");
            parametres.put("filtreCategorie", filtres.categorie().valeur());
        }
        if (filtres.typeImage() != null) {
            conditions.add("i.type_image = :filtreType");
            parametres.put("filtreType", filtres.typeImage().valeur());
        }
        if (filtres.proprietaireId() != null) {
            conditions.add("i.proprietaire_id = :filtreProprietaire");
            parametres.put("filtreProprietaire", filtres.proprietaireId());
        }
        return new ConditionFiltres(conditions.isEmpty() ? "" : "(" + String.join(" and ", conditions) + ")",
                Map.copyOf(parametres));
    }

    /** Conditions des filtres de la Banque et leurs paramètres nommés, produites par {@link #conditionFiltres}. */
    record ConditionFiltres(String condition, Map<String, Object> parametres) {
    }

    private ImageBanqueVue imageBanque(ImageBanqueLigne ligne, UUID enseignantId) {
        ImageVue image = vue(ligne.id(), ligne.proprietaireId(), ligne.etat(), ligne.typeImage(), ligne.licence(),
                ligne.source(), ligne.retraitAdmin(), enseignantId, visibilite);
        List<Section> sections = ligne.sections() == null ? List.of()
                : Arrays.stream(ligne.sections().split(","))
                        .map(valeur -> Section.deValeur(valeur)
                                .orElseThrow(() -> new IllegalStateException("Section inconnue : " + valeur)))
                        .sorted()
                        .toList();
        return new ImageBanqueVue(image, sections, new MotVue(ligne.motId(), ligne.forme()),
                new SensVue(ligne.sensId(), ligne.motId(), ligne.sensLibelle(), ligne.categorie()));
    }

    /**
     * Image vue par l'enseignant {@code enseignantId} : {@code reutilisable} vient de {@link VisibiliteImages},
     * {@code versabilite} de {@link Versabilite#de}, pour le propriétaire d'une Image {@code privee} seulement ;
     * {@code aRemplacer} de {@link VisibiliteImages#aRemplacer}.
     */
    static ImageVue vue(Image image, UUID enseignantId, VisibiliteImages visibilite) {
        return vue(image.id(), image.proprietaireId(), image.etat(), image.typeImage(), image.licence(),
                image.source(), image.retraitAdminMotif() != null, enseignantId, visibilite);
    }

    private static ImageVue vue(UUID id, UUID proprietaireId, String valeurEtat, String valeurType, String licence,
            String source, boolean retraitAdmin, UUID enseignantId, VisibiliteImages visibilite) {
        TypeImage type = TypeImage.deValeur(valeurType)
                .orElseThrow(() -> new IllegalStateException("Type inconnu de l'Image " + id));
        EtatImage etat = EtatImage.deValeur(valeurEtat)
                .orElseThrow(() -> new IllegalStateException("État inconnu de l'Image " + id));
        boolean aCompleter = type == TypeImage.IMAGE_LIBRE && (source == null || licence == null);
        boolean proprietaire = proprietaireId != null && proprietaireId.equals(enseignantId);
        Versabilite versabilite = proprietaire && etat == EtatImage.PRIVEE
                ? versabilite(type, licence, source, retraitAdmin, id)
                : null;
        return new ImageVue(id, proprietaireId, etat, visibilite.aRemplacer(proprietaireId, etat, enseignantId),
                visibilite.proposable(proprietaireId, etat, enseignantId),
                type, aCompleter, versabilite);
    }

    /** Versabilité d'une Image (AD-4) par {@link Versabilite#de}, à partir des valeurs en base. */
    static Versabilite versabilite(Image image) {
        TypeImage type = TypeImage.deValeur(image.typeImage())
                .orElseThrow(() -> new IllegalStateException("Type inconnu de l'Image " + image.id()));
        return versabilite(type, image.licence(), image.source(), image.retraitAdminMotif() != null, image.id());
    }

    private static Versabilite versabilite(TypeImage type, String licence, String source, boolean retraitAdmin,
            UUID id) {
        Licence connue = licence == null ? null
                : Licence.deValeur(licence)
                        .orElseThrow(() -> new IllegalStateException("Licence inconnue de l'Image " + id));
        return Versabilite.de(type, connue, source, retraitAdmin);
    }
}
