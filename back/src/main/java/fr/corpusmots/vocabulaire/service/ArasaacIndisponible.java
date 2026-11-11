package fr.corpusmots.vocabulaire.service;

/** ARASAAC injoignable, en erreur ou trop lent : levée par {@link SourceArasaac}. */
public class ArasaacIndisponible extends RuntimeException {

    public ArasaacIndisponible(String message) {
        super(message);
    }

    public ArasaacIndisponible(String message, Throwable cause) {
        super(message, cause);
    }
}
