package fr.corpusmots.comptes.service;

import java.util.UUID;

/**
 * Compte de l'équipe vu par l'administrateur : {@code nomAffiche} (vide tant que {@code invite}) et {@code statut}
 * viennent de la table {@code enseignant} ; {@code email} et {@code administrateur} de Keycloak ({@code email} vide
 * si Keycloak ne connaît plus l'utilisateur).
 */
public record CompteVue(UUID id, String nomAffiche, String email, String statut, boolean administrateur) {
}
