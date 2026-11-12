package fr.corpusmots.vocabulaire.service;

import java.util.Arrays;
import java.util.Locale;
import java.util.Optional;

/**
 * État d'une Image (AD-3) : même valeur en base, dans l'API et dans le front. Une Image naît {@code privee} ; seul
 * {@code vocabulaire.service} change son état.
 */
public enum EtatImage {
    PRIVEE,
    VERSEE,
    ABANDONNEE,
    SUPPRIMEE;

    public String valeur() {
        return name().toLowerCase(Locale.ROOT);
    }

    /** État de valeur {@code valeur}, vide pour toute autre chaîne ou {@code null}. */
    public static Optional<EtatImage> deValeur(String valeur) {
        return Arrays.stream(values()).filter(etat -> etat.valeur().equals(valeur)).findFirst();
    }
}
