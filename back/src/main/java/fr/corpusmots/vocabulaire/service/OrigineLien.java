package fr.corpusmots.vocabulaire.service;

import java.util.Locale;

/**
 * Origine d'un lien d'Image (AD-14) : {@code nouvelle} si l'Image a été créée pour cette Préparation, dans la même
 * transaction ; {@code reutilisee} pour une Image existante (choix, rétablissement, duplication).
 */
public enum OrigineLien {
    NOUVELLE,
    REUTILISEE;

    public String valeur() {
        return name().toLowerCase(Locale.ROOT);
    }
}
