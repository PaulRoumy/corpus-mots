package fr.corpusmots.referentiels.api;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;

import fr.corpusmots.commun.api.EnseignantsDeTest;
import fr.corpusmots.commun.api.ProblemeDto;
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
import java.util.stream.Stream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;

/** Créer, renommer et supprimer les Modules d'un Album (matrice de la story 2.2, partie 2). */
@QuarkusTest
class ModulesResourceTest {

    static final String CLAIRE = "0190f0a0-0000-7000-8000-000000000601";
    static final String ZOE = "0190f0a0-0000-7000-8000-000000000602";
    static final String ADMIN = "0190f0a0-0000-7000-8000-000000000603";

    /** Vide, blanc, ou de plus de 200 caractères. */
    static Stream<String> nomsInvalides() {
        return Stream.of("", "   ", "m".repeat(201));
    }

    @Inject
    EnseignantsDeTest enseignants;

    @Inject
    ReferentielsDeTest referentiels;

    UUID rouleGalette;
    UUID loup;
    /** Module 1 de La Roule Galette, créé par Claire. */
    UUID deClaire;
    /** Les Saisons, de La Roule Galette, sans créateur (inséré avant cette partie). */
    UUID sansCreateur;

    @BeforeEach
    void donnees() {
        enseignants.seulsActifs(CLAIRE, ZOE, ADMIN);
        referentiels.effacer();
        rouleGalette = referentiels.album("La Roule Galette", "Natha Caputo");
        loup = referentiels.album("Le loup qui voulait changer de couleur", "Orianne Lallemand");
        deClaire = referentiels.module(rouleGalette, "Module 1", 1, CLAIRE);
        // Un trou laissé par une suppression : la place suivante reste après le dernier.
        sansCreateur = referentiels.module(rouleGalette, "Les Saisons", 4);
    }

    // --- Créer ---

    @Test
    @TestSecurity(user = ZOE)
    @OidcSecurity(claims = @Claim(key = "sub", value = ZOE))
    void creerAjouteLeModuleApresLeDernierAvecLEnseignantPourCreateur() {
        String id = given().contentType(ContentType.JSON).body(Map.of("nom", "  Module   2 "))
                .when().post("/api/albums/" + rouleGalette + "/modules")
                .then()
                .statusCode(201)
                .body("id", notNullValue())
                .body("albumId", equalTo(rouleGalette.toString()))
                .body("nom", equalTo("Module 2"))
                .body("ordre", equalTo(5))
                .body("createurId", equalTo(ZOE))
                .extract().path("id");

        given().when().get("/api/albums/" + rouleGalette + "/modules")
                .then()
                .statusCode(200)
                .body("nom", contains("Module 1", "Les Saisons", "Module 2"))
                .body("[2].id", equalTo(id))
                .body("[0].createurId", equalTo(CLAIRE))
                .body("[1].createurId", nullValue());
    }

    @Test
    @TestSecurity(user = ZOE)
    @OidcSecurity(claims = @Claim(key = "sub", value = ZOE))
    void leMemeNomEstAccepteDansUnAutreAlbumEtLePremierModulePrendLaPlace1() {
        given().contentType(ContentType.JSON).body(Map.of("nom", "Module 1"))
                .when().post("/api/albums/" + loup + "/modules")
                .then()
                .statusCode(201)
                .body("ordre", equalTo(1));
    }

    @Test
    @TestSecurity(user = ZOE)
    @OidcSecurity(claims = @Claim(key = "sub", value = ZOE))
    void creerDansUnAlbumInconnuEstIntrouvable() {
        given().contentType(ContentType.JSON).body(Map.of("nom", "Module 2"))
                .when().post("/api/albums/" + UUID.randomUUID() + "/modules")
                .then()
                .statusCode(404)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo("ressource.introuvable"));
    }

    @ParameterizedTest
    @MethodSource("nomsInvalides")
    @TestSecurity(user = ZOE)
    @OidcSecurity(claims = @Claim(key = "sub", value = ZOE))
    void creerAvecUnNomInvalideEstRefuse(String nom) {
        given().contentType(ContentType.JSON).body(Map.of("nom", nom))
                .when().post("/api/albums/" + rouleGalette + "/modules")
                .then()
                .statusCode(400)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo("module.nom_invalide"));
        assertEquals(List.of("Module 1:1", "Les Saisons:4"), referentiels.modules(rouleGalette));
    }

    @Test
    @TestSecurity(user = ZOE)
    @OidcSecurity(claims = @Claim(key = "sub", value = ZOE))
    void unNomDeDeuxCentsCaracteresEstAccepte() {
        given().contentType(ContentType.JSON).body(Map.of("nom", "m".repeat(200)))
                .when().post("/api/albums/" + rouleGalette + "/modules")
                .then()
                .statusCode(201);
    }

    @ParameterizedTest
    @ValueSource(strings = { "module 1", "MODULE  1", " Modulé 1 ", "les saisons", "Saisons" })
    @TestSecurity(user = ZOE)
    @OidcSecurity(claims = @Claim(key = "sub", value = ZOE))
    void creerUnNomDejaPrisDansLAlbumEstRefuse(String nom) {
        given().contentType(ContentType.JSON).body(Map.of("nom", nom))
                .when().post("/api/albums/" + rouleGalette + "/modules")
                .then()
                .statusCode(409)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo("module.deja_existant"));
        assertEquals(List.of("Module 1:1", "Les Saisons:4"), referentiels.modules(rouleGalette));
    }

    @Test
    @TestSecurity(user = ZOE)
    @OidcSecurity(claims = @Claim(key = "sub", value = ZOE))
    void creerSansCorpsEstRefuse() {
        given().contentType(ContentType.JSON)
                .when().post("/api/albums/" + rouleGalette + "/modules")
                .then()
                .statusCode(400)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo("requete.invalide"));
        assertEquals(List.of("Module 1:1", "Les Saisons:4"), referentiels.modules(rouleGalette));
    }

    @Test
    @TestSecurity(user = ZOE)
    @OidcSecurity(claims = @Claim(key = "sub", value = ZOE))
    void deuxCreationsSimultaneesDuMemeNomNeCreentQuUnModule() throws Exception {
        List<String> reponses = creationsSimultanees("Module 2", "module 2");

        assertEquals(List.of("201", "409 module.deja_existant"), reponses);
        assertEquals(3, referentiels.modules(rouleGalette).size());
        assertEquals("Les Saisons:4", referentiels.modules(rouleGalette).get(1));
        assertEquals(5, Integer.parseInt(referentiels.modules(rouleGalette).get(2).split(":")[1]));
    }

    @Test
    @TestSecurity(user = ZOE)
    @OidcSecurity(claims = @Claim(key = "sub", value = ZOE))
    void deuxCreationsSimultaneesDeNomsDifferentsPrennentDeuxPlacesConsecutives() throws Exception {
        List<String> reponses = creationsSimultanees("Module 2", "Module 3");

        assertEquals(List.of("201", "201"), reponses);
        List<String> ordres = referentiels.modules(rouleGalette).stream()
                .map(module -> module.split(":")[1])
                .toList();
        assertEquals(List.of("1", "4", "5", "6"), ordres);
    }

    /**
     * Lance deux créations pendant que la ligne de l'Album est verrouillée par le test : elles attendent toutes deux le
     * verrou, puis repartent ensemble. Sans le verrou de l'Album pris par le service, chacune lirait les mêmes Modules
     * (même nom libre, même dernière place). Rend « statut » ou « statut code », triés.
     */
    private List<String> creationsSimultanees(String premier, String second) throws Exception {
        ExecutorService executeur = Executors.newFixedThreadPool(2);
        try {
            List<CompletableFuture<String>> creations = new ArrayList<>();
            referentiels.pendantVerrouAlbum(rouleGalette, () -> {
                creations.add(CompletableFuture.supplyAsync(() -> creer(premier), executeur));
                creations.add(CompletableFuture.supplyAsync(() -> creer(second), executeur));
                try {
                    // Le temps que les deux requêtes arrivent au verrou de l'Album.
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
                .when().post("/api/albums/" + rouleGalette + "/modules")
                .then().extract().response();
        return reponse.statusCode() == 201 ? "201" : reponse.statusCode() + " " + reponse.path("code");
    }

    // --- Renommer ---

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void leCreateurRenommeSonModule() {
        given().contentType(ContentType.JSON).body(Map.of("nom", " Les  Couleurs "))
                .when().put("/api/modules/" + deClaire + "/nom")
                .then()
                .statusCode(200)
                .body("id", equalTo(deClaire.toString()))
                .body("nom", equalTo("Les Couleurs"))
                .body("ordre", equalTo(1))
                .body("createurId", equalTo(CLAIRE));
        assertEquals(List.of("Les Couleurs:1", "Les Saisons:4"), referentiels.modules(rouleGalette));
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void renommerUnModuleEnSonPropreNomEstAccepte() {
        given().contentType(ContentType.JSON).body(Map.of("nom", "MODULE 1"))
                .when().put("/api/modules/" + deClaire + "/nom")
                .then()
                .statusCode(200)
                .body("nom", equalTo("MODULE 1"));
    }

    @Test
    @TestSecurity(user = ADMIN, roles = "admin")
    @OidcSecurity(claims = @Claim(key = "sub", value = ADMIN))
    void lAdministrateurRenommeLeModuleDUnCollegueEtUnModuleSansCreateur() {
        given().contentType(ContentType.JSON).body(Map.of("nom", "Module 2"))
                .when().put("/api/modules/" + deClaire + "/nom")
                .then()
                .statusCode(200)
                .body("nom", equalTo("Module 2"))
                .body("createurId", equalTo(CLAIRE));
        given().contentType(ContentType.JSON).body(Map.of("nom", "Saisons"))
                .when().put("/api/modules/" + sansCreateur + "/nom")
                .then()
                .statusCode(200)
                .body("nom", equalTo("Saisons"))
                .body("createurId", nullValue());
        assertEquals(List.of("Module 2:1", "Saisons:4"), referentiels.modules(rouleGalette));
    }

    @ParameterizedTest
    @MethodSource("nomsInvalides")
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void renommerAvecUnNomInvalideEstRefuse(String nom) {
        refusDeRenommage(deClaire, Map.of("nom", nom), 400, "module.nom_invalide");
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void renommerEnLeNomDUnAutreModuleDeLAlbumEstRefuse() {
        refusDeRenommage(deClaire, Map.of("nom", "les saisons"), 409, "module.deja_existant");
    }

    @Test
    @TestSecurity(user = ZOE)
    @OidcSecurity(claims = @Claim(key = "sub", value = ZOE))
    void unAutreEnseignantNeRenommePasLeModule() {
        refusDeRenommage(deClaire, Map.of("nom", "Module 2"), 403, "module.reserve_au_createur");
        // Le refus passe avant la vérification du nom.
        refusDeRenommage(deClaire, Map.of("nom", ""), 403, "module.reserve_au_createur");
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void unModuleSansCreateurNEstRenommeQueParLAdministrateur() {
        refusDeRenommage(sansCreateur, Map.of("nom", "Saisons"), 403, "module.reserve_au_createur");
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void renommerUnModuleInconnuEstIntrouvable() {
        given().contentType(ContentType.JSON).body(Map.of("nom", "Module 2"))
                .when().put("/api/modules/" + UUID.randomUUID() + "/nom")
                .then()
                .statusCode(404)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo("ressource.introuvable"));
        assertEquals(List.of("Module 1:1", "Les Saisons:4"), referentiels.modules(rouleGalette));
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void renommerSansCorpsEstRefuse() {
        given().contentType(ContentType.JSON)
                .when().put("/api/modules/" + deClaire + "/nom")
                .then()
                .statusCode(400)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo("requete.invalide"));
        assertEquals(List.of("Module 1:1", "Les Saisons:4"), referentiels.modules(rouleGalette));
    }

    // --- Supprimer ---

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void leCreateurSupprimeSonModule() {
        given().when().delete("/api/modules/" + deClaire)
                .then()
                .statusCode(204);
        assertEquals(List.of("Les Saisons:4"), referentiels.modules(rouleGalette));
    }

    @Test
    @TestSecurity(user = ADMIN, roles = "admin")
    @OidcSecurity(claims = @Claim(key = "sub", value = ADMIN))
    void lAdministrateurSupprimeLeModuleDUnCollegueEtUnModuleSansCreateur() {
        given().when().delete("/api/modules/" + deClaire).then().statusCode(204);
        given().when().delete("/api/modules/" + sansCreateur).then().statusCode(204);
        assertEquals(List.of(), referentiels.modules(rouleGalette));
    }

    @Test
    @TestSecurity(user = ZOE)
    @OidcSecurity(claims = @Claim(key = "sub", value = ZOE))
    void unAutreEnseignantNeSupprimePasLeModule() {
        refusDeSuppression(deClaire, 403, "module.reserve_au_createur");
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void unModuleSansCreateurNEstSupprimeQueParLAdministrateur() {
        refusDeSuppression(sansCreateur, 403, "module.reserve_au_createur");
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void supprimerUnModuleInconnuEstIntrouvable() {
        refusDeSuppression(UUID.randomUUID(), 404, "ressource.introuvable");
    }

    /** Refus d'un renommage : les Modules de l'Album sont inchangés. */
    private void refusDeRenommage(UUID module, Map<String, Object> corps, int statut, String code) {
        given().contentType(ContentType.JSON).body(corps)
                .when().put("/api/modules/" + module + "/nom")
                .then()
                .statusCode(statut)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo(code));
        assertEquals(List.of("Module 1:1", "Les Saisons:4"), referentiels.modules(rouleGalette));
    }

    /** Refus d'une suppression : les Modules de l'Album sont inchangés. */
    private void refusDeSuppression(UUID module, int statut, String code) {
        given().when().delete("/api/modules/" + module)
                .then()
                .statusCode(statut)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo(code));
        assertEquals(List.of("Module 1:1", "Les Saisons:4"), referentiels.modules(rouleGalette));
    }
}
