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

        Comparator<Image> classement = Comparator
                .comparing((Image image) -> !image.sections().contains(section))
                .thenComparing(image -> !lieesAilleurs.contains(image.id()))
                .thenComparing(image -> !enseignant.equals(image.proprietaireId()))
                .thenComparing(Image::creeLe, Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(Image::id, Comparator.reverseOrder());
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
            if (imagesDuMot.isEmpty() && retenusDuMot.isEmpty()) {
                continue;
            }
            Set<UUID> sensVisibles = new LinkedHashSet<>();
            imagesDuMot.forEach(image -> sensVisibles.add(image.sensId()));
            retenusDuMot.forEach(retenu -> sensVisibles.add(retenu.sensId()));
            List<SensProposeVue> sensDuMot = sensVisibles.stream()
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
                    .map(image -> new ImageDetecteeVue(Images.vue(image, enseignant, visibilite),
                            image.sections().stream().sorted().toList(),
                            albumDOrigine(image) == null ? null : albums.get(albumDOrigine(image)),
                            propose(sensParId.get(image.sensId())), dejaUtilisees.contains(image.id())))
                    .toList();
            detectes.add(new MotDetecteVue(new MotVue(mot.id(), mot.forme()), sensDuMot, albumsMontres,
                    imagesMontrees));
        }
        return new DetectionVue(forme, detectes);
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
