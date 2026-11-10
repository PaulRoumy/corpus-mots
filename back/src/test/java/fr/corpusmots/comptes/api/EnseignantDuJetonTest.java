package fr.corpusmots.comptes.api;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.quarkus.security.runtime.QuarkusSecurityIdentity;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.eclipse.microprofile.jwt.Claims;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.junit.jupiter.api.Test;

/**
 * L'enseignant courant est le {@code sub} du jeton, administrateur par son rôle {@code admin}, et n'existe pas hors
 * d'une requête authentifiée (AD-6).
 */
class EnseignantDuJetonTest {

    private static final String SUB = "0190f0a0-0000-7000-8000-000000000001";

    @Test
    void leSubDuJetonEstRenduEnUuid() {
        assertEquals(UUID.fromString(SUB), enseignant(jeton(SUB)).id());
    }

    @Test
    void uneRequeteAnonymeLeveIllegalStateException() {
        EnseignantDuJeton enseignant = new EnseignantDuJeton();
        enseignant.identite = QuarkusSecurityIdentity.builder().setAnonymous(true).build();

        assertThrows(IllegalStateException.class, enseignant::id);
    }

    @Test
    void unJetonSansSubLeveIllegalStateException() {
        assertThrows(IllegalStateException.class, enseignant(jeton(null))::id);
    }

    @Test
    void unSubQuiNEstPasUnUuidLeveIllegalStateException() {
        assertThrows(IllegalStateException.class, enseignant(jeton("pas-un-uuid"))::id);
    }

    @Test
    void leRoleAdminDuJetonFaitLAdministrateur() {
        EnseignantDuJeton enseignant = new EnseignantDuJeton();
        enseignant.identite = QuarkusSecurityIdentity.builder().setPrincipal(jeton(SUB)).addRole("admin").build();

        assertTrue(enseignant.administrateur());
        assertFalse(enseignant(jeton(SUB)).administrateur());
    }

    @Test
    void uneRequeteAnonymeNEstPasAdministrateur() {
        EnseignantDuJeton enseignant = new EnseignantDuJeton();
        enseignant.identite = QuarkusSecurityIdentity.builder().setAnonymous(true).build();

        assertFalse(enseignant.administrateur());
    }

    private static EnseignantDuJeton enseignant(JsonWebToken jeton) {
        EnseignantDuJeton enseignant = new EnseignantDuJeton();
        enseignant.identite = QuarkusSecurityIdentity.builder().setPrincipal(jeton).build();
        return enseignant;
    }

    private static JsonWebToken jeton(String sub) {
        Map<String, Object> revendications = sub == null ? Map.of() : Map.of(Claims.sub.name(), sub);
        return new JsonWebToken() {
            @Override
            public String getName() {
                return "enseignant";
            }

            @Override
            public Set<String> getClaimNames() {
                return revendications.keySet();
            }

            @SuppressWarnings("unchecked")
            @Override
            public <T> T getClaim(String nom) {
                return (T) revendications.get(nom);
            }
        };
    }
}
