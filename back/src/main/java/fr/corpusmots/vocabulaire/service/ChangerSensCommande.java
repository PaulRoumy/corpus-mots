package fr.corpusmots.vocabulaire.service;

import java.util.UUID;

/**
 * Changement du Sens retenu pour le Mot de Préparation {@code preparationMotId} d'une Préparation de l'enseignant
 * courant : le Sens {@code sensId} devient le Sens retenu (Panneau de choix d'Image, story 2.8).
 */
public record ChangerSensCommande(UUID preparationMotId, UUID sensId) {
}
