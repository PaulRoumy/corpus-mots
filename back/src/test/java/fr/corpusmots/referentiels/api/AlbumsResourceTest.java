package fr.corpusmots.referentiels.api;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import fr.corpusmots.commun.api.EnseignantsDeTest;
import fr.corpusmots.commun.api.ProblemeDto;
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
import java.util.stream.Stream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;

/** Albums, Modules et Thèmes (matrices de la story 2.1, parties 1 et 2, et de la story 2.2, partie 4). */
@QuarkusTest
@TestSecurity(user = AlbumsResourceTest.ENSEIGNANTE)
@OidcSecurity(claims = @Claim(key = "sub", value = AlbumsResourceTest.ENSEIGNANTE))
class AlbumsResourceTest {

    static final String ENSEIGNANTE = "0190f0a0-0000-7000-8000-000000000401";
    static final String COLLEGUE = "0190f0a0-0000-7000-8000-000000000402";
    static final String ADMIN = "0190f0a0-0000-7000-8000-000000000403";

    @Inject
    EnseignantsDeTest enseignants;

    @Inject
    ReferentielsDeTest referentiels;

    @Inject
    EntityManager entityManager;

    UUID rouleGalette;
    UUID galette;
    UUID loup;
    UUID elmer;

    @BeforeEach
    void donnees() {
        enseignants.seulsActifs(ENSEIGNANTE, COLLEGUE, ADMIN);
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

    // Story 2.1, partie 2 : titres proches et création d'Album.

    @Test
    void unTitreDeMemeFormeNormaliseeEstProche() {
        UUID roule = referentiels.album("Roule galette", "Natha Caputo");

        given().queryParam("titre", "La Roule Galette")
                .when().get("/api/albums/titres-proches")
                .then()
                .statusCode(200)
                .body("id", hasItem(roule.toString()))
                .body("id", not(hasItem(loup.toString())));
    }

    @Test
    void lesTitresProchesSontDuPlusProcheAuMoinsProcheEtCinqAuPlus() {
        UUID exact = referentiels.album("Roule galettes", "A");
        for (int rang = 1; rang <= 6; rang++) {
            referentiels.album("Roule galettes et compagnie " + rang, "B");
        }

        given().queryParam("titre", "roule galettes")
                .when().get("/api/albums/titres-proches")
                .then()
                .statusCode(200)
                .body("$", hasSize(5))
                .body("[0].id", equalTo(exact.toString()))
                .body("[0].nombreModules", equalTo(0));
    }

    @Test
    void unTitreQuiRessembleMalgreUneFauteEstProche() {
        given().queryParam("titre", "Roule galete")
                .when().get("/api/albums/titres-proches")
                .then()
                .statusCode(200)
                .body("[0].id", equalTo(rouleGalette.toString()))
                .body("[0].nombreModules", equalTo(2))
                .body("id", not(hasItem(loup.toString())));
    }

    @ParameterizedTest
    @ValueSource(strings = { "", "r", " l ", "le r" })
    void unTitreDeMoinsDeDeuxCaracteresNAPasDeTitreProche(String titre) {
        given().queryParam("titre", titre)
                .when().get("/api/albums/titres-proches")
                .then()
                .statusCode(200)
                .body("$", empty());
    }

    @Test
    void creerUnAlbumNettoieLeTitreEtLeRendVisible() {
        String id = given().contentType(ContentType.JSON)
                .body(Map.of("titre", " La  Moufle ", "auteur", " Jan  Brett ", "editeur", "  "))
                .when().post("/api/albums")
                .then()
                .statusCode(201)
                .body("titre", equalTo("La Moufle"))
                .body("auteur", equalTo("Jan Brett"))
                .body("editeur", nullValue())
                .body("nombreModules", equalTo(0))
                .extract().path("id");

        UUID album = UUID.fromString(id);
        assertEquals(UUID.fromString(ENSEIGNANTE), referentiels.createur(album));
        assertNull(referentiels.editeur(album));
        given().queryParam("recherche", "moufle")
                .when().get("/api/albums")
                .then()
                .statusCode(200)
                .body("elements.id", contains(id));
    }

    @Test
    void creerUnAlbumAvecSonEditeur() {
        given().contentType(ContentType.JSON)
                .body(Map.of("titre", "La Moufle", "auteur", "Jan Brett", "editeur", " L'école  des loisirs "))
                .when().post("/api/albums")
                .then()
                .statusCode(201)
                .body("editeur", equalTo("L'école des loisirs"));
    }

    static Stream<Arguments> champsInvalides() {
        String long201 = "a".repeat(201);
        return Stream.of(
                Arguments.of(null, "Jan Brett", null, "album.titre_invalide"),
                Arguments.of("   ", "Jan Brett", null, "album.titre_invalide"),
                Arguments.of(long201, "Jan Brett", null, "album.titre_invalide"),
                Arguments.of("La Moufle", null, null, "album.auteur_invalide"),
                Arguments.of("La Moufle", " ", null, "album.auteur_invalide"),
                Arguments.of("La Moufle", long201, null, "album.auteur_invalide"),
                Arguments.of("La Moufle", "Jan Brett", long201, "album.editeur_invalide"));
    }

    @ParameterizedTest
    @MethodSource("champsInvalides")
    void unChampInvalideEstRefuseSansRienCreer(String titre, String auteur, String editeur, String code) {
        long avant = referentiels.nombreAlbums();
        Map<String, String> corps = new HashMap<>();
        corps.put("titre", titre);
        corps.put("auteur", auteur);
        corps.put("editeur", editeur);

        given().contentType(ContentType.JSON).body(corps)
                .when().post("/api/albums")
                .then()
                .statusCode(400)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo(code));

        assertEquals(avant, referentiels.nombreAlbums());
    }

    @Test
    void deuxCentsCaracteresApresNettoyageSontAcceptes() {
        given().contentType(ContentType.JSON)
                .body(Map.of("titre", "  " + "a".repeat(200) + "  ", "auteur", "b".repeat(200),
                        "editeur", "c".repeat(200)))
                .when().post("/api/albums")
                .then()
                .statusCode(201);
    }

    @Test
    void unCorpsAbsentEstRefuse() {
        given().contentType(ContentType.JSON)
                .when().post("/api/albums")
                .then()
                .statusCode(400)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo("requete.invalide"));
    }

    @Test
    void unAlbumDeMemeTitreEtDeMemeAuteurNormalisesEstRefuse() {
        referentiels.album("La Moufle", "Jan Brett");
        long avant = referentiels.nombreAlbums();

        given().contentType(ContentType.JSON)
                .body(Map.of("titre", "LA MOUFLE", "auteur", "jan brett"))
                .when().post("/api/albums")
                .then()
                .statusCode(409)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo("album.deja_existant"));

        assertEquals(avant, referentiels.nombreAlbums());
    }

    @Test
    void unAlbumDeMemeTitreEtDAutreAuteurEstCreeApresAvoirEteSignale() {
        UUID brett = referentiels.album("La Moufle", "Jan Brett");

        given().queryParam("titre", "La Moufle")
                .when().get("/api/albums/titres-proches")
                .then()
                .statusCode(200)
                .body("id", contains(brett.toString()));

        given().contentType(ContentType.JSON)
                .body(Map.of("titre", "La Moufle", "auteur", "Florence Desnouveaux"))
                .when().post("/api/albums")
                .then()
                .statusCode(201)
                .body("auteur", equalTo("Florence Desnouveaux"));
    }

    // Story 2.2, partie 4 : lire et corriger un Album.

    @Test
    void lireUnAlbumDonneSonCreateur() {
        given().when().get("/api/albums/" + rouleGalette)
                .then()
                .statusCode(200)
                .body("id", equalTo(rouleGalette.toString()))
                .body("titre", equalTo("La Roule Galette"))
                .body("auteur", equalTo("Natha Caputo"))
                .body("editeur", nullValue())
                .body("createurId", equalTo(ReferentielsDeTest.CREATEUR.toString()))
                .body("nombreModules", equalTo(2));
    }

    @Test
    void lireUnAlbumInconnuEstIntrouvable() {
        given().when().get("/api/albums/" + UUID.randomUUID())
                .then()
                .statusCode(404)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo("ressource.introuvable"));
    }

    @Test
    void leCreateurCorrigeSonAlbumEtLaRechercheMontreLeNouveauTitre() {
        UUID moufle = referentiels.album("La Mouffle", "Jan Bret", UUID.fromString(ENSEIGNANTE));

        given().contentType(ContentType.JSON)
                .body(Map.of("titre", " La  Moufle ", "auteur", "Jan Brett", "editeur", " L'école  des loisirs "))
                .when().put("/api/albums/" + moufle)
                .then()
                .statusCode(200)
                .body("id", equalTo(moufle.toString()))
                .body("titre", equalTo("La Moufle"))
                .body("auteur", equalTo("Jan Brett"))
                .body("editeur", equalTo("L'école des loisirs"))
                .body("createurId", equalTo(ENSEIGNANTE))
                .body("nombreModules", equalTo(0));

        assertEquals("La Moufle|moufle|Jan Brett|L'école des loisirs|" + ENSEIGNANTE, referentiels.ligneAlbum(moufle));
        given().queryParam("recherche", "moufle")
                .when().get("/api/albums")
                .then()
                .statusCode(200)
                .body("elements.id", contains(moufle.toString()))
                .body("elements[0].titre", equalTo("La Moufle"));
    }

    @Test
    void corrigerAvecUnEditeurVideLeRetire() {
        UUID moufle = referentiels.album("La Moufle", "Jan Brett", UUID.fromString(ENSEIGNANTE));
        given().contentType(ContentType.JSON)
                .body(Map.of("titre", "La Moufle", "auteur", "Jan Brett", "editeur", "Milan"))
                .when().put("/api/albums/" + moufle)
                .then()
                .statusCode(200)
                .body("editeur", equalTo("Milan"));

        given().contentType(ContentType.JSON)
                .body(Map.of("titre", "La Moufle", "auteur", "Jan Brett", "editeur", "  "))
                .when().put("/api/albums/" + moufle)
                .then()
                .statusCode(200)
                .body("editeur", nullValue());
        assertNull(referentiels.editeur(moufle));
    }

    @Test
    void garderSonTitreEtSonAuteurEstAccepte() {
        UUID moufle = referentiels.album("La Moufle", "Jan Brett", UUID.fromString(ENSEIGNANTE));

        given().contentType(ContentType.JSON)
                .body(Map.of("titre", "la moufle", "auteur", "JAN BRETT"))
                .when().put("/api/albums/" + moufle)
                .then()
                .statusCode(200)
                .body("titre", equalTo("la moufle"))
                .body("auteur", equalTo("JAN BRETT"));
    }

    /**
     * La Préparation ne garde aucune copie du titre : celle d'un enseignant qui n'est pas le créateur de l'Album, créée
     * avant la correction, montre le nouveau titre. {@code @TestSecurity} ne donne qu'une identité par test : c'est
     * l'administrateur qui corrige l'Album d'une collègue, puis relit sa propre Préparation.
     */
    @Test
    @TestSecurity(user = ADMIN, roles = "admin")
    @OidcSecurity(claims = @Claim(key = "sub", value = ADMIN))
    void lAdministrateurCorrigeLAlbumDUneCollegueEtLesPreparationsMontrentLeNouveauTitre() {
        UUID moufle = referentiels.album("La Mouffle", "Jan Brett", UUID.fromString(COLLEGUE));
        UUID preparation = QuarkusTransaction.requiringNew().call(() -> (UUID) entityManager.createNativeQuery(
                "insert into preparation (proprietaire_id, album_id, section) values (:proprietaire, :album, 'ms')"
                        + " returning id")
                .setParameter("proprietaire", UUID.fromString(ADMIN))
                .setParameter("album", moufle)
                .getSingleResult());
        try {
            given().contentType(ContentType.JSON)
                    .body(Map.of("titre", "La Moufle", "auteur", "Jan Brett"))
                    .when().put("/api/albums/" + moufle)
                    .then()
                    .statusCode(200)
                    .body("titre", equalTo("La Moufle"))
                    .body("createurId", equalTo(COLLEGUE));

            given().when().get("/api/preparations/" + preparation)
                    .then()
                    .statusCode(200)
                    .body("albumId", equalTo(moufle.toString()))
                    .body("titreAlbum", equalTo("La Moufle"));
        } finally {
            QuarkusTransaction.requiringNew().run(() -> entityManager
                    .createNativeQuery("delete from preparation where id = :id")
                    .setParameter("id", preparation)
                    .executeUpdate());
        }
    }

    @ParameterizedTest
    @MethodSource("champsInvalides")
    void corrigerAvecUnChampInvalideEstRefuseSansRienModifier(String titre, String auteur, String editeur,
            String code) {
        UUID moufle = referentiels.album("La Moufle", "Jan Brett", UUID.fromString(ENSEIGNANTE));
        String avant = referentiels.ligneAlbum(moufle);
        Map<String, String> corps = new HashMap<>();
        corps.put("titre", titre);
        corps.put("auteur", auteur);
        corps.put("editeur", editeur);

        given().contentType(ContentType.JSON).body(corps)
                .when().put("/api/albums/" + moufle)
                .then()
                .statusCode(400)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo(code));

        assertEquals(avant, referentiels.ligneAlbum(moufle));
    }

    @Test
    void corrigerSansCorpsEstRefuse() {
        UUID moufle = referentiels.album("La Moufle", "Jan Brett", UUID.fromString(ENSEIGNANTE));

        given().contentType(ContentType.JSON)
                .when().put("/api/albums/" + moufle)
                .then()
                .statusCode(400)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo("requete.invalide"));
    }

    @Test
    void corrigerEnLeTitreEtLAuteurDUnAutreAlbumEstRefuseSansRienModifier() {
        referentiels.album("La Moufle", "Jan Brett");
        UUID mouffle = referentiels.album("La Mouffle", "Jan Brett", UUID.fromString(ENSEIGNANTE));
        String avant = referentiels.ligneAlbum(mouffle);

        given().contentType(ContentType.JSON)
                .body(Map.of("titre", "MOUFLE", "auteur", "jan  brett"))
                .when().put("/api/albums/" + mouffle)
                .then()
                .statusCode(409)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo("album.deja_existant"));

        assertEquals(avant, referentiels.ligneAlbum(mouffle));
    }

    @Test
    @TestSecurity(user = COLLEGUE)
    @OidcSecurity(claims = @Claim(key = "sub", value = COLLEGUE))
    void unAutreEnseignantNePeutPasCorrigerLAlbum() {
        UUID moufle = referentiels.album("La Mouffle", "Jan Brett", UUID.fromString(ENSEIGNANTE));
        String avant = referentiels.ligneAlbum(moufle);

        // 403 avant toute validation : même un titre vide est refusé pour ce motif.
        for (String titre : new String[] { "La Moufle", "" }) {
            given().contentType(ContentType.JSON)
                    .body(Map.of("titre", titre, "auteur", "Jan Brett"))
                    .when().put("/api/albums/" + moufle)
                    .then()
                    .statusCode(403)
                    .contentType(ProblemeDto.MEDIA_TYPE)
                    .body("code", equalTo("album.reserve_au_createur"));
        }

        assertEquals(avant, referentiels.ligneAlbum(moufle));
    }

    @Test
    void corrigerUnAlbumInconnuEstIntrouvable() {
        long avant = referentiels.nombreAlbums();

        given().contentType(ContentType.JSON)
                .body(Map.of("titre", "La Moufle", "auteur", "Jan Brett"))
                .when().put("/api/albums/" + UUID.randomUUID())
                .then()
                .statusCode(404)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo("ressource.introuvable"));

        assertEquals(avant, referentiels.nombreAlbums());
    }
}
