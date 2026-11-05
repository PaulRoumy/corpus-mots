package fr.corpusmots.commun.service;

import java.util.UUID;

/**
 * Enseignant auteur de la requête en cours, lu dans le jeton et jamais dans un paramètre (AD-6). Interface de
 * {@code commun} pour que tout module puisse le connaître sans dépendre de {@code comptes}, qui l'implémente (AD-1).
 *
 * <p>Seul l'identifiant est exposé : le rôle se lit par {@code @RolesAllowed}, le nom par l'annuaire (AD-20).
 */
public interface EnseignantCourant {

    /**
     * Identifiant de l'Enseignant, égal au {@code sub} du jeton (AD-6).
     *
     * <p>Ne renvoie jamais {@code null}.
     *
     * @throws IllegalStateException dans une requête qui n'est pas authentifiée ou dont le {@code sub} n'est pas un
     *         UUID
     * @throws jakarta.enterprise.context.ContextNotActiveException hors de toute requête (tâche planifiée,
     *         démarrage)
     */
    UUID id();
}
