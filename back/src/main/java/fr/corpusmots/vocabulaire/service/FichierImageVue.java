package fr.corpusmots.vocabulaire.service;

/**
 * Fichier d'une Image servi par {@link FichiersImages#lire} : ses octets, son type MIME et la version de l'Image, qui
 * sert d'{@code ETag} (AD-23).
 */
public record FichierImageVue(byte[] octets, String typeMime, long version) {
}
