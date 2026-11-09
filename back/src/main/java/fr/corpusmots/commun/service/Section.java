package fr.corpusmots.commun.service;

import java.util.Arrays;
import java.util.Optional;

/**
 * Section de maternelle (Glossaire du PRD) : {@code ps}, {@code ms} ou {@code gs}, même valeur en base, dans l'API et
 * dans le front. Déclarée une seule fois ici, car {@code preparations} et {@code vocabulaire} l'utilisent tous les
 * deux (AD-16) ; les DTO l'exposent en chaîne, par {@code @Schema(enumeration = {"ps", "ms", "gs"})}.
 */
public enum Section {
    PS("ps"),
    MS("ms"),
    GS("gs");

    private final String valeur;

    Section(String valeur) {
        this.valeur = valeur;
    }

    public String valeur() {
        return valeur;
    }

    /** Section de valeur {@code valeur} ({@code ps}, {@code ms}, {@code gs}), vide pour toute autre chaîne ou {@code null}. */
    public static Optional<Section> deValeur(String valeur) {
        return Arrays.stream(values()).filter(section -> section.valeur.equals(valeur)).findFirst();
    }
}
