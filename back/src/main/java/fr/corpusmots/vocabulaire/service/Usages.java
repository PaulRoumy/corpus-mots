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
import java.util.HashSet;
import java.util.List;
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
    static final String CODE_IMAGE_INDISPONIBLE = "image.indisponible";
    static final String CODE_SENS_INVALIDE = "preparation.sens_invalide";

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
    DetectionMots detection;

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
     * @throws ErreurMetier {@code 404 image.indisponible} si l'Image n'existe pas ou ne lui est pas proposable ;
     *         {@code 400 image.sens_different} si elle illustre un autre Sens que le Sens retenu ;
     *         {@code 409 preparation.mot_deja_illustre} si le Mot a déjà une Image
     * @throws IllegalStateException si le Mot de Préparation n'a pas de Sens retenu
     */
    @Transactional
    public ImageVue lierImage(LierImageCommande commande) {
        UUID enseignant = enseignantCourant.id();
        Image image = imageProposable(commande.imageId(), enseignant)
                .orElseThrow(() -> new ErreurMetier(404, CODE_IMAGE_INDISPONIBLE,
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

    /**
     * Sens de l'Image {@code imageId} si elle existe et est {@link VisibiliteImages#proposable proposable} à
     * l'enseignant courant ; vide sinon. Lecture sans verrou ni écriture : {@link #lierImage} revérifie tout sous
     * verrou. Sert à retenir pour un Mot le Sens de l'Image choisie avant de la lier (story 2.7).
     */
    @Transactional
    public Optional<UUID> sensDImageProposable(UUID imageId) {
        UUID enseignant = enseignantCourant.id();
        if (imageId == null || enseignant == null) {
            return Optional.empty();
        }
        return images.sensProprietaireEtat(imageId)
                .filter(ligne -> EtatImage.deValeur((String) ligne[2])
                        .map(etat -> visibilite.proposable((UUID) ligne[1], etat, enseignant))
                        .orElse(false))
                .map(ligne -> (UUID) ligne[0]);
    }

    /**
     * Image que l'enseignant courant possède déjà pour le pictogramme ARASAAC {@code arasaacId} et pour le Sens retenu
     * du Mot de Préparation {@code preparationMotId} (story 2.11) : la plus récente de ses Images de ce Sens créées
     * depuis ce pictogramme qui lui soient {@link VisibiliteImages#proposable proposables} (AD-2). Les Images d'un
     * collègue ne comptent jamais, même versées. Lecture sans verrou ni écriture : {@link #lierImage} revérifie tout
     * sous verrou. L'appelant a vérifié que ce Mot de Préparation est le sien.
     *
     * @return l'identifiant de l'Image possédée ; vide s'il n'y en a pas
     * @throws IllegalStateException si le Mot de Préparation n'a pas de Sens retenu
     */
    @Transactional
    public Optional<UUID> imagePossedeeDuPictogramme(UUID preparationMotId, long arasaacId) {
        UUID enseignant = enseignantCourant.id();
        if (enseignant == null) {
            return Optional.empty();
        }
        UUID sensId = sensRetenu(preparationMotId);
        return images.duPictogramme(enseignant, sensId, arasaacId).stream()
                .filter(image -> visibilite.proposable(image, enseignant))
                .map(Image::id)
                .findFirst();
    }

    /**
     * Lie l'Image de la commande au Mot de Préparation de l'enseignant courant à la place de celle qu'il a, s'il en a
     * une (Panneau de choix d'Image, story 2.7). L'Image est verrouillée ({@code SELECT … FOR UPDATE}, après la
     * Préparation que l'appelant a verrouillée), puis doit lui être {@link VisibiliteImages#proposable proposable} et
     * illustrer un Sens du Mot. Si elle illustre un autre Sens que le Sens retenu, celui-ci devient le Sens de l'Image
     * (invariant : Sens de l'Image = Sens retenu). L'ancien lien est supprimé ; l'Image remplacée n'est ni supprimée ni
     * modifiée. Choisir l'Image déjà liée ne change rien.
     *
     * @return l'Image liée, vue par l'enseignant courant
     * @throws ErreurMetier {@code 404 image.indisponible} si l'Image n'existe pas ou ne lui est pas proposable ;
     *         {@code 400 image.sens_different} si elle illustre un autre Mot
     * @throws IllegalStateException si le Mot de Préparation n'a pas de Sens retenu
     */
    @Transactional
    public ImageVue remplacerImage(RemplacerImageCommande commande) {
        UUID enseignant = enseignantCourant.id();
        Optional<UUID> actuelle = liens.imageIdDe(commande.preparationMotId());
        if (actuelle.isPresent() && actuelle.get().equals(commande.imageId())) {
            return Images.vue(images.findById(commande.imageId()), enseignant, visibilite);
        }
        Image image = imageProposable(commande.imageId(), enseignant)
                .orElseThrow(() -> new ErreurMetier(404, CODE_IMAGE_INDISPONIBLE,
                        "Aucune image proposable ne porte cet identifiant"));
        SensRetenu retenu = sensRetenus.de(commande.preparationMotId())
                .orElseThrow(() -> new IllegalStateException("Sens retenu du mot de préparation "
                        + commande.preparationMotId() + " introuvable"));
        if (!image.sensId().equals(retenu.sensId())) {
            UUID motId = lexique.sens(retenu.sensId()).map(SensVue::motId).orElse(null);
            if (motId == null || lexique.sensDuMot(motId, image.sensId()).isEmpty()) {
                throw new ErreurMetier(400, CODE_SENS_DIFFERENT, "Cette image illustre un autre mot");
            }
            retenu.changerSens(image.sensId());
        }
        liens.supprimerDe(commande.preparationMotId());
        liens.persist(LienImage.nouveau(liens.nouvelIdentifiant(), commande.preparationId(),
                commande.preparationMotId(), image.id(), enseignant, commande.albumId(), commande.section(),
                commande.origine().valeur()));
        liens.flush();
        return Images.vue(image, enseignant, visibilite);
    }

    /**
     * Change le Sens retenu pour le Mot de Préparation de l'enseignant courant (Panneau de choix d'Image, story 2.8) : le
     * Sens de la commande doit être un Sens du même Mot, visible de l'enseignant selon la règle de la détection
     * ({@link DetectionMots#sensVisible}, AD-2). La ligne {@code sens_retenu} existante est mise à jour ; si l'Image liée
     * n'illustre pas ce Sens, son lien est supprimé et le Mot redevient « à illustrer » (invariant : Sens de l'Image =
     * Sens retenu, AD-5). L'Image déliée n'est ni supprimée ni modifiée. Choisir le Sens déjà retenu n'écrit rien. Aucun
     * Sens n'est créé ni modifié (AD-19). L'appelant a verrouillé la Préparation et vérifié que ce Mot est le sien.
     *
     * @return le Sens retenu après le changement
     * @throws ErreurMetier {@code 400 preparation.sens_invalide} si le Sens n'existe pas, est celui d'un autre Mot ou
     *         n'est pas visible de l'enseignant
     * @throws IllegalStateException si le Mot de Préparation n'a pas de Sens retenu
     */
    @Transactional
    public SensVue changerSens(ChangerSensCommande commande) {
        SensRetenu retenu = sensRetenus.de(commande.preparationMotId())
                .orElseThrow(() -> new IllegalStateException("Sens retenu du mot de préparation "
                        + commande.preparationMotId() + " introuvable"));
        SensVue actuel = lexique.sens(retenu.sensId())
                .orElseThrow(() -> new IllegalStateException("Sens " + retenu.sensId() + " introuvable"));
        if (actuel.id().equals(commande.sensId())) {
            return actuel;
        }
        SensVue nouveau = (commande.sensId() == null ? Optional.<SensVue>empty()
                : lexique.sensDuMot(actuel.motId(), commande.sensId()))
                .filter(trouve -> detection.sensVisible(actuel.motId(), trouve.id()))
                .orElseThrow(() -> new ErreurMetier(400, CODE_SENS_INVALIDE,
                        "Ce sens n'est pas un sens visible de ce mot"));
        retenir(retenu, nouveau, commande.preparationMotId());
        return nouveau;
    }

    /**
     * Retient pour le Mot de Préparation de l'enseignant courant le Sens qu'il vient de taper dans la Création de Sens
     * (Panneau de choix d'Image, story 2.8) : le Sens est obtenu ou créé par {@link Lexique#obtenirOuCreerSensSaisi}
     * pour le Mot du Sens retenu, puis devient le Sens retenu comme par {@link #changerSens}, sans contrôle de
     * visibilité (AD-2 ne vise que les Sens montrés à l'enseignant) : l'Image liée d'un autre Sens est déliée, sans être
     * supprimée ni modifiée. Un libellé déjà connu pour ce Mot réutilise ce Sens, avec sa catégorie (AD-19) ; s'il est
     * déjà le Sens retenu, rien n'est écrit. L'appelant a verrouillé la Préparation et vérifié que ce Mot est le sien.
     *
     * @return le Sens retenu après le changement
     * @throws ErreurMetier {@code 400 sens.libelle_invalide} si le libellé est vide, trop long ou réservé
     * @throws IllegalStateException si le Mot de Préparation n'a pas de Sens retenu
     */
    @Transactional
    public SensVue creerSens(CreerSensCommande commande) {
        SensRetenu retenu = sensRetenus.de(commande.preparationMotId())
                .orElseThrow(() -> new IllegalStateException("Sens retenu du mot de préparation "
                        + commande.preparationMotId() + " introuvable"));
        SensVue actuel = lexique.sens(retenu.sensId())
                .orElseThrow(() -> new IllegalStateException("Sens " + retenu.sensId() + " introuvable"));
        SensVue nouveau = lexique.obtenirOuCreerSensSaisi(actuel.motId(), commande.libelle(), commande.categorie());
        if (!actuel.id().equals(nouveau.id())) {
            retenir(retenu, nouveau, commande.preparationMotId());
        }
        return nouveau;
    }

    /** Le Sens {@code nouveau} devient le Sens retenu ; l'Image liée d'un autre Sens est déliée. */
    private void retenir(SensRetenu retenu, SensVue nouveau, UUID preparationMotId) {
        retenu.changerSens(nouveau.id());
        sensRetenus.flush();
        Image liee = liens.imagesDe(List.of(preparationMotId)).get(preparationMotId);
        if (liee != null && !liee.sensId().equals(nouveau.id())) {
            liens.supprimerDe(preparationMotId);
        }
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

    /**
     * Libère la Préparation {@code preparationId} avant que {@code preparations} ne la supprime (story 2.10) : les Sens
     * retenus et les liens d'Image de tous ses Mots sont supprimés. Aucune Image, aucun Mot ni aucun Sens n'est
     * supprimé. L'appelant a verrouillé la Préparation et vérifié qu'elle est celle de l'enseignant courant.
     */
    @Transactional
    public void libererPreparation(UUID preparationId) {
        liens.supprimerDeLaPreparation(preparationId);
        sensRetenus.supprimerDeLaPreparation(preparationId);
    }

    /**
     * Copie les usages de la Préparation source vers sa copie (duplication, story 2.10) : pour chaque Mot de
     * Préparation copié, son Sens retenu et, s'il en a un, son lien d'Image, vers la même Image, avec l'origine
     * {@code reutilisee} (AD-14), l'enseignant courant, l'Album et la Section de la copie. L'Image n'est ni copiée ni
     * revérifiée : une Image retirée ou devenue invisible est liée telle quelle, comme dans la source (décision de la
     * story). Aucune ligne {@code image} n'est créée. L'appelant a verrouillé la source, vérifié qu'elle est celle de
     * l'enseignant courant et créé les Mots de Préparation de la copie.
     *
     * @throws IllegalStateException si un Mot de Préparation de la source n'a pas de copie, ou si un Mot copié n'a
     *         pas de Sens retenu dans la source
     */
    @Transactional
    public void copierPreparation(CopierPreparationCommande commande) {
        UUID enseignant = enseignantCourant.id();
        Set<UUID> sourcesAvecSens = new HashSet<>();
        for (SensRetenu retenu : sensRetenus.deLaPreparation(commande.sourceId())) {
            sensRetenus.persist(SensRetenu.nouveau(sensRetenus.nouvelIdentifiant(), commande.cibleId(),
                    copie(commande, retenu.preparationMotId()), retenu.sensId(), enseignant, commande.albumId(),
                    commande.section()));
            sourcesAvecSens.add(retenu.preparationMotId());
        }
        // Chaque Mot copié doit avoir un Sens retenu (invariant d'un Mot de Préparation).
        if (!sourcesAvecSens.equals(commande.motsCopies().keySet())) {
            throw new IllegalStateException("Mots de préparation copiés sans sens retenu, ou sens retenus sans copie,"
                    + " dans la préparation " + commande.sourceId());
        }
        for (LienImage lien : liens.deLaPreparation(commande.sourceId())) {
            liens.persist(LienImage.nouveau(liens.nouvelIdentifiant(), commande.cibleId(),
                    copie(commande, lien.preparationMotId()), lien.imageId(), enseignant, commande.albumId(),
                    commande.section(), OrigineLien.REUTILISEE.valeur()));
        }
        liens.flush();
    }

    /** Mot de Préparation de la copie qui copie {@code preparationMotId}. */
    private static UUID copie(CopierPreparationCommande commande, UUID preparationMotId) {
        UUID copie = commande.motsCopies().get(preparationMotId);
        if (copie == null) {
            throw new IllegalStateException("Mot de préparation " + preparationMotId + " sans copie");
        }
        return copie;
    }
}
