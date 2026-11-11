package fr.corpusmots.vocabulaire.api;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.equalTo;
import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;

import fr.corpusmots.commun.api.EnseignantsDeTest;
import fr.corpusmots.vocabulaire.service.ArasaacIndisponible;
import fr.corpusmots.vocabulaire.service.PictogrammeArasaac;
import fr.corpusmots.vocabulaire.service.SourceArasaac;
import fr.corpusmots.vocabulaire.service.SourceArasaacHttp;
import io.quarkus.test.junit.QuarkusMock;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.quarkus.test.security.oidc.Claim;
import io.quarkus.test.security.oidc.OidcSecurity;
import jakarta.inject.Inject;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Stream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;

/**
 * Proxy ARASAAC (matrice de la story 2.4, partie 1), avec une fausse {@link SourceArasaac} : aucun appel à Internet.
 */
@QuarkusTest
class ArasaacResourceTest {

    static final String CLAIRE = "0190f0a0-0000-7000-8000-000000000901";

    static final byte[] PNG = { (byte) 0x89, 'P', 'N', 'G', 13, 10, 26, 10, 1, 2, 3 };

    /** Absent, vide, blanc, ou de plus de 100 caractères. */
    static Stream<String> motsInvalides() {
        return Stream.of(null, "", "   ", "m".repeat(101));
    }

    @Inject
    EnseignantsDeTest enseignants;

    FausseSource source;

    @BeforeEach
    void donnees() {
        enseignants.seulsActifs(CLAIRE);
        source = new FausseSource();
        QuarkusMock.installMockForType(source, SourceArasaac.class);
    }

    // --- Suggestions ---

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void suggestionsRenvoieAuPlusTroisPictogrammesDansLOrdreDArasaac() {
        source.resultats.put("citrouille", List.of(
                new PictogrammeArasaac(2459, List.of("citrouille", "potiron")),
                new PictogrammeArasaac(37172, List.of("potiron")),
                new PictogrammeArasaac(8, List.of()),
                new PictogrammeArasaac(9, List.of("courge"))));

        given().queryParam("mot", "la citrouille")
                .when().get("/api/arasaac/suggestions")
                .then()
                .statusCode(200)
                .body("idArasaac", contains(2459, 37172, 8))
                .body("motCle", contains("citrouille", "potiron", "citrouille"));

        assertEquals(List.of("citrouille"), source.recherches);
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void suggestionsSansDoublonAvantDeGarderTrois() {
        source.resultats.put("four", List.of(
                new PictogrammeArasaac(1, List.of("four")),
                new PictogrammeArasaac(1, List.of("four")),
                new PictogrammeArasaac(2, List.of("cuisinière")),
                new PictogrammeArasaac(2, List.of("cuisinière")),
                new PictogrammeArasaac(3, List.of("fourneau"))));

        given().queryParam("mot", "four")
                .when().get("/api/arasaac/suggestions")
                .then()
                .statusCode(200)
                .body("idArasaac", contains(1, 2, 3));
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void suggestionsAccepteUnMotDeCentCaracteres() {
        String mot = "m".repeat(100);

        given().queryParam("mot", mot)
                .when().get("/api/arasaac/suggestions")
                .then()
                .statusCode(200)
                .body("$", empty());

        assertEquals(List.of(mot), source.recherches);
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void suggestionsSansResultatRenvoieUneListeVide() {
        given().queryParam("mot", "zorglub")
                .when().get("/api/arasaac/suggestions")
                .then()
                .statusCode(200)
                .body("$", empty());
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void suggestionsArasaacIndisponibleDonne503() {
        source.indisponible = true;

        given().queryParam("mot", "four")
                .when().get("/api/arasaac/suggestions")
                .then()
                .statusCode(503)
                .contentType("application/problem+json")
                .body("code", equalTo("arasaac.indisponible"));
    }

    @ParameterizedTest
    @MethodSource("motsInvalides")
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void suggestionsAvecUnMotInvalideEstRefuse(String mot) {
        var requete = given();
        if (mot != null) {
            requete = requete.queryParam("mot", mot);
        }

        requete.when().get("/api/arasaac/suggestions")
                .then()
                .statusCode(400)
                .body("code", equalTo("requete.invalide"));

        assertEquals(List.of(), source.recherches);
    }

    @Test
    void suggestionsSansJetonDonne401() {
        given().queryParam("mot", "four")
                .when().get("/api/arasaac/suggestions")
                .then()
                .statusCode(401);
    }

    // --- Pictogramme ---

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void pictogrammeRenvoieLeFichierPngAvecUnCachePrive() {
        source.fichiers.put(2459L, PNG);

        byte[] corps = given()
                .when().get("/api/arasaac/pictogrammes/2459")
                .then()
                .statusCode(200)
                .contentType("image/png")
                .header("Cache-Control", "private, max-age=86400")
                .extract().asByteArray();

        assertArrayEquals(PNG, corps);
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void pictogrammeInconnuDArasaacDonne404() {
        given()
                .when().get("/api/arasaac/pictogrammes/404404")
                .then()
                .statusCode(404)
                .contentType("application/problem+json")
                .body("code", equalTo("ressource.introuvable"));
    }

    @ParameterizedTest
    @ValueSource(longs = { 0, -1 })
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void pictogrammeDIdentifiantNulOuNegatifDonne404SansAppelerArasaac(long id) {
        given()
                .when().get("/api/arasaac/pictogrammes/" + id)
                .then()
                .statusCode(404)
                .body("code", equalTo("ressource.introuvable"));

        assertEquals(List.of(), source.pictogrammesDemandes);
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void pictogrammeArasaacIndisponibleDonne503() {
        source.indisponible = true;

        given()
                .when().get("/api/arasaac/pictogrammes/2459")
                .then()
                .statusCode(503)
                .contentType("application/problem+json")
                .body("code", equalTo("arasaac.indisponible"));
    }

    @Test
    void pictogrammeSansJetonDonne401() {
        source.fichiers.put(2459L, PNG);

        given()
                .when().get("/api/arasaac/pictogrammes/2459")
                .then()
                .statusCode(401);
    }

    /**
     * Fausse source : résultats et fichiers connus, ou indisponible ; journalise les recherches. Elle étend la source
     * HTTP, car {@link QuarkusMock} exige une instance de la classe du bean, mais n'appelle jamais le réseau.
     */
    static class FausseSource extends SourceArasaacHttp {

        final Map<String, List<PictogrammeArasaac>> resultats = new HashMap<>();
        final Map<Long, byte[]> fichiers = new HashMap<>();
        final List<String> recherches = new ArrayList<>();
        final List<Long> pictogrammesDemandes = new ArrayList<>();
        boolean indisponible;

        @Override
        public List<PictogrammeArasaac> rechercher(String texte) {
            recherches.add(texte);
            if (indisponible) {
                throw new ArasaacIndisponible("hors service");
            }
            return resultats.getOrDefault(texte, List.of());
        }

        @Override
        public Optional<byte[]> pictogramme(long id) {
            pictogrammesDemandes.add(id);
            if (indisponible) {
                throw new ArasaacIndisponible("hors service");
            }
            return Optional.ofNullable(fichiers.get(id));
        }
    }
}
