package fr.corpusmots.architecture.fixtures.vocabulaire.service;

import jakarta.transaction.Transactional;

/** Violation d'AD-17 : appel ARASAAC depuis une méthode {@code @Transactional}. */
public class AppelArasaacEnTransaction {

    SourceArasaac source;

    @Transactional
    public byte[] telecharger(long id) {
        return source.pictogramme(id);
    }
}
