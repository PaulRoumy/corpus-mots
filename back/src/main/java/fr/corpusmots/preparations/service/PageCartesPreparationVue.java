package fr.corpusmots.preparations.service;

import java.util.List;

/** Page des Préparations de l'enseignant, les plus récentes d'abord, et leur nombre total. */
public record PageCartesPreparationVue(List<CartePreparationVue> elements, long total) {
}
