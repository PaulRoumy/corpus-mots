package fr.corpusmots.vocabulaire.service;

import fr.corpusmots.commun.service.Section;
import java.util.List;

/** Image de la Banque vue par l'enseignant courant, avec ses Sections (dans l'ordre ps, ms, gs), son Mot et son Sens. */
public record ImageBanqueVue(ImageVue image, List<Section> sections, MotVue mot, SensVue sens) {
}
