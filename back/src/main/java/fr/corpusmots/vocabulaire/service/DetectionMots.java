package fr.corpusmots.vocabulaire.service;

import fr.corpusmots.commun.api.ErreurMetier;
import fr.corpusmots.commun.service.EnseignantCourant;
import fr.corpusmots.commun.service.Section;
import fr.corpusmots.referentiels.service.AlbumVue;
import fr.corpusmots.referentiels.service.ReferentielsService;
import fr.corpusmots.vocabulaire.persistance.Image;
import fr.corpusmots.vocabulaire.persistance.ImageRepository;
import fr.corpusmots.vocabulaire.persistance.LienImageRepository;
import fr.corpusmots.vocabulaire.persistance.Mot;
import fr.corpusmots.vocabulaire.persistance.MotRepository;
import fr.corpusmots.vocabulaire.persistance.Sens;
import fr.corpusmots.vocabulaire.persistance.SensRepository;
import fr.corpusmots.vocabulaire.persistance.SensRetenu;
import fr.corpusmots.vocabulaire.persistance.SensRetenuRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.text.Collator;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Détection pendant la frappe (FR-8, FR-9, story 2.7) : Mots existants de même forme que la saisie, sans casse ni
 * accents, et ce que l'enseignant courant peut en voir. Lecture seule : aucun Mot, Sens ni Sens retenu n'est écrit
 * (AD-19), {@link Lexique#obtenirOuCreerMot} n'est jamais appelée.
 *
 * <p>Un Mot n'est montré que s'il porte une Image {@link VisibiliteImages#proposable proposable} à l'enseignant ou
 * figure dans l'une de ses Préparations (un Sens retenu) ; sinon, même s'il existe dans Mes mots d'un collègue, il
 * reste absent et la saisie est présentée comme un Mot nouveau (AD-2). Les Albums des Préparations d'un collègue ne
 * sont jamais montrés.
 *
 * <p>Classement des Images (FR-9), calculé ici seulement : celles qui cochent la Section de la Préparation d'abord ; à
 * Section égale, celles déjà liées dans un autre Album que celui de la Préparation (lien de n'importe quel enseignant,
 * donc à leur Sens) ; puis celles de l'enseignant avant celles des collègues ; enfin les plus récentes.
 */
@ApplicationScoped
public class DetectionMots {

    static final String CODE_REQUETE_INVALIDE = "requete.invalide";

    /** Longueur minimale de la saisie normalisée pour lancer une détection. */
    public static final int LONGUEUR_MIN_SAISIE = 2;

    @Inject
    MotRepository mots;

    @Inject
    SensRepository sens;

    @Inject
    SensRetenuRepository sensRetenus;

    @Inject
    ImageRepository images;

    @Inject
    LienImageRepository liens;

    @Inject
    VisibiliteImages visibilite;

    @Inject
    EnseignantCourant enseignantCourant;

    @Inject
    ReferentielsService referentiels;

    /**
     * Détecte les Mots de la forme de {@code saisie} pour une Préparation de l'Album {@code albumId} et de la Section
     * {@code section}, que l'appelant a vérifiée comme étant une Préparation de l'enseignant courant.
     *
     * @throws ErreurMetier {@code 400 requete.invalide} si la saisie normalisée par {@link Lexique#normaliser} compte
     *         moins de {@value #LONGUEUR_MIN_SAISIE} ou plus de {@value Lexique#LONGUEUR_MAX_FORME} caractères
     */
    @Transactional
    public DetectionVue detecter(String saisie, UUID albumId, Section section) {
        String forme = Lexique.normaliser(saisie);
        if (forme.length() < LONGUEUR_MIN_SAISIE || forme.length() > Lexique.LONGUEUR_MAX_FORME) {
            throw new ErreurMetier(400, CODE_REQUETE_INVALIDE, "La saisie doit compter de " + LONGUEUR_MIN_SAISIE
                    + " à " + Lexique.LONGUEUR_MAX_FORME + " caractères");
        }
        UUID enseignant = enseignantCourant.id();
        List<Mot> trouves = mots.parFormeRecherche(Lexique.cle(forme));
        if (enseignant == null || trouves.isEmpty()) {
            return new DetectionVue(forme, List.of());
        }
        return new DetectionVue(forme, detectes(trouves, albumId, section, enseignant, false, null));
    }

    /**
     * Propositions d'Images pour le Mot {@code motId}, qui figure dans une Préparation de l'enseignant courant de
     * l'Album {@code albumId} et de la Section {@code section} (Panneau de choix d'Image, story 2.7) : ses Sens visibles,
     * ses Albums et ses Images {@link VisibiliteImages#proposable proposables}, classées comme la détection : celles du
     * Sens {@code sensId} seulement s'il est donné (story 2.8), sinon celles de tous ses Sens. La liste des Sens visibles
     * reste complète. Lecture seule. L'appelant a vérifié que le Mot est celui d'une Préparation de l'enseignant courant.
     *
     * @throws IllegalArgumentException si le Mot n'existe pas
     */
    @Transactional
    public MotDetecteVue propositions(UUID motId, UUID albumId, Section section, UUID sensId) {
        UUID enseignant = enseignantCourant.id();
        List<Mot> trouves = motId == null ? List.of() : mots.lire(List.of(motId));
        if (trouves.isEmpty()) {
            throw new IllegalArgumentException("Mot " + motId + " introuvable");
        }
        if (enseignant == null) {
            Mot mot = trouves.get(0);
            return new MotDetecteVue(new MotVue(mot.id(), mot.forme()), List.of(), List.of(), List.of());
        }
        return detectes(trouves, albumId, section, enseignant, true, sensId).get(0);
    }

    /**
     * Vrai si {@code sensId} est un Sens du Mot {@code motId} visible de l'enseignant courant, selon la règle de la
     * détection ({@link #sensVisibles}) : il porte une Image {@link VisibiliteImages#proposable proposable} ou
     * l'enseignant l'a retenu dans l'une de ses Préparations (AD-2). Lecture seule.
     */
    @Transactional
    public boolean sensVisible(UUID motId, UUID sensId) {
        UUID enseignant = enseignantCourant.id();
        if (enseignant == null || motId == null || sensId == null
                || sens.deMots(List.of(motId)).stream().noneMatch(duMot -> sensId.equals(duMot.id()))) {
            return false;
        }
        List<Image> proposables = images.deSensAvecSections(Set.of(sensId)).stream()
                .filter(image -> visibilite.proposable(image, enseignant))
                .toList();
        List<SensRetenu> retenus = sensRetenus.deMots(enseignant, List.of(motId));
        return sensVisibles(proposables, retenus).contains(sensId);
    }

    /**
     * Règle unique des Sens visibles d'un Mot (AD-2) : les Sens de ses Images proposables à l'enseignant, puis ceux qu'il
     * a retenus dans ses Préparations.
     */
    private static Set<UUID> sensVisibles(List<Image> imagesProposables, List<SensRetenu> retenus) {
        Set<UUID> visibles = new LinkedHashSet<>();
        imagesProposables.forEach(image -> visibles.add(image.sensId()));
        retenus.forEach(retenu -> visibles.add(retenu.sensId()));
        return visibles;
    }

    /**
     * Calcul commun de la détection et des propositions : pour chacun de ces Mots, par forme, ses Sens visibles, ses
     * Albums et ses Images proposables classées. Un Mot sans Image proposable ni Sens retenu par l'enseignant est omis,
     * sauf si {@code garderTous}. Si {@code sensFiltre} est donné, seules les Images de ce Sens sont montrées ; Sens
     * visibles et Albums restent complets.
     */
    private List<MotDetecteVue> detectes(List<Mot> trouves, UUID albumId, Section section, UUID enseignant,
            boolean garderTous, UUID sensFiltre) {
        List<UUID> motIds = trouves.stream().map(Mot::id).toList();
        Map<UUID, Sens> sensParId = sens.deMots(motIds).stream()
                .collect(Collectors.toMap(Sens::id, Function.identity()));
        List<Image> proposables = images.deSensAvecSections(sensParId.keySet()).stream()
                .filter(image -> visibilite.proposable(image, enseignant))
                .toList();
        List<SensRetenu> retenus = sensRetenus.deMots(enseignant, motIds);
        List<UUID> imageIds = proposables.stream().map(Image::id).toList();
        Set<UUID> lieesAilleurs = liens.lieesHorsAlbum(imageIds, albumId);
        Set<UUID> dejaUtilisees = liens.lieesPar(imageIds, enseignant);
        Set<UUID> albumIds = new HashSet<>();
        proposables.stream().map(DetectionMots::albumDOrigine).filter(Objects::nonNull).forEach(albumIds::add);
        retenus.stream().map(SensRetenu::albumId).forEach(albumIds::add);
        Map<UUID, AlbumVue> albums = referentiels.albums(albumIds);

        Comparator<Image> classement = classement(section, lieesAilleurs, enseignant);
        Collator collation = Collator.getInstance(Locale.FRENCH);
        List<MotDetecteVue> detectes = new ArrayList<>();
        for (Mot mot : trouves.stream()
                .sorted(Comparator.comparing(Mot::forme, collation).thenComparing(Mot::id)).toList()) {
            List<Image> imagesDuMot = proposables.stream()
                    .filter(image -> mot.id().equals(sensParId.get(image.sensId()).motId()))
                    .sorted(classement)
                    .toList();
            List<SensRetenu> retenusDuMot = retenus.stream()
                    .filter(retenu -> mot.id().equals(sensParId.get(retenu.sensId()).motId()))
                    .toList();
            if (!garderTous && imagesDuMot.isEmpty() && retenusDuMot.isEmpty()) {
                continue;
            }
            List<SensProposeVue> sensDuMot = sensVisibles(imagesDuMot, retenusDuMot).stream()
                    .map(id -> propose(sensParId.get(id)))
                    .sorted(Comparator.comparing(SensProposeVue::aCompleter)
                            .thenComparing(propose -> propose.sens().libelle(), collation)
                            .thenComparing(propose -> propose.sens().id()))
                    .toList();
            Set<UUID> albumsDuMot = new HashSet<>();
            imagesDuMot.stream().map(DetectionMots::albumDOrigine).filter(Objects::nonNull).forEach(albumsDuMot::add);
            retenusDuMot.forEach(retenu -> albumsDuMot.add(retenu.albumId()));
            List<AlbumVue> albumsMontres = albumsDuMot.stream()
                    .map(albums::get)
                    .filter(Objects::nonNull)
                    .sorted(Comparator.comparing(AlbumVue::titre, collation).thenComparing(AlbumVue::id))
                    .toList();
            List<ImageDetecteeVue> imagesMontrees = imagesDuMot.stream()
                    .filter(image -> sensFiltre == null || sensFiltre.equals(image.sensId()))
                    .map(image -> imageDetectee(image, enseignant, albums, sensParId, dejaUtilisees))
                    .toList();
            detectes.add(new MotDetecteVue(new MotVue(mot.id(), mot.forme()), sensDuMot, albumsMontres,
                    imagesMontrees));
        }
        return detectes;
    }

    /**
     * Mots déjà illustrés pour l'Album {@code albumId} (Encart de la Préparation {@code preparationId}, story 2.9), par
     * forme. Les Sens liés à l'Album d'un Mot sont ceux de ses Images {@link VisibiliteImages#proposable proposables}
     * dont l'Album d'origine est cet Album, et ceux que l'enseignant courant a retenus pour ce Mot dans ses autres
     * Préparations de cet Album, quand ce Mot y porte une Image ; jamais ceux des Préparations d'un collègue (AD-2). Un
     * Mot est candidat s'il a au moins une Image proposable d'un Sens lié ; son Image proposée est la première de
     * celles-ci selon le classement de la détection pour la Section {@code section}. Les Mots de {@code exclus} (déjà
     * dans la Préparation, écartés) sont omis. Lecture seule ; liste vide sans Album.
     */
    @Transactional
    public List<MotDejaIllustreVue> motsDejaIllustres(UUID albumId, Section section, UUID preparationId,
            Set<UUID> exclus) {
        UUID enseignant = enseignantCourant.id();
        if (enseignant == null || albumId == null) {
            return List.of();
        }
        Set<UUID> sensLies = new HashSet<>();
        images.dAlbumDOrigineAvecSections(albumId, TypeImage.IMAGE_ALBUM.valeur()).stream()
                .filter(image -> albumId.equals(albumDOrigine(image)))
                .filter(image -> visibilite.proposable(image, enseignant))
                .forEach(image -> sensLies.add(image.sensId()));
        sensLies.addAll(sensRetenus.sensIllustresDansLAlbum(enseignant, albumId, preparationId));
        Map<UUID, Sens> sensParId = sens.lire(sensLies).stream()
                .filter(lie -> !exclus.contains(lie.motId()))
                .collect(Collectors.toMap(Sens::id, Function.identity()));
        List<Image> proposables = images.deSensAvecSections(sensParId.keySet()).stream()
                .filter(image -> visibilite.proposable(image, enseignant))
                .toList();
        if (proposables.isEmpty()) {
            return List.of();
        }
        List<UUID> imageIds = proposables.stream().map(Image::id).toList();
        Comparator<Image> classement = classement(section, liens.lieesHorsAlbum(imageIds, albumId), enseignant);
        Map<UUID, Image> proposeeParMot = new HashMap<>();
        proposables.forEach(image -> proposeeParMot.merge(sensParId.get(image.sensId()).motId(), image,
                (une, autre) -> classement.compare(une, autre) <= 0 ? une : autre));
        Set<UUID> dejaUtilisees = liens.lieesPar(imageIds, enseignant);
        Set<UUID> albumIds = new HashSet<>();
        proposeeParMot.values().stream().map(DetectionMots::albumDOrigine).filter(Objects::nonNull)
                .forEach(albumIds::add);
        Map<UUID, AlbumVue> albums = referentiels.albums(albumIds);
        Collator collation = Collator.getInstance(Locale.FRENCH);
        return mots.lire(proposeeParMot.keySet()).stream()
                .sorted(Comparator.comparing(Mot::forme, collation).thenComparing(Mot::id))
                .map(mot -> {
                    Image image = proposeeParMot.get(mot.id());
                    return new MotDejaIllustreVue(new MotVue(mot.id(), mot.forme()),
                            Lexique.vue(sensParId.get(image.sensId())),
                            imageDetectee(image, enseignant, albums, sensParId, dejaUtilisees));
                })
                .toList();
    }

    /**
     * Classement des Images (FR-9), seul et partagé : Section {@code section} d'abord ; à Section égale, Images liées
     * dans un autre Album ({@code lieesAilleurs}) ; puis celles de l'enseignant ; enfin les plus récentes.
     */
    private static Comparator<Image> classement(Section section, Set<UUID> lieesAilleurs, UUID enseignant) {
        return Comparator
                .comparing((Image image) -> !image.sections().contains(section))
                .thenComparing(image -> !lieesAilleurs.contains(image.id()))
                .thenComparing(image -> !enseignant.equals(image.proprietaireId()))
                .thenComparing(Image::creeLe, Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(Image::id, Comparator.reverseOrder());
    }

    private ImageDetecteeVue imageDetectee(Image image, UUID enseignant, Map<UUID, AlbumVue> albums,
            Map<UUID, Sens> sensParId, Set<UUID> dejaUtilisees) {
        UUID albumOrigine = albumDOrigine(image);
        return new ImageDetecteeVue(Images.vue(image, enseignant, visibilite),
                image.sections().stream().sorted().toList(), albumOrigine == null ? null : albums.get(albumOrigine),
                propose(sensParId.get(image.sensId())), dejaUtilisees.contains(image.id()));
    }

    private static SensProposeVue propose(Sens sens) {
        SensVue vue = Lexique.vue(sens);
        return new SensProposeVue(vue, Usages.aCompleter(vue));
    }

    /** Album d'origine de l'Image : seule une image d'album en a un, même si une autre ligne porte un album_id. */
    private static UUID albumDOrigine(Image image) {
        return TypeImage.IMAGE_ALBUM.valeur().equals(image.typeImage()) ? image.albumId() : null;
    }
}
