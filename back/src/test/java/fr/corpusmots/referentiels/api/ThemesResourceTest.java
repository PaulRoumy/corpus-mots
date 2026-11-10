package fr.corpusmots.referentiels.api;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;

import fr.corpusmots.commun.api.EnseignantsDeTest;
import fr.corpusmots.commun.api.ProblemeDto;
import fr.corpusmots.referentiels.service.TitresAlbums;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.quarkus.test.security.oidc.Claim;
import io.quarkus.test.security.oidc.OidcSecurity;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.function.Supplier;
import java.util.stream.Stream;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;

/**
 * Créer, renommer et supprimer les Thèmes de l'école (matrice de la story 2.2, partie 3). Les noms sont choisis pour
 * que l'ordre par nom soit le même quelle que soit la collation de la base.
 */
@QuarkusTest
class ThemesResourceTest {

    static final String CLAIRE = "0190f0a0-0000-7000-8000-000000000701";
    static final String ZOE = "0190f0a0-0000-7000-8000-000000000702";
    static final String ADMIN = "0190f0a0-0000-7000-8000-000000000703";

    /** Thèmes en base au début de chaque test, par nom. */
    static final List<String> THEMES_INITIAUX = List.of("cuisine", "les animaux");

    /** Vide, blanc, ou de plus de 200 caractères. */
    static Stream<String> nomsInvalides() {
        return Stream.of("", "   ", "t".repeat(201));
    }

    @Inject
    EnseignantsDeTest enseignants;

    @Inject
    ReferentielsDeTest referentiels;

    @Inject
    UtilisationThemesDeTest utilisations;

    /** cuisine, créé par Claire. */
    UUID cuisine;
    /** les animaux, sans créateur (inséré avant cette partie). */
    UUID sansCreateur;

    @BeforeEach
    void donnees() {
        enseignants.seulsActifs(CLAIRE, ZOE, ADMIN);
        referentiels.effacer();
        utilisations.oublier();
        cuisine = referentiels.theme("cuisine", CLAIRE);
        sansCreateur = referentiels.theme("les animaux");
    }

    @AfterEach
    void oublierUtilisations() {
        utilisations.oublier();
    }

    // --- Créer ---

    @Test
    @TestSecurity(user = ZOE)
    @OidcSecurity(claims = @Claim(key = "sub", value = ZOE))
    void creerAjouteLeThemeAvecLEnseignantPourCreateurVisibleDeTous() {
        String id = given().contentType(ContentType.JSON).body(Map.of("nom", "  les   saisons "))
                .when().post("/api/themes")
                .then()
                .statusCode(201)
                .body("id", notNullValue())
                .body("nom", equalTo("les saisons"))
                .body("createurId", equalTo(ZOE))
                .extract().path("id");

        given().when().get("/api/themes")
                .then()
                .statusCode(200)
                .body("nom", contains("cuisine", "les animaux", "les saisons"))
                .body("[2].id", equalTo(id))
                .body("[0].createurId", equalTo(CLAIRE))
                .body("[1].createurId", nullValue());
    }

    @ParameterizedTest
    @MethodSource("nomsInvalides")
    @TestSecurity(user = ZOE)
    @OidcSecurity(claims = @Claim(key = "sub", value = ZOE))
    void creerAvecUnNomInvalideEstRefuse(String nom) {
        given().contentType(ContentType.JSON).body(Map.of("nom", nom))
                .when().post("/api/themes")
                .then()
                .statusCode(400)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo("theme.nom_invalide"));
        assertEquals(THEMES_INITIAUX, referentiels.themes());
    }

    @Test
    @TestSecurity(user = ZOE)
    @OidcSecurity(claims = @Claim(key = "sub", value = ZOE))
    void unNomDeDeuxCentsCaracteresEstAccepte() {
        given().contentType(ContentType.JSON).body(Map.of("nom", "t".repeat(200)))
                .when().post("/api/themes")
                .then()
                .statusCode(201);
    }

    @ParameterizedTest
    @ValueSource(strings = { "Cuisine", "CUISINE", " cuisiné ", "la cuisine", "animaux", "LES  ANIMAUX" })
    @TestSecurity(user = ZOE)
    @OidcSecurity(claims = @Claim(key = "sub", value = ZOE))
    void creerUnNomDejaPrisEstRefuse(String nom) {
        given().contentType(ContentType.JSON).body(Map.of("nom", nom))
                .when().post("/api/themes")
                .then()
                .statusCode(409)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo("theme.deja_existant"));
        assertEquals(THEMES_INITIAUX, referentiels.themes());
    }

    @Test
    @TestSecurity(user = ZOE)
    @OidcSecurity(claims = @Claim(key = "sub", value = ZOE))
    void creerSansCorpsEstRefuse() {
        given().contentType(ContentType.JSON)
                .when().post("/api/themes")
                .then()
                .statusCode(400)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo("requete.invalide"));
        assertEquals(THEMES_INITIAUX, referentiels.themes());
    }

    @Test
    @TestSecurity(user = ZOE)
    @OidcSecurity(claims = @Claim(key = "sub", value = ZOE))
    void deuxCreationsSimultaneesDuMemeNomNeCreentQuUnTheme() throws Exception {
        List<String> reponses = creationsSimultanees("les saisons", "Saisons");

        assertEquals(List.of("201", "409 theme.deja_existant"), reponses);
        assertEquals(3, referentiels.themes().size());
    }

    @Test
    @TestSecurity(user = ADMIN, roles = "admin")
    @OidcSecurity(claims = @Claim(key = "sub", value = ADMIN))
    void unRenommageEtUneCreationSimultanesDuMemeNomNeLaissentQuUnTheme() throws Exception {
        List<String> reponses = simultanees(
                () -> renommer(cuisine, "saisons"),
                () -> creer("Les saisons"));

        assertEquals(2, reponses.size());
        assertEquals(1, reponses.stream().filter(reponse -> reponse.equals("200") || reponse.equals("201")).count());
        assertEquals(1, reponses.stream().filter(reponse -> reponse.equals("409 theme.deja_existant")).count());
        assertEquals(1, referentiels.themes().stream()
                .filter(nom -> TitresAlbums.normaliser(nom).equals("saisons"))
                .count());
    }

    /**
     * Lance deux créations pendant que le test tient le verrou consultatif des Thèmes : elles l'attendent toutes deux,
     * puis repartent ensemble. Sans ce verrou pris par le service, chacune trouverait le nom libre (la contrainte
     * d'unicité ne compare que le nom exact). Rend « statut » ou « statut code », triés.
     */
    private List<String> creationsSimultanees(String premier, String second) throws Exception {
        return simultanees(() -> creer(premier), () -> creer(second));
    }

    /** Lance les deux requêtes pendant que le test tient le verrou des Thèmes ; rend leurs réponses triées. */
    private List<String> simultanees(Supplier<String> premiere, Supplier<String> seconde) throws Exception {
        ExecutorService executeur = Executors.newFixedThreadPool(2);
        try {
            List<CompletableFuture<String>> creations = new ArrayList<>();
            referentiels.pendantVerrouThemes(() -> {
                creations.add(CompletableFuture.supplyAsync(premiere, executeur));
                creations.add(CompletableFuture.supplyAsync(seconde, executeur));
                try {
                    // Le temps que les deux requêtes arrivent au verrou des Thèmes.
                    Thread.sleep(500);
                } catch (InterruptedException interrompu) {
                    Thread.currentThread().interrupt();
                }
            });
            List<String> reponses = new ArrayList<>();
            for (CompletableFuture<String> creation : creations) {
                reponses.add(creation.get());
            }
            return reponses.stream().sorted().toList();
        } finally {
            executeur.shutdownNow();
        }
    }

    private String creer(String nom) {
        var reponse = given().contentType(ContentType.JSON).body(Map.of("nom", nom))
                .when().post("/api/themes")
                .then().extract().response();
        return reponse.statusCode() == 201 ? "201" : reponse.statusCode() + " " + reponse.path("code");
    }

    private String renommer(UUID theme, String nom) {
        var reponse = given().contentType(ContentType.JSON).body(Map.of("nom", nom))
                .when().put("/api/themes/" + theme + "/nom")
                .then().extract().response();
        return reponse.statusCode() == 200 ? "200" : reponse.statusCode() + " " + reponse.path("code");
    }

    // --- Renommer ---

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void leCreateurRenommeSonTheme() {
        given().contentType(ContentType.JSON).body(Map.of("nom", " repas  du monde "))
                .when().put("/api/themes/" + cuisine + "/nom")
                .then()
                .statusCode(200)
                .body("id", equalTo(cuisine.toString()))
                .body("nom", equalTo("repas du monde"))
                .body("createurId", equalTo(CLAIRE));
        assertEquals(List.of("les animaux", "repas du monde"), referentiels.themes());
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void renommerUnThemeEnSonPropreNomEstAccepte() {
        given().contentType(ContentType.JSON).body(Map.of("nom", "La Cuisine"))
                .when().put("/api/themes/" + cuisine + "/nom")
                .then()
                .statusCode(200)
                .body("nom", equalTo("La Cuisine"));
    }

    @Test
    @TestSecurity(user = ADMIN, roles = "admin")
    @OidcSecurity(claims = @Claim(key = "sub", value = ADMIN))
    void lAdministrateurRenommeLeThemeDUnCollegueEtUnThemeSansCreateur() {
        given().contentType(ContentType.JSON).body(Map.of("nom", "repas"))
                .when().put("/api/themes/" + cuisine + "/nom")
                .then()
                .statusCode(200)
                .body("nom", equalTo("repas"))
                .body("createurId", equalTo(CLAIRE));
        given().contentType(ContentType.JSON).body(Map.of("nom", "animaux"))
                .when().put("/api/themes/" + sansCreateur + "/nom")
                .then()
                .statusCode(200)
                .body("nom", equalTo("animaux"))
                .body("createurId", nullValue());
        assertEquals(List.of("animaux", "repas"), referentiels.themes());
    }

    @ParameterizedTest
    @MethodSource("nomsInvalides")
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void renommerAvecUnNomInvalideEstRefuse(String nom) {
        refusDeRenommage(cuisine, Map.of("nom", nom), 400, "theme.nom_invalide");
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void renommerEnLeNomDUnAutreThemeEstRefuse() {
        refusDeRenommage(cuisine, Map.of("nom", "Animaux"), 409, "theme.deja_existant");
    }

    @Test
    @TestSecurity(user = ZOE)
    @OidcSecurity(claims = @Claim(key = "sub", value = ZOE))
    void unAutreEnseignantNeRenommePasLeTheme() {
        refusDeRenommage(cuisine, Map.of("nom", "repas"), 403, "theme.reserve_au_createur");
        // Le refus passe avant la vérification du nom.
        refusDeRenommage(cuisine, Map.of("nom", ""), 403, "theme.reserve_au_createur");
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void unThemeSansCreateurNEstRenommeQueParLAdministrateur() {
        refusDeRenommage(sansCreateur, Map.of("nom", "animaux"), 403, "theme.reserve_au_createur");
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void renommerUnThemeInconnuEstIntrouvable() {
        refusDeRenommage(UUID.randomUUID(), Map.of("nom", "repas"), 404, "ressource.introuvable");
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void renommerSansCorpsEstRefuse() {
        given().contentType(ContentType.JSON)
                .when().put("/api/themes/" + cuisine + "/nom")
                .then()
                .statusCode(400)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo("requete.invalide"));
        assertEquals(THEMES_INITIAUX, referentiels.themes());
    }

    // --- Supprimer ---

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void leCreateurSupprimeSonTheme() {
        given().when().delete("/api/themes/" + cuisine)
                .then()
                .statusCode(204);
        assertEquals(List.of("les animaux"), referentiels.themes());
    }

    @Test
    @TestSecurity(user = ADMIN, roles = "admin")
    @OidcSecurity(claims = @Claim(key = "sub", value = ADMIN))
    void lAdministrateurSupprimeLeThemeDUnCollegueEtUnThemeSansCreateur() {
        given().when().delete("/api/themes/" + cuisine).then().statusCode(204);
        given().when().delete("/api/themes/" + sansCreateur).then().statusCode(204);
        assertEquals(List.of(), referentiels.themes());
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void unThemeUtiliseNEstPasSupprime() {
        utilisations.utiliser(cuisine);
        refusDeSuppression(cuisine, 409, "theme.utilise");
    }

    @Test
    @TestSecurity(user = ADMIN, roles = "admin")
    @OidcSecurity(claims = @Claim(key = "sub", value = ADMIN))
    void unThemeUtiliseNEstPasSupprimeParLAdministrateur() {
        utilisations.utiliser(sansCreateur);
        refusDeSuppression(sansCreateur, 409, "theme.utilise");
    }

    @Test
    @TestSecurity(user = ZOE)
    @OidcSecurity(claims = @Claim(key = "sub", value = ZOE))
    void unAutreEnseignantNeSupprimePasLeTheme() {
        refusDeSuppression(cuisine, 403, "theme.reserve_au_createur");
        // Le refus passe avant la vérification de l'utilisation.
        utilisations.utiliser(cuisine);
        refusDeSuppression(cuisine, 403, "theme.reserve_au_createur");
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void unThemeSansCreateurNEstSupprimeQueParLAdministrateur() {
        refusDeSuppression(sansCreateur, 403, "theme.reserve_au_createur");
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void supprimerUnThemeInconnuEstIntrouvable() {
        refusDeSuppression(UUID.randomUUID(), 404, "ressource.introuvable");
    }

    /** Refus d'un renommage : les Thèmes sont inchangés. */
    private void refusDeRenommage(UUID theme, Map<String, Object> corps, int statut, String code) {
        given().contentType(ContentType.JSON).body(corps)
                .when().put("/api/themes/" + theme + "/nom")
                .then()
                .statusCode(statut)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo(code));
        assertEquals(THEMES_INITIAUX, referentiels.themes());
    }

    /** Refus d'une suppression : les Thèmes sont inchangés. */
    private void refusDeSuppression(UUID theme, int statut, String code) {
        given().when().delete("/api/themes/" + theme)
                .then()
                .statusCode(statut)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo(code));
        assertEquals(THEMES_INITIAUX, referentiels.themes());
    }
}
