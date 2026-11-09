package fr.corpusmots.referentiels.service;

import java.util.UUID;

/** Module d'un Album, à sa place {@code ordre}. */
public record ModuleVue(UUID id, UUID albumId, String nom, int ordre) {
}
