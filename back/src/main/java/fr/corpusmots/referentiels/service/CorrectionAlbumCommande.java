package fr.corpusmots.referentiels.service;

/** Correction d'un Album : titre et auteur obligatoires, éditeur facultatif, tels que saisis (FR-4). */
public record CorrectionAlbumCommande(String titre, String auteur, String editeur) {
}
