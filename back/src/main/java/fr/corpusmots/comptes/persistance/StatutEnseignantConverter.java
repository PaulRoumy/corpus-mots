package fr.corpusmots.comptes.persistance;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/** Écrit le statut sous sa valeur snake_case, identique en base, dans l'API et dans le front. */
@Converter(autoApply = true)
public class StatutEnseignantConverter implements AttributeConverter<StatutEnseignant, String> {

    @Override
    public String convertToDatabaseColumn(StatutEnseignant statut) {
        return statut == null ? null : statut.valeur();
    }

    @Override
    public StatutEnseignant convertToEntityAttribute(String valeur) {
        return valeur == null ? null : StatutEnseignant.deValeur(valeur);
    }
}
