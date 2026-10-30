package fr.corpusmots.commun.api;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasKey;
import static org.hamcrest.Matchers.not;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.quarkus.test.common.http.TestHTTPResource;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.Socket;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

/** Format RFC 9457 des erreurs sous /api et limite de taille des requêtes (matrice de la story 1.1). */
@QuarkusTest
class ErreursTest {

    @TestHTTPResource("/")
    URL racine;

    @Test
    void uneErreurMetierRenvoieSonStatutEtSonCode() {
        given().when().get("/api/test-erreurs/metier")
                .then()
                .statusCode(409)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("type", equalTo("about:blank"))
                .body("title", equalTo("Conflict"))
                .body("status", equalTo(409))
                .body("detail", equalTo("Exemple d'erreur métier"))
                .body("code", equalTo("exemple.code"));
    }

    @Test
    void uneRouteInconnueRenvoie404AuFormatProbleme() {
        given().when().get("/api/inexistant")
                .then()
                .statusCode(404)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("status", equalTo(404))
                .body("code", equalTo("ressource.introuvable"));
    }

    @Test
    void uneRequeteDePlusDe100MoEstRefuseeEn413() throws IOException {
        // En-têtes seuls : le serveur refuse dès le Content-Length, sans attendre les 100 Mo.
        try (Socket socket = new Socket(racine.getHost(), racine.getPort())) {
            socket.setSoTimeout(5000);
            OutputStream sortie = socket.getOutputStream();
            sortie.write(("POST /api/test-erreurs/metier HTTP/1.1\r\nHost: localhost\r\n"
                    + "Content-Type: application/octet-stream\r\nContent-Length: " + (100L * 1024 * 1024 + 1)
                    + "\r\n\r\n").getBytes(StandardCharsets.US_ASCII));
            sortie.flush();
            String ligneDeStatut = new BufferedReader(
                    new InputStreamReader(socket.getInputStream(), StandardCharsets.US_ASCII)).readLine();

            assertNotNull(ligneDeStatut, "aucune ligne de statut reçue");
            assertTrue(ligneDeStatut.startsWith("HTTP/1.1 413"), ligneDeStatut);
        }
    }

    @Test
    void uneErreurInattendueRenvoie500SansDetailInterne() {
        given().when().get("/api/test-erreurs/inattendue")
                .then()
                .statusCode(500)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("status", equalTo(500))
                .body("code", equalTo("erreur.interne"))
                .body(not(containsString(ErreursTestResource.MESSAGE_INTERNE)))
                .body(not(containsString("RuntimeException")))
                .body(not(containsString("at fr.corpusmots")));
    }

    @Test
    void uneMethodeNonAutoriseeRenvoie405() {
        // Quarkus REST ne joint pas d'en-tête Allow à son 405 ; la recopie des en-têtes d'origine
        // est vérifiée par le test 503 (Retry-After).
        given().when().post("/api/test-erreurs/metier")
                .then()
                .statusCode(405)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo("methode.non_autorisee"));
    }

    @Test
    void uneErreurHttpServeurRenvoieErreurInterneSansDetail() {
        given().when().get("/api/test-erreurs/indisponible")
                .then()
                .statusCode(503)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .header("Retry-After", equalTo("120"))
                .body("code", equalTo("erreur.interne"))
                .body("$", not(hasKey("detail")));
    }

    @Test
    void unJsonMalFormeRenvoie400RequeteInvalide() {
        given().contentType(ContentType.JSON).body("{ pas du json")
                .when().post("/api/test-erreurs/json")
                .then()
                .statusCode(400)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo("requete.invalide"));
    }

    @Test
    void unJsonDeMauvaisTypeRenvoie400RequeteInvalide() {
        given().contentType(ContentType.JSON).body("[1, 2]")
                .when().post("/api/test-erreurs/json")
                .then()
                .statusCode(400)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo("requete.invalide"));
    }
}
