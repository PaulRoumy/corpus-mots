package fr.corpusmots.referentiels.service;

import java.util.UUID;

/** Album vu des autres modules et de l'API : titre, auteur, éditeur (facultatif) et nombre de Modules. */
public record AlbumVue(UUID id, String titre, String auteur, String editeur, long nombreModules) {
}
