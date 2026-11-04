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
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/** Renommage par l'enseignant connecté (matrice de la story 1.7, partie 1, FR-3). */
@QuarkusTest
class MonCompteResourceTest {

    static final String ACTIF = "0190f0a0-0000-7000-8000-000000000301";
    static final String DESACTIVE = "0190f0a0-0000-7000-8000-000000000302";
    static final String CHEMIN = "/api/mon-compte/nom-affiche";

    @Inject
    EntityManager entityManager;

    @BeforeEach
    void equipe() {
        QuarkusTransaction.requiringNew().run(() -> {
            entityManager.createNativeQuery("delete from enseignant").executeUpdate();
            inserer(ACTIF, "Claire Martin", "actif");
            inserer(DESACTIVE, "Ancienne Collègue", "desactive");
        });
    }

    @Test
    @TestSecurity(user = ACTIF)
    @OidcSecurity(claims = { @Claim(key = "sub", value = ACTIF), @Claim(key = "name", value = "Claire Martin"),
            @Claim(key = "email", value = "claire@ecole.fr") })
    void unEnseignantActifCorrigeSonNomSansEspacesAutour() {
        given().contentType(ContentType.JSON).body(Map.of("nomAffiche", "  Claire Dupont "))
                .when().put(CHEMIN)
                .then()
                .statusCode(200)
                .body("id", equalTo(ACTIF))
                .body("nomAffiche", equalTo("Claire Dupont"))
                .body("email", equalTo("claire@ecole.fr"))
                .body("administrateur", equalTo(false));

        assertEquals("Claire Dupont", nom(ACTIF));
        given().when().get("/api/mon-compte").then().statusCode(200).body("nomAffiche", equalTo("Claire Dupont"));
    }

    @Test
    @TestSecurity(user = ACTIF, roles = "admin")
    @OidcSecurity(claims = @Claim(key = "sub", value = ACTIF))
    void unNomDeCentCaracteresEstAccepte() {
        String nom = "a".repeat(100);
        given().contentType(ContentType.JSON).body(Map.of("nomAffiche", " " + nom + " "))
                .when().put(CHEMIN)
                .then()
                .statusCode(200)
                .body("nomAffiche", equalTo(nom))
                .body("email", equalTo(""))
                .body("administrateur", equalTo(true));

        assertEquals(nom, nom(ACTIF));
    }

    @ParameterizedTest
    @ValueSource(strings = { "{\"nomAffiche\":\"\"}", "{\"nomAffiche\":\"   \"}", "{}", "{\"nomAffiche\":null}",
            "{\"nomAffiche\":\"\u00a0\u00a0\ufeff\"}" })
    @TestSecurity(user = ACTIF)
    @OidcSecurity(claims = @Claim(key = "sub", value = ACTIF))
    void unNomVideOuAbsentEstRefuse(String corps) {
        refuse400(corps);
    }

    @Test
    @TestSecurity(user = ACTIF)
    @OidcSecurity(claims = @Claim(key = "sub", value = ACTIF))
    void unCorpsVideEstRefuse() {
        refuse400("");
    }

    @Test
    @TestSecurity(user = ACTIF)
    @OidcSecurity(claims = @Claim(key = "sub", value = ACTIF))
    void unNomDeCentUnCaracteresEstRefuse() {
        refuse400("{\"nomAffiche\":\" " + "a".repeat(101) + " \"}");
    }

    @Test
    @TestSecurity(user = DESACTIVE)
    @OidcSecurity(claims = @Claim(key = "sub", value = DESACTIVE))
    void unEnseignantDesactiveEstRefuse() {
        given().contentType(ContentType.JSON).body(Map.of("nomAffiche", "Nouveau Nom"))
                .when().put(CHEMIN)
                .then()
                .statusCode(403)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo("compte.inconnu_ou_inactif"));

        assertEquals("Ancienne Collègue", nom(DESACTIVE));
    }

    @Test
    void sansJetonLaReponseEst401() {
        given().contentType(ContentType.JSON).body(Map.of("nomAffiche", "Nouveau Nom"))
                .when().put(CHEMIN)
                .then()
                .statusCode(401)
                .contentType(ProblemeDto.MEDIA_TYPE);

        assertEquals("Claire Martin", nom(ACTIF));
    }

    private void refuse400(String corps) {
        given().contentType(ContentType.JSON).body(corps)
                .when().put(CHEMIN)
                .then()
                .statusCode(400)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo("compte.nom_affiche_invalide"));

        assertEquals("Claire Martin", nom(ACTIF));
    }

    private void inserer(String id, String nomAffiche, String statut) {
        entityManager.createNativeQuery("insert into enseignant (id, nom_affiche, statut) values (:id, :nom, :statut)")
                .setParameter("id", UUID.fromString(id))
                .setParameter("nom", nomAffiche)
                .setParameter("statut", statut)
                .executeUpdate();
    }

    private String nom(String id) {
        return QuarkusTransaction.requiringNew().call(() -> (String) entityManager
                .createNativeQuery("select nom_affiche from enseignant where id = :id")
                .setParameter("id", UUID.fromString(id))
                .getSingleResult());
    }
}
