package fr.corpusmots.comptes.api;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.junit.jupiter.api.Assertions.assertEquals;

import fr.corpusmots.commun.api.ProblemeDto;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.quarkus.test.security.oidc.Claim;
import io.quarkus.test.security.oidc.OidcSecurity;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** Accès à /api selon le jeton et le statut de l'Enseignant (matrice de la story 1.3, AD-6). */
@QuarkusTest
class CompteActifTest {

    static final String ACTIF = "0190f0a0-0000-7000-8000-000000000001";
    static final String INVITE = "0190f0a0-0000-7000-8000-000000000002";
    static final String DESACTIVE = "0190f0a0-0000-7000-8000-000000000003";
    static final String INCONNU = "0190f0a0-0000-7000-8000-000000000004";

    @Inject
    EntityManager entityManager;

    @BeforeEach
    void equipe() {
        QuarkusTransaction.requiringNew().run(() -> {
            entityManager.createNativeQuery("delete from enseignant").executeUpdate();
            inserer(ACTIF, "Paul Roumy", "actif");
            inserer(INVITE, null, "invite");
            inserer(DESACTIVE, "Ancienne Collègue", "desactive");
        });
    }

    @Test
    @TestSecurity(user = ACTIF, roles = "admin")
    @OidcSecurity(claims = { @Claim(key = "sub", value = ACTIF), @Claim(key = "name", value = "Autre Nom") })
    void unEnseignantActifLitSonCompte() {
        given().when().get("/api/mon-compte")
                .then()
                .statusCode(200)
                .body("id", equalTo(ACTIF))
                .body("nomAffiche", equalTo("Paul Roumy"))
                .body("administrateur", equalTo(true));
    }

    @Test
    @TestSecurity(user = ACTIF)
    @OidcSecurity(claims = @Claim(key = "sub", value = ACTIF))
    void leRoleAdministrateurVientDuJeton() {
        given().when().get("/api/mon-compte")
                .then()
                .statusCode(200)
                .body("administrateur", equalTo(false));
    }

    @Test
    @TestSecurity(user = INVITE)
    @OidcSecurity(claims = { @Claim(key = "sub", value = INVITE), @Claim(key = "name", value = " Camille Martin ") })
    void unInviteDevientActifASonPremierAppelAvecLeNomSaisi() {
        given().when().get("/api/mon-compte")
                .then()
                .statusCode(200)
                .body("id", equalTo(INVITE))
                .body("nomAffiche", equalTo("Camille Martin"));

        assertEquals(List.of("actif", "Camille Martin"), ligne(INVITE));
    }

    @Test
    @TestSecurity(user = INVITE)
    @OidcSecurity(claims = @Claim(key = "sub", value = INVITE))
    void unInviteSansNomDansLeJetonResteInviteEtEstRefuse() {
        refuse403();

        assertEquals("invite", ligne(INVITE).get(0));
    }

    @Test
    @TestSecurity(user = INCONNU)
    @OidcSecurity(claims = @Claim(key = "sub", value = INCONNU))
    void unSubInconnuEstRefuse() {
        refuse403();
    }

    @Test
    @TestSecurity(user = DESACTIVE)
    @OidcSecurity(claims = { @Claim(key = "sub", value = DESACTIVE), @Claim(key = "name", value = "X") })
    void unEnseignantDesactiveEstRefuse() {
        refuse403();
    }

    @Test
    @TestSecurity(user = "pas-un-uuid")
    @OidcSecurity(claims = @Claim(key = "sub", value = "pas-un-uuid"))
    void unSubHorsFormatEstRefuse() {
        refuse403();
    }

    @Test
    void sansJetonLaReponseEst401() {
        given().when().get("/api/mon-compte")
                .then()
                .statusCode(401)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .header("WWW-Authenticate", equalTo("Bearer"))
                .body("code", equalTo("authentification.requise"));
    }

    @Test
    void unJetonInvalideDonne401() {
        given().header("Authorization", "Bearer pas-un-jeton").when().get("/api/mon-compte")
                .then()
                .statusCode(401)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo("authentification.requise"));
    }

    private static void refuse403() {
        given().when().get("/api/mon-compte")
                .then()
                .statusCode(403)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo("compte.inconnu_ou_inactif"));
    }

    private void inserer(String id, String nomAffiche, String statut) {
        entityManager.createNativeQuery("insert into enseignant (id, nom_affiche, statut) values (:id, cast(:nom as text), :statut)")
                .setParameter("id", UUID.fromString(id))
                .setParameter("nom", nomAffiche)
                .setParameter("statut", statut)
                .executeUpdate();
    }

    private List<String> ligne(String id) {
        Object[] ligne = QuarkusTransaction.requiringNew().call(() -> (Object[]) entityManager
                .createNativeQuery("select statut, nom_affiche from enseignant where id = :id")
                .setParameter("id", UUID.fromString(id))
                .getSingleResult());
        return java.util.Arrays.stream(ligne).map(String::valueOf).toList();
    }
}
