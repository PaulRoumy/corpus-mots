package fr.corpusmots.comptes.service;

import java.util.UUID;

/** Utilisateur tel que Keycloak le connaît : e-mail et rôle ne sont jamais copiés en base (AD-6). */
public record IdentiteVue(UUID id, String email, boolean administrateur) {
}
