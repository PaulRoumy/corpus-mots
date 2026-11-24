package fr.corpusmots.vocabulaire.service;

import java.util.Arrays;
import java.util.Locale;
import java.util.Optional;

/**
 * Motif d'un retrait d'Image par l'administrateur (AD-3), même valeur en base ({@code image.retrait_admin_motif}) :
 * {@code licence_non_conforme}, {@code image_album}, {@code image_inadaptee}, {@code autre} (avec un texte).
 */
public enum MotifRetraitAdmin {
    LICENCE_NON_CONFORME,
    IMAGE_ALBUM,
    IMAGE_INADAPTEE,
    AUTRE;

    public String valeur() {
        return name().toLowerCase(Locale.ROOT);
    }

    /** Motif de valeur {@code valeur}, vide pour toute autre chaîne ou {@code null}. */
    public static Optional<MotifRetraitAdmin> deValeur(String valeur) {
        return Arrays.stream(values()).filter(motif -> motif.valeur().equals(valeur)).findFirst();
    }
}
