package fr.corpusmots.referentiels.service;

/** Nouvel Album : titre et auteur obligatoires, éditeur facultatif, tels que saisis (FR-4). */
public record NouvelAlbumCommande(String titre, String auteur, String editeur) {
}
