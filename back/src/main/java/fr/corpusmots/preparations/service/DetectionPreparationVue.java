package fr.corpusmots.preparations.service;

import fr.corpusmots.vocabulaire.service.DetectionVue;
import java.util.Set;
import java.util.UUID;

/**
 * Détection d'une saisie dans une Préparation de l'enseignant courant (story 2.7) : ce que {@code vocabulaire} montre
 * ({@code detection}) et les Mots du Lexique ({@code motsDejaPresents}) qui figurent déjà dans cette Préparation.
 */
public record DetectionPreparationVue(DetectionVue detection, Set<UUID> motsDejaPresents) {
}
