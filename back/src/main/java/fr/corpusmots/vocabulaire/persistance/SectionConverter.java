package fr.corpusmots.vocabulaire.persistance;

import fr.corpusmots.commun.service.Section;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * Écrit la Section sous sa valeur ({@code ps}, {@code ms}, {@code gs}) dans les tables de {@code vocabulaire} ; celui
 * de {@code preparations} reste privé à son module (AD-1). Appliqué par {@code @Convert}, jamais automatiquement.
 */
@Converter
public class SectionConverter implements AttributeConverter<Section, String> {

    @Override
    public String convertToDatabaseColumn(Section section) {
        return section == null ? null : section.valeur();
    }

    @Override
    public Section convertToEntityAttribute(String valeur) {
        return valeur == null ? null : Section.deValeur(valeur)
                .orElseThrow(() -> new IllegalArgumentException("Section inconnue : " + valeur));
    }
}
