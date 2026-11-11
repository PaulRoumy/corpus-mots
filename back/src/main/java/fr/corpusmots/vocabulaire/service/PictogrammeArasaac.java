package fr.corpusmots.vocabulaire.service;

import java.util.List;

/** Pictogramme trouvé par une recherche ARASAAC : identifiant et mots-clés français, dans l'ordre d'ARASAAC. */
public record PictogrammeArasaac(long id, List<String> motsCles) {

    public PictogrammeArasaac {
        motsCles = List.copyOf(motsCles);
    }
}
