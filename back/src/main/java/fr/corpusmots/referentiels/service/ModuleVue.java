package fr.corpusmots.referentiels.service;

import java.util.UUID;

/**
 * Module d'un Album, à sa place {@code ordre}. {@code createurId} est {@code null} pour un Module inséré avant la
 * story 2.2, que seul l'administrateur gère.
 */
public record ModuleVue(UUID id, UUID albumId, String nom, int ordre, UUID createurId) {
}
