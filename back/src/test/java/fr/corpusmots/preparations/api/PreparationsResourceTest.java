package fr.corpusmots.preparations.api;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;

import fr.corpusmots.commun.api.EnseignantsDeTest;
import fr.corpusmots.commun.api.ProblemeDto;
import fr.corpusmots.referentiels.api.ReferentielsDeTest;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.quarkus.test.security.oidc.Claim;
import io.quarkus.test.security.oidc.OidcSecurity;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/** Création, liste et lecture des Préparations, isolées entre enseignants (matrice de la story 2.1, partie 1). */
@QuarkusTest
class PreparationsResourceTest {

    static final String CLAIRE = "0190f0a0-0000-7000-8000-000000000501";
    static final String ZOE = "0190f0a0-0000-7000-8000-000000000502";

    @Inject
    EnseignantsDeTest enseignants;

    @Inject
    ReferentielsDeTest referentiels;

    @Inject
    EntityManager entityManager;

    UUID rouleGalette;
    UUID loup;
    UUID module1;
    UUID moduleDuLoup;
    UUID cuisine;

    @BeforeEach
    void donnees() {
        enseignants.seulsActifs(CLAIRE, ZOE);
        QuarkusTransaction.requiringNew()
                .run(() -> entityManager.createNativeQuery("delete from preparation").executeUpdate());
        referentiels.effacer();
        rouleGalette = referentiels.album("La Roule Galette", "Natha Caputo");
        loup = referentiels.album("Le loup qui voulait changer de couleur", "Orianne Lallemand");
        module1 = referentiels.module(rouleGalette, "Module 1", 1);
        referentiels.module(rouleGalette, "Module 2", 2);
        moduleDuLoup = referentiels.module(loup, "Couleurs", 1);
        cuisine = referentiels.theme("cuisine");
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void creerUnePreparationCompletePuisLaRelire() {
        String id = given().contentType(ContentType.JSON)
                .body(Map.of("albumId", rouleGalette, "section", "ms", "moduleId", module1,
                        "themeDefautId", cuisine))
                .when().post("/api/preparations")
                .then()
                .statusCode(201)
                .body("id", notNullValue())
                .body("albumId", equalTo(rouleGalette.toString()))
                .body("titreAlbum", equalTo("La Roule Galette"))
                .body("section", equalTo("ms"))
                .body("moduleId", equalTo(module1.toString()))
                .body("nomModule", equalTo("Module 1"))
                .body("themeDefautId", equalTo(cuisine.toString()))
                .body("nomThemeDefaut", equalTo("cuisine"))
                .body("nombreMots", equalTo(0))
                .body("nombreIllustres", equalTo(0))
                .body("creeLe", notNullValue())
                .extract().path("id");

        assertEquals(UUID.fromString(CLAIRE), proprietaire(UUID.fromString(id)));
        given().when().get("/api/preparations/" + id)
                .then()
                .statusCode(200)
                .body("id", equalTo(id))
                .body("titreAlbum", equalTo("La Roule Galette"))
                .body("section", equalTo("ms"))
                .body("nomModule", equalTo("Module 1"))
                .body("nomThemeDefaut", equalTo("cuisine"))
                .body("nombreMots", equalTo(0))
                .body("nombreIllustres", equalTo(0));
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void moduleEtThemeSontFacultatifs() {
        given().contentType(ContentType.JSON)
                .body(Map.of("albumId", loup, "section", "gs"))
                .when().post("/api/preparations")
                .then()
                .statusCode(201)
                .body("titreAlbum", equalTo("Le loup qui voulait changer de couleur"))
                .body("section", equalTo("gs"))
                .body("moduleId", nullValue())
                .body("nomModule", nullValue())
                .body("themeDefautId", nullValue())
                .body("nomThemeDefaut", nullValue());
    }

    @ParameterizedTest
    @ValueSource(strings = { "PS", "xs", "", "petite" })
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void uneSectionInvalideEstRefusee(String section) {
        refus(Map.of("albumId", rouleGalette, "section", section), "preparation.section_invalide");
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void uneSectionAbsenteEstRefusee() {
        refus(Map.of("albumId", rouleGalette), "preparation.section_invalide");
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void unAlbumInconnuOuAbsentEstRefuse() {
        refus(Map.of("albumId", UUID.randomUUID(), "section", "ps"), "preparation.album_introuvable");
        refus(Map.of("section", "ps"), "preparation.album_introuvable");
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void unModuleInconnuOuDUnAutreAlbumEstRefuse() {
        refus(Map.of("albumId", rouleGalette, "section", "ps", "moduleId", UUID.randomUUID()),
                "preparation.module_invalide");
        refus(Map.of("albumId", rouleGalette, "section", "ps", "moduleId", moduleDuLoup),
                "preparation.module_invalide");
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void unThemeInconnuEstRefuse() {
        refus(Map.of("albumId", rouleGalette, "section", "ps", "themeDefautId", UUID.randomUUID()),
                "preparation.theme_introuvable");
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void unCorpsAbsentEstRefuse() {
        given().contentType(ContentType.JSON)
                .when().post("/api/preparations")
                .then()
                .statusCode(400)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo("requete.invalide"));
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void sansPreparationLaDerniereSectionEstNulle() {
        preparation(ZOE, loup, "gs", "2026-11-09T09:00:00Z");

        given().when().get("/api/preparations/derniere-section")
                .then()
                .statusCode(200)
                .body("containsKey('section')", equalTo(true))
                .body("section", nullValue());
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void laDerniereSectionEstCelleDeMaPreparationLaPlusRecente() {
        preparation(CLAIRE, loup, "gs", "2026-11-08T09:00:00Z");
        preparation(CLAIRE, rouleGalette, "ms", "2026-11-09T09:00:00Z");
        // Plus récente, mais d'un collègue : sans effet.
        preparation(ZOE, loup, "ps", "2026-11-09T10:00:00Z");

        given().when().get("/api/preparations/derniere-section")
                .then()
                .statusCode(200)
                .body("section", equalTo("ms"));
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void laDerniereSectionSuitLaCreation() {
        preparation(CLAIRE, loup, "gs", "2026-11-08T09:00:00Z");
        given().contentType(ContentType.JSON).body(Map.of("albumId", rouleGalette, "section", "ps"))
                .when().post("/api/preparations").then().statusCode(201);

        given().when().get("/api/preparations/derniere-section")
                .then()
                .statusCode(200)
                .body("section", equalTo("ps"));
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void laPreparationDUnCollegueEstIntrouvable() {
        UUID deZoe = preparation(ZOE, loup, "gs", "2026-11-09T09:00:00Z");

        for (String chemin : new String[] { "/api/preparations/" + deZoe, "/api/preparations/" + UUID.randomUUID() }) {
            given().when().get(chemin)
                    .then()
                    .statusCode(404)
                    .contentType(ProblemeDto.MEDIA_TYPE)
                    .body("code", equalTo("ressource.introuvable"));
        }
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void chacunNeVoitQueSesPropresPreparationsLesPlusRecentesDAbord() {
        UUID ancienne = preparation(CLAIRE, loup, "gs", "2026-11-08T09:00:00Z");
        UUID recente = preparationAvecModule(CLAIRE, rouleGalette, "ms", module1, "2026-11-09T09:00:00Z");
        preparation(ZOE, rouleGalette, "ps", "2026-11-09T10:00:00Z");

        given().when().get("/api/preparations")
                .then()
                .statusCode(200)
                .body("total", equalTo(2))
                .body("elements.id", contains(recente.toString(), ancienne.toString()))
                .body("elements[0].titreAlbum", equalTo("La Roule Galette"))
                .body("elements[0].section", equalTo("ms"))
                .body("elements[0].moduleId", equalTo(module1.toString()))
                .body("elements[0].nomModule", equalTo("Module 1"))
                .body("elements[0].nombreMots", equalTo(0))
                .body("elements[0].nombreAIllustrer", equalTo(0))
                .body("elements[1].titreAlbum", equalTo("Le loup qui voulait changer de couleur"))
                .body("elements[1].nomModule", nullValue());

        given().queryParam("page", 1).queryParam("taille", 1)
                .when().get("/api/preparations")
                .then()
                .statusCode(200)
                .body("total", equalTo(2))
                .body("elements.id", contains(ancienne.toString()));
    }

    @Test
    @TestSecurity(user = ZOE)
    @OidcSecurity(claims = @Claim(key = "sub", value = ZOE))
    void leCollegueNeVoitQueLesSiennes() {
        preparation(CLAIRE, loup, "gs", "2026-11-08T09:00:00Z");
        UUID deZoe = preparation(ZOE, rouleGalette, "ps", "2026-11-09T10:00:00Z");

        given().when().get("/api/preparations")
                .then()
                .statusCode(200)
                .body("total", equalTo(1))
                .body("elements.id", contains(deZoe.toString()));
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void unePaginationHorsLimitesEstRefusee() {
        given().queryParam("taille", 101)
                .when().get("/api/preparations")
                .then()
                .statusCode(400)
                .body("code", equalTo("requete.invalide"));
        given().queryParam("page", 21474836).queryParam("taille", 100)
                .when().get("/api/preparations")
                .then()
                .statusCode(400)
                .body("code", equalTo("requete.invalide"));
    }

    private void refus(Map<String, Object> corps, String code) {
        given().contentType(ContentType.JSON).body(new HashMap<>(corps))
                .when().post("/api/preparations")
                .then()
                .statusCode(400)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo(code));
        assertEquals(0L, QuarkusTransaction.requiringNew().call(() -> ((Number) entityManager
                .createNativeQuery("select count(*) from preparation where proprietaire_id = :claire")
                .setParameter("claire", UUID.fromString(CLAIRE))
                .getSingleResult()).longValue()));
    }

    private UUID proprietaire(UUID preparation) {
        return QuarkusTransaction.requiringNew().call(() -> (UUID) entityManager
                .createNativeQuery("select proprietaire_id from preparation where id = :id")
                .setParameter("id", preparation)
                .getSingleResult());
    }

    private UUID preparation(String proprietaire, UUID album, String section, String creeLe) {
        return preparationAvecModule(proprietaire, album, section, null, creeLe);
    }

    private UUID preparationAvecModule(String proprietaire, UUID album, String section, UUID module, String creeLe) {
        return QuarkusTransaction.requiringNew().call(() -> (UUID) entityManager.createNativeQuery(
                "insert into preparation (proprietaire_id, album_id, section, module_id, cree_le)"
                        + " values (:proprietaire, :album, :section, cast(:module as uuid), cast(:creeLe as timestamptz))"
                        + " returning id")
                .setParameter("proprietaire", UUID.fromString(proprietaire))
                .setParameter("album", album)
                .setParameter("section", section)
                .setParameter("module", module == null ? null : module.toString())
                .setParameter("creeLe", creeLe)
                .getSingleResult());
    }
}
