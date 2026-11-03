package fr.corpusmots.comptes.api;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;

import fr.corpusmots.commun.api.ProblemeDto;
import fr.corpusmots.comptes.service.IdentitesFactices;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.quarkus.test.security.oidc.Claim;
import io.quarkus.test.security.oidc.OidcSecurity;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** Administration › Comptes : liste, invitation, renvoi de l'invitation (matrice de la story 1.5, AD-18). */
@QuarkusTest
class ComptesResourceTest {

    static final String ADMIN = "0190f0a0-0000-7000-8000-000000000101";
    static final String ENSEIGNANTE = "0190f0a0-0000-7000-8000-000000000102";
    static final String ACCENTUEE = "0190f0a0-0000-7000-8000-000000000103";
    static final String DESACTIVEE = "0190f0a0-0000-7000-8000-000000000104";
    static final String INVITEE_B = "0190f0a0-0000-7000-8000-000000000105";
    static final String INVITEE_A = "0190f0a0-0000-7000-8000-000000000106";
    static final String SUPPRIMEE = "0190f0a0-0000-7000-8000-000000000107";
    static final String INCONNU = "0190f0a0-0000-7000-8000-000000000199";

    @Inject
    EntityManager entityManager;

    @Inject
    IdentitesFactices identites;

    @BeforeEach
    void equipe() {
        QuarkusTransaction.requiringNew().run(() -> {
            entityManager.createNativeQuery("delete from enseignant").executeUpdate();
            inserer(ADMIN, "Paul Roumy", "actif");
            inserer(ENSEIGNANTE, "zoé Bernard", "actif");
            inserer(ACCENTUEE, "Élodie Martin", "actif");
            inserer(DESACTIVEE, "Agathe Petit", "desactive");
            inserer(INVITEE_B, null, "invite");
            inserer(INVITEE_A, null, "invite");
            inserer(SUPPRIMEE, "Ancienne Collègue", "supprime");
        });
        identites.reinitialiser();
        identites.utilisateur(UUID.fromString(ADMIN), "paul@ecole.fr", true);
        identites.utilisateur(UUID.fromString(ENSEIGNANTE), "zoe@ecole.fr", false);
        identites.utilisateur(UUID.fromString(ACCENTUEE), "elodie@ecole.fr", false);
        identites.utilisateur(UUID.fromString(DESACTIVEE), "agathe@ecole.fr", false);
        identites.utilisateur(UUID.fromString(INVITEE_B), "b@ecole.fr", false);
        identites.utilisateur(UUID.fromString(INVITEE_A), "a@ecole.fr", false);
    }

    // --- Lister ---

    @Test
    @TestSecurity(user = ADMIN, roles = "admin")
    @OidcSecurity(claims = @Claim(key = "sub", value = ADMIN))
    void laListeMontreLesInvitesDAbordPuisLesNomsDansLOrdreFrancais() {
        given().when().get("/api/comptes")
                .then()
                .statusCode(200)
                .body("email", contains("a@ecole.fr", "b@ecole.fr", "agathe@ecole.fr", "elodie@ecole.fr",
                        "paul@ecole.fr", "zoe@ecole.fr"))
                .body("statut", contains("invite", "invite", "desactive", "actif", "actif", "actif"))
                .body("administrateur", contains(false, false, false, false, true, false))
                .body("[0].id", equalTo(INVITEE_A))
                .body("[0].nomAffiche", nullValue())
                .body("[3].nomAffiche", equalTo("Élodie Martin"));
    }

    @Test
    @TestSecurity(user = ADMIN, roles = "admin")
    @OidcSecurity(claims = @Claim(key = "sub", value = ADMIN))
    void unEnseignantInconnuDeKeycloakResteDansLaListeSansEmailNiRole() {
        String horsKeycloak = "0190f0a0-0000-7000-8000-000000000108";
        QuarkusTransaction.requiringNew().run(() -> inserer(horsKeycloak, "Bruno Hors", "actif"));

        given().when().get("/api/comptes")
                .then()
                .statusCode(200)
                .body("find { it.id == '" + horsKeycloak + "' }.email", equalTo(""))
                .body("find { it.id == '" + horsKeycloak + "' }.administrateur", equalTo(false))
                .body("find { it.id == '" + horsKeycloak + "' }.nomAffiche", equalTo("Bruno Hors"));
    }

    @Test
    @TestSecurity(user = ADMIN, roles = "admin")
    @OidcSecurity(claims = @Claim(key = "sub", value = ADMIN))
    void unKeycloakInjoignableDonne500() {
        identites.echouerA(IdentitesFactices.Etape.LISTE);

        given().when().get("/api/comptes")
                .then()
                .statusCode(500)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo("erreur.interne"));
    }

    // --- Inviter ---

    @Test
    @TestSecurity(user = ADMIN, roles = "admin")
    @OidcSecurity(claims = @Claim(key = "sub", value = ADMIN))
    void inviterCreeLUtilisateurKeycloakPuisLEnseignantInvite() {
        UUID id = UUID.randomUUID();
        identites.prochainId(id);

        given().contentType(ContentType.JSON).body("{\"email\": \" Claire@Ecole.fr \"}")
                .when().post("/api/comptes")
                .then()
                .statusCode(201)
                .body("id", equalTo(id.toString()))
                .body("email", equalTo("claire@ecole.fr"))
                .body("statut", equalTo("invite"))
                .body("administrateur", equalTo(false));

        assertEquals(List.of("creer claire@ecole.fr", "inviter " + id), identites.appels());
        assertEquals(List.of("invite"), statut(id));
        given().when().get("/api/comptes").then()
                .body("email", contains("a@ecole.fr", "b@ecole.fr", "claire@ecole.fr", "agathe@ecole.fr",
                        "elodie@ecole.fr", "paul@ecole.fr", "zoe@ecole.fr"))
                .body("[2].statut", equalTo("invite"));
    }

    @Test
    @TestSecurity(user = ADMIN, roles = "admin")
    @OidcSecurity(claims = @Claim(key = "sub", value = ADMIN))
    void unEmailDejaUtiliseEstRefuseSansCreerDEnseignant() {
        identites.emailDejaUtilise();

        given().contentType(ContentType.JSON).body("{\"email\": \"paul@ecole.fr\"}")
                .when().post("/api/comptes")
                .then()
                .statusCode(409)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo("compte.email_deja_utilise"));

        assertEquals(List.of("creer paul@ecole.fr"), identites.appels());
        assertEquals(7L, nombreDEnseignants());
    }

    @Test
    @TestSecurity(user = ADMIN, roles = "admin")
    @OidcSecurity(claims = @Claim(key = "sub", value = ADMIN))
    void unEchecEnBaseApresKeycloakSupprimeLUtilisateurKeycloak() {
        // Identifiant déjà pris en base : l'insertion de l'Enseignant échoue après les appels Keycloak.
        UUID dejaPris = UUID.fromString(INVITEE_A);
        identites.prochainId(dejaPris);

        given().contentType(ContentType.JSON).body("{\"email\": \"claire@ecole.fr\"}")
                .when().post("/api/comptes")
                .then()
                .statusCode(500)
                .body("code", equalTo("erreur.interne"));

        assertEquals(List.of("creer claire@ecole.fr", "inviter " + dejaPris, "supprimer " + dejaPris),
                identites.appels());
        assertEquals(7L, nombreDEnseignants());
    }

    @Test
    @TestSecurity(user = ADMIN, roles = "admin")
    @OidcSecurity(claims = @Claim(key = "sub", value = ADMIN))
    void unEmailInvalideEstRefuseSansAppelerKeycloak() {
        for (String corps : List.of("{\"email\": \"claire\"}", "{\"email\": \"  \"}", "{\"email\": \"a@b\"}",
                "{\"email\": \"a@@b.fr\"}", "{\"email\": \"claire dupont@ecole.fr\"}", "{\"email\": null}", "{}")) {
            given().contentType(ContentType.JSON).body(corps)
                    .when().post("/api/comptes")
                    .then()
                    .statusCode(400)
                    .contentType(ProblemeDto.MEDIA_TYPE)
                    .body("code", equalTo("requete.invalide"));
        }

        assertEquals(List.of(), identites.appels());
        assertEquals(7L, nombreDEnseignants());
    }

    @Test
    @TestSecurity(user = ADMIN, roles = "admin")
    @OidcSecurity(claims = @Claim(key = "sub", value = ADMIN))
    void unEmailTropLongOuAuxCaracteresRefusesParKeycloakEstRefuse() {
        String tropLong = "a".repeat(250) + "@b.fr";
        for (String email : List.of(tropLong, "a<b>@ecole.fr", "a,b@ecole.fr", "a;b@ecole.fr", "a:b@ecole.fr",
                "\\\"a\\\"@ecole.fr", "a'b@ecole.fr", "a(b)@ecole.fr", "a[b]@ecole.fr", "a\\u0001b@ecole.fr")) {
            given().contentType(ContentType.JSON).body("{\"email\": \"" + email + "\"}")
                    .when().post("/api/comptes")
                    .then()
                    .statusCode(400)
                    .body("code", equalTo("requete.invalide"));
        }

        assertEquals(List.of(), identites.appels());
    }

    // --- Renvoyer l'invitation ---

    @Test
    @TestSecurity(user = ADMIN, roles = "admin")
    @OidcSecurity(claims = @Claim(key = "sub", value = ADMIN))
    void renvoyerLInvitationDUnInviteEnvoieUnNouvelEmail() {
        given().when().post("/api/comptes/" + INVITEE_B + "/invitation")
                .then()
                .statusCode(204);

        assertEquals(List.of("inviter " + INVITEE_B), identites.appels());
    }

    @Test
    @TestSecurity(user = ADMIN, roles = "admin")
    @OidcSecurity(claims = @Claim(key = "sub", value = ADMIN))
    void renvoyerLInvitationDUnCompteQuiNEstPlusInviteEstRefuse() {
        for (String id : List.of(ENSEIGNANTE, DESACTIVEE)) {
            given().when().post("/api/comptes/" + id + "/invitation")
                    .then()
                    .statusCode(409)
                    .contentType(ProblemeDto.MEDIA_TYPE)
                    .body("code", equalTo("compte.invitation_inutile"));
        }

        assertEquals(List.of(), identites.appels());
    }

    @Test
    @TestSecurity(user = ADMIN, roles = "admin")
    @OidcSecurity(claims = @Claim(key = "sub", value = ADMIN))
    void renvoyerLInvitationDUnInconnuDonne404() {
        for (String id : List.of(INCONNU, SUPPRIMEE)) {
            given().when().post("/api/comptes/" + id + "/invitation")
                    .then()
                    .statusCode(404)
                    .contentType(ProblemeDto.MEDIA_TYPE)
                    .body("code", equalTo("ressource.introuvable"));
        }

        assertEquals(List.of(), identites.appels());
    }

    // --- Non-administrateur ---

    @Test
    @TestSecurity(user = ENSEIGNANTE)
    @OidcSecurity(claims = @Claim(key = "sub", value = ENSEIGNANTE))
    void unNonAdministrateurEstRefuseSurLesTroisRessources() {
        given().when().get("/api/comptes")
                .then().statusCode(403).contentType(ProblemeDto.MEDIA_TYPE).body("code", equalTo("acces.refuse"));
        given().contentType(ContentType.JSON).body("{\"email\": \"claire@ecole.fr\"}")
                .when().post("/api/comptes")
                .then().statusCode(403).contentType(ProblemeDto.MEDIA_TYPE).body("code", equalTo("acces.refuse"));
        given().when().post("/api/comptes/" + INVITEE_A + "/invitation")
                .then().statusCode(403).contentType(ProblemeDto.MEDIA_TYPE).body("code", equalTo("acces.refuse"));

        assertEquals(List.of(), identites.appels());
    }

    @Test
    void sansJetonLaReponseEst401() {
        given().when().get("/api/comptes")
                .then()
                .statusCode(401)
                .body("code", equalTo("authentification.requise"));
    }

    private void inserer(String id, String nomAffiche, String statut) {
        entityManager.createNativeQuery("insert into enseignant (id, nom_affiche, statut) values (:id, cast(:nom as text), :statut)")
                .setParameter("id", UUID.fromString(id))
                .setParameter("nom", nomAffiche)
                .setParameter("statut", statut)
                .executeUpdate();
    }

    @SuppressWarnings("unchecked")
    private List<String> statut(UUID id) {
        return QuarkusTransaction.requiringNew().call(() -> entityManager
                .createNativeQuery("select statut from enseignant where id = :id")
                .setParameter("id", id)
                .getResultList());
    }

    private long nombreDEnseignants() {
        return QuarkusTransaction.requiringNew().call(() -> ((Number) entityManager
                .createNativeQuery("select count(*) from enseignant").getSingleResult()).longValue());
    }
}
