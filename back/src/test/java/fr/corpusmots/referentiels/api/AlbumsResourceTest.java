package fr.corpusmots.referentiels.api;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;

import fr.corpusmots.commun.api.EnseignantsDeTest;
import fr.corpusmots.commun.api.ProblemeDto;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.quarkus.test.security.oidc.Claim;
import io.quarkus.test.security.oidc.OidcSecurity;
import jakarta.inject.Inject;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/** Albums, Modules et Thèmes en lecture (matrice de la story 2.1, partie 1). */
@QuarkusTest
@TestSecurity(user = AlbumsResourceTest.ENSEIGNANTE)
@OidcSecurity(claims = @Claim(key = "sub", value = AlbumsResourceTest.ENSEIGNANTE))
class AlbumsResourceTest {

    static final String ENSEIGNANTE = "0190f0a0-0000-7000-8000-000000000401";

    @Inject
    EnseignantsDeTest enseignants;

    @Inject
    ReferentielsDeTest referentiels;

    UUID rouleGalette;
    UUID galette;
    UUID loup;
    UUID elmer;

    @BeforeEach
    void donnees() {
        enseignants.seulsActifs(ENSEIGNANTE);
        referentiels.effacer();
        rouleGalette = referentiels.album("La Roule Galette", "Natha Caputo");
        galette = referentiels.album("La galette et l’ogre", "Anonyme");
        loup = referentiels.album("Le loup qui voulait changer de couleur", "Orianne Lallemand");
        elmer = referentiels.album("Élmer l’éléphant", "David McKee");
        referentiels.module(rouleGalette, "Module 2", 2);
        referentiels.module(rouleGalette, "Module 1", 1);
    }

    @Test
    void laRechercheIgnoreCasseArticleEtAccentsEtClasseDuPlusProcheAuMoinsProche() {
        given().queryParam("recherche", "la roule gal")
                .when().get("/api/albums")
                .then()
                .statusCode(200)
                .body("total", equalTo(1))
                .body("elements", hasSize(1))
                .body("elements[0].id", equalTo(rouleGalette.toString()))
                .body("elements[0].titre", equalTo("La Roule Galette"))
                .body("elements[0].auteur", equalTo("Natha Caputo"))
                .body("elements[0].editeur", nullValue())
                .body("elements[0].nombreModules", equalTo(2));
    }

    @Test
    void unTitreAccentueEstTrouveSansAccents() {
        given().queryParam("recherche", "elmer")
                .when().get("/api/albums")
                .then()
                .statusCode(200)
                .body("elements.id", contains(elmer.toString()))
                .body("elements[0].titre", equalTo("Élmer l’éléphant"));
    }

    @Test
    void unTitreQuiContientLeTexteEstTrouveLePlusProcheDAbord() {
        given().queryParam("recherche", "GALETTE")
                .when().get("/api/albums")
                .then()
                .statusCode(200)
                .body("total", equalTo(2))
                .body("elements.id", contains(rouleGalette.toString(), galette.toString()))
                .body("elements[1].nombreModules", equalTo(0));
    }

    @Test
    void unTitreQuiRessembleEstTrouveMalgreUneFaute() {
        given().queryParam("recherche", "roule galete")
                .when().get("/api/albums")
                .then()
                .statusCode(200)
                .body("elements.id", hasItem(rouleGalette.toString()))
                .body("elements.id", not(hasItem(loup.toString())));
    }

    @Test
    void lesCaracteresSpeciauxDeLikeSontPrisLitteralement() {
        given().queryParam("recherche", "%%")
                .when().get("/api/albums")
                .then()
                .statusCode(200)
                .body("elements", empty())
                .body("total", equalTo(0));
    }

    @ParameterizedTest
    @ValueSource(strings = { "", "r", " l ", "le r" })
    void moinsDeDeuxCaracteresNeTrouventRien(String recherche) {
        given().queryParam("recherche", recherche)
                .when().get("/api/albums")
                .then()
                .statusCode(200)
                .body("elements", empty())
                .body("total", equalTo(0));
    }

    @Test
    void sansRechercheRienNEstTrouve() {
        given().when().get("/api/albums")
                .then()
                .statusCode(200)
                .body("elements", empty())
                .body("total", equalTo(0));
    }

    @Test
    void laPaginationDecoupeLesResultatsSansChangerLeTotal() {
        given().queryParam("recherche", "galette").queryParam("page", 1).queryParam("taille", 1)
                .when().get("/api/albums")
                .then()
                .statusCode(200)
                .body("total", equalTo(2))
                .body("elements.id", contains(galette.toString()));
    }

    @ParameterizedTest
    @ValueSource(strings = { "taille=101", "taille=0", "page=-1", "page=21474836&taille=100" })
    void unePaginationHorsLimitesEstRefusee(String parametre) {
        given().when().get("/api/albums?recherche=galette&" + parametre)
                .then()
                .statusCode(400)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo("requete.invalide"));
    }

    @Test
    void lesModulesSontDansLeurOrdre() {
        given().when().get("/api/albums/" + rouleGalette + "/modules")
                .then()
                .statusCode(200)
                .body("nom", contains("Module 1", "Module 2"))
                .body("ordre", contains(1, 2))
                .body("albumId", contains(rouleGalette.toString(), rouleGalette.toString()));
    }

    @Test
    void unAlbumSansModuleRendUneListeVide() {
        given().when().get("/api/albums/" + loup + "/modules")
                .then()
                .statusCode(200)
                .body("$", empty());
    }

    @Test
    void lesModulesDUnAlbumInconnuRepondent404() {
        given().when().get("/api/albums/" + UUID.randomUUID() + "/modules")
                .then()
                .statusCode(404)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo("ressource.introuvable"));
    }

    @Test
    void lesThemesSontParNom() {
        referentiels.theme("saisons");
        referentiels.theme("cuisine");

        given().when().get("/api/themes")
                .then()
                .statusCode(200)
                .body("nom", contains("cuisine", "saisons"));
    }
}
