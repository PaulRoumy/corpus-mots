package fr.corpusmots.vocabulaire.service;

import java.util.Arrays;
import java.util.Optional;

/**
 * Versabilité d'une Image (AD-4) : {@code versable}, ou le code stable du motif qui refuse le versement. Même valeur
 * dans l'API et dans le front ; un refus de versement répond {@code 400} avec ce code. Calculée uniquement par
 * {@link #de}, que le versement et les vues appellent.
 */
public enum Versabilite {
    VERSABLE("versable"),
    RETRAIT_ADMIN("image.versement.retrait_admin"),
    IMAGE_ALBUM("image.versement.image_album"),
    TYPE_INCONNU("image.versement.type_inconnu"),
    SOURCE_MANQUANTE("image.versement.source_manquante"),
    LICENCE_NON_VERSABLE("image.versement.licence_non_versable");

    private final String valeur;

    Versabilite(String valeur) {
        this.valeur = valeur;
    }

    /** {@code versable}, ou le code stable du motif de refus. */
    public String valeur() {
        return valeur;
    }

    /** Versabilité de valeur {@code valeur}, vide pour toute autre chaîne ou {@code null}. */
    public static Optional<Versabilite> deValeur(String valeur) {
        return Arrays.stream(values()).filter(versabilite -> versabilite.valeur.equals(valeur)).findFirst();
    }

    /**
     * Seule règle de versabilité (AD-4). Les motifs sont examinés dans cet ordre, le premier qui s'applique l'emporte :
     * <ol>
     *   <li>un retrait par l'administrateur est renseigné : {@link #RETRAIT_ADMIN} ;</li>
     *   <li>image d'album : {@link #IMAGE_ALBUM} ;</li>
     *   <li>type inconnu (ou absent) : {@link #TYPE_INCONNU} ;</li>
     *   <li>image libre sans source, ou dont la source est vide après rognage : {@link #SOURCE_MANQUANTE} ;</li>
     *   <li>image libre dont la licence est absente ou hors des quatre licences partageables (ARASAAC, Sclera,
     *       Mulberry, CC0) : {@link #LICENCE_NON_VERSABLE}.</li>
     * </ol>
     * Une photo personnelle est toujours versable, hors retrait par l'administrateur. L'état de l'Image n'entre pas
     * en compte : l'appelant décide de ce qu'une Image déjà versée devient.
     */
    public static Versabilite de(TypeImage type, Licence licence, String source, boolean retraitAdmin) {
        if (retraitAdmin) {
            return RETRAIT_ADMIN;
        }
        if (type == TypeImage.IMAGE_ALBUM) {
            return IMAGE_ALBUM;
        }
        if (type == null || type == TypeImage.INCONNU) {
            return TYPE_INCONNU;
        }
        if (type == TypeImage.PHOTO_PERSONNELLE) {
            return VERSABLE;
        }
        if (source == null || source.isBlank()) {
            return SOURCE_MANQUANTE;
        }
        return licence != null && licence.partageable() ? VERSABLE : LICENCE_NON_VERSABLE;
    }
}
