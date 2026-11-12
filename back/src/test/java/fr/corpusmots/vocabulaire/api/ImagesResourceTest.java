package fr.corpusmots.vocabulaire.api;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertArrayEquals;

import fr.corpusmots.commun.api.EnseignantsDeTest;
import fr.corpusmots.commun.api.ProblemeDto;
import fr.corpusmots.vocabulaire.service.Lexique;
import fr.corpusmots.vocabulaire.service.MotVue;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.quarkus.test.security.oidc.Claim;
import io.quarkus.test.security.oidc.OidcSecurity;
import io.restassured.response.ValidatableResponse;
import jakarta.inject.Inject;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Fichiers des Images (AD-2, AD-23) : servis seulement à qui peut consulter l'Image, avec {@code Cache-Control} et
 * {@code ETag} ; le rôle {@code admin} n'élargit rien.
 */
@QuarkusTest
class ImagesResourceTest {

    static final String CLAIRE = "0190f0a0-0000-7000-8000-000000000801";
    static final String ZOE = "0190f0a0-0000-7000-8000-000000000802";
    static final UUID ALBUM = UUID.fromString("0190f0a0-0000-7000-8000-000000000899");

    static final byte[] GRANDE = { 1, 2, 3, 4, 5 };
    static final byte[] MINIATURE = { 9, 8, 7 };

    @Inject
    EnseignantsDeTest enseignants;

    @Inject
    ImagesDeTest images;

    @Inject
    Lexique lexique;

    UUID sens;

    @BeforeEach
    void donnees() {
        enseignants.seulsActifs(CLAIRE, ZOE);
        images.effacer();
        MotVue mot = QuarkusTransaction.requiringNew().call(() -> lexique.obtenirOuCreerMot("citrouille"));
        sens = QuarkusTransaction.requiringNew().call(() -> lexique.obtenirOuCreerSens(mot.id(), "légume", "nom"))
                .id();
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void leProprietaireRecoitSesDeuxTaillesAvecCacheEtETag() {
        UUID image = images.image(UUID.fromString(CLAIRE), sens, "privee", GRANDE, MINIATURE);
        images.version(image, 3);

        byte[] grande = fichier(image, null)
                .statusCode(200)
                .contentType("image/png")
                .header("Cache-Control", "private, max-age=86400")
                .header("ETag", "\"3\"")
                .extract().asByteArray();
        byte[] grandeExplicite = fichier(image, "grande").statusCode(200).extract().asByteArray();
        byte[] miniature = fichier(image, "miniature").statusCode(200).header("ETag", "\"3\"").extract().asByteArray();

        assertArrayEquals(GRANDE, grande);
        assertArrayEquals(GRANDE, grandeExplicite);
        assertArrayEquals(MINIATURE, miniature);
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void unETagInchangeRepond304() {
        UUID image = images.image(UUID.fromString(CLAIRE), sens, "privee", GRANDE, MINIATURE);

        given().header("If-None-Match", "\"0\"")
                .when().get("/api/images/" + image + "/fichier?taille=miniature")
                .then()
                .statusCode(304)
                .header("ETag", "\"0\"");
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void lImagePriveeDUnCollegueSansLienEstIntrouvable() {
        UUID deZoe = images.image(UUID.fromString(ZOE), sens, "privee", GRANDE, MINIATURE);

        introuvable(fichier(deZoe, "miniature"));
        introuvable(fichier(deZoe, null));
        introuvable(fichier(UUID.randomUUID(), "miniature"));
    }

    @Test
    @TestSecurity(user = ZOE, roles = "admin")
    @OidcSecurity(claims = @Claim(key = "sub", value = ZOE))
    void leRoleAdminNElargitRien() {
        UUID deClaire = images.image(UUID.fromString(CLAIRE), sens, "privee", GRANDE, MINIATURE);

        introuvable(fichier(deClaire, "miniature"));
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void uneImageVerseeOuLieeEstConsultable() {
        UUID versee = images.image(UUID.fromString(ZOE), sens, "versee", GRANDE, MINIATURE);
        UUID liee = images.image(UUID.fromString(ZOE), sens, "privee", GRANDE, MINIATURE);
        images.lien(liee, UUID.fromString(CLAIRE), ALBUM);

        fichier(versee, "miniature").statusCode(200);
        fichier(liee, "miniature").statusCode(200);
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void mesImagesAbandonneesOuSupprimeesSontIntrouvables() {
        for (String etat : new String[] { "abandonnee", "supprimee" }) {
            UUID image = images.image(UUID.fromString(CLAIRE), sens, etat, GRANDE, MINIATURE);
            introuvable(fichier(image, "miniature"));
        }
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void uneTailleInconnueEstRefusee() {
        UUID image = images.image(UUID.fromString(CLAIRE), sens, "privee", GRANDE, MINIATURE);

        fichier(image, "enorme")
                .statusCode(400)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo("requete.invalide"));
    }

    @Test
    void sansJetonLaRequeteEstRefusee() {
        given().when().get("/api/images/" + UUID.randomUUID() + "/fichier")
                .then()
                .statusCode(401);
    }

    private static ValidatableResponse fichier(UUID image, String taille) {
        return given().queryParams(taille == null ? Map.of() : Map.of("taille", taille))
                .when().get("/api/images/" + image + "/fichier")
                .then();
    }

    private static void introuvable(ValidatableResponse reponse) {
        reponse.statusCode(404)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .header("Cache-Control", nullValue())
                .body("code", equalTo("ressource.introuvable"));
    }
}
