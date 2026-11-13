package fr.corpusmots.vocabulaire.api;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.nullValue;

import fr.corpusmots.commun.api.EnseignantsDeTest;
import fr.corpusmots.commun.api.ProblemeDto;
import fr.corpusmots.referentiels.api.ReferentielsDeTest;
import fr.corpusmots.vocabulaire.service.FichiersDeTest;
import fr.corpusmots.vocabulaire.service.Lexique;
import fr.corpusmots.vocabulaire.service.MotVue;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.quarkus.test.security.oidc.Claim;
import io.quarkus.test.security.oidc.OidcSecurity;
import io.restassured.http.ContentType;
import io.restassured.response.ValidatableResponse;
import jakarta.inject.Inject;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * {@code PUT /images/{id}/description} (story 2.6, partie 2) : le propriétaire remplace d'un coup type, licence,
 * source, auteur et Album d'origine, avec les règles du téléversement ; {@code 403} pour un autre enseignant qui voit
 * l'Image, administrateur compris, {@code 404} pour une Image non consultable. Une ligne de test par ligne back de la
 * matrice de la spec.
 */
@QuarkusTest
class DescriptionImageResourceTest {

    static final String CLAIRE = "0190f0a0-0000-7000-8000-000000000821";
    static final String ZOE = "0190f0a0-0000-7000-8000-000000000822";

    @Inject
    EnseignantsDeTest enseignants;

    @Inject
    ImagesDeTest images;

    @Inject
    ReferentielsDeTest referentiels;

    @Inject
    Lexique lexique;

    UUID legume;
    UUID rouleGalette;

    @BeforeEach
    void donnees() {
        enseignants.seulsActifs(CLAIRE, ZOE);
        images.effacer();
        referentiels.effacer();
        rouleGalette = referentiels.album("Roule galette", "Natha Caputo");
        MotVue citrouille = QuarkusTransaction.requiringNew().call(() -> lexique.obtenirOuCreerMot("citrouille"));
        legume = QuarkusTransaction.requiringNew()
                .call(() -> lexique.obtenirOuCreerSens(citrouille.id(), "légume", "nom")).id();
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void leProprietaireCompleteUneImageLibre() {
        UUID image = images.image(UUID.fromString(CLAIRE), legume, "privee", "image_libre", null, null, null, null);

        decrire(image, description("image_libre", "cc0_domaine_public", "  pixabay.com ", "Claire D.", null))
                .statusCode(200)
                .body("id", equalTo(image.toString()))
                .body("etat", equalTo("privee"))
                .body("typeImage", equalTo("image_libre"))
                .body("licence", equalTo("cc0_domaine_public"))
                .body("source", equalTo("pixabay.com"))
                .body("auteur", equalTo("Claire D."))
                .body("aCompleter", equalTo(false))
                .body("forme", equalTo("citrouille"));
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void passerEnImageDAlbumReduitLeFichierEtLaMiniature() throws IOException {
        UUID image = images.image(UUID.fromString(CLAIRE), legume, "privee", "image_libre", "cc0_domaine_public",
                "site web", null, null);
        images.fichier(image, FichiersDeTest.jpeg(1600, 1200), FichiersDeTest.jpeg(1000, 750), "image/jpeg", 1600,
                1200);

        decrire(image, description("image_album", "cc0_domaine_public", "site web", null, rouleGalette))
                .statusCode(200)
                .body("typeImage", equalTo("image_album"))
                .body("licence", equalTo("usage_pedagogique_album"))
                .body("albumOrigine.id", equalTo(rouleGalette.toString()))
                .body("albumOrigine.titre", equalTo("Roule galette"));

        BufferedImage grande = ImageIO.read(new ByteArrayInputStream(images.octets(image)));
        BufferedImage miniature = ImageIO.read(new ByteArrayInputStream(images.miniature(image)));
        assertEquals(400, Math.max(grande.getWidth(), grande.getHeight()));
        assertTrue(Math.max(miniature.getWidth(), miniature.getHeight()) <= 256);
        assertArrayEquals(new int[] { grande.getWidth(), grande.getHeight() }, images.dimensions(image));
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void uneImageDAlbumSansAlbumEstRefusee() {
        UUID image = images.image(UUID.fromString(CLAIRE), legume, "privee", "image_libre", "cc0_domaine_public",
                "site web", null, null);

        refus(decrire(image, description("image_album", null, "site web", null, null)), 400, "image.album_requis");
        inchangee(image);
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void unAlbumInconnuEstRefuse() {
        UUID image = images.image(UUID.fromString(CLAIRE), legume, "privee", "image_libre", "cc0_domaine_public",
                "site web", null, null);

        refus(decrire(image, description("image_album", null, "site web", null, UUID.randomUUID())), 400,
                "image.album_introuvable");
        inchangee(image);
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void quitterLImageDAlbumEffaceAlbumEtLicenceSansToucherAuFichier() {
        UUID image = images.image(UUID.fromString(CLAIRE), legume, "privee", "image_album",
                "usage_pedagogique_album", "site web", null, rouleGalette);
        byte[] avant = images.octets(image);

        decrire(image, description("image_libre", null, "site web", null, rouleGalette))
                .statusCode(200)
                .body("typeImage", equalTo("image_libre"))
                .body("albumOrigine", nullValue())
                .body("licence", nullValue())
                .body("aCompleter", equalTo(true));
        assertArrayEquals(avant, images.octets(image));
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void unePhotoPersonnelleRecoitSaLicence() {
        UUID image = images.image(UUID.fromString(CLAIRE), legume, "privee", "image_libre", null, null, null, null);

        decrire(image, description("photo_personnelle", "cc0_domaine_public", null, null, null))
                .statusCode(200)
                .body("typeImage", equalTo("photo_personnelle"))
                .body("licence", equalTo("droits_auteur_enseignant"));
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void uneLicenceNonChoisissableEstRefusee() {
        UUID image = images.image(UUID.fromString(CLAIRE), legume, "privee", "image_libre", "cc0_domaine_public",
                "site web", null, null);

        refus(decrire(image, description("image_libre", "usage_pedagogique_album", "site web", null, null)), 400,
                "requete.invalide");
        inchangee(image);
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void unTexteTropLongEstRefuse() {
        UUID image = images.image(UUID.fromString(CLAIRE), legume, "privee", "image_libre", "cc0_domaine_public",
                "site web", null, null);

        refus(decrire(image, description("image_libre", "cc0_domaine_public", "s".repeat(501), null, null)), 400,
                "requete.invalide");
        inchangee(image);
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void unCollegueQuiALieLImageNePeutPasLaModifier() {
        UUID deZoe = images.image(UUID.fromString(ZOE), legume, "privee", "image_libre", "cc0_domaine_public",
                "site web", null, null);
        images.lien(deZoe, UUID.fromString(CLAIRE), rouleGalette);

        refus(decrire(deZoe, description("image_libre", "pixabay", "autre", null, null)), 403,
                "image.reservee_au_proprietaire");
        inchangee(deZoe);
    }

    @Test
    @TestSecurity(user = ZOE, roles = "admin")
    @OidcSecurity(claims = @Claim(key = "sub", value = ZOE))
    void lAdministrateurNonProprietaireNePeutPasLaModifier() {
        UUID deClaire = images.image(UUID.fromString(CLAIRE), legume, "privee", "image_libre",
                "cc0_domaine_public", "site web", null, null);
        images.lien(deClaire, UUID.fromString(ZOE), rouleGalette);

        refus(decrire(deClaire, description("image_libre", "pixabay", "autre", null, null)), 403,
                "image.reservee_au_proprietaire");
        inchangee(deClaire);
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void uneImageNonConsultableEstIntrouvable() {
        UUID deZoe = images.image(UUID.fromString(ZOE), legume, "privee", "image_libre", "cc0_domaine_public",
                "site web", null, null);

        refus(decrire(deZoe, description("image_libre", "pixabay", "autre", null, null)), 404,
                "ressource.introuvable");
        refus(decrire(UUID.randomUUID(), description("image_libre", null, null, null, null)), 404,
                "ressource.introuvable");
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void unTypeOuUneLicenceInconnusOuUnTypeAbsentSontRefuses() {
        UUID image = images.image(UUID.fromString(CLAIRE), legume, "privee", "image_libre", "cc0_domaine_public",
                "site web", null, null);

        refus(decrire(image, description("dessin", null, "autre", null, null)), 400, "requete.invalide");
        refus(decrire(image, description("image_libre", "cc_by", "autre", null, null)), 400, "requete.invalide");
        refus(decrire(image, description(null, null, "autre", null, null)), 400, "requete.invalide");
        inchangee(image);
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void uneImageDAlbumChangeDAlbumSansNouvelleReduction() {
        UUID autreAlbum = referentiels.album("La grosse faim de P'tit Bonhomme", "Pierre Delye");
        UUID image = images.image(UUID.fromString(CLAIRE), legume, "privee", "image_album",
                "usage_pedagogique_album", null, null, rouleGalette);
        images.fichier(image, FichiersDeTest.jpeg(400, 300), FichiersDeTest.jpeg(256, 192), "image/jpeg", 400, 300);
        byte[] avant = images.octets(image);

        decrire(image, description("image_album", null, null, null, autreAlbum))
                .statusCode(200)
                .body("typeImage", equalTo("image_album"))
                .body("albumOrigine.id", equalTo(autreAlbum.toString()))
                .body("albumOrigine.titre", equalTo("La grosse faim de P'tit Bonhomme"));
        assertArrayEquals(avant, images.octets(image));
    }

    @Test
    void sansJetonLaRequeteEstRefusee() {
        given().contentType(ContentType.JSON).body(description("image_libre", null, null, null, null))
                .when().put("/api/images/" + UUID.randomUUID() + "/description").then().statusCode(401);
    }

    private static Map<String, Object> description(String type, String licence, String source, String auteur,
            UUID albumId) {
        Map<String, Object> corps = new HashMap<>();
        corps.put("typeImage", type);
        corps.put("licence", licence);
        corps.put("source", source);
        corps.put("auteur", auteur);
        corps.put("albumId", albumId == null ? null : albumId.toString());
        return corps;
    }

    private static ValidatableResponse decrire(UUID image, Map<String, Object> corps) {
        return given().contentType(ContentType.JSON).body(corps)
                .when().put("/api/images/" + image + "/description").then();
    }

    private static void refus(ValidatableResponse reponse, int statut, String code) {
        reponse.statusCode(statut)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo(code));
    }

    /** L'Image a gardé sa description de départ : image libre, CC0, source « site web », sans Album. */
    private void inchangee(UUID image) {
        assertEquals("image_libre|cc0_domaine_public|site web|null", images.description(image));
    }
}
