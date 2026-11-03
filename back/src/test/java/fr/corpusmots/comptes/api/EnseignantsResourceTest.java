package fr.corpusmots.comptes.api;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;

import fr.corpusmots.commun.api.ProblemeDto;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.quarkus.test.security.oidc.Claim;
import io.quarkus.test.security.oidc.OidcSecurity;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** Annuaire de l'équipe (matrice de la story 1.6, partie 3, AD-20). */
@QuarkusTest
class EnseignantsResourceTest {

    static final String ADMIN = "0190f0a0-0000-7000-8000-000000000201";
    static final String ENSEIGNANTE = "0190f0a0-0000-7000-8000-000000000202";
    static final String DESACTIVEE = "0190f0a0-0000-7000-8000-000000000203";
    static final String EN_SUPPRESSION = "0190f0a0-0000-7000-8000-000000000204";
    static final String SUPPRIMEE = "0190f0a0-0000-7000-8000-000000000205";
    static final String INVITEE = "0190f0a0-0000-7000-8000-000000000206";
    static final String INVITEE_DESACTIVEE = "0190f0a0-0000-7000-8000-000000000207";

    @Inject
    EntityManager entityManager;

    @BeforeEach
    void equipe() {
        QuarkusTransaction.requiringNew().run(() -> {
            entityManager.createNativeQuery("delete from enseignant").executeUpdate();
            inserer(ADMIN, "Paul Roumy", "actif");
            inserer(ENSEIGNANTE, "Zoé Bernard", "actif");
            inserer(DESACTIVEE, "Agathe Petit", "desactive");
            inserer(EN_SUPPRESSION, "Bruno Durand", "suppression_en_cours");
            inserer(SUPPRIMEE, "Ancienne Collègue", "supprime");
            inserer(INVITEE, null, "invite");
            inserer(INVITEE_DESACTIVEE, null, "desactive");
        });
    }

    @Test
    @TestSecurity(user = ENSEIGNANTE)
    @OidcSecurity(claims = @Claim(key = "sub", value = ENSEIGNANTE))
    void unEnseignantNonAdministrateurLitLAnnuaireSansLesInvites() {
        given().when().get("/api/enseignants")
                .then()
                .statusCode(200)
                .body("$", hasSize(5))
                .body("id", containsInAnyOrder(ADMIN, ENSEIGNANTE, DESACTIVEE, EN_SUPPRESSION, SUPPRIMEE))
                .body("find { it.id == '" + DESACTIVEE + "' }.nomAffiche", equalTo("Agathe Petit"))
                .body("find { it.id == '" + DESACTIVEE + "' }.statut", equalTo("desactive"))
                .body("find { it.id == '" + EN_SUPPRESSION + "' }.statut", equalTo("suppression_en_cours"))
                .body("find { it.id == '" + SUPPRIMEE + "' }.nomAffiche", equalTo("Ancienne Collègue"))
                .body("find { it.id == '" + SUPPRIMEE + "' }.statut", equalTo("supprime"))
                .body("find { it.id == '" + ENSEIGNANTE + "' }", equalTo(Map.of(
                        "id", ENSEIGNANTE, "nomAffiche", "Zoé Bernard", "statut", "actif")));
    }

    @Test
    @TestSecurity(user = ADMIN, roles = "admin")
    @OidcSecurity(claims = @Claim(key = "sub", value = ADMIN))
    void unAdministrateurLitLeMemeAnnuaire() {
        given().when().get("/api/enseignants")
                .then()
                .statusCode(200)
                .body("id", containsInAnyOrder(ADMIN, ENSEIGNANTE, DESACTIVEE, EN_SUPPRESSION, SUPPRIMEE));
    }

    @Test
    void sansJetonLaReponseEst401() {
        given().when().get("/api/enseignants")
                .then()
                .statusCode(401)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo("authentification.requise"));
    }

    @Test
    @TestSecurity(user = DESACTIVEE)
    @OidcSecurity(claims = @Claim(key = "sub", value = DESACTIVEE))
    void unEnseignantDesactiveEstRefuse() {
        given().when().get("/api/enseignants")
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
}
