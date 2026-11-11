package fr.corpusmots.vocabulaire.service;

import java.util.List;
import java.util.Optional;

/**
 * Source des pictogrammes ARASAAC (AD-9) : seul accès du back à ARASAAC, que le navigateur n'appelle jamais. Chaque
 * méthode est un appel HTTP sortant : ne jamais l'appeler dans une transaction ouverte (AD-17). Les tests la remplacent
 * par une fausse source.
 */
public interface SourceArasaac {

    /**
     * Pictogrammes trouvés pour {@code texte}, dans l'ordre d'ARASAAC ; liste vide si ARASAAC ne trouve rien.
     *
     * @throws ArasaacIndisponible si ARASAAC est injoignable, répond en erreur ou trop lentement
     */
    List<PictogrammeArasaac> rechercher(String texte);

    /**
     * Fichier PNG du pictogramme {@code id} ; vide si ARASAAC ne le connaît pas.
     *
     * @throws ArasaacIndisponible si ARASAAC est injoignable, répond en erreur ou trop lentement
     */
    Optional<byte[]> pictogramme(long id);
}
