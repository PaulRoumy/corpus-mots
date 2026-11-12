package fr.corpusmots.vocabulaire.service;

import fr.corpusmots.commun.api.ErreurMetier;
import fr.corpusmots.commun.service.EnseignantCourant;
import fr.corpusmots.vocabulaire.persistance.Image;
import fr.corpusmots.vocabulaire.persistance.ImageFichier;
import fr.corpusmots.vocabulaire.persistance.ImageFichierRepository;
import fr.corpusmots.vocabulaire.persistance.ImageRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.util.UUID;

/**
 * Images de l'enseignant courant (FR-13) : seul point de création des lignes {@code image} et {@code image_fichier}.
 * Une Image naît {@code privee}, propriété de l'enseignant courant (AD-3). Rejoint la transaction de l'appelant
 * (AD-17).
 */
@ApplicationScoped
public class Images {

    static final String CODE_ALBUM_REQUIS = "image.album_requis";
    static final String CODE_REQUETE_INVALIDE = "requete.invalide";
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

    /**
     * Crée l'Image téléversée et son fichier, déjà réduit. La licence suit le type : {@code droits_auteur_enseignant}
     * pour une photo personnelle, {@code usage_pedagogique_album} pour une image d'album ; pour une image libre ou de
     * type inconnu, celle de la commande, facultative, parmi les six du Sélecteur de licence. Une image libre sans
     * source ou sans licence est enregistrée, marquée {@code aCompleter}.
     *
     * @throws ErreurMetier {@code 400 requete.invalide} si le type manque, si la licence ne peut pas être choisie pour
     *         ce type, ou si la source ou l'auteur dépassent {@value #LONGUEUR_MAX_TEXTE} caractères ;
     *         {@code 400 image.album_requis} pour une image d'album sans Album d'origine
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
        if (type == TypeImage.IMAGE_ALBUM && commande.albumId() == null) {
            throw new ErreurMetier(400, CODE_ALBUM_REQUIS, "Une image d'album exige son Album d'origine");
        }
        Licence licence = licence(type, commande.licence());
        String source = texte(commande.source(), "source");
        String auteur = texte(commande.auteur(), "auteur");
        UUID proprietaire = enseignantCourant.id();
        Image image = Image.nouvelle(images.nouvelIdentifiant(), proprietaire, commande.sensId(), TYPE_MEDIA_IMAGE,
                type.valeur(), licence == null ? null : licence.valeur(), source, auteur, commande.albumId(),
                EtatImage.PRIVEE.valeur());
        images.persist(image);
        fichiers.persist(ImageFichier.nouveau(image.id(), fichier.octets(), fichier.miniature(), fichier.typeMime(),
                fichier.largeur(), fichier.hauteur()));
        images.flush();
        return vue(image, proprietaire, visibilite);
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

    /** Image vue par l'enseignant {@code enseignantId} : {@code reutilisable} vient de {@link VisibiliteImages}. */
    static ImageVue vue(Image image, UUID enseignantId, VisibiliteImages visibilite) {
        TypeImage type = TypeImage.deValeur(image.typeImage())
                .orElseThrow(() -> new IllegalStateException("Type inconnu de l'Image " + image.id()));
        boolean aCompleter = type == TypeImage.IMAGE_LIBRE && (image.source() == null || image.licence() == null);
        return new ImageVue(image.id(), image.proprietaireId(), VisibiliteImages.etat(image), null,
                visibilite.proposable(image, enseignantId), type, aCompleter);
    }
}
