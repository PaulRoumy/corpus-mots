package fr.corpusmots.preparations.api;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import fr.corpusmots.commun.api.EnseignantsDeTest;
import fr.corpusmots.commun.api.ErreurMetier;
import fr.corpusmots.commun.api.ProblemeDto;
import fr.corpusmots.referentiels.api.ReferentielsDeTest;
import fr.corpusmots.vocabulaire.api.ImagesDeTest;
import fr.corpusmots.vocabulaire.service.FichiersDeTest;
import fr.corpusmots.vocabulaire.service.ImageReduiteVue;
import fr.corpusmots.vocabulaire.service.Images;
import fr.corpusmots.vocabulaire.service.ReductionImages;
import fr.corpusmots.vocabulaire.service.TeleverserImageCommande;
import fr.corpusmots.vocabulaire.service.TypeImage;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.quarkus.test.security.oidc.Claim;
import io.quarkus.test.security.oidc.OidcSecurity;
import io.restassured.http.ContentType;
import io.restassured.response.ValidatableResponse;
import io.restassured.specification.RequestSpecification;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import java.awt.image.BufferedImage;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Téléverser une Image depuis la Carte « à illustrer » (story 2.5, partie 1) : une ligne de test par ligne de la
 * matrice de la spec, plus les compteurs et le rétablissement d'un Mot illustré.
 */
@QuarkusTest
@TestSecurity(user = ImagesMotsPreparationResourceTest.CLAIRE)
@OidcSecurity(claims = @Claim(key = "sub", value = ImagesMotsPreparationResourceTest.CLAIRE))
class ImagesMotsPreparationResourceTest {

    static final String CLAIRE = "0190f0a0-0000-7000-8000-000000000611";
    static final String ZOE = "0190f0a0-0000-7000-8000-000000000612";

    @Inject
    EnseignantsDeTest enseignants;

    @Inject
    ReferentielsDeTest referentiels;

    @Inject
    ImagesDeTest imagesDeTest;

    @Inject
    Images images;

    @Inject
    ReductionImages reduction;

    @Inject
    EntityManager entityManager;

    UUID rouleGalette;
    UUID preparation;
    UUID citrouille;

    @BeforeEach
    void donnees() {
        enseignants.seulsActifs(CLAIRE, ZOE);
        imagesDeTest.effacer();
        QuarkusTransaction.requiringNew().run(() -> {
            entityManager.createNativeQuery("delete from sens_retenu").executeUpdate();
            entityManager.createNativeQuery("delete from preparation").executeUpdate();
            entityManager.createNativeQuery("delete from sens").executeUpdate();
            entityManager.createNativeQuery("delete from mot").executeUpdate();
        });
        referentiels.effacer();
        rouleGalette = referentiels.album("La Roule Galette", "Natha Caputo");
        preparation = preparation(CLAIRE);
        citrouille = UUID.fromString(ajouter(preparation, "citrouille"));
    }

    @Test
    void uneImageLibreCompleteIllustreLeMot() {
        Map<String, String> champs = champs("image_libre", "https://openclipart.org", "cc0_domaine_public", "Anne");

        String imageId = televerser(preparation, citrouille, FichiersDeTest.png(2400, 1200), "citrouille.png", champs)
                .statusCode(201)
                .body("id", equalTo(citrouille.toString()))
                .body("illustre", equalTo(true))
                .body("image.id", notNullValue())
                .body("image.proprietaireId", equalTo(CLAIRE))
                .body("image.etat", equalTo("privee"))
                .body("image.aRemplacer", nullValue())
                .body("image.reutilisable", equalTo(true))
                .body("image.typeImage", equalTo("image_libre"))
                .body("image.aCompleter", equalTo(false))
                .extract().path("image.id");

        UUID image = UUID.fromString(imageId);
        // Seule une image d'album reçoit un Album d'origine, quel que soit le chemin.
        assertEquals("privee|image_libre|cc0_domaine_public|https://openclipart.org|Anne|null|" + CLAIRE
                + "|image|0", ligneImage(image));
        assertEquals(sensRetenu(citrouille), sensDeLImage(image));
        assertEquals("1600x800|image/jpeg", fichierEnBase(image));
        assertEquals(preparation + "|" + image + "|" + CLAIRE + "|" + rouleGalette + "|ms|nouvelle",
                lienEnBase(citrouille));
        BufferedImage miniature = FichiersDeTest.lire(fichier(image, "miniature"));
        assertEquals(256, miniature.getWidth());
        assertEquals(128, miniature.getHeight());
        assertEquals(1600, FichiersDeTest.lire(fichier(image, "grande")).getWidth());

        given().when().get("/api/preparations/" + preparation + "/mots")
                .then()
                .statusCode(200)
                .body("[0].illustre", equalTo(true))
                .body("[0].image.id", equalTo(imageId))
                .body("[0].image.typeImage", equalTo("image_libre"));
        ajouter(preparation, "potiron");
        given().when().get("/api/preparations/" + preparation)
                .then()
                .statusCode(200)
                .body("nombreMots", equalTo(2))
                .body("nombreIllustres", equalTo(1));
        given().when().get("/api/preparations")
                .then()
                .statusCode(200)
                .body("elements[0].nombreMots", equalTo(2))
                .body("elements[0].nombreAIllustrer", equalTo(1));
    }

    @Test
    void uneImageLibreSansLicenceOuSansSourceEstACompleter() {
        televerser(preparation, citrouille, FichiersDeTest.png(50, 50), "a.png",
                champs("image_libre", "https://openclipart.org", null, null))
                .statusCode(201)
                .body("image.aCompleter", equalTo(true));
        UUID potiron = UUID.fromString(ajouter(preparation, "potiron"));
        televerser(preparation, potiron, FichiersDeTest.png(50, 50), "b.png",
                champs("image_libre", "   ", "cc0_domaine_public", null))
                .statusCode(201)
                .body("image.aCompleter", equalTo(true));
        UUID courge = UUID.fromString(ajouter(preparation, "courge"));
        televerser(preparation, courge, FichiersDeTest.png(50, 50), "c.png", champs("inconnu", null, null, null))
                .statusCode(201)
                .body("image.typeImage", equalTo("inconnu"))
                .body("image.aCompleter", equalTo(false));
    }

    @Test
    void unePhotoPersonnelleEstRedresseeSansExifAvecSaLicence() {
        byte[] photo = FichiersDeTest.avecOrientationExif(FichiersDeTest.jpeg(400, 200), 6);

        String imageId = televerser(preparation, citrouille, photo, "photo.jpg",
                champs("photo_personnelle", null, "pixabay", "Claire"))
                .statusCode(201)
                .body("image.typeImage", equalTo("photo_personnelle"))
                .body("image.aCompleter", equalTo(false))
                .extract().path("image.id");

        UUID image = UUID.fromString(imageId);
        assertTrue(ligneImage(image).startsWith("privee|photo_personnelle|droits_auteur_enseignant|null|Claire|"));
        byte[] grande = fichier(image, "grande");
        BufferedImage redressee = FichiersDeTest.lire(grande);
        assertEquals(200, redressee.getWidth());
        assertEquals(400, redressee.getHeight());
        assertFalse(FichiersDeTest.contient(grande, "Exif"));
        assertFalse(FichiersDeTest.contient(fichier(image, "miniature"), "Exif"));
    }

    @Test
    void uneImageDAlbumEstReduiteA400AvecLAlbumDeLaPreparation() {
        String imageId = televerser(preparation, citrouille, FichiersDeTest.jpeg(3000, 2000), "page.jpg",
                champs("image_album", null, "cc0_domaine_public", null))
                .statusCode(201)
                .body("image.typeImage", equalTo("image_album"))
                .extract().path("image.id");

        UUID image = UUID.fromString(imageId);
        assertTrue(ligneImage(image).startsWith("privee|image_album|usage_pedagogique_album|null|null|" + rouleGalette
                + "|"));
        assertEquals("400x267|image/jpeg", fichierEnBase(image));
    }

    @Test
    void uneImageDAlbumSansAlbumEstRefuseeParLeService() {
        ImageReduiteVue fichier = reduction.reduire(FichiersDeTest.png(10, 10), TypeImage.IMAGE_ALBUM);

        ErreurMetier erreur = assertThrows(ErreurMetier.class, () -> images.televerser(
                new TeleverserImageCommande(fichier, sensRetenu(citrouille), TypeImage.IMAGE_ALBUM, null, null, null,
                        null)));

        assertEquals(400, erreur.status());
        assertEquals("image.album_requis", erreur.code());
        assertEquals(0L, nombre("select count(*) from image"));
    }

    @Test
    void uneImageDAlbumDUnAlbumInconnuEstRefuseeParLeService() {
        ImageReduiteVue fichier = reduction.reduire(FichiersDeTest.png(10, 10), TypeImage.IMAGE_ALBUM);

        ErreurMetier erreur = assertThrows(ErreurMetier.class, () -> images.televerser(
                new TeleverserImageCommande(fichier, sensRetenu(citrouille), TypeImage.IMAGE_ALBUM, null, null, null,
                        UUID.randomUUID())));

        assertEquals(400, erreur.status());
        assertEquals("image.album_introuvable", erreur.code());
        assertEquals(0L, nombre("select count(*) from image"));
    }

    @Test
    void lAlbumDemandePourUnAutreTypeQuUneImageDAlbumEstIgnoreParLeService() {
        ImageReduiteVue fichier = reduction.reduire(FichiersDeTest.png(10, 10), TypeImage.PHOTO_PERSONNELLE);

        UUID image = QuarkusTransaction.requiringNew().call(() -> images.televerser(
                new TeleverserImageCommande(fichier, sensRetenu(citrouille), TypeImage.PHOTO_PERSONNELLE, null, null,
                        null, UUID.randomUUID())).id());

        assertTrue(ligneImage(image).startsWith("privee|photo_personnelle|droits_auteur_enseignant|null|null|null|"));
    }

    @Test
    void unFichierTropLourdEstRefuse() {
        byte[] lourd = new byte[21 * 1024 * 1024];
        System.arraycopy(FichiersDeTest.png(10, 10), 0, lourd, 0, 50);

        refus(televerser(preparation, citrouille, lourd, "lourd.png", champs("image_libre", null, null, null)), 413,
                "requete.trop_volumineuse");
        rienNEstEnregistre();
    }

    @Test
    void unFichierQuiNEstPasUneImageEstRefuse() {
        for (byte[] octets : List.of("%PDF-1.7\n%âãÏÓ".getBytes(StandardCharsets.UTF_8),
                "bonjour".getBytes(StandardCharsets.UTF_8), FichiersDeTest.webp(), FichiersDeTest.bmp(10, 10))) {
            refus(televerser(preparation, citrouille, octets, "faux.png", champs("image_libre", null, null, null)),
                    415, "format.non_supporte");
        }
        rienNEstEnregistre();
    }

    @Test
    void uneImageGeanteEstRefuseeAvantLeDecodage() {
        refus(televerser(preparation, citrouille, FichiersDeTest.pngGeant(30_000, 30_000), "geant.png",
                champs("image_libre", null, null, null)), 415, "format.non_supporte");
        rienNEstEnregistre();
    }

    @Test
    void unTypeOuUneLicenceInvalidesSontRefuses() {
        byte[] png = FichiersDeTest.png(10, 10);
        refus(televerser(preparation, citrouille, png, "a.png", champs(null, null, null, null)), 400,
                "requete.invalide");
        refus(televerser(preparation, citrouille, png, "a.png", champs("dessin", null, null, null)), 400,
                "requete.invalide");
        refus(televerser(preparation, citrouille, png, "a.png", champs("image_libre", null, "gratuite", null)), 400,
                "requete.invalide");
        refus(televerser(preparation, citrouille, png, "a.png",
                champs("image_libre", null, "droits_auteur_enseignant", null)), 400, "requete.invalide");
        refus(televerser(preparation, citrouille, png, "a.png", champs("image_libre", "s".repeat(501), null, null)),
                400, "requete.invalide");
        refus(given().multiPart("typeImage", "image_libre")
                .when().post(chemin(preparation, citrouille)).then(), 400, "requete.invalide");
        rienNEstEnregistre();
    }

    @Test
    void unMotDejaIllustreEstRefuse() {
        televerser(preparation, citrouille, FichiersDeTest.png(10, 10), "a.png", champs("inconnu", null, null, null))
                .statusCode(201);

        refus(televerser(preparation, citrouille, FichiersDeTest.png(10, 10), "b.png",
                champs("inconnu", null, null, null)), 409, "preparation.mot_deja_illustre");
        assertEquals(1L, nombre("select count(*) from image"));
        assertEquals(1L, nombre("select count(*) from lien_image"));
    }

    @Test
    void laPreparationOuLeMotDUnCollegueSontIntrouvables() {
        UUID deZoe = preparation(ZOE);
        UUID motDeZoe = motDePreparation(deZoe, motDe(citrouille), 1);
        UUID autre = preparation(CLAIRE);

        for (UUID[] cible : new UUID[][] { { deZoe, motDeZoe }, { UUID.randomUUID(), citrouille },
                { autre, citrouille }, { preparation, UUID.randomUUID() } }) {
            refus(televerser(cible[0], cible[1], FichiersDeTest.png(10, 10), "a.png",
                    champs("image_libre", null, null, null)), 404, "ressource.introuvable");
        }
        rienNEstEnregistre();
    }

    @Test
    void leFichierDUneImagePriveeDUnCollegueNEstPasServi() {
        UUID deZoe = imagesDeTest.image(UUID.fromString(ZOE), sensRetenu(citrouille), "privee", new byte[] { 1 },
                new byte[] { 2 });

        given().when().get("/api/images/" + deZoe + "/fichier?taille=miniature")
                .then()
                .statusCode(404)
                .body("code", equalTo("ressource.introuvable"));
    }

    @Test
    void retirerPuisAnnulerRetablitLaMemeImage() {
        String imageId = televerser(preparation, citrouille, FichiersDeTest.png(10, 10), "a.png",
                champs("image_libre", "source", "cc0_domaine_public", null))
                .statusCode(201).extract().path("image.id");

        Map<String, Object> retire = given().when().delete("/api/preparations/" + preparation + "/mots/" + citrouille)
                .then()
                .statusCode(200)
                .body("illustre", equalTo(true))
                .body("image.id", equalTo(imageId))
                .extract().jsonPath().getMap("$");
        assertEquals(0L, nombre("select count(*) from lien_image"));
        assertEquals(1L, nombre("select count(*) from image"));
        assertEquals(1L, nombre("select count(*) from image_fichier"));

        @SuppressWarnings("unchecked")
        Map<String, Object> sens = (Map<String, Object>) retire.get("sens");
        String retabli = retablir(retire.get("motId"), sens.get("id"), imageId)
                .statusCode(201)
                .body("illustre", equalTo(true))
                .body("image.id", equalTo(imageId))
                .body("image.typeImage", equalTo("image_libre"))
                .extract().path("id");
        assertEquals(preparation + "|" + imageId + "|" + CLAIRE + "|" + rouleGalette + "|ms|reutilisee",
                lienEnBase(UUID.fromString(retabli)));
        assertEquals(1L, nombre("select count(*) from image"));
        given().when().get("/api/preparations/" + preparation).then().body("nombreIllustres", equalTo(1));
    }

    @Test
    void retablirAvecLImagePriveeDUnCollegueRetablitLeMotSansImage() {
        Map<String, Object> retire = given().when().delete("/api/preparations/" + preparation + "/mots/" + citrouille)
                .then().statusCode(200).body("image", nullValue()).extract().jsonPath().getMap("$");
        @SuppressWarnings("unchecked")
        Map<String, Object> sens = (Map<String, Object>) retire.get("sens");
        UUID sensId = UUID.fromString((String) sens.get("id"));
        UUID deZoe = imagesDeTest.image(UUID.fromString(ZOE), sensId, "privee", new byte[] { 1 }, new byte[] { 2 });

        retablir(retire.get("motId"), sensId, deZoe.toString())
                .statusCode(201)
                .body("motId", equalTo(retire.get("motId")))
                .body("sens.id", equalTo(sensId.toString()))
                .body("ordre", equalTo(1))
                .body("illustre", equalTo(false))
                .body("image", nullValue());
        assertEquals(1L, nombre("select count(*) from preparation_mot"));
        assertEquals(1L, nombre("select count(*) from sens_retenu"));
        assertEquals(0L, nombre("select count(*) from lien_image"));
    }

    @Test
    void retablirAvecUneImageAbsenteRetablitLeMotSansImage() {
        Map<String, Object> retire = given().when().delete("/api/preparations/" + preparation + "/mots/" + citrouille)
                .then().statusCode(200).extract().jsonPath().getMap("$");
        @SuppressWarnings("unchecked")
        Map<String, Object> sens = (Map<String, Object>) retire.get("sens");

        retablir(retire.get("motId"), sens.get("id"), UUID.randomUUID().toString())
                .statusCode(201)
                .body("illustre", equalTo(false))
                .body("image", nullValue());
        assertEquals(1L, nombre("select count(*) from preparation_mot"));
        assertEquals(0L, nombre("select count(*) from lien_image"));
    }

    @Test
    void changerLeThemeDUnMotIllustreGardeSonImage() {
        String imageId = televerser(preparation, citrouille, FichiersDeTest.png(10, 10), "a.png",
                champs("inconnu", null, null, null))
                .statusCode(201).extract().path("image.id");
        UUID cuisine = referentiels.theme("cuisine");

        given().contentType(ContentType.JSON).body(Map.of("themeId", cuisine.toString()))
                .when().put("/api/preparations/" + preparation + "/mots/" + citrouille + "/theme")
                .then()
                .statusCode(200)
                .body("themeId", equalTo(cuisine.toString()))
                .body("illustre", equalTo(true))
                .body("image.id", equalTo(imageId));
    }

    @Test
    void retablirAvecUneImageDUnAutreSensRetablitLeMotSansImage() {
        UUID potiron = UUID.fromString(ajouter(preparation, "potiron"));
        UUID duPotiron = imagesDeTest.image(UUID.fromString(CLAIRE), sensRetenu(potiron), "privee",
                new byte[] { 1 }, new byte[] { 2 });
        Map<String, Object> retire = given().when().delete("/api/preparations/" + preparation + "/mots/" + citrouille)
                .then().statusCode(200).extract().jsonPath().getMap("$");
        @SuppressWarnings("unchecked")
        Map<String, Object> sens = (Map<String, Object>) retire.get("sens");

        retablir(retire.get("motId"), sens.get("id"), duPotiron.toString())
                .statusCode(201)
                .body("sens.id", equalTo(sens.get("id")))
                .body("illustre", equalTo(false))
                .body("image", nullValue());
        assertEquals(2L, nombre("select count(*) from preparation_mot"));
        assertEquals(0L, nombre("select count(*) from lien_image"));
    }

    // --- Outils ---

    private static Map<String, String> champs(String type, String source, String licence, String auteur) {
        Map<String, String> champs = new HashMap<>();
        champs.put("typeImage", type);
        champs.put("source", source);
        champs.put("licence", licence);
        champs.put("auteur", auteur);
        return champs;
    }

    private static String chemin(UUID preparationId, UUID motPreparationId) {
        return "/api/preparations/" + preparationId + "/mots/" + motPreparationId + "/image";
    }

    private static ValidatableResponse televerser(UUID preparationId, UUID motPreparationId, byte[] octets,
            String nom, Map<String, String> champs) {
        RequestSpecification requete = given().multiPart("fichier", nom, octets, "application/octet-stream");
        champs.forEach((champ, valeur) -> {
            if (valeur != null) {
                requete.multiPart(champ, valeur);
            }
        });
        return requete.when().post(chemin(preparationId, motPreparationId)).then();
    }

    private static void refus(ValidatableResponse reponse, int statut, String code) {
        reponse.statusCode(statut)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo(code));
    }

    private void rienNEstEnregistre() {
        assertEquals(0L, nombre("select count(*) from image"));
        assertEquals(0L, nombre("select count(*) from image_fichier"));
        assertEquals(0L, nombre("select count(*) from lien_image"));
    }

    private static byte[] fichier(UUID imageId, String taille) {
        return given().when().get("/api/images/" + imageId + "/fichier?taille=" + taille)
                .then().statusCode(200).extract().asByteArray();
    }

    private ValidatableResponse retablir(Object motId, Object sensId, String imageId) {
        Map<String, Object> corps = new HashMap<>();
        corps.put("motId", motId.toString());
        corps.put("sensId", sensId.toString());
        corps.put("ordre", 1);
        corps.put("imageId", imageId);
        return given().contentType(ContentType.JSON).body(corps)
                .when().post("/api/preparations/" + preparation + "/mots/retablissement")
                .then();
    }

    private static String ajouter(UUID preparationId, String saisie) {
        return given().contentType(ContentType.JSON).body(Map.of("saisie", saisie))
                .when().post("/api/preparations/" + preparationId + "/mots")
                .then().statusCode(201).extract().path("id");
    }

    private UUID preparation(String proprietaire) {
        return QuarkusTransaction.requiringNew().call(() -> (UUID) entityManager.createNativeQuery(
                "insert into preparation (proprietaire_id, album_id, section) values (:proprietaire, :album, 'ms')"
                        + " returning id")
                .setParameter("proprietaire", UUID.fromString(proprietaire))
                .setParameter("album", rouleGalette)
                .getSingleResult());
    }

    private UUID motDePreparation(UUID preparationId, UUID motId, int ordre) {
        return QuarkusTransaction.requiringNew().call(() -> (UUID) entityManager.createNativeQuery(
                "insert into preparation_mot (preparation_id, mot_id, ordre) values (:preparation, :mot, :ordre)"
                        + " returning id")
                .setParameter("preparation", preparationId)
                .setParameter("mot", motId)
                .setParameter("ordre", ordre)
                .getSingleResult());
    }

    private UUID motDe(UUID preparationMotId) {
        return QuarkusTransaction.requiringNew().call(() -> (UUID) entityManager
                .createNativeQuery("select mot_id from preparation_mot where id = :id")
                .setParameter("id", preparationMotId)
                .getSingleResult());
    }

    private UUID sensRetenu(UUID preparationMotId) {
        return QuarkusTransaction.requiringNew().call(() -> (UUID) entityManager
                .createNativeQuery("select sens_id from sens_retenu where preparation_mot_id = :id")
                .setParameter("id", preparationMotId)
                .getSingleResult());
    }

    private UUID sensDeLImage(UUID imageId) {
        return QuarkusTransaction.requiringNew().call(() -> (UUID) entityManager
                .createNativeQuery("select sens_id from image where id = :id")
                .setParameter("id", imageId)
                .getSingleResult());
    }

    /** Image en base : « etat|type|licence|source|auteur|album|propriétaire|type_media|version ». */
    private String ligneImage(UUID imageId) {
        return QuarkusTransaction.requiringNew().call(() -> {
            Object[] ligne = (Object[]) entityManager.createNativeQuery(
                    "select etat, type_image, licence, source, auteur, album_id, proprietaire_id, type_media, version"
                            + " from image where id = :id")
                    .setParameter("id", imageId)
                    .getSingleResult();
            StringBuilder texte = new StringBuilder();
            for (Object valeur : ligne) {
                texte.append(texte.isEmpty() ? "" : "|").append(valeur);
            }
            return texte.toString();
        });
    }

    /** Fichier en base : « largeurxhauteur|type_mime ». */
    private String fichierEnBase(UUID imageId) {
        return QuarkusTransaction.requiringNew().call(() -> {
            Object[] ligne = (Object[]) entityManager.createNativeQuery(
                    "select largeur, hauteur, type_mime from image_fichier where image_id = :id")
                    .setParameter("id", imageId)
                    .getSingleResult();
            return ligne[0] + "x" + ligne[1] + "|" + ligne[2];
        });
    }

    /** Lien du Mot de Préparation en base : « préparation|image|enseignant|album|section|origine ». */
    private String lienEnBase(UUID preparationMotId) {
        return QuarkusTransaction.requiringNew().call(() -> {
            List<?> lignes = entityManager.createNativeQuery(
                    "select preparation_id, image_id, enseignant_id, album_id, section, origine from lien_image"
                            + " where preparation_mot_id = :id")
                    .setParameter("id", preparationMotId)
                    .getResultList();
            if (lignes.isEmpty()) {
                return null;
            }
            Object[] ligne = (Object[]) lignes.get(0);
            return ligne[0] + "|" + ligne[1] + "|" + ligne[2] + "|" + ligne[3] + "|" + ligne[4] + "|" + ligne[5];
        });
    }

    private long nombre(String requete) {
        return QuarkusTransaction.requiringNew()
                .call(() -> ((Number) entityManager.createNativeQuery(requete).getSingleResult()).longValue());
    }
}
