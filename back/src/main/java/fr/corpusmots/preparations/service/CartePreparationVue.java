package fr.corpusmots.preparations.service;

import fr.corpusmots.commun.service.Section;
import java.time.OffsetDateTime;
import java.util.UUID;

/** Carte de Préparation de l'accueil : Album, Section, Module (absent s'il n'est pas choisi) et compteurs. */
public record CartePreparationVue(UUID id, UUID albumId, String titreAlbum, Section section, UUID moduleId,
        String nomModule, int nombreMots, int nombreAIllustrer, OffsetDateTime creeLe) {
}
