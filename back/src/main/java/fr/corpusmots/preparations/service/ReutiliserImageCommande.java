package fr.corpusmots.preparations.service;

import java.util.UUID;

/**
 * Réutilisation d'une Image depuis le Panneau de détection (story 2.7) : le Mot {@code motId} est ajouté en fin de
 * Préparation avec le Sens de l'Image {@code imageId}, qui lui est liée avec l'origine {@code reutilisee}.
 */
public record ReutiliserImageCommande(UUID motId, UUID imageId) {
}
