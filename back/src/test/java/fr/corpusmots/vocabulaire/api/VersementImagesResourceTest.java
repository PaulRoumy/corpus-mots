package fr.corpusmots.vocabulaire.api;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;

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
import io.restassured.http.ContentType;
import io.restassured.response.ValidatableResponse;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import jakarta.inject.Inject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * {@code POST /images/{id}/versement} et {@code POST /images/versements} (story 3.3, partie 1) : le propriétaire verse
 * une Image ou un lot dans la Banque de l'école, si elle est versable (AD-4) ; {@code 403} pour l'Image d'un collègue,
 * administrateur compris, {@code 404 image.indisponible} pour une Image invisible. La Carte d'identité et la Banque
 * exposent la versabilité. Une ligne de test par ligne de la matrice de la spec ; Mots « toupie » et « bilboquet »
 * propres à cette classe.
 */
@QuarkusTest
class VersementImagesResourceTest {

    static final String CLAIRE = "0190f0a0-0000-7000-8000-000000000911";
    static final String ZOE = "0190f0a0-0000-7000-8000-000000000912";

    static final String IMAGE_ALBUM = "image.versement.image_album";
    static final String TYPE_INCONNU = "image.versement.type_inconnu";
    static final String SOURCE_MANQUANTE = "image.versement.source_manquante";
    static final String LICENCE_NON_VERSABLE = "image.versement.licence_non_versable";
    static final String RETRAIT_ADMIN = "image.versement.retrait_admin";

    @Inject
    EnseignantsDeTest enseignants;

    @Inject
    ImagesDeTest images;

    @Inject
    ReferentielsDeTest referentiels;

    @Inject
    Lexique lexique;

    UUID claire = UUID.fromString(CLAIRE);
    UUID zoe = UUID.fromString(ZOE);

    /** Sens « jouet » du Mot « toupie ». */
    UUID jouet;

    /** Sens « figure de patinage » du Mot « toupie ». */
    UUID patinage;

    /** Sens « jouet » du Mot « bilboquet ». */
    UUID bilboquet;

    UUID album;

    @BeforeEach
    void donnees() {
        enseignants.seulsActifs(CLAIRE, ZOE);
        images.effacer();
        referentiels.effacer();
        album = referentiels.album("La toupie de Léon", "Anne Martin");
        MotVue toupie = QuarkusTransaction.requiringNew().call(() -> lexique.obtenirOuCreerMot("toupie"));
        jouet = QuarkusTransaction.requiringNew()
                .call(() -> lexique.obtenirOuCreerSens(toupie.id(), "jouet", "nom")).id();
        patinage = QuarkusTransaction.requiringNew()
                .call(() -> lexique.obtenirOuCreerSens(toupie.id(), "figure de patinage", "nom")).id();
        MotVue motBilboquet = QuarkusTransaction.requiringNew().call(() -> lexique.obtenirOuCreerMot("bilboquet"));
        bilboquet = QuarkusTransaction.requiringNew()
                .call(() -> lexique.obtenirOuCreerSens(motBilboquet.id(), "jouet", "nom")).id();
    }

    // --- Verser une Image ---

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void unePhotoPersonnelleEstVersee() {
        UUID photo = photo(claire);

        verser(photo).statusCode(200)
                .body("id", equalTo(photo.toString()))
                .body("etat", equalTo("versee"))
                .body("versabilite", nullValue())
                .body("reutilisable", equalTo(true))
                .body("forme", equalTo("toupie"));
        assertEquals("versee", images.etat(photo));
    }

    /**
     * Un Sens « à compléter » ne bloque pas le versement d'une Image versable par ailleurs ; la Carte d'identité le
     * garde mis en avant (story 3.7).
     */
    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void unSensACompleterNeBloquePasLeVersement() {
        MotVue toupie = QuarkusTransaction.requiringNew().call(() -> lexique.obtenirOuCreerMot("toupie"));
        UUID aCompleter = QuarkusTransaction.requiringNew()
                .call(() -> lexique.obtenirOuCreerSens(toupie.id(), "à compléter", null)).id();
        UUID image = images.image(claire, aCompleter, "privee", "image_libre", "cc0_domaine_public", "Wikimedia",
                null, null);

        verser(image).statusCode(200)
                .body("etat", equalTo("versee"))
                .body("versabilite", nullValue());
        assertEquals("versee", images.etat(image));
        given().when().get("/api/images/" + image)
                .then()
                .statusCode(200)
                .body("etat", equalTo("versee"))
                .body("sens.libelle", equalTo("à compléter"))
                .body("sens.aCompleter", equalTo(true));
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void uneImageLibreSourceeSousChacuneDesQuatreLicencesPartageablesEstVersee() {
        for (String licence : List.of("arasaac_cc_by_nc_sa", "sclera_cc_by_nc", "mulberry_cc_by_sa",
                "cc0_domaine_public")) {
            UUID image = images.image(claire, jouet, "privee", "image_libre", licence, "Wikimedia", null, null);

            verser(image).statusCode(200).body("etat", equalTo("versee")).body("licence", equalTo(licence));
            assertEquals("versee", images.etat(image), licence);
        }
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void uneImageDAlbumEstRefusee() {
        UUID image = images.image(claire, jouet, "privee", "image_album", "usage_pedagogique_album", null, null, album);

        refus(verser(image), 400, IMAGE_ALBUM);
        assertEquals("privee", images.etat(image));
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void unTypeInconnuEstRefuse() {
        UUID image = images.image(claire, jouet, "privee", "inconnu", "cc0_domaine_public", "Wikimedia", null, null);

        refus(verser(image), 400, TYPE_INCONNU);
        assertEquals("privee", images.etat(image));
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void uneImageLibreSansSourceEstRefusee() {
        UUID sansSource = images.image(claire, jouet, "privee", "image_libre", "cc0_domaine_public", null, null, null);
        UUID sourceVide = images.image(claire, jouet, "privee", "image_libre", "cc0_domaine_public", "", null, null);
        UUID sourceBlanche = images.image(claire, jouet, "privee", "image_libre", "cc0_domaine_public", "  ", null,
                null);

        for (UUID image : List.of(sansSource, sourceVide, sourceBlanche)) {
            refus(verser(image), 400, SOURCE_MANQUANTE);
            assertEquals("privee", images.etat(image));
        }
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void uneLicenceNonPartageableOuAbsenteEstRefusee() {
        UUID pixabay = images.image(claire, jouet, "privee", "image_libre", "pixabay", "Wikimedia", null, null);
        UUID autre = images.image(claire, jouet, "privee", "image_libre", "autre_inconnue", "Wikimedia", null, null);
        UUID absente = images.image(claire, jouet, "privee", "image_libre", null, "Wikimedia", null, null);

        for (UUID image : List.of(pixabay, autre, absente)) {
            refus(verser(image), 400, LICENCE_NON_VERSABLE);
            assertEquals("privee", images.etat(image));
        }
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void unRetraitAdminBloqueLeVersement() {
        UUID photo = photo(claire);
        images.retraitAdmin(photo, "image_inadaptee", "Image floue");

        refus(verser(photo), 400, RETRAIT_ADMIN);
        assertEquals("privee", images.etat(photo));
        assertEquals("image_inadaptee|Image floue", images.retraitAdmin(photo));
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void uneImageDejaVerseeNeChangePas() {
        UUID photo = images.image(claire, jouet, "versee", "photo_personnelle", "droits_auteur_enseignant", null,
                null, null);
        long version = images.version(photo);

        verser(photo).statusCode(200).body("etat", equalTo("versee")).body("versabilite", nullValue());
        assertEquals("versee", images.etat(photo));
        assertEquals(version, images.version(photo));
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void lImageVerseeDUnCollegueEstReserveeAuProprietaire() {
        UUID deZoe = images.image(zoe, jouet, "versee", "photo_personnelle", "droits_auteur_enseignant", null, null,
                null);

        refus(verser(deZoe), 403, "image.reservee_au_proprietaire");
    }

    @Test
    @TestSecurity(user = ZOE, roles = "admin")
    @OidcSecurity(claims = @Claim(key = "sub", value = ZOE))
    void lAdministrateurNonProprietaireNePeutPasVerser() {
        UUID deClaire = images.image(claire, jouet, "versee", "photo_personnelle", "droits_auteur_enseignant", null,
                null, null);

        refus(verser(deClaire), 403, "image.reservee_au_proprietaire");
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void uneImageInvisibleEstIndisponible() {
        UUID priveeDeZoe = photo(zoe);
        UUID priveeDeZoeLiee = photo(zoe);
        images.lien(priveeDeZoeLiee, claire, album);
        UUID abandonnee = images.image(claire, jouet, "abandonnee", "photo_personnelle", "droits_auteur_enseignant",
                null, null, null);
        UUID supprimee = images.image(claire, jouet, "supprimee", "photo_personnelle", "droits_auteur_enseignant",
                null, null, null);

        for (UUID image : List.of(priveeDeZoe, priveeDeZoeLiee, abandonnee, supprimee, UUID.randomUUID())) {
            refus(verser(image), 404, "image.indisponible");
        }
        assertEquals("privee", images.etat(priveeDeZoe));
        assertEquals("abandonnee", images.etat(abandonnee));
        assertEquals("supprimee", images.etat(supprimee));
    }

    // --- Retrait admin vidé par chaque modification de la Carte d'identité ---

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void modifierLaDescriptionVideLeRetraitAdmin() {
        UUID photo = photoRetiree();

        given().contentType(ContentType.JSON).body(description("photo_personnelle", "Claire D."))
                .when().put("/api/images/" + photo + "/description").then()
                .statusCode(200).body("versabilite", equalTo("versable"));
        apresModification(photo);
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void classerVideLeRetraitAdmin() {
        UUID photo = photoRetiree();
        Map<String, Object> classement = new HashMap<>();
        classement.put("sections", List.of("gs"));
        classement.put("moduleId", null);
        classement.put("themeIds", List.of());

        given().contentType(ContentType.JSON).body(classement)
                .when().put("/api/images/" + photo + "/classement").then()
                .statusCode(200).body("versabilite", equalTo("versable"));
        apresModification(photo);
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void changerLeSensVideLeRetraitAdmin() {
        UUID photo = photoRetiree();
        // Une Image de Claire sur « figure de patinage » rend ce Sens visible (AD-2).
        images.image(claire, patinage, "privee", "photo_personnelle", "droits_auteur_enseignant", null, null, null);

        given().contentType(ContentType.JSON).body(Map.of("sensId", patinage.toString()))
                .when().put("/api/images/" + photo + "/sens").then()
                .statusCode(200).body("sens.id", equalTo(patinage.toString()))
                .body("versabilite", equalTo("versable"));
        apresModification(photo);
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void creerUnSensVideLeRetraitAdmin() {
        UUID photo = photoRetiree();

        given().contentType(ContentType.JSON).body(Map.of("libelle", "toupie de versement", "categorie", "nom"))
                .when().post("/api/images/" + photo + "/sens").then()
                .statusCode(200).body("sens.libelle", equalTo("toupie de versement"))
                .body("versabilite", equalTo("versable"));
        apresModification(photo);
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void uneDescriptionIdentiqueGardeLeRetraitAdmin() {
        UUID photo = photoRetiree();

        given().contentType(ContentType.JSON).body(description("photo_personnelle", null))
                .when().put("/api/images/" + photo + "/description").then()
                .statusCode(200).body("versabilite", equalTo(RETRAIT_ADMIN));
        retraitGarde(photo);
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void unClassementIdentiqueGardeLeRetraitAdmin() {
        UUID photo = photoRetiree();
        Map<String, Object> classement = new HashMap<>();
        classement.put("sections", List.of());
        classement.put("moduleId", null);
        classement.put("themeIds", List.of());

        given().contentType(ContentType.JSON).body(classement)
                .when().put("/api/images/" + photo + "/classement").then()
                .statusCode(200).body("versabilite", equalTo(RETRAIT_ADMIN));
        retraitGarde(photo);
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void leMemeSensGardeLeRetraitAdmin() {
        UUID photo = photoRetiree();

        given().contentType(ContentType.JSON).body(Map.of("sensId", jouet.toString()))
                .when().put("/api/images/" + photo + "/sens").then()
                .statusCode(200).body("versabilite", equalTo(RETRAIT_ADMIN));
        retraitGarde(photo);
        // Libellé du Sens actuel : la création retombe sur « jouet », rien ne change.
        given().contentType(ContentType.JSON).body(Map.of("libelle", "jouet", "categorie", "nom"))
                .when().post("/api/images/" + photo + "/sens").then()
                .statusCode(200).body("sens.id", equalTo(jouet.toString()))
                .body("versabilite", equalTo(RETRAIT_ADMIN));
        retraitGarde(photo);
    }

    // --- Verser un lot ---

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void unLotMixteVerseLesImagesVersablesEtRendLaRaisonDesAutres() {
        UUID photo = photo(claire);
        UUID imageAlbum = images.image(claire, jouet, "privee", "image_album", "usage_pedagogique_album", null, null,
                album);
        UUID deZoe = images.image(zoe, jouet, "versee", "photo_personnelle", "droits_auteur_enseignant", null, null,
                null);

        verserLot(List.of(photo, imageAlbum, deZoe)).statusCode(200)
                .body("versees", equalTo(List.of(photo.toString())))
                .body("dejaVersees", hasSize(0))
                .body("refusees", hasSize(2))
                .body("refusees[0].imageId", equalTo(imageAlbum.toString()))
                .body("refusees[0].code", equalTo(IMAGE_ALBUM))
                .body("refusees[0].licence", nullValue())
                .body("refusees[1].imageId", equalTo(deZoe.toString()))
                .body("refusees[1].code", equalTo("image.reservee_au_proprietaire"))
                .body("refusees[1].licence", nullValue());
        assertEquals("versee", images.etat(photo));
        assertEquals("privee", images.etat(imageAlbum));
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void chaqueMotifDeRefusEstRenduDansLeLot() {
        UUID album = images.image(claire, bilboquet, "privee", "image_album", "usage_pedagogique_album", null, null,
                this.album);
        UUID inconnu = images.image(claire, bilboquet, "privee", "inconnu", null, null, null, null);
        UUID sansSource = images.image(claire, bilboquet, "privee", "image_libre", "cc0_domaine_public", null, null,
                null);
        UUID pixabay = images.image(claire, bilboquet, "privee", "image_libre", "pixabay", "Pixabay", null, null);
        UUID sansLicence = images.image(claire, bilboquet, "privee", "image_libre", null, "Wikimedia", null, null);
        UUID retiree = photo(claire);
        images.retraitAdmin(retiree, "autre", "Visage d'élève");
        UUID priveeDeZoe = photo(zoe);
        UUID versable = images.image(claire, bilboquet, "privee", "image_libre", "sclera_cc_by_nc", "Sclera", null,
                null);
        UUID dejaVersee = images.image(claire, bilboquet, "versee", "photo_personnelle", "droits_auteur_enseignant",
                null, null, null);
        long versionDejaVersee = images.version(dejaVersee);

        ValidatableResponse reponse = verserLot(List.of(album, inconnu, sansSource, pixabay, sansLicence, retiree,
                priveeDeZoe, versable, dejaVersee)).statusCode(200)
                .body("versees", equalTo(List.of(versable.toString())))
                .body("dejaVersees", equalTo(List.of(dejaVersee.toString())))
                .body("refusees", hasSize(7));
        Map<UUID, String> attendus = Map.of(album, IMAGE_ALBUM, inconnu, TYPE_INCONNU, sansSource, SOURCE_MANQUANTE,
                pixabay, LICENCE_NON_VERSABLE, sansLicence, LICENCE_NON_VERSABLE, retiree, RETRAIT_ADMIN,
                priveeDeZoe, "image.indisponible");
        attendus.forEach((image, code) -> reponse.body("refusees.find { it.imageId == '" + image + "' }.code",
                equalTo(code)));
        // La licence distingue « licence non partageable » de « licence à préciser » ; null pour les autres motifs.
        reponse.body("refusees.find { it.imageId == '" + pixabay + "' }.licence", equalTo("pixabay"));
        for (UUID image : List.of(album, inconnu, sansSource, sansLicence, retiree, priveeDeZoe)) {
            reponse.body("refusees.find { it.imageId == '" + image + "' }.licence", nullValue());
        }
        assertEquals("versee", images.etat(versable));
        assertEquals(versionDejaVersee, images.version(dejaVersee));
        for (UUID image : attendus.keySet()) {
            assertEquals("privee", images.etat(image), image.toString());
        }
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void unLotVideTropLongOuAvecUnDoublonEstRefuse() {
        UUID photo = photo(claire);
        List<UUID> tropLong = new ArrayList<>();
        tropLong.add(photo);
        for (int rang = 0; rang < 500; rang++) {
            tropLong.add(UUID.randomUUID());
        }

        refus(verserLot(List.of()), 400, "requete.invalide");
        refus(verserLot(tropLong), 400, "requete.invalide");
        refus(verserLot(List.of(photo, photo)), 400, "requete.invalide");
        refus(given().contentType(ContentType.JSON).body(Map.of())
                .when().post("/api/images/versements").then(), 400, "requete.invalide");
        refus(given().contentType(ContentType.JSON).body(Map.of("imageIds", Arrays.asList((Object) null)))
                .when().post("/api/images/versements").then(), 400, "requete.invalide");
        refus(given().contentType(ContentType.JSON)
                .body(Map.of("imageIds", List.of(photo.toString(), "pas-un-uuid")))
                .when().post("/api/images/versements").then(), 400, "requete.invalide");
        assertEquals("privee", images.etat(photo));
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void unLotDeCinqCentsImagesEstAccepte() {
        UUID photo = photo(claire);
        List<UUID> lot = new ArrayList<>();
        lot.add(photo);
        for (int rang = 1; rang < 500; rang++) {
            lot.add(UUID.randomUUID());
        }

        verserLot(lot).statusCode(200)
                .body("versees", equalTo(List.of(photo.toString())))
                .body("dejaVersees", hasSize(0))
                .body("refusees", hasSize(499))
                .body("refusees[0].code", equalTo("image.indisponible"));
        assertEquals("versee", images.etat(photo));
    }

    // --- Versabilité lue ---

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void laCarteEtLaBanqueDuProprietaireDonnentLaVersabilite() {
        UUID sansSource = images.image(claire, jouet, "privee", "image_libre", "cc0_domaine_public", null, null, null);
        UUID retiree = photo(claire);
        images.retraitAdmin(retiree, "licence_non_conforme", "Licence douteuse");
        UUID versee = images.image(claire, jouet, "versee", "photo_personnelle", "droits_auteur_enseignant", null,
                null, null);

        carte(sansSource).statusCode(200).body("versabilite", equalTo(SOURCE_MANQUANTE));
        carte(retiree).statusCode(200).body("versabilite", equalTo(RETRAIT_ADMIN));
        carte(versee).statusCode(200).body("versabilite", nullValue());
        ValidatableResponse banque = given().when().get("/api/images?provenance=mes-mots").then().statusCode(200)
                .body("total", equalTo(3));
        banque.body("elements.find { it.id == '" + sansSource + "' }.versabilite", equalTo(SOURCE_MANQUANTE));
        banque.body("elements.find { it.id == '" + retiree + "' }.versabilite", equalTo(RETRAIT_ADMIN));
        banque.body("elements.find { it.id == '" + versee + "' }.versabilite", nullValue());
    }

    @Test
    @TestSecurity(user = ZOE)
    @OidcSecurity(claims = @Claim(key = "sub", value = ZOE))
    void unCollegueNeLitAucuneVersabilite() {
        UUID sansSource = images.image(claire, jouet, "privee", "image_libre", "cc0_domaine_public", null, null, null);
        images.lien(sansSource, zoe, album);
        UUID verseeDeClaire = images.image(claire, jouet, "versee", "image_libre", "cc0_domaine_public", null, null,
                null);

        carte(sansSource).statusCode(200).body("versabilite", nullValue());
        given().when().get("/api/images?provenance=banque").then().statusCode(200)
                .body("total", equalTo(1))
                .body("elements[0].id", equalTo(verseeDeClaire.toString()))
                .body("elements[0].versabilite", nullValue());
    }

    @Test
    void sansJetonLesVersementsSontRefuses() {
        given().when().post("/api/images/" + UUID.randomUUID() + "/versement").then().statusCode(401);
        given().contentType(ContentType.JSON).body(Map.of("imageIds", List.of(UUID.randomUUID().toString())))
                .when().post("/api/images/versements").then().statusCode(401);
    }

    /** Photo personnelle privée de ce propriétaire, sur « toupie (jouet) ». */
    private UUID photo(UUID proprietaire) {
        return images.image(proprietaire, jouet, "privee", "photo_personnelle", "droits_auteur_enseignant", null, null,
                null);
    }

    /** Photo personnelle privée de Claire, retirée par l'administrateur : son versement est refusé. */
    private UUID photoRetiree() {
        UUID photo = photo(claire);
        images.retraitAdmin(photo, "image_inadaptee", "Image floue");
        refus(verser(photo), 400, RETRAIT_ADMIN);
        return photo;
    }

    /** Après une modification de la Carte : retrait admin vidé, versement accepté. */
    private void apresModification(UUID photo) {
        assertEquals("null|null", images.retraitAdmin(photo));
        verser(photo).statusCode(200).body("etat", equalTo("versee"));
        assertEquals("versee", images.etat(photo));
    }

    /** Après une modification qui ne change rien : retrait admin gardé, versement toujours refusé. */
    private void retraitGarde(UUID photo) {
        assertEquals("image_inadaptee|Image floue", images.retraitAdmin(photo));
        refus(verser(photo), 400, RETRAIT_ADMIN);
        assertEquals("privee", images.etat(photo));
    }

    private static Map<String, Object> description(String type, String auteur) {
        Map<String, Object> corps = new HashMap<>();
        corps.put("typeImage", type);
        corps.put("licence", null);
        corps.put("source", null);
        corps.put("auteur", auteur);
        corps.put("albumId", null);
        return corps;
    }

    private static ValidatableResponse verser(UUID image) {
        return given().when().post("/api/images/" + image + "/versement").then();
    }

    private static ValidatableResponse verserLot(List<UUID> imageIds) {
        return given().contentType(ContentType.JSON)
                .body(Map.of("imageIds", imageIds.stream().map(UUID::toString).toList()))
                .when().post("/api/images/versements").then();
    }

    private static ValidatableResponse carte(UUID image) {
        return given().when().get("/api/images/" + image).then();
    }

    private static void refus(ValidatableResponse reponse, int statut, String code) {
        reponse.statusCode(statut)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo(code));
    }
}
