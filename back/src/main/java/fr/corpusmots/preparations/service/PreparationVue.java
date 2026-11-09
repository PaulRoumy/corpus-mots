package fr.corpusmots.preparations.service;

import fr.corpusmots.commun.service.Section;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Préparation de l'enseignant courant, de quoi afficher son En-tête : Album, Section, Module et Thème par défaut
 * (absents s'ils ne sont pas choisis), nombre de Mots et de Mots déjà illustrés.
 */
public record PreparationVue(UUID id, UUID albumId, String titreAlbum, Section section, UUID moduleId,
        String nomModule, UUID themeDefautId, String nomThemeDefaut, int nombreMots, int nombreIllustres,
        OffsetDateTime creeLe) {
}
