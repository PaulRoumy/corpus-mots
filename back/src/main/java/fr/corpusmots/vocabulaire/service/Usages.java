package fr.corpusmots.vocabulaire.service;

import fr.corpusmots.commun.api.ErreurMetier;
import fr.corpusmots.commun.service.EnseignantCourant;
import fr.corpusmots.vocabulaire.persistance.Image;
import fr.corpusmots.vocabulaire.persistance.ImageRepository;
import fr.corpusmots.vocabulaire.persistance.LienImage;
import fr.corpusmots.vocabulaire.persistance.LienImageRepository;
import fr.corpusmots.vocabulaire.persistance.SensRetenu;
import fr.corpusmots.vocabulaire.persistance.SensRetenuRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.util.Collection;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Registre des usages (AD-14) : seul point d'écriture de {@code sens_retenu} et de {@code lien_image}. Appelé par
 * {@code preparations} dans sa transaction, qu'il rejoint (AD-17). L'enseignant est l'enseignant courant, lu dans le
 * jeton (AD-6).
 */
@ApplicationScoped
public class Usages {

    /** Libellé du Sens par défaut d'un Mot pour lequel l'enseignant n'a encore retenu aucun Sens. */
    static final String LIBELLE_A_COMPLETER = "à compléter";

    static final String CODE_MOT_DEJA_ILLUSTRE = "preparation.mot_deja_illustre";
    static final String CODE_SENS_DIFFERENT = "image.sens_different";
    static final String CODE_INTROUVABLE = "ressource.introuvable";

    @Inject
    SensRetenuRepository sensRetenus;

    @Inject
    LienImageRepository liens;

    @Inject
    ImageRepository images;

    @Inject
    VisibiliteImages visibilite;

    @Inject
    Lexique lexique;

    @Inject
    EnseignantCourant enseignantCourant;

    /**
     * Retient un Sens pour le Mot que la commande ajoute à une Préparation de l'enseignant courant : le Sens imposé par
     * la commande s'il y en a un ; sinon le Sens qu'il a retenu le plus récemment pour ce Mot dans ses Préparations ;
     * sinon le Sens « à compléter » du Mot (sans catégorie), obtenu ou créé. Jamais le Sens retenu par un collègue
     * (AD-2).
     *
     * @throws IllegalArgumentException si le Sens imposé n'est pas un Sens de ce Mot : l'appelant le vérifie avant par
     *         {@link Lexique#sensDuMot}
     */
    @Transactional
    public SensVue retenirSens(RetenirSensCommande commande) {
        UUID enseignant = enseignantCourant.id();
        SensVue retenu = commande.sensId() != null
                ? lexique.sensDuMot(commande.motId(), commande.sensId())
                        .orElseThrow(() -> new IllegalArgumentException("Le Sens " + commande.sensId()
                                + " n'est pas un Sens du Mot " + commande.motId()))
                : sensParDefaut(commande.motId());
        sensRetenus.persist(SensRetenu.nouveau(sensRetenus.nouvelIdentifiant(), commande.preparationId(),
                commande.preparationMotId(), retenu.id(), enseignant, commande.albumId(), commande.section()));
        return retenu;
    }

    /**
     * Sens par défaut du Mot {@code motId} pour l'enseignant courant : celui qu'il a retenu le plus récemment pour ce
     * Mot dans ses Préparations, sinon le Sens « à compléter » du Mot (sans catégorie), obtenu ou créé. Jamais le Sens
     * retenu par un collègue (AD-2). N'écrit aucun Sens retenu.
     */
    @Transactional
    public SensVue sensParDefaut(UUID motId) {
        return sensRetenus.dernierRetenu(enseignantCourant.id(), motId)
                .map(Lexique::vue)
                .orElseGet(() -> lexique.obtenirOuCreerSens(motId, LIBELLE_A_COMPLETER, null));
    }

    /** Identifiants des Sens du Mot {@code motId} que l'enseignant courant a retenus dans l'une de ses Préparations. */
    @Transactional
    public Set<UUID> sensRetenusDuMot(UUID motId) {
        UUID enseignant = enseignantCourant.id();
        return enseignant == null || motId == null ? Set.of() : sensRetenus.sensRetenusDuMot(enseignant, motId);
    }

    /** Vrai pour le Sens par défaut « à compléter » d'un Mot. */
    static boolean aCompleter(SensVue sens) {
        return LIBELLE_A_COMPLETER.equals(sens.libelle());
    }

    /**
     * Lie l'Image de la commande au Mot de Préparation de l'enseignant courant. L'Image est verrouillée
     * ({@code SELECT … FOR UPDATE}, après la Préparation que l'appelant a verrouillée), puis doit lui être
     * {@link VisibiliteImages#proposable proposable} et illustrer le Sens retenu pour ce Mot (AD-5, AD-14).
     *
     * @return l'Image liée, vue par l'enseignant courant
     * @throws ErreurMetier {@code 404 ressource.introuvable} si l'Image n'existe pas ou ne lui est pas proposable ;
     *         {@code 400 image.sens_different} si elle illustre un autre Sens que le Sens retenu ;
     *         {@code 409 preparation.mot_deja_illustre} si le Mot a déjà une Image
     * @throws IllegalStateException si le Mot de Préparation n'a pas de Sens retenu
     */
    @Transactional
    public ImageVue lierImage(LierImageCommande commande) {
        UUID enseignant = enseignantCourant.id();
        Image image = imageProposable(commande.imageId(), enseignant)
                .orElseThrow(() -> new ErreurMetier(404, CODE_INTROUVABLE,
                        "Aucune image proposable ne porte cet identifiant"));
        if (!image.sensId().equals(sensRetenu(commande.preparationMotId()))) {
            throw new ErreurMetier(400, CODE_SENS_DIFFERENT, "Cette image illustre un autre sens que le sens retenu");
        }
        return lier(commande, image, enseignant);
    }

    /**
     * Lie l'Image de la commande au Mot de Préparation de l'enseignant courant si elle peut l'être, sans rien refuser :
     * mêmes contrôles que {@link #lierImage} (verrou, {@link VisibiliteImages#proposable proposable}, Sens retenu), mais
     * une Image absente, qui ne lui est plus proposable ou qui illustre un autre Sens n'est pas liée et le Mot reste
     * « à illustrer ». Sert au rétablissement d'un Mot retiré, sans exception qui marquerait la transaction en
     * annulation.
     *
     * @return l'Image liée, vue par l'enseignant courant ; vide si elle n'a pas été liée
     * @throws ErreurMetier {@code 409 preparation.mot_deja_illustre} si le Mot a déjà une Image
     * @throws IllegalStateException si le Mot de Préparation n'a pas de Sens retenu
     */
    @Transactional
    public Optional<ImageVue> lierImageSiPossible(LierImageCommande commande) {
        UUID enseignant = enseignantCourant.id();
        Optional<Image> image = imageProposable(commande.imageId(), enseignant);
        if (image.isEmpty() || !image.get().sensId().equals(sensRetenu(commande.preparationMotId()))) {
            return Optional.empty();
        }
        return Optional.of(lier(commande, image.get(), enseignant));
    }

    /** Image {@code imageId}, verrouillée, si elle existe et est proposable à l'enseignant. */
    private Optional<Image> imageProposable(UUID imageId, UUID enseignant) {
        return (imageId == null ? Optional.<Image>empty() : images.verrouillee(imageId))
                .filter(trouvee -> visibilite.proposable(trouvee, enseignant));
    }

    /** Sens retenu pour le Mot de Préparation {@code preparationMotId}. */
    private UUID sensRetenu(UUID preparationMotId) {
        return sensRetenus.sensIdDe(preparationMotId)
                .orElseThrow(() -> new IllegalStateException("Sens retenu du mot de préparation "
                        + preparationMotId + " introuvable"));
    }

    /** Écrit le lien, l'Image ayant passé les contrôles. */
    private ImageVue lier(LierImageCommande commande, Image image, UUID enseignant) {
        if (liens.existePourMot(commande.preparationMotId())) {
            throw new ErreurMetier(409, CODE_MOT_DEJA_ILLUSTRE, "Ce mot a déjà une image dans la préparation");
        }
        liens.persist(LienImage.nouveau(liens.nouvelIdentifiant(), commande.preparationId(),
                commande.preparationMotId(), image.id(), enseignant, commande.albumId(), commande.section(),
                commande.origine().valeur()));
        liens.flush();
        return Images.vue(image, enseignant, visibilite);
    }

    /**
     * Image liée à chacun de ces Mots de Préparation, vue par l'enseignant courant ; ceux qui n'en ont pas sont absents.
     * L'appelant a vérifié que ces Mots sont ceux d'une Préparation de l'enseignant courant : l'Image liée lui est
     * consultable dans cette Préparation (AD-2).
     */
    @Transactional
    public Map<UUID, ImageVue> imagesLiees(Collection<UUID> preparationMotIds) {
        UUID enseignant = enseignantCourant.id();
        return liens.imagesDe(preparationMotIds).entrySet().stream()
                .collect(Collectors.toMap(Map.Entry::getKey,
                        entree -> Images.vue(entree.getValue(), enseignant, visibilite)));
    }

    /**
     * Nombre de Mots illustrés de chacune de ces Préparations ; une Préparation sans Mot illustré est absente.
     * L'appelant a vérifié que ce sont des Préparations de l'enseignant courant.
     */
    @Transactional
    public Map<UUID, Integer> nombresIllustres(Collection<UUID> preparationIds) {
        return liens.compterParPreparation(preparationIds);
    }

    /**
     * Libère le Mot de Préparation {@code preparationMotId} avant que {@code preparations} ne supprime sa ligne : son
     * Sens retenu et son lien d'Image sont supprimés. Le Mot, ses Sens et l'Image restent. L'appelant a vérifié que ce
     * Mot est celui d'une Préparation de l'enseignant courant.
     */
    @Transactional
    public void libererPreparationMot(UUID preparationMotId) {
        liens.supprimerDe(preparationMotId);
        sensRetenus.supprimerDe(preparationMotId);
    }
}
