package fr.corpusmots.vocabulaire.service;

import java.util.Arrays;
import java.util.Optional;

/**
 * Provenance des Images de la Banque (FR-18), même valeur dans l'API et dans le front : {@code mes-mots} (les Images
 * de l'enseignant, versées ou non), {@code banque} (les Images versées de tous), {@code tout} (l'union des deux). Le
 * critère de chacune est écrit dans {@link VisibiliteImages}, et nulle part ailleurs (AD-2).
 */
public enum ProvenanceImages {
    MES_MOTS("mes-mots"),
    BANQUE("banque"),
    TOUT("tout");

    private final String valeur;

    ProvenanceImages(String valeur) {
        this.valeur = valeur;
    }

    public String valeur() {
        return valeur;
    }

    /** Provenance de valeur {@code valeur}, vide pour toute autre chaîne ou {@code null}. */
    public static Optional<ProvenanceImages> deValeur(String valeur) {
        return Arrays.stream(values()).filter(provenance -> provenance.valeur.equals(valeur)).findFirst();
    }
}
