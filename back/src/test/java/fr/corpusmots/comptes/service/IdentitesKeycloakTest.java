package fr.corpusmots.comptes.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.keycloak.representations.idm.UserRepresentation;

/** Lecture d'un utilisateur Keycloak : activation, rôle et compte de service, dont dépend la réconciliation. */
class IdentitesKeycloakTest {

    static final String ID = "0190f0a0-0000-7000-8000-000000000401";

    @Test
    void unUtilisateurActiveEstActif() {
        IdentiteVue vue = IdentitesKeycloak.vue(utilisateur("zoe@ecole.fr", true), Set.of());

        assertEquals(UUID.fromString(ID), vue.id());
        assertEquals("zoe@ecole.fr", vue.email());
        assertTrue(vue.active());
    }

    @Test
    void unUtilisateurDesactiveOuSansChampEnabledNEstPasActif() {
        assertFalse(IdentitesKeycloak.vue(utilisateur("zoe@ecole.fr", false), Set.of()).active());
        assertFalse(IdentitesKeycloak.vue(utilisateur("zoe@ecole.fr", null), Set.of()).active());
    }

    @Test
    void leRoleAdminVientDesMembresDuRole() {
        assertTrue(IdentitesKeycloak.vue(utilisateur("paul@ecole.fr", true), Set.of(ID)).administrateur());
        assertFalse(IdentitesKeycloak.vue(utilisateur("paul@ecole.fr", true), Set.of()).administrateur());
    }

    @Test
    void unCompteDeServiceSeReconnaitASonClient() {
        UserRepresentation service = utilisateur("compte", true);
        service.setServiceAccountClientId("corpus-mots-back");

        assertTrue(IdentitesKeycloak.vue(service, Set.of()).compteDeService());
    }

    @Test
    void unCompteDeServiceSeReconnaitASonNomDUtilisateur() {
        UserRepresentation service = utilisateur("service-account-corpus-mots-back", true);

        assertTrue(IdentitesKeycloak.vue(service, Set.of()).compteDeService());
    }

    @Test
    void unEnseignantNEstPasUnCompteDeService() {
        assertFalse(IdentitesKeycloak.vue(utilisateur("zoe@ecole.fr", true), Set.of()).compteDeService());
    }

    private static UserRepresentation utilisateur(String username, Boolean active) {
        UserRepresentation utilisateur = new UserRepresentation();
        utilisateur.setId(ID);
        utilisateur.setUsername(username);
        utilisateur.setEmail(username.contains("@") ? username : null);
        utilisateur.setEnabled(active);
        return utilisateur;
    }
}
