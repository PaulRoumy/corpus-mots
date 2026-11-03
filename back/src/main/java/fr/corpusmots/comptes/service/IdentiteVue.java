package fr.corpusmots.comptes.service;

import java.util.UUID;

/**
 * Utilisateur tel que Keycloak le connaît : e-mail et rôle ne sont jamais copiés en base (AD-6). {@code active} :
 * connexion permise ({@code enabled}) ; {@code compteDeService} : utilisateur d'un client (celui du back), jamais
 * un enseignant.
 */
public record IdentiteVue(UUID id, String email, boolean administrateur, boolean active, boolean compteDeService) {
}
