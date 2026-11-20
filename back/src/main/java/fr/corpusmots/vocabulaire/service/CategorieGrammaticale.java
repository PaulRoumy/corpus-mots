package fr.corpusmots.vocabulaire.service;

import java.util.Arrays;
import java.util.Locale;
import java.util.Optional;

/**
 * Catégorie grammaticale d'un Sens, énumération fermée : même valeur en base ({@code sens.categorie}), dans l'API et
 * dans le front ({@code nom}, {@code verbe}, {@code adjectif}, {@code adverbe}, {@code autre}). Seul le Sens par défaut
 * « à compléter » n'en a pas. Les DTO l'exposent en chaîne, par {@code @Schema(enumeration = …)}.
 */
public enum CategorieGrammaticale {
    NOM,
    VERBE,
    ADJECTIF,
    ADVERBE,
    AUTRE;

    public String valeur() {
        return name().toLowerCase(Locale.ROOT);
    }

    /** Catégorie de valeur {@code valeur}, vide pour toute autre chaîne ou {@code null}. */
    public static Optional<CategorieGrammaticale> deValeur(String valeur) {
        return Arrays.stream(values()).filter(categorie -> categorie.valeur().equals(valeur)).findFirst();
    }
}
