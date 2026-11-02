package fr.corpusmots.comptes.persistance;

import java.util.Arrays;

/** Statut d'un Enseignant (AD-6), stocké en base sous sa valeur snake_case. */
public enum StatutEnseignant {
    INVITE("invite"),
    ACTIF("actif"),
    DESACTIVE("desactive"),
    SUPPRESSION_EN_COURS("suppression_en_cours"),
    SUPPRIME("supprime");

    private final String valeur;

    StatutEnseignant(String valeur) {
        this.valeur = valeur;
    }

    public String valeur() {
        return valeur;
    }

    public static StatutEnseignant deValeur(String valeur) {
        return Arrays.stream(values())
                .filter(statut -> statut.valeur.equals(valeur))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Statut d'enseignant inconnu : " + valeur));
    }
}
