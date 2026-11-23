package fr.corpusmots.vocabulaire.service;

import java.util.List;

/** Page de la Banque pour une provenance et nombre total d'Images de cette provenance. */
public record PageImagesBanqueVue(List<ImageBanqueVue> elements, long total) {
}
