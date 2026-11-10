package fr.corpusmots.referentiels.persistance;

import java.util.UUID;

/** Ligne d'une recherche ou d'une lecture d'Albums, avec son créateur et son nombre de Modules. */
public record AlbumTrouve(UUID id, String titre, String auteur, String editeur, UUID createurId, long nombreModules) {
}
