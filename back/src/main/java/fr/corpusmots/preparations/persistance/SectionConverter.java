package fr.corpusmots.preparations.persistance;

import fr.corpusmots.commun.service.Section;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * Écrit la Section sous sa valeur ({@code ps}, {@code ms}, {@code gs}), identique en base, dans l'API et dans le front.
 * Appliqué par {@code @Convert} et non automatiquement : {@code vocabulaire} déclarera le sien pour ses tables.
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
