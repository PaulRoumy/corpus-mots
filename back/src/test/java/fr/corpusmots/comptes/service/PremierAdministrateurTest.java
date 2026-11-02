package fr.corpusmots.comptes.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** Premier administrateur et circuit d'invitation (matrice de la story 1.3, AD-18). */
@QuarkusTest
class PremierAdministrateurTest {

    static final String EMAIL = "paul@example.fr";

    @Inject
    PremierAdministrateur premierAdministrateur;

    @Inject
    InvitationService invitations;

    @Inject
    IdentitesFactices identites;

    @Inject
    EntityManager entityManager;

    @BeforeEach
    void baseVide() {
        QuarkusTransaction.requiringNew().run(() -> entityManager.createNativeQuery("delete from enseignant").executeUpdate());
        identites.reinitialiser();
        premierAdministrateur.reinitialiser();
    }

    @Test
    void auPremierDemarrageLAdministrateurEstInviteParKeycloakPuisEnBase() {
        UUID id = UUID.randomUUID();
        identites.prochainId(id);

        premierAdministrateur.executer(Optional.of(EMAIL));

        assertEquals(List.of("creer " + EMAIL, "admin " + id, "inviter " + id), identites.appels());
        assertEquals(List.of("invite"), statuts());
    }

    @Test
    void auxDemarragesSuivantsRienNEstCree() {
        premierAdministrateur.executer(Optional.of(EMAIL));
        identites.reinitialiser();
        premierAdministrateur.reinitialiser();

        premierAdministrateur.executer(Optional.of(EMAIL));

        assertEquals(List.of(), identites.appels());
        assertEquals(1, statuts().size());
    }

    @Test
    void unKeycloakPasEncorePretNeLaisseRienEnBaseEtLaTacheSuivanteReessaie() {
        identites.echouerA(IdentitesFactices.Etape.CREATION);

        premierAdministrateur.executer(Optional.of(EMAIL));

        assertEquals(List.of(), statuts());
        identites.echouerA();
        premierAdministrateur.executer(Optional.of(EMAIL));
        assertEquals(List.of("invite"), statuts());
    }

    @Test
    void unEchecDEnvoiDeLInvitationSupprimeLUtilisateurKeycloak() {
        UUID id = UUID.randomUUID();
        identites.prochainId(id);
        identites.echouerA(IdentitesFactices.Etape.INVITATION);

        premierAdministrateur.executer(Optional.of(EMAIL));

        assertEquals(List.of("creer " + EMAIL, "admin " + id, "inviter " + id, "supprimer " + id),
                identites.appels());
        assertEquals(List.of(), statuts());
    }

    @Test
    void unEchecDAttributionDuRoleSupprimeLUtilisateurKeycloak() {
        UUID id = UUID.randomUUID();
        identites.prochainId(id);
        identites.echouerA(IdentitesFactices.Etape.ROLE);

        premierAdministrateur.executer(Optional.of(EMAIL));

        assertEquals(List.of("creer " + EMAIL, "admin " + id, "supprimer " + id), identites.appels());
        assertEquals(List.of(), statuts());
    }

    @Test
    void uneCompensationEnEchecLaisseRemonterLEchecDOrigine() {
        UUID id = UUID.randomUUID();
        identites.prochainId(id);
        identites.echouerA(IdentitesFactices.Etape.INVITATION, IdentitesFactices.Etape.SUPPRESSION);

        RuntimeException echec = assertThrows(RuntimeException.class, () -> invitations.inviter(EMAIL, false));

        assertTrue(echec.getMessage().contains("INVITATION"), echec.getMessage());
        assertEquals(List.of("creer " + EMAIL, "inviter " + id, "supprimer " + id), identites.appels());
        assertEquals(List.of(), statuts());
    }

    @Test
    void unEchecEnBaseApresKeycloakSupprimeLUtilisateurKeycloak() {
        UUID dejaPris = UUID.randomUUID();
        QuarkusTransaction.requiringNew().run(() -> entityManager
                .createNativeQuery("insert into enseignant (id, statut) values (:id, 'invite')")
                .setParameter("id", dejaPris).executeUpdate());
        identites.prochainId(dejaPris);

        assertThrows(RuntimeException.class, () -> invitations.inviter(EMAIL, false));

        assertEquals(List.of("creer " + EMAIL, "inviter " + dejaPris, "supprimer " + dejaPris), identites.appels());
        assertEquals(List.of("invite"), statuts());
    }

    @Test
    void unEmailDejaPresentDansKeycloakNEstNiModifieNiSupprime() {
        identites.emailDejaUtilise();

        premierAdministrateur.executer(Optional.of(EMAIL));
        premierAdministrateur.executer(Optional.of(EMAIL));

        assertEquals(List.of("creer " + EMAIL, "creer " + EMAIL), identites.appels());
        assertEquals(List.of(), statuts());
    }

    @Test
    void sansEmailInitialRienNEstFait() {
        premierAdministrateur.executer(Optional.empty());
        premierAdministrateur.executer(Optional.of("  "));

        assertTrue(identites.appels().isEmpty());
        assertEquals(List.of(), statuts());
    }

    @SuppressWarnings("unchecked")
    private List<String> statuts() {
        return QuarkusTransaction.requiringNew().call(() -> entityManager
                .createNativeQuery("select statut from enseignant order by statut").getResultList());
    }
}
