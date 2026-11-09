package fr.corpusmots.preparations.service;

import java.util.UUID;

/**
 * Demande de création d'une Préparation : Album et Section obligatoires, Module (de cet Album) et Thème par défaut
 * facultatifs. La Section est reçue telle que saisie ({@code ps}, {@code ms}, {@code gs}) et vérifiée par le service.
 */
public record NouvellePreparationCommande(UUID albumId, String section, UUID moduleId, UUID themeDefautId) {
}
