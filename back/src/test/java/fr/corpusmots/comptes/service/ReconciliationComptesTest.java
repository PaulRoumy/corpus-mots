package fr.corpusmots.comptes.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** Réconciliation des comptes entre Keycloak et la base (matrice de la story 1.6, partie 2, AD-18). */
@QuarkusTest
class ReconciliationComptesTest {

    static final UUID ADMIN = UUID.fromString("0190f0a0-0000-7000-8000-000000000301");
    static final UUID CIBLE = UUID.fromString("0190f0a0-0000-7000-8000-000000000302");
    static final UUID AUTRE = UUID.fromString("0190f0a0-0000-7000-8000-000000000303");

    @Inject
    ReconciliationComptes reconciliation;

    @Inject
    IdentitesFactices identites;

    @Inject
    EntityManager entityManager;

    @BeforeEach
    void equipe() {
        QuarkusTransaction.requiringNew().run(() -> {
            entityManager.createNativeQuery("delete from enseignant").executeUpdate();
            inserer(ADMIN, "Paul Roumy", "actif");
        });
        identites.reinitialiser();
        identites.utilisateur(ADMIN, "paul@ecole.fr", true);
        reconciliation.reinitialiser();
    }

    // --- Orphelins ---

    @Test
    void unOrphelinVuADeuxPassagesEstSupprimeDeKeycloak() {
        identites.utilisateur(CIBLE, "orphelin@ecole.fr", false);

        reconciliation.reconcilier();
        assertEquals(List.of(), identites.appels());

        reconciliation.reconcilier();
        assertEquals(List.of("supprimer " + CIBLE), identites.appels());
        assertFalse(identites.existe(CIBLE));
        assertTrue(identites.existe(ADMIN));
    }

    @Test
    void uneInvitationEnCoursNEstPasSupprimee() {
        identites.utilisateur(CIBLE, "invitee@ecole.fr", false);

        reconciliation.reconcilier();
        enBase(() -> inserer(CIBLE, null, "invite"));
        reconciliation.reconcilier();

        assertEquals(List.of(), identites.appels());
        assertTrue(identites.existe(CIBLE));
        assertEquals("invite", statut(CIBLE));
    }

    @Test
    void lUtilisateurKeycloakDUnEnseignantSupprimeEstSupprime() {
        enBase(() -> inserer(CIBLE, "Ancienne Collègue", "supprime"));
        identites.utilisateur(CIBLE, "ancienne@ecole.fr", false, false);

        deuxPassages();

        assertEquals(List.of("supprimer " + CIBLE), identites.appels());
        assertFalse(identites.existe(CIBLE));
        assertEquals("supprime", statut(CIBLE));
    }

    @Test
    void leCompteDeServiceNEstJamaisSupprime() {
        deuxPassages();
        deuxPassages();

        assertEquals(List.of(), identites.appels());
        assertTrue(identites.existe(IdentitesFactices.COMPTE_DE_SERVICE));
    }

    @Test
    void uneBaseSansEnseignantNeSupprimeRienDansKeycloak() {
        enBase(() -> entityManager.createNativeQuery("delete from enseignant").executeUpdate());
        identites.utilisateur(CIBLE, "orphelin@ecole.fr", false);

        deuxPassages();

        assertEquals(List.of(), identites.appels());
        assertTrue(identites.existe(ADMIN));
        assertTrue(identites.existe(CIBLE));
    }

    // --- Désactivation et réactivation interrompues ---

    @Test
    void uneDesactivationInterrompueEstRejoueePuisEcriteEnBase() {
        enBase(() -> inserer(CIBLE, "Zoé Bernard", "actif"));
        identites.utilisateur(CIBLE, "zoe@ecole.fr", false, false);

        reconciliation.reconcilier();
        assertEquals(List.of(), identites.appels());
        assertEquals("actif", statut(CIBLE));

        reconciliation.reconcilier();
        assertEquals(List.of("desactiver " + CIBLE), identites.appels());
        assertTrue(identites.sessionsRevoquees(CIBLE));
        assertFalse(identites.estActive(CIBLE));
        assertEquals("desactive", statut(CIBLE));
    }

    @Test
    void uneDesactivationInterrompueDUnInviteEstAussiAchevee() {
        enBase(() -> inserer(CIBLE, null, "invite"));
        identites.utilisateur(CIBLE, "invitee@ecole.fr", false, false);

        deuxPassages();

        assertEquals(List.of("desactiver " + CIBLE), identites.appels());
        assertEquals("desactive", statut(CIBLE));
    }

    @Test
    void uneReactivationInterrompueRendLeStatutActifOuInvite() {
        enBase(() -> {
            inserer(CIBLE, "Agathe Petit", "desactive");
            inserer(AUTRE, null, "desactive");
        });
        identites.utilisateur(CIBLE, "agathe@ecole.fr", false, true);
        identites.utilisateur(AUTRE, "sans-nom@ecole.fr", false, true);

        reconciliation.reconcilier();
        assertEquals("desactive", statut(CIBLE));

        reconciliation.reconcilier();
        assertEquals(List.of(), identites.appels());
        assertEquals("actif", statut(CIBLE));
        assertEquals("invite", statut(AUTRE));
    }

    @Test
    void unCompteEnSuppressionEncoreActiveEstDesactiveDansKeycloak() {
        enBase(() -> inserer(CIBLE, "Partante", "suppression_en_cours"));
        identites.utilisateur(CIBLE, "partante@ecole.fr", false, true);

        deuxPassages();

        assertEquals(List.of("desactiver " + CIBLE), identites.appels());
        assertFalse(identites.estActive(CIBLE));
        assertTrue(identites.existe(CIBLE));
        assertEquals("suppression_en_cours", statut(CIBLE));
    }

    @Test
    void unCompteDesactiveEnBaseNEstJamaisReactiveDansKeycloak() {
        enBase(() -> inserer(CIBLE, "Agathe Petit", "desactive"));
        identites.utilisateur(CIBLE, "agathe@ecole.fr", true, false);

        deuxPassages();

        assertEquals(List.of(), identites.appels());
        assertFalse(identites.estActive(CIBLE));
        assertTrue(identites.estAdministrateur(CIBLE));
        assertEquals("desactive", statut(CIBLE));
    }

    // --- Écarts qui ne se confirment pas ---

    @Test
    void unEcartResoluEntreDeuxPassagesNEstPasCorrige() {
        enBase(() -> inserer(CIBLE, "Zoé Bernard", "actif"));
        identites.utilisateur(CIBLE, "zoe@ecole.fr", false, false);

        reconciliation.reconcilier();
        // La requête de désactivation en cours écrit son statut.
        enBase(() -> entityManager.createNativeQuery("update enseignant set statut = 'desactive' where id = :id")
                .setParameter("id", CIBLE).executeUpdate());
        reconciliation.reconcilier();

        assertEquals(List.of(), identites.appels());
        assertEquals("desactive", statut(CIBLE));
    }

    @Test
    void unEcartQuiChangeDeNatureNEstPasCorrige() {
        enBase(() -> inserer(CIBLE, "Zoé Bernard", "actif"));
        identites.utilisateur(CIBLE, "zoe@ecole.fr", false, false);

        reconciliation.reconcilier();
        enBase(() -> entityManager.createNativeQuery("update enseignant set statut = 'supprime' where id = :id")
                .setParameter("id", CIBLE).executeUpdate());
        reconciliation.reconcilier();
        assertEquals(List.of(), identites.appels());

        reconciliation.reconcilier();
        assertEquals(List.of("supprimer " + CIBLE), identites.appels());
    }

    @Test
    void unEnseignantSansUtilisateurKeycloakEstSeulementJournalise() {
        enBase(() -> inserer(CIBLE, "Zoé Bernard", "actif"));

        deuxPassages();

        assertEquals(List.of(), identites.appels());
        assertEquals("actif", statut(CIBLE));
    }

    // --- Échecs ---

    @Test
    void unStatutChangeEntreLectureEtEcritureEstIgnoreEtLesAutresSontTraites() {
        enBase(() -> inserer(CIBLE, "Zoé Bernard", "actif"));
        identites.utilisateur(CIBLE, "zoe@ecole.fr", false, false);
        identites.utilisateur(AUTRE, "orphelin@ecole.fr", false);

        reconciliation.reconcilier();
        // Une requête concurrente supprime le compte pendant le rejeu de la désactivation : 409 statut_incompatible.
        identites.auPassage(IdentitesFactices.Etape.DESACTIVATION, () -> enBase(() -> entityManager
                .createNativeQuery("update enseignant set statut = 'suppression_en_cours' where id = :id")
                .setParameter("id", CIBLE).executeUpdate()));
        reconciliation.reconcilier();

        assertEquals("suppression_en_cours", statut(CIBLE));
        assertTrue(identites.appels().contains("desactiver " + CIBLE));
        assertTrue(identites.appels().contains("supprimer " + AUTRE));
        assertFalse(identites.existe(AUTRE));
    }

    @Test
    void unEchecKeycloakSurUnCompteNArretePasLesAutres() {
        enBase(() -> inserer(CIBLE, "Zoé Bernard", "actif"));
        identites.utilisateur(CIBLE, "zoe@ecole.fr", false, false);
        identites.utilisateur(AUTRE, "orphelin@ecole.fr", false);
        identites.echouerA(IdentitesFactices.Etape.DESACTIVATION);

        deuxPassages();

        assertEquals("actif", statut(CIBLE));
        assertFalse(identites.existe(AUTRE));

        identites.echouerA();
        reconciliation.reconcilier();
        assertEquals("desactive", statut(CIBLE));
    }

    @Test
    void unKeycloakInjoignableNeModifieRienEtLePassageSuivantReprend() {
        identites.utilisateur(CIBLE, "orphelin@ecole.fr", false);
        reconciliation.reconcilier();

        identites.echouerA(IdentitesFactices.Etape.LISTE);
        reconciliation.reconcilier();
        assertEquals(List.of(), identites.appels());
        assertTrue(identites.existe(CIBLE));

        identites.echouerA();
        reconciliation.reconcilier();
        assertEquals(List.of("supprimer " + CIBLE), identites.appels());
    }

    private void deuxPassages() {
        reconciliation.reconcilier();
        reconciliation.reconcilier();
    }

    private void enBase(Runnable ecriture) {
        QuarkusTransaction.requiringNew().run(ecriture);
    }

    private void inserer(UUID id, String nom, String statut) {
        entityManager.createNativeQuery("insert into enseignant (id, nom_affiche, statut) values (:id, cast(:nom as text), :statut)")
                .setParameter("id", id).setParameter("nom", nom).setParameter("statut", statut).executeUpdate();
    }

    private String statut(UUID id) {
        return QuarkusTransaction.requiringNew().call(() -> (String) entityManager
                .createNativeQuery("select statut from enseignant where id = :id")
                .setParameter("id", id).getSingleResult());
    }
}
