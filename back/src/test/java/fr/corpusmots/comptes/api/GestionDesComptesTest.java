package fr.corpusmots.comptes.api;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import fr.corpusmots.commun.api.ProblemeDto;
import fr.corpusmots.comptes.service.ComptesAdministration;
import fr.corpusmots.comptes.service.IdentitesFactices;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.quarkus.test.security.oidc.Claim;
import io.quarkus.test.security.oidc.OidcSecurity;
import io.restassured.http.ContentType;
import io.restassured.response.ValidatableResponse;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import java.time.Duration;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executors;
import java.util.concurrent.ExecutorService;
import java.util.function.Supplier;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Administration › Comptes : désactiver, réactiver, donner et retirer le rôle d'administrateur (matrice de la story
 * 1.6, AD-6, AD-18).
 */
@QuarkusTest
class GestionDesComptesTest {

    static final String ADMIN = "0190f0a0-0000-7000-8000-000000000201";
    static final String ENSEIGNANTE = "0190f0a0-0000-7000-8000-000000000202";
    static final String DESACTIVEE = "0190f0a0-0000-7000-8000-000000000203";
    static final String DESACTIVEE_SANS_NOM = "0190f0a0-0000-7000-8000-000000000204";
    static final String INVITEE = "0190f0a0-0000-7000-8000-000000000205";
    static final String SUPPRIMEE = "0190f0a0-0000-7000-8000-000000000206";
    static final String EN_SUPPRESSION = "0190f0a0-0000-7000-8000-000000000207";
    static final String INCONNU = "0190f0a0-0000-7000-8000-000000000299";

    @Inject
    EntityManager entityManager;

    @Inject
    IdentitesFactices identites;

    @Inject
    ComptesAdministration administration;

    @BeforeEach
    void equipe() {
        QuarkusTransaction.requiringNew().run(() -> {
            entityManager.createNativeQuery("delete from enseignant").executeUpdate();
            inserer(ADMIN, "Paul Roumy", "actif");
            inserer(ENSEIGNANTE, "Zoé Bernard", "actif");
            inserer(DESACTIVEE, "Agathe Petit", "desactive");
            inserer(DESACTIVEE_SANS_NOM, null, "desactive");
            inserer(INVITEE, null, "invite");
            inserer(SUPPRIMEE, "Ancienne Collègue", "supprime");
            inserer(EN_SUPPRESSION, "Partante", "suppression_en_cours");
        });
        identites.reinitialiser();
        identites.utilisateur(id(ADMIN), "paul@ecole.fr", true);
        identites.utilisateur(id(ENSEIGNANTE), "zoe@ecole.fr", false);
        identites.utilisateur(id(DESACTIVEE), "agathe@ecole.fr", false, false);
        identites.utilisateur(id(DESACTIVEE_SANS_NOM), "sans-nom@ecole.fr", false, false);
        identites.utilisateur(id(INVITEE), "invitee@ecole.fr", false);
        identites.utilisateur(id(EN_SUPPRESSION), "partante@ecole.fr", false, false);
    }

    // --- Désactiver ---

    @Test
    @TestSecurity(user = ADMIN, roles = "admin")
    @OidcSecurity(claims = @Claim(key = "sub", value = ADMIN))
    void desactiverCoupeKeycloakEtSesSessionsPuisEcritLeStatut() {
        desactiver(ENSEIGNANTE).statusCode(204);

        assertEquals(List.of("desactiver " + ENSEIGNANTE), identites.appels());
        assertFalse(identites.estActive(id(ENSEIGNANTE)));
        assertTrue(identites.sessionsRevoquees(id(ENSEIGNANTE)));
        assertEquals("desactive", statut(ENSEIGNANTE));
        assertEquals("Zoé Bernard", nomAffiche(ENSEIGNANTE));
        given().when().get("/api/comptes").then()
                .body("find { it.id == '" + ENSEIGNANTE + "' }.statut", equalTo("desactive"));
    }

    @Test
    @TestSecurity(user = ADMIN, roles = "admin")
    @OidcSecurity(claims = @Claim(key = "sub", value = ADMIN))
    void unInviteSeDesactiveAussi() {
        desactiver(INVITEE).statusCode(204);

        assertEquals("desactive", statut(INVITEE));
        assertFalse(identites.estActive(id(INVITEE)));
    }

    @Test
    @TestSecurity(user = ENSEIGNANTE)
    @OidcSecurity(claims = @Claim(key = "sub", value = ENSEIGNANTE))
    void unCompteDesactiveEstRefuseParLApiAvecUnJetonEncoreValide() {
        given().when().get("/api/mon-compte").then().statusCode(200);

        administration.desactiver(id(ENSEIGNANTE), id(ADMIN));

        given().when().get("/api/mon-compte")
                .then()
                .statusCode(403)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo("compte.inconnu_ou_inactif"));
    }

    @Test
    @TestSecurity(user = ADMIN, roles = "admin")
    @OidcSecurity(claims = @Claim(key = "sub", value = ADMIN))
    void unAdministrateurNePeutPasSeDesactiverLuiMeme() {
        identites.utilisateur(id(ENSEIGNANTE), "zoe@ecole.fr", true);

        desactiver(ADMIN).statusCode(409)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo("compte.auto_desactivation"));

        assertEquals(List.of(), identites.appels());
        assertEquals("actif", statut(ADMIN));
    }

    @Test
    @TestSecurity(user = ADMIN, roles = "admin")
    @OidcSecurity(claims = @Claim(key = "sub", value = ADMIN))
    void desactiverLeSeulAdministrateurActifEstRefuse() {
        // Le jeton de l'acteur porte encore admin, mais Keycloak ne compte plus que Zoé, et un administrateur désactivé
        // ne compte pas.
        identites.utilisateur(id(ADMIN), "paul@ecole.fr", false);
        identites.utilisateur(id(ENSEIGNANTE), "zoe@ecole.fr", true);
        identites.utilisateur(id(DESACTIVEE), "agathe@ecole.fr", true, false);

        desactiver(ENSEIGNANTE).statusCode(409)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo("compte.dernier_administrateur"));

        assertEquals(List.of(), identites.appels());
        assertTrue(identites.estActive(id(ENSEIGNANTE)));
        assertEquals("actif", statut(ENSEIGNANTE));
    }

    @Test
    @TestSecurity(user = ADMIN, roles = "admin")
    @OidcSecurity(claims = @Claim(key = "sub", value = ADMIN))
    void desactiverUnAdministrateurQuandIlEnResteUnAutreEstAdmis() {
        identites.utilisateur(id(ENSEIGNANTE), "zoe@ecole.fr", true);

        desactiver(ENSEIGNANTE).statusCode(204);

        assertEquals("desactive", statut(ENSEIGNANTE));
    }

    @Test
    @TestSecurity(user = ADMIN, roles = "admin")
    @OidcSecurity(claims = @Claim(key = "sub", value = ADMIN))
    void desactiverUnCompteQuiNEstNiInviteNiActifEstSansObjet() {
        for (String id : List.of(DESACTIVEE, EN_SUPPRESSION)) {
            desactiver(id).statusCode(409)
                    .contentType(ProblemeDto.MEDIA_TYPE)
                    .body("code", equalTo("compte.statut_incompatible"));
        }

        assertEquals(List.of(), identites.appels());
    }

    @Test
    @TestSecurity(user = ADMIN, roles = "admin")
    @OidcSecurity(claims = @Claim(key = "sub", value = ADMIN))
    void unKeycloakInjoignableLaisseLaBaseInchangee() {
        identites.echouerA(IdentitesFactices.Etape.DESACTIVATION);
        desactiver(ENSEIGNANTE).statusCode(500).body("code", equalTo("erreur.interne"));
        assertEquals("actif", statut(ENSEIGNANTE));

        identites.echouerA(IdentitesFactices.Etape.ADMINISTRATEURS);
        desactiver(ENSEIGNANTE).statusCode(500).body("code", equalTo("erreur.interne"));
        assertEquals("actif", statut(ENSEIGNANTE));

        identites.echouerA(IdentitesFactices.Etape.REACTIVATION);
        reactiver(DESACTIVEE).statusCode(500).body("code", equalTo("erreur.interne"));
        assertEquals("desactive", statut(DESACTIVEE));

        // « Réessayer » rejoue l'action une fois Keycloak revenu.
        identites.echouerA();
        desactiver(ENSEIGNANTE).statusCode(204);
        assertEquals("desactive", statut(ENSEIGNANTE));
    }

    // --- Réactiver ---

    @Test
    @TestSecurity(user = ADMIN, roles = "admin")
    @OidcSecurity(claims = @Claim(key = "sub", value = ADMIN))
    void reactiverRendLeStatutActifAvecSonNom() {
        reactiver(DESACTIVEE).statusCode(204);

        assertEquals(List.of("reactiver " + DESACTIVEE), identites.appels());
        assertTrue(identites.estActive(id(DESACTIVEE)));
        assertEquals("actif", statut(DESACTIVEE));
        assertEquals("Agathe Petit", nomAffiche(DESACTIVEE));
    }

    @Test
    @TestSecurity(user = ADMIN, roles = "admin")
    @OidcSecurity(claims = @Claim(key = "sub", value = ADMIN))
    void reactiverUnCompteJamaisActiveLeRendInvite() {
        reactiver(DESACTIVEE_SANS_NOM).statusCode(204);

        assertEquals("invite", statut(DESACTIVEE_SANS_NOM));
    }

    @Test
    @TestSecurity(user = ADMIN, roles = "admin")
    @OidcSecurity(claims = @Claim(key = "sub", value = ADMIN))
    void reactiverUnCompteNonDesactiveEstSansObjet() {
        for (String id : List.of(ENSEIGNANTE, INVITEE, EN_SUPPRESSION)) {
            reactiver(id).statusCode(409)
                    .contentType(ProblemeDto.MEDIA_TYPE)
                    .body("code", equalTo("compte.statut_incompatible"));
        }

        assertEquals(List.of(), identites.appels());
    }

    @Test
    @TestSecurity(user = ADMIN, roles = "admin")
    @OidcSecurity(claims = @Claim(key = "sub", value = ADMIN))
    void desactiverPuisReactiverRendLeCompteTelQuIlEtait() {
        desactiver(ENSEIGNANTE).statusCode(204);
        reactiver(ENSEIGNANTE).statusCode(204);

        assertEquals("actif", statut(ENSEIGNANTE));
        assertEquals("Zoé Bernard", nomAffiche(ENSEIGNANTE));
        assertTrue(identites.estActive(id(ENSEIGNANTE)));
    }

    // --- Rôle d'administrateur ---

    @Test
    @TestSecurity(user = ADMIN, roles = "admin")
    @OidcSecurity(claims = @Claim(key = "sub", value = ADMIN))
    void donnerLeRolePasseParKeycloakSeulement() {
        changerRole(ENSEIGNANTE, true).statusCode(204);

        assertEquals(List.of("admin " + ENSEIGNANTE), identites.appels());
        assertTrue(identites.estAdministrateur(id(ENSEIGNANTE)));
        assertEquals("actif", statut(ENSEIGNANTE));
        given().when().get("/api/comptes").then()
                .body("find { it.id == '" + ENSEIGNANTE + "' }.administrateur", equalTo(true));
    }

    @Test
    @TestSecurity(user = ADMIN, roles = "admin")
    @OidcSecurity(claims = @Claim(key = "sub", value = ADMIN))
    void retirerLeRoleQuandIlResteUnAutreAdministrateurActif() {
        identites.utilisateur(id(ENSEIGNANTE), "zoe@ecole.fr", true);

        changerRole(ENSEIGNANTE, false).statusCode(204);
        assertFalse(identites.estAdministrateur(id(ENSEIGNANTE)));

        // Son propre rôle aussi, s'il reste un autre administrateur actif.
        identites.utilisateur(id(ENSEIGNANTE), "zoe@ecole.fr", true);
        changerRole(ADMIN, false).statusCode(204);
        assertFalse(identites.estAdministrateur(id(ADMIN)));
    }

    @Test
    @TestSecurity(user = ADMIN, roles = "admin")
    @OidcSecurity(claims = @Claim(key = "sub", value = ADMIN))
    void retirerLeRoleDuSeulAdministrateurActifEstRefuse() {
        // Agathe est administratrice, mais désactivée : elle ne compte pas.
        identites.utilisateur(id(DESACTIVEE), "agathe@ecole.fr", true, false);

        changerRole(ADMIN, false).statusCode(409)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo("compte.dernier_administrateur"));

        assertEquals(List.of(), identites.appels());
        assertTrue(identites.estAdministrateur(id(ADMIN)));
    }

    @Test
    @TestSecurity(user = ADMIN, roles = "admin")
    @OidcSecurity(claims = @Claim(key = "sub", value = ADMIN))
    void unAdministrateurInviteOuDesactiveEnBaseNeComptePas() {
        // Zoé est la seule administratrice qui peut se connecter : l'invitée et Agathe (désactivée en base, activée
        // dans Keycloak) ont le rôle mais ne comptent pas ; le jeton de Paul porte encore admin.
        identites.utilisateur(id(ADMIN), "paul@ecole.fr", false);
        identites.utilisateur(id(ENSEIGNANTE), "zoe@ecole.fr", true);
        identites.utilisateur(id(INVITEE), "invitee@ecole.fr", true);
        identites.utilisateur(id(DESACTIVEE), "agathe@ecole.fr", true, true);

        changerRole(ENSEIGNANTE, false).statusCode(409).body("code", equalTo("compte.dernier_administrateur"));
        desactiver(ENSEIGNANTE).statusCode(409).body("code", equalTo("compte.dernier_administrateur"));

        assertEquals(List.of(), identites.appels());
        assertTrue(identites.estAdministrateur(id(ENSEIGNANTE)));
        assertEquals("actif", statut(ENSEIGNANTE));
    }

    @Test
    @TestSecurity(user = ADMIN, roles = "admin")
    @OidcSecurity(claims = @Claim(key = "sub", value = ADMIN))
    void sansAucunAdministrateurActifLuDansKeycloakLeRetraitEstRefuse() {
        identites.utilisateur(id(ADMIN), "paul@ecole.fr", false);

        changerRole(ADMIN, false).statusCode(409).body("code", equalTo("compte.dernier_administrateur"));
        desactiver(ENSEIGNANTE).statusCode(409).body("code", equalTo("compte.dernier_administrateur"));

        assertEquals(List.of(), identites.appels());
    }

    @Test
    @TestSecurity(user = ADMIN, roles = "admin")
    @OidcSecurity(claims = @Claim(key = "sub", value = ADMIN))
    void deuxRetraitsSimultanesNeLaissentPasLEquipeSansAdministrateur() throws Exception {
        identites.utilisateur(id(ENSEIGNANTE), "zoe@ecole.fr", true);
        // Sans sérialisation, chaque requête lirait deux administrateurs avant que l'autre retire le sien.
        identites.pauseApresLectureAdministrateurs(Duration.ofMillis(500));

        ExecutorService executeur = Executors.newFixedThreadPool(2);
        try {
            CompletableFuture<Integer> retirerZoe = CompletableFuture.supplyAsync(
                    statutDe(() -> changerRole(ENSEIGNANTE, false)), executeur);
            CompletableFuture<Integer> retirerPaul = CompletableFuture.supplyAsync(
                    statutDe(() -> changerRole(ADMIN, false)), executeur);

            List<Integer> statuts = List.of(retirerZoe.get(), retirerPaul.get()).stream().sorted().toList();
            assertEquals(List.of(204, 409), statuts);
        } finally {
            executeur.shutdownNow();
        }
        assertNotEquals(identites.estAdministrateur(id(ADMIN)), identites.estAdministrateur(id(ENSEIGNANTE)));
    }

    @Test
    @TestSecurity(user = ADMIN, roles = "admin")
    @OidcSecurity(claims = @Claim(key = "sub", value = ADMIN))
    void unRoleSansValeurEstRefuse() {
        for (String corps : List.of("{}", "{\"administrateur\": null}")) {
            given().contentType(ContentType.JSON).body(corps)
                    .when().put("/api/comptes/" + ENSEIGNANTE + "/administrateur")
                    .then()
                    .statusCode(400)
                    .contentType(ProblemeDto.MEDIA_TYPE)
                    .body("code", equalTo("requete.invalide"));
        }

        assertEquals(List.of(), identites.appels());
    }

    @Test
    @TestSecurity(user = ADMIN, roles = "admin")
    @OidcSecurity(claims = @Claim(key = "sub", value = ADMIN))
    void leRoleDUnCompteEnSuppressionNeChangePas() {
        changerRole(EN_SUPPRESSION, true).statusCode(409).body("code", equalTo("compte.statut_incompatible"));

        assertEquals(List.of(), identites.appels());
    }

    // --- Compte absent, non-administrateur ---

    @Test
    @TestSecurity(user = ADMIN, roles = "admin")
    @OidcSecurity(claims = @Claim(key = "sub", value = ADMIN))
    void uneActionSurUnCompteAbsentOuSupprimeDonne404() {
        for (String id : List.of(INCONNU, SUPPRIMEE)) {
            for (ValidatableResponse reponse : List.of(desactiver(id), reactiver(id), changerRole(id, true),
                    changerRole(id, false))) {
                reponse.statusCode(404)
                        .contentType(ProblemeDto.MEDIA_TYPE)
                        .body("code", equalTo("ressource.introuvable"));
            }
        }

        assertEquals(List.of(), identites.appels());
    }

    @Test
    @TestSecurity(user = ENSEIGNANTE)
    @OidcSecurity(claims = @Claim(key = "sub", value = ENSEIGNANTE))
    void unNonAdministrateurEstRefuseSurChaqueRessource() {
        for (ValidatableResponse reponse : List.of(desactiver(ADMIN), reactiver(DESACTIVEE),
                changerRole(ENSEIGNANTE, true))) {
            reponse.statusCode(403)
                    .contentType(ProblemeDto.MEDIA_TYPE)
                    .body("code", equalTo("acces.refuse"));
        }

        assertEquals(List.of(), identites.appels());
    }

    private static ValidatableResponse desactiver(String id) {
        return given().when().post("/api/comptes/" + id + "/desactivation").then();
    }

    private static ValidatableResponse reactiver(String id) {
        return given().when().post("/api/comptes/" + id + "/reactivation").then();
    }

    private static ValidatableResponse changerRole(String id, boolean administrateur) {
        return given().contentType(ContentType.JSON).body("{\"administrateur\": " + administrateur + "}")
                .when().put("/api/comptes/" + id + "/administrateur").then();
    }

    private static Supplier<Integer> statutDe(Supplier<ValidatableResponse> requete) {
        return () -> requete.get().extract().statusCode();
    }

    private static UUID id(String id) {
        return UUID.fromString(id);
    }

    private void inserer(String id, String nomAffiche, String statut) {
        entityManager.createNativeQuery("insert into enseignant (id, nom_affiche, statut) values (:id, cast(:nom as text), :statut)")
                .setParameter("id", UUID.fromString(id))
                .setParameter("nom", nomAffiche)
                .setParameter("statut", statut)
                .executeUpdate();
    }

    private String statut(String id) {
        return (String) QuarkusTransaction.requiringNew().call(() -> entityManager
                .createNativeQuery("select statut from enseignant where id = :id")
                .setParameter("id", UUID.fromString(id))
                .getSingleResult());
    }

    private String nomAffiche(String id) {
        return (String) QuarkusTransaction.requiringNew().call(() -> entityManager
                .createNativeQuery("select nom_affiche from enseignant where id = :id")
                .setParameter("id", UUID.fromString(id))
                .getSingleResult());
    }
}
