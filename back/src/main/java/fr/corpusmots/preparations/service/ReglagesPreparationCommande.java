package fr.corpusmots.preparations.service;

import java.util.UUID;

/**
 * Réglages d'une Préparation, remplacés tous ensemble : Module (de l'Album de la Préparation), Thème par défaut et
 * Temps passé en minutes (multiple de 30, de 0 à 6000). {@code null} retire la valeur.
 */
public record ReglagesPreparationCommande(UUID moduleId, UUID themeDefautId, Integer tempsPasseMinutes) {
}
