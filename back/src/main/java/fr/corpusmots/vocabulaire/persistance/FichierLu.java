package fr.corpusmots.vocabulaire.persistance;

/** Une taille du fichier d'une Image ({@code octets} ou {@code miniature}), lue seule, avec son type MIME. */
public record FichierLu(byte[] octets, String typeMime) {
}
