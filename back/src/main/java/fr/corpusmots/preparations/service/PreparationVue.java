package fr.corpusmots.preparations.service;

import fr.corpusmots.commun.service.Section;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Préparation de l'enseignant courant, de quoi afficher son En-tête : nom propre (absent s'il n'est pas renseigné : le
 * titre de l'Album s'affiche), Album, Section, Module et Thème par défaut (absents s'ils ne sont pas choisis), Temps
 * passé en minutes (absent s'il n'est pas renseigné), nombre de Mots et de Mots déjà illustrés.
 */
public record PreparationVue(UUID id, String nom, UUID albumId, String titreAlbum, Section section, UUID moduleId,
        String nomModule, UUID themeDefautId, String nomThemeDefaut, Integer tempsPasseMinutes, int nombreMots,
        int nombreIllustres, OffsetDateTime creeLe) {
}
