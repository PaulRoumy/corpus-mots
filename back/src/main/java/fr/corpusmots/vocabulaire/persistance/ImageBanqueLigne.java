package fr.corpusmots.vocabulaire.persistance;

import java.util.UUID;

/**
 * Ligne de la Banque lue en une requête (Image, Mot, Sens et Sections), sans charger d'entité. {@code sections} est la
 * liste des valeurs de Section séparées par des virgules, {@code null} si l'Image n'en a aucune ; {@code retraitAdmin}
 * est vrai si un motif de retrait par l'administrateur est renseigné.
 */
public record ImageBanqueLigne(UUID id, UUID proprietaireId, String etat, String typeImage, String licence,
        String source, String sections, UUID motId, String forme, UUID sensId, String sensLibelle,
        String categorie, boolean retraitAdmin) {
}
