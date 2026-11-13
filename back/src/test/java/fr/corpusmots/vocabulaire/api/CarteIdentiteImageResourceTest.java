package fr.corpusmots.vocabulaire.api;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.nullValue;

import fr.corpusmots.commun.api.EnseignantsDeTest;
import fr.corpusmots.commun.api.ProblemeDto;
import fr.corpusmots.referentiels.api.ReferentielsDeTest;
import fr.corpusmots.vocabulaire.service.Lexique;
import fr.corpusmots.vocabulaire.service.MotVue;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.quarkus.test.security.oidc.Claim;
import io.quarkus.test.security.oidc.OidcSecurity;
import io.restassured.response.ValidatableResponse;
import jakarta.inject.Inject;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * {@code GET /images/{id}} (story 2.6, partie 1) : Carte d'identité d'une Image consultable (AD-2), sinon
 * {@code 404 ressource.introuvable} ; le rôle {@code admin} n'élargit rien. Une ligne de test par ligne back de la
 * matrice de la spec.
 */
@QuarkusTest
class CarteIdentiteImageResourceTest {

    static final String CLAIRE = "0190f0a0-0000-7000-8000-000000000811";
    static final String ZOE = "0190f0a0-0000-7000-8000-000000000812";

    @Inject
    EnseignantsDeTest enseignants;

    @Inject
    ImagesDeTest images;

    @Inject
    ReferentielsDeTest referentiels;

    @Inject
    Lexique lexique;

    UUID mot;
    UUID legume;
    UUID aCompleter;
    UUID rouleGalette;

    @BeforeEach
    void donnees() {
        enseignants.seulsActifs(CLAIRE, ZOE);
        images.effacer();
        referentiels.effacer();
        rouleGalette = referentiels.album("Roule galette", "Natha Caputo");
        MotVue citrouille = QuarkusTransaction.requiringNew().call(() -> lexique.obtenirOuCreerMot("citrouille"));
        mot = citrouille.id();
        legume = QuarkusTransaction.requiringNew()
                .call(() -> lexique.obtenirOuCreerSens(citrouille.id(), "légume", "nom")).id();
        aCompleter = QuarkusTransaction.requiringNew()
                .call(() -> lexique.obtenirOuCreerSens(citrouille.id(), "à compléter", null)).id();
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void leProprietaireLitTousLesChamps() {
        UUID image = images.image(UUID.fromString(CLAIRE), legume, "privee", "image_libre", "cc0_domaine_public",
                "site web", "Claire D.", null);

        carte(image)
                .statusCode(200)
                .body("id", equalTo(image.toString()))
                .body("proprietaireId", equalTo(CLAIRE))
                .body("etat", equalTo("privee"))
                .body("aRemplacer", nullValue())
                .body("reutilisable", equalTo(true))
                .body("typeImage", equalTo("image_libre"))
                .body("aCompleter", equalTo(false))
                .body("motId", equalTo(mot.toString()))
                .body("forme", equalTo("citrouille"))
                .body("sens.id", equalTo(legume.toString()))
                .body("sens.libelle", equalTo("légume"))
                .body("sens.categorie", equalTo("nom"))
                .body("sens.aCompleter", equalTo(false))
                .body("albumOrigine", nullValue())
                .body("licence", equalTo("cc0_domaine_public"))
                .body("source", equalTo("site web"))
                .body("auteur", equalTo("Claire D."));
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void uneImageLibreSansLicenceEstACompleter() {
        UUID image = images.image(UUID.fromString(CLAIRE), legume, "privee", "image_libre", null, null, null, null);

        carte(image)
                .statusCode(200)
                .body("aCompleter", equalTo(true))
                .body("licence", nullValue())
                .body("source", nullValue())
                .body("auteur", nullValue());
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void uneImageDAlbumPorteSonAlbumDOrigine() {
        UUID image = images.image(UUID.fromString(CLAIRE), legume, "privee", "image_album",
                "usage_pedagogique_album", null, null, rouleGalette);

        carte(image)
                .statusCode(200)
                .body("typeImage", equalTo("image_album"))
                .body("licence", equalTo("usage_pedagogique_album"))
                .body("albumOrigine.id", equalTo(rouleGalette.toString()))
                .body("albumOrigine.titre", equalTo("Roule galette"))
                .body("albumOrigine.auteur", equalTo("Natha Caputo"));
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void seuleUneImageDAlbumAUnAlbumDOrigine() {
        UUID image = images.image(UUID.fromString(CLAIRE), legume, "privee", "image_libre", "cc0_domaine_public",
                "site web", null, rouleGalette);

        carte(image)
                .statusCode(200)
                .body("typeImage", equalTo("image_libre"))
                .body("albumOrigine", nullValue());
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void leSensACompleterEstSignale() {
        UUID image = images.image(UUID.fromString(CLAIRE), aCompleter, "privee", "image_libre",
                "cc0_domaine_public", "site web", null, null);

        carte(image)
                .statusCode(200)
                .body("sens.libelle", equalTo("à compléter"))
                .body("sens.categorie", nullValue())
                .body("sens.aCompleter", equalTo(true));
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void lImagePriveeDUnCollegueSansLienEstIntrouvable() {
        UUID deZoe = images.image(UUID.fromString(ZOE), legume, "privee", "image_libre", "cc0_domaine_public",
                "site web", "Zoé", null);

        introuvable(carte(deZoe));
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void lImageDUnCollegueLieeParLEnseignantEstConsultableSansEtreReutilisable() {
        UUID deZoe = images.image(UUID.fromString(ZOE), legume, "privee", "image_libre", "cc0_domaine_public",
                "site web", "Zoé", null);
        images.lien(deZoe, UUID.fromString(CLAIRE), rouleGalette);

        carte(deZoe)
                .statusCode(200)
                .body("proprietaireId", equalTo(ZOE))
                .body("reutilisable", equalTo(false))
                .body("auteur", equalTo("Zoé"));
    }

    @Test
    @TestSecurity(user = ZOE, roles = "admin")
    @OidcSecurity(claims = @Claim(key = "sub", value = ZOE))
    void leRoleAdminNElargitRien() {
        UUID deClaire = images.image(UUID.fromString(CLAIRE), legume, "privee", "image_libre",
                "cc0_domaine_public", "site web", null, null);

        introuvable(carte(deClaire));
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void uneImageInexistanteEstIntrouvable() {
        introuvable(carte(UUID.randomUUID()));
    }

    @Test
    void sansJetonLaRequeteEstRefusee() {
        given().when().get("/api/images/" + UUID.randomUUID()).then().statusCode(401);
    }

    private static ValidatableResponse carte(UUID image) {
        return given().when().get("/api/images/" + image).then();
    }

    private static void introuvable(ValidatableResponse reponse) {
        reponse.statusCode(404)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo("ressource.introuvable"));
    }
}
