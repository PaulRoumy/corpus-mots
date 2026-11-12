package fr.corpusmots.vocabulaire.service;

import java.util.Arrays;
import java.util.Locale;
import java.util.Optional;

/**
 * Licence d'une Image (AD-4), énumération fermée : même valeur en base, dans l'API et dans le front. Les six premières
 * se choisissent dans le Sélecteur de licence ({@link #choisissable()}) ; {@code droits_auteur_enseignant} est posée
 * pour une photo personnelle et {@code usage_pedagogique_album} pour une image d'album, jamais choisies.
 */
public enum Licence {
    ARASAAC_CC_BY_NC_SA,
    SCLERA_CC_BY_NC,
    MULBERRY_CC_BY_SA,
    CC0_DOMAINE_PUBLIC,
    PIXABAY,
    AUTRE_INCONNUE,
    DROITS_AUTEUR_ENSEIGNANT,
    USAGE_PEDAGOGIQUE_ALBUM;

    public String valeur() {
        return name().toLowerCase(Locale.ROOT);
    }

    /** Vrai pour les six licences du Sélecteur de licence (image libre, type inconnu). */
    public boolean choisissable() {
        return this != DROITS_AUTEUR_ENSEIGNANT && this != USAGE_PEDAGOGIQUE_ALBUM;
    }

    /** Licence de valeur {@code valeur}, vide pour toute autre chaîne ou {@code null}. */
    public static Optional<Licence> deValeur(String valeur) {
        return Arrays.stream(values()).filter(licence -> licence.valeur().equals(valeur)).findFirst();
    }
}
