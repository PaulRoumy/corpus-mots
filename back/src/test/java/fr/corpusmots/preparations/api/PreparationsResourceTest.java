package fr.corpusmots.preparations.api;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

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

/**
 * Création, liste, lecture et réglages des Préparations, isolées entre enseignants, et retrait d'un Module ou d'un
 * Thème supprimé (stories 2.1 et 2.2, parties 1 à 3).
 */
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
    UUID module2;
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
        module2 = referentiels.module(rouleGalette, "Module 2", 2);
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

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void reglerUnePreparationPuisLaRelire() {
        UUID id = preparation(CLAIRE, rouleGalette, "ms", "2026-11-09T09:00:00Z");

        given().contentType(ContentType.JSON)
                .body(Map.of("moduleId", module2, "themeDefautId", cuisine, "tempsPasseMinutes", 210))
                .when().put("/api/preparations/" + id + "/reglages")
                .then()
                .statusCode(200)
                .body("id", equalTo(id.toString()))
                .body("titreAlbum", equalTo("La Roule Galette"))
                .body("section", equalTo("ms"))
                .body("moduleId", equalTo(module2.toString()))
                .body("nomModule", equalTo("Module 2"))
                .body("themeDefautId", equalTo(cuisine.toString()))
                .body("nomThemeDefaut", equalTo("cuisine"))
                .body("tempsPasseMinutes", equalTo(210));

        given().when().get("/api/preparations/" + id)
                .then()
                .statusCode(200)
                .body("moduleId", equalTo(module2.toString()))
                .body("nomModule", equalTo("Module 2"))
                .body("themeDefautId", equalTo(cuisine.toString()))
                .body("nomThemeDefaut", equalTo("cuisine"))
                .body("tempsPasseMinutes", equalTo(210));
        assertEquals(new Reglages(module2, cuisine, 210), reglages(id));
    }

    @ParameterizedTest
    @ValueSource(ints = { 0, 6000 })
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void lesBornesDuTempsPasseSontAcceptees(int minutes) {
        UUID id = preparation(CLAIRE, rouleGalette, "ms", "2026-11-09T09:00:00Z");

        given().contentType(ContentType.JSON)
                .body(Map.of("tempsPasseMinutes", minutes))
                .when().put("/api/preparations/" + id + "/reglages")
                .then()
                .statusCode(200)
                .body("tempsPasseMinutes", equalTo(minutes));
        assertEquals(new Reglages(null, null, minutes), reglages(id));
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void reglerANullRetireLesTroisValeurs() {
        UUID id = preparationReglee(CLAIRE);
        Map<String, Object> corps = new HashMap<>();
        corps.put("moduleId", null);
        corps.put("themeDefautId", null);
        corps.put("tempsPasseMinutes", null);

        given().contentType(ContentType.JSON)
                .body(corps)
                .when().put("/api/preparations/" + id + "/reglages")
                .then()
                .statusCode(200)
                .body("moduleId", nullValue())
                .body("nomModule", nullValue())
                .body("themeDefautId", nullValue())
                .body("nomThemeDefaut", nullValue())
                .body("tempsPasseMinutes", nullValue());
        assertEquals(new Reglages(null, null, null), reglages(id));
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void reglerUnModuleInconnuOuDUnAutreAlbumEstRefuse() {
        UUID id = preparationReglee(CLAIRE);

        refusDeReglage(id, Map.of("moduleId", UUID.randomUUID()), 400, "preparation.module_invalide");
        refusDeReglage(id, Map.of("moduleId", moduleDuLoup, "themeDefautId", cuisine), 400,
                "preparation.module_invalide");
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void reglerUnThemeInconnuEstRefuse() {
        UUID id = preparationReglee(CLAIRE);

        refusDeReglage(id, Map.of("moduleId", module1, "themeDefautId", UUID.randomUUID()), 400,
                "preparation.theme_introuvable");
    }

    @ParameterizedTest
    @ValueSource(ints = { -1, 6001, 45, 5990, Integer.MIN_VALUE, Integer.MAX_VALUE })
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void unTempsPasseHorsBornesOuHorsDemiHeureEstRefuse(int minutes) {
        UUID id = preparationReglee(CLAIRE);

        refusDeReglage(id, Map.of("moduleId", module1, "themeDefautId", cuisine, "tempsPasseMinutes", minutes), 400,
                "preparation.temps_passe_invalide");
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void reglerLaPreparationDUnCollegueEstIntrouvable() {
        UUID deZoe = preparationReglee(ZOE);

        refusDeReglage(deZoe, Map.of("tempsPasseMinutes", 30), 404, "ressource.introuvable");
        // Le 404 passe avant toute validation : un corps invalide ne révèle rien de la Préparation du collègue.
        refusDeReglage(deZoe, Map.of("tempsPasseMinutes", -1), 404, "ressource.introuvable");
        refusDeReglage(deZoe, Map.of("moduleId", moduleDuLoup), 404, "ressource.introuvable");
        given().contentType(ContentType.JSON).body(Map.of("tempsPasseMinutes", 30))
                .when().put("/api/preparations/" + UUID.randomUUID() + "/reglages")
                .then()
                .statusCode(404)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo("ressource.introuvable"));
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void reglerSansCorpsEstRefuse() {
        UUID id = preparationReglee(CLAIRE);

        given().contentType(ContentType.JSON)
                .when().put("/api/preparations/" + id + "/reglages")
                .then()
                .statusCode(400)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo("requete.invalide"));
        assertEquals(new Reglages(module1, cuisine, 60), reglages(id));
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void supprimerUnModuleLeRetireDesPreparationsDeTousLesEnseignants() {
        UUID moduleDeClaire = referentiels.module(rouleGalette, "Module 3", 3, CLAIRE);
        UUID deClaire = preparationAvecModule(CLAIRE, rouleGalette, "ms", moduleDeClaire, "2026-11-09T09:00:00Z");
        UUID deZoe = preparationAvecModule(ZOE, rouleGalette, "gs", moduleDeClaire, "2026-11-09T10:00:00Z");
        UUID autreModule = preparationAvecModule(ZOE, rouleGalette, "ps", module2, "2026-11-09T11:00:00Z");

        given().when().delete("/api/modules/" + moduleDeClaire)
                .then()
                .statusCode(204);

        assertNull(reglages(deClaire).moduleId());
        assertNull(reglages(deZoe).moduleId());
        assertEquals(module2, reglages(autreModule).moduleId());
        given().when().get("/api/preparations/" + deClaire)
                .then()
                .statusCode(200)
                .body("moduleId", nullValue())
                .body("nomModule", nullValue());
    }

    @Test
    @TestSecurity(user = ZOE)
    @OidcSecurity(claims = @Claim(key = "sub", value = ZOE))
    void unModuleQueLEnseignantNePeutSupprimerResteDansLesPreparations() {
        UUID moduleDeClaire = referentiels.module(rouleGalette, "Module 3", 3, CLAIRE);
        UUID deZoe = preparationAvecModule(ZOE, rouleGalette, "gs", moduleDeClaire, "2026-11-09T10:00:00Z");

        given().when().delete("/api/modules/" + moduleDeClaire)
                .then()
                .statusCode(403)
                .body("code", equalTo("module.reserve_au_createur"));

        assertEquals(moduleDeClaire, reglages(deZoe).moduleId());
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void supprimerUnThemeLeRetireDesPreparationsDeTousLesEnseignants() {
        UUID themeDeClaire = referentiels.theme("animaux", CLAIRE);
        UUID deClaire = preparationAvecModule(CLAIRE, rouleGalette, "ms", module1, "2026-11-09T09:00:00Z");
        UUID deZoe = preparationAvecModule(ZOE, rouleGalette, "gs", module1, "2026-11-09T10:00:00Z");
        UUID autreTheme = preparationAvecModule(ZOE, rouleGalette, "ps", module1, "2026-11-09T11:00:00Z");
        choisirTheme(deClaire, themeDeClaire);
        choisirTheme(deZoe, themeDeClaire);
        choisirTheme(autreTheme, cuisine);

        given().when().delete("/api/themes/" + themeDeClaire)
                .then()
                .statusCode(204);

        assertEquals(new Reglages(module1, null, null), reglages(deClaire));
        assertEquals(new Reglages(module1, null, null), reglages(deZoe));
        assertEquals(cuisine, reglages(autreTheme).themeDefautId());
        given().when().get("/api/preparations/" + deClaire)
                .then()
                .statusCode(200)
                .body("themeDefautId", nullValue())
                .body("nomThemeDefaut", nullValue());
    }

    @Test
    @TestSecurity(user = ZOE)
    @OidcSecurity(claims = @Claim(key = "sub", value = ZOE))
    void unThemeQueLEnseignantNePeutSupprimerResteDansLesPreparations() {
        UUID themeDeClaire = referentiels.theme("animaux", CLAIRE);
        UUID deZoe = preparationAvecModule(ZOE, rouleGalette, "gs", module1, "2026-11-09T10:00:00Z");
        choisirTheme(deZoe, themeDeClaire);

        given().when().delete("/api/themes/" + themeDeClaire)
                .then()
                .statusCode(403)
                .body("code", equalTo("theme.reserve_au_createur"));

        assertEquals(themeDeClaire, reglages(deZoe).themeDefautId());
    }

    /** Pose en base le Thème par défaut de la Préparation. */
    private void choisirTheme(UUID preparation, UUID theme) {
        QuarkusTransaction.requiringNew().run(() -> entityManager.createNativeQuery(
                "update preparation set theme_defaut_id = :theme where id = :id")
                .setParameter("theme", theme)
                .setParameter("id", preparation)
                .executeUpdate());
    }

    /** Réglages lus en base. */
    private record Reglages(UUID moduleId, UUID themeDefautId, Integer tempsPasseMinutes) {
    }

    /** Refus d'un réglage : rien n'est modifié, la Préparation garde Module 1, cuisine et 60 minutes. */
    private void refusDeReglage(UUID id, Map<String, Object> corps, int statut, String code) {
        given().contentType(ContentType.JSON).body(new HashMap<>(corps))
                .when().put("/api/preparations/" + id + "/reglages")
                .then()
                .statusCode(statut)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo(code));
        assertEquals(new Reglages(module1, cuisine, 60), reglages(id));
    }

    /** Préparation de La Roule Galette réglée en base sur Module 1, cuisine et 60 minutes. */
    private UUID preparationReglee(String proprietaire) {
        UUID id = preparationAvecModule(proprietaire, rouleGalette, "ms", module1, "2026-11-09T09:00:00Z");
        QuarkusTransaction.requiringNew().run(() -> entityManager.createNativeQuery(
                "update preparation set theme_defaut_id = :theme, temps_passe_minutes = 60 where id = :id")
                .setParameter("theme", cuisine)
                .setParameter("id", id)
                .executeUpdate());
        return id;
    }

    private Reglages reglages(UUID preparation) {
        return QuarkusTransaction.requiringNew().call(() -> {
            Object[] ligne = (Object[]) entityManager.createNativeQuery(
                    "select module_id, theme_defaut_id, temps_passe_minutes from preparation where id = :id")
                    .setParameter("id", preparation)
                    .getSingleResult();
            return new Reglages((UUID) ligne[0], (UUID) ligne[1],
                    ligne[2] == null ? null : ((Number) ligne[2]).intValue());
        });
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
