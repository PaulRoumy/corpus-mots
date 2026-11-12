package fr.corpusmots.vocabulaire.service;

import java.util.Arrays;
import java.util.Locale;
import java.util.Optional;

/**
 * Type d'une Image (AD-4), énumération fermée : même valeur en base, dans l'API et dans le front
 * ({@code image_album}, {@code image_libre}, {@code photo_personnelle}, {@code inconnu}). Les DTO l'exposent en chaîne,
 * par {@code @Schema(enumeration = …)}.
 */
public enum TypeImage {
    IMAGE_ALBUM,
    IMAGE_LIBRE,
    PHOTO_PERSONNELLE,
    INCONNU;

    public String valeur() {
        return name().toLowerCase(Locale.ROOT);
    }

    /** Type de valeur {@code valeur}, vide pour toute autre chaîne ou {@code null}. */
    public static Optional<TypeImage> deValeur(String valeur) {
        return Arrays.stream(values()).filter(type -> type.valeur().equals(valeur)).findFirst();
    }
}
