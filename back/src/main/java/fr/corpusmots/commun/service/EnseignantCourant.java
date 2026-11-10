package fr.corpusmots.commun.service;

import java.util.UUID;

/**
 * Enseignant auteur de la requête en cours, lu dans le jeton et jamais dans un paramètre (AD-6). Interface de
 * {@code commun} pour que tout module puisse le connaître sans dépendre de {@code comptes}, qui l'implémente (AD-1).
 *
 * <p>Seuls l'identifiant et le rôle d'administrateur sont exposés : le nom se lit par l'annuaire (AD-20).
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

    /**
     * Vrai si le jeton porte le rôle {@code admin} : pour qu'un service décide seul d'un droit réservé au créateur et
     * à l'administrateur. {@code false} dans une requête qui n'est pas authentifiée.
     */
    boolean administrateur();
}
