package fr.corpusmots.comptes.service;

import java.util.UUID;

/**
 * Compte de l'enseignant connecté ; {@code email} et {@code administrateur} viennent du jeton, jamais de la base
 * (AD-6).
 */
public record MonCompteVue(UUID id, String nomAffiche, String email, boolean administrateur) {
}
