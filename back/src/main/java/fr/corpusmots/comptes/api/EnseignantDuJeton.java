package fr.corpusmots.comptes.api;

import fr.corpusmots.commun.service.EnseignantCourant;
import io.quarkus.security.identity.SecurityIdentity;
import jakarta.enterprise.context.RequestScoped;
import jakarta.inject.Inject;
import java.util.UUID;
import org.eclipse.microprofile.jwt.JsonWebToken;

/**
 * {@link EnseignantCourant} tiré du {@code sub} du jeton de la requête (AD-6). Sous {@code /api}, le filtre des
 * comptes a déjà vérifié que ce {@code sub} est un Enseignant actif.
 */
@RequestScoped
public class EnseignantDuJeton implements EnseignantCourant {

    @Inject
    SecurityIdentity identite;

    @Override
    public UUID id() {
        if (identite == null || identite.isAnonymous()) {
            throw new IllegalStateException("Aucun enseignant courant : la requête n'est pas authentifiée");
        }
        if (!(identite.getPrincipal() instanceof JsonWebToken jeton) || jeton.getSubject() == null) {
            throw new IllegalStateException("Aucun enseignant courant : le jeton n'a pas de sub");
        }
        try {
            return UUID.fromString(jeton.getSubject());
        } catch (IllegalArgumentException invalide) {
            throw new IllegalStateException("Aucun enseignant courant : le sub du jeton n'est pas un UUID", invalide);
        }
    }
}
