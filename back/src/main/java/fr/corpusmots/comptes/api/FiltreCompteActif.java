package fr.corpusmots.comptes.api;

import fr.corpusmots.comptes.service.ComptesService;
import io.quarkus.security.identity.SecurityIdentity;
import jakarta.inject.Inject;
import jakarta.json.JsonString;
import jakarta.ws.rs.Priorities;
import java.util.Optional;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.jboss.resteasy.reactive.server.ServerRequestFilter;

/**
 * Sous {@code /api}, un jeton valide ne suffit pas : son {@code sub} doit être un Enseignant actif, sinon
 * {@code 403 compte.inconnu_ou_inactif} (AD-6). Les requêtes sans jeton sont laissées à la sécurité de Quarkus
 * ({@code 401}).
 */
public class FiltreCompteActif {

    @Inject
    SecurityIdentity identite;

    @Inject
    ComptesService comptes;

    @ServerRequestFilter(priority = Priorities.AUTHORIZATION + 1)
    public void verifierCompteActif() {
        if (identite.isAnonymous()) {
            return;
        }
        String sub = null;
        Optional<String> nom = Optional.empty();
        if (identite.getPrincipal() instanceof JsonWebToken jeton) {
            sub = jeton.getSubject();
            nom = texte(jeton.getClaim("name"));
        }
        comptes.verifierActif(sub, nom);
    }

    /** Selon la bibliothèque JWT, une revendication texte arrive en {@code String} ou en {@code JsonString}. */
    static Optional<String> texte(Object revendication) {
        return switch (revendication) {
            case String valeur -> Optional.of(valeur);
            case JsonString valeur -> Optional.of(valeur.getString());
            case null, default -> Optional.empty();
        };
    }
}
