package fr.corpusmots.vocabulaire.service;

import fr.corpusmots.commun.api.ErreurMetier;
import fr.corpusmots.vocabulaire.persistance.Image;
import fr.corpusmots.vocabulaire.persistance.ImageRepository;
import fr.corpusmots.vocabulaire.persistance.LienImageRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Versement d'Images dans la Banque de l'école (FR-19), transition {@code privee → versee} d'AD-3, et retour
 * {@code versee → privee} (« Ne plus verser », FR-21), au nom d'un {@link Acteur} explicite, le propriétaire. La
 * versabilité est celle de {@link Versabilite#de} (AD-4). Aucune Notification n'est encore créée. Rejoint la
 * transaction de l'appelant (AD-17).
 */
@ApplicationScoped
public class Versements {

    static final String CODE_IMAGE_INDISPONIBLE = "image.indisponible";
    static final String CODE_RESERVEE_AU_PROPRIETAIRE = "image.reservee_au_proprietaire";
    static final String CODE_REQUETE_INVALIDE = "requete.invalide";
    static final String CODE_REUTILISEE = "image.versement.reutilisee";

    /** Nombre maximal d'Images d'un versement en lot. */
    public static final int TAILLE_MAX_LOT = 500;

    @Inject
    ImageRepository images;

    @Inject
    VisibiliteImages visibilite;

    @Inject
    Images cartes;

    @Inject
    LienImageRepository liens;

    /**
     * Verse l'Image {@code imageId} de son propriétaire {@code acteur}, verrouillée ({@code SELECT … FOR UPDATE},
     * AD-17). Une Image déjà versée ne change pas (idempotent). Rien n'est modifié en cas de refus.
     *
     * @return la Carte d'identité à jour, lue par l'acteur
     * @throws ErreurMetier {@code 404 image.indisponible} si l'Image n'existe pas ou n'est pas proposable à l'acteur
     *         (abandonnée, supprimée, privée d'un collègue, AD-2) ; {@code 403 image.reservee_au_proprietaire} s'il n'en
     *         est pas le propriétaire, administrateur compris ; {@code 400} avec le code du motif de
     *         {@link Versabilite#de} si elle n'est pas versable
     */
    @Transactional
    public CarteIdentiteImageVue verser(UUID imageId, Acteur.Proprietaire acteur) {
        Objects.requireNonNull(acteur, "acteur");
        Optional<Image> image = imageId == null ? Optional.empty() : images.verrouillee(imageId);
        if (verserSousVerrou(image, acteur) instanceof Issue.Refusee refus) {
            throw new ErreurMetier(refus.statut(), refus.code(), refus.detail());
        }
        images.flush();
        return cartes.carteIdentite(image.orElseThrow(), acteur.id());
    }

    /**
     * Ne plus verser l'Image {@code imageId} de son propriétaire {@code acteur} : elle repasse de {@code versee} à
     * {@code privee}, verrouillée ({@code SELECT … FOR UPDATE}, AD-17). Une Image déjà privée ne change pas. Les liens
     * des collègues restent intacts : seule leur lecture change ({@code aRemplacer = retiree}). Rien n'est modifié en
     * cas de refus.
     *
     * @param confirme vrai si le propriétaire a confirmé malgré les liens de collègues
     * @return la Carte d'identité à jour, lue par l'acteur
     * @throws ErreurMetier {@code 404 image.indisponible} si l'Image n'existe pas ou n'est pas proposable à l'acteur ;
     *         {@code 403 image.reservee_au_proprietaire} s'il n'en est pas le propriétaire ;
     *         {@code 409 image.versement.reutilisee} si un collègue a un lien vers l'Image et que {@code confirme} est
     *         faux
     */
    @Transactional
    public CarteIdentiteImageVue nePlusVerser(UUID imageId, boolean confirme, Acteur.Proprietaire acteur) {
        Objects.requireNonNull(acteur, "acteur");
        Image image = (imageId == null ? Optional.<Image>empty() : images.verrouillee(imageId))
                .filter(verrouillee -> visibilite.proposable(verrouillee, acteur.id()))
                .orElseThrow(() -> new ErreurMetier(404, CODE_IMAGE_INDISPONIBLE,
                        "Aucune image disponible ne porte cet identifiant"));
        if (!image.proprietaireId().equals(acteur.id())) {
            throw new ErreurMetier(403, CODE_RESERVEE_AU_PROPRIETAIRE,
                    "Seul le propriétaire de l'image peut ne plus la verser");
        }
        if (VisibiliteImages.etat(image) == EtatImage.VERSEE) {
            if (!confirme && liens.existeHorsEnseignant(image.id(), image.proprietaireId())) {
                throw new ErreurMetier(409, CODE_REUTILISEE,
                        "Des collègues utilisent cette image : confirmez pour ne plus la verser");
            }
            image.changerEtat(EtatImage.PRIVEE.valeur());
            images.flush();
        }
        return cartes.carteIdentite(image, acteur.id());
    }

    /**
     * Verse en une transaction les Images {@code imageIds} de leur propriétaire {@code acteur} : chacune suit la règle
     * de {@link #verser}, et une Image refusée ne bloque pas les autres. Toutes sont verrouillées d'abord, en une seule
     * requête, dans l'ordre des identifiants de PostgreSQL, pour éviter les interblocages entre deux lots.
     *
     * @return les Images versées par cet appel, celles qui l'étaient déjà et les refusées avec leur code, dans l'ordre
     *         de la demande
     * @throws ErreurMetier {@code 400 requete.invalide} si la liste est absente, vide, dépasse
     *         {@value #TAILLE_MAX_LOT} identifiants, ou contient un identifiant nul ou en double ; rien n'est alors versé
     */
    @Transactional
    public VersementLotVue verserLot(List<UUID> imageIds, Acteur.Proprietaire acteur) {
        Objects.requireNonNull(acteur, "acteur");
        if (imageIds == null || imageIds.isEmpty() || imageIds.size() > TAILLE_MAX_LOT
                || imageIds.stream().anyMatch(Objects::isNull) || new HashSet<>(imageIds).size() != imageIds.size()) {
            throw new ErreurMetier(400, CODE_REQUETE_INVALIDE,
                    "Le lot compte de 1 à " + TAILLE_MAX_LOT + " identifiants d'images, chacun une seule fois");
        }
        Map<UUID, Image> verrouillees = images.verrouillees(imageIds).stream()
                .collect(Collectors.toMap(Image::id, Function.identity()));
        Map<UUID, Issue> issues = new HashMap<>();
        for (UUID imageId : imageIds) {
            issues.put(imageId, verserSousVerrou(Optional.ofNullable(verrouillees.get(imageId)), acteur));
        }
        images.flush();
        List<UUID> versees = new ArrayList<>();
        List<UUID> dejaVersees = new ArrayList<>();
        List<RefusVersementVue> refusees = new ArrayList<>();
        for (UUID imageId : imageIds) {
            switch (issues.get(imageId)) {
                case Issue.Versee versee -> versees.add(imageId);
                case Issue.DejaVersee deja -> dejaVersees.add(imageId);
                case Issue.Refusee refus -> refusees.add(new RefusVersementVue(imageId, refus.code(), refus.licence()));
            }
        }
        return new VersementLotVue(List.copyOf(versees), List.copyOf(dejaVersees), List.copyOf(refusees));
    }

    /**
     * Seule méthode qui verse (AD-3, AD-4), sur une Image déjà verrouillée par l'appelant ({@code SELECT … FOR UPDATE},
     * AD-17) : vérifie qu'elle existe et est proposable à l'acteur, qu'il en est le propriétaire, puis sa versabilité,
     * et la passe de {@code privee} à {@code versee}. Une Image déjà versée ne change pas. Rien n'est écrit en cas de
     * refus.
     */
    private Issue verserSousVerrou(Optional<Image> verrouillee, Acteur.Proprietaire acteur) {
        Optional<Image> proposable = verrouillee.filter(image -> visibilite.proposable(image, acteur.id()));
        if (proposable.isEmpty()) {
            return new Issue.Refusee(404, CODE_IMAGE_INDISPONIBLE, null,
                    "Aucune image disponible ne porte cet identifiant");
        }
        Image image = proposable.get();
        if (!image.proprietaireId().equals(acteur.id())) {
            return new Issue.Refusee(403, CODE_RESERVEE_AU_PROPRIETAIRE, null,
                    "Seul le propriétaire de l'image peut la verser");
        }
        if (VisibiliteImages.etat(image) == EtatImage.VERSEE) {
            return new Issue.DejaVersee();
        }
        Versabilite versabilite = Images.versabilite(image);
        if (versabilite != Versabilite.VERSABLE) {
            return new Issue.Refusee(400, versabilite.valeur(),
                    versabilite == Versabilite.LICENCE_NON_VERSABLE ? image.licence() : null,
                    "Cette image ne peut pas être versée dans la banque");
        }
        image.changerEtat(EtatImage.VERSEE.valeur());
        return new Issue.Versee();
    }

    /** Issue du versement d'une Image par {@link #verserSousVerrou}. */
    private sealed interface Issue {

        /** Passée de {@code privee} à {@code versee}. */
        record Versee() implements Issue {
        }

        /** Déjà versée, inchangée. */
        record DejaVersee() implements Issue {
        }

        /** Refusée, sans écriture : statut HTTP, code stable, licence pour le motif de licence, détail. */
        record Refusee(int statut, String code, String licence, String detail) implements Issue {
        }
    }
}
