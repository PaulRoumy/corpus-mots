package fr.corpusmots.vocabulaire.api;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

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
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * {@code GET} et {@code PUT /images/{id}/sens} (story 2.6, partie 4) : le propriétaire remplace le Sens de son Image
 * par un autre Sens visible du même Mot, tant qu'elle n'a aucun lien ; {@code 403} pour un autre enseignant qui voit
 * l'Image, administrateur compris, {@code 404} pour une Image non consultable. Une ligne de test par ligne back de la
 * matrice de la spec.
 */
@QuarkusTest
class SensImageResourceTest {

    static final String PAUL = "0190f0a0-0000-7000-8000-000000000861";
    static final String ZOE = "0190f0a0-0000-7000-8000-000000000862";

    @Inject
    EnseignantsDeTest enseignants;

    @Inject
    ImagesDeTest images;

    @Inject
    ReferentielsDeTest referentiels;

    @Inject
    Lexique lexique;

    @Inject
    EntityManager entityManager;

    UUID album;
    /** Sens du Mot « loup ». */
    UUID aCompleter;
    UUID animal;
    UUID mechant;
    UUID solitaire;
    UUID gris;
    /** Sens d'un autre Mot, « galette ». */
    UUID gateau;

    @BeforeEach
    void donnees() {
        enseignants.seulsActifs(PAUL, ZOE);
        images.effacer();
        images.effacerSensRetenus();
        referentiels.effacer();
        album = referentiels.album("Le loup qui voulait changer de couleur", "Orianne Lallemand");
        MotVue loup = QuarkusTransaction.requiringNew().call(() -> lexique.obtenirOuCreerMot("loup"));
        aCompleter = sens(loup, "à compléter", null);
        animal = sens(loup, "animal", "nom");
        mechant = sens(loup, "méchant", "adjectif");
        solitaire = sens(loup, "solitaire", "adjectif");
        gris = sens(loup, "gris", "adjectif");
        MotVue galette = QuarkusTransaction.requiringNew().call(() -> lexique.obtenirOuCreerMot("galette"));
        gateau = sens(galette, "gâteau", "nom");
        // « animal » retenu par Paul, « méchant » par Zoé seule.
        images.sensRetenu(animal, UUID.fromString(PAUL), album);
        images.sensRetenu(mechant, UUID.fromString(ZOE), album);
    }

    // --- Changer le Sens ---

    @Test
    @TestSecurity(user = PAUL)
    @OidcSecurity(claims = @Claim(key = "sub", value = PAUL))
    void leProprietaireCompleteLeSensDeSonImage() {
        UUID image = imageDe(PAUL, aCompleter);
        given().when().get("/api/images/" + image).then()
                .statusCode(200)
                .body("sens.aCompleter", equalTo(true))
                .body("sensModifiable", equalTo(true));

        changer(image, animal)
                .statusCode(200)
                .body("id", equalTo(image.toString()))
                .body("etat", equalTo("privee"))
                .body("forme", equalTo("loup"))
                .body("sens.id", equalTo(animal.toString()))
                .body("sens.libelle", equalTo("animal"))
                .body("sens.categorie", equalTo("nom"))
                .body("sens.aCompleter", equalTo(false))
                .body("sensModifiable", equalTo(true));

        assertEquals(animal, images.sensId(image));
        given().when().get("/api/images/" + image).then()
                .statusCode(200)
                .body("sens.libelle", equalTo("animal"))
                .body("sens.categorie", equalTo("nom"));
    }

    @Test
    @TestSecurity(user = PAUL)
    @OidcSecurity(claims = @Claim(key = "sub", value = PAUL))
    void leMemeSensNeChangeRien() {
        UUID image = imageDe(PAUL, animal);
        long version = images.version(image);

        changer(image, animal)
                .statusCode(200)
                .body("sens.id", equalTo(animal.toString()));
        assertEquals(animal, images.sensId(image));
        assertEquals(version, images.version(image));
    }

    @Test
    @TestSecurity(user = PAUL)
    @OidcSecurity(claims = @Claim(key = "sub", value = PAUL))
    void uneImageLieeParSonProprietaireGardeSonSens() {
        UUID image = imageDe(PAUL, aCompleter);
        images.lien(image, UUID.fromString(PAUL), album);
        given().when().get("/api/images/" + image).then()
                .statusCode(200)
                .body("sensModifiable", equalTo(false));

        refus(changer(image, animal), 409, "image.sens_non_modifiable");
        assertEquals(aCompleter, images.sensId(image));
    }

    @Test
    @TestSecurity(user = PAUL)
    @OidcSecurity(claims = @Claim(key = "sub", value = PAUL))
    void uneImageLieeParUnCollegueGardeSonSens() {
        UUID image = imageDe(PAUL, aCompleter);
        images.lien(image, UUID.fromString(ZOE), album);
        given().when().get("/api/images/" + image).then()
                .statusCode(200)
                .body("sensModifiable", equalTo(false));

        refus(changer(image, animal), 409, "image.sens_non_modifiable");
        assertEquals(aCompleter, images.sensId(image));
    }

    @Test
    @TestSecurity(user = PAUL)
    @OidcSecurity(claims = @Claim(key = "sub", value = PAUL))
    void unSensDUnAutreMotOuInexistantEstRefuse() {
        UUID image = imageDe(PAUL, aCompleter);

        refus(changer(image, gateau), 400, "image.sens_invalide");
        refus(changer(image, UUID.randomUUID()), 400, "image.sens_invalide");
        refus(changer(image, null), 400, "requete.invalide");
        assertEquals(aCompleter, images.sensId(image));
    }

    @Test
    @TestSecurity(user = PAUL)
    @OidcSecurity(claims = @Claim(key = "sub", value = PAUL))
    void unSensNonVisibleEstRefuse() {
        UUID image = imageDe(PAUL, aCompleter);
        // « gris » ne porte qu'une Image privée de Zoé : elle n'est pas proposable à Paul.
        imageDe(ZOE, gris);

        refus(changer(image, mechant), 400, "image.sens_invalide");
        refus(changer(image, gris), 400, "image.sens_invalide");
        assertEquals(aCompleter, images.sensId(image));
    }

    @Test
    @TestSecurity(user = ZOE)
    @OidcSecurity(claims = @Claim(key = "sub", value = ZOE))
    void unCollegueQuiALieLImageNePeutPasChangerSonSens() {
        UUID dePaul = imageDe(PAUL, aCompleter);
        images.lien(dePaul, UUID.fromString(ZOE), album);
        given().when().get("/api/images/" + dePaul).then()
                .statusCode(200)
                .body("sensModifiable", equalTo(false));

        refus(changer(dePaul, mechant), 403, "image.reservee_au_proprietaire");
        refus(given().when().get("/api/images/" + dePaul + "/sens").then(), 403,
                "image.reservee_au_proprietaire");
        assertEquals(aCompleter, images.sensId(dePaul));
    }

    @Test
    @TestSecurity(user = ZOE, roles = "admin")
    @OidcSecurity(claims = @Claim(key = "sub", value = ZOE))
    void lAdministrateurNonProprietaireNePeutPasChangerSonSens() {
        UUID dePaul = imageDe(PAUL, aCompleter, "versee");

        refus(changer(dePaul, animal), 403, "image.reservee_au_proprietaire");
        refus(given().when().get("/api/images/" + dePaul + "/sens").then(), 403,
                "image.reservee_au_proprietaire");
        assertEquals(aCompleter, images.sensId(dePaul));
    }

    @Test
    @TestSecurity(user = PAUL)
    @OidcSecurity(claims = @Claim(key = "sub", value = PAUL))
    void uneImageNonConsultableEstIntrouvable() {
        UUID deZoe = imageDe(ZOE, aCompleter);

        refus(changer(deZoe, animal), 404, "ressource.introuvable");
        refus(changer(UUID.randomUUID(), animal), 404, "ressource.introuvable");
        refus(given().when().get("/api/images/" + deZoe + "/sens").then(), 404, "ressource.introuvable");
        refus(given().when().get("/api/images/" + UUID.randomUUID() + "/sens").then(), 404,
                "ressource.introuvable");
        assertEquals(aCompleter, images.sensId(deZoe));
    }

    @Test
    void sansJetonLaRequeteEstRefusee() {
        given().contentType(ContentType.JSON).body(Map.of("sensId", UUID.randomUUID().toString()))
                .when().put("/api/images/" + UUID.randomUUID() + "/sens").then().statusCode(401);
        given().when().get("/api/images/" + UUID.randomUUID() + "/sens").then().statusCode(401);
    }

    @Test
    @TestSecurity(user = PAUL)
    @OidcSecurity(claims = @Claim(key = "sub", value = PAUL))
    void unLienCreePendantLeChangementLeFaitRefuser() throws Exception {
        UUID image = imageDe(PAUL, aCompleter);
        ExecutorService executeur = Executors.newSingleThreadExecutor();
        try {
            List<CompletableFuture<String>> reponses = new ArrayList<>();
            // Comme Usages.lierImage : verrou de l'Image, puis lien, pendant que le changement de Sens attend.
            QuarkusTransaction.requiringNew().run(() -> {
                entityManager.createNativeQuery("select id from image where id = :id for update")
                        .setParameter("id", image)
                        .getSingleResult();
                reponses.add(CompletableFuture.supplyAsync(() -> reponse(changer(image, animal)), executeur));
                try {
                    // Le temps que la requête arrive au verrou de l'Image.
                    Thread.sleep(500);
                } catch (InterruptedException interrompu) {
                    Thread.currentThread().interrupt();
                }
                assertTrue(!reponses.get(0).isDone(), "Le changement de Sens aurait dû attendre le lien");
                entityManager.createNativeQuery(
                        "insert into lien_image (preparation_id, preparation_mot_id, image_id, enseignant_id,"
                                + " album_id, section, origine) values (uuidv7(), uuidv7(), :image, :enseignant,"
                                + " :album, 'ms', 'reutilisee')")
                        .setParameter("image", image)
                        .setParameter("enseignant", UUID.fromString(PAUL))
                        .setParameter("album", album)
                        .executeUpdate();
            });
            assertEquals("409 image.sens_non_modifiable", reponses.get(0).get());
        } finally {
            executeur.shutdownNow();
        }
        assertEquals(aCompleter, images.sensId(image));
    }

    // --- Sens proposés ---

    @Test
    @TestSecurity(user = PAUL)
    @OidcSecurity(claims = @Claim(key = "sub", value = PAUL))
    void lesSensProposesSontCeuxVisiblesDuProprietaire() {
        UUID image = imageDe(PAUL, aCompleter);
        // « abeille » précède « à compléter » en collation française : « à compléter » reste en tête.
        MotVue loup = QuarkusTransaction.requiringNew().call(() -> lexique.obtenirOuCreerMot("loup"));
        UUID abeille = sens(loup, "abeille", "nom");
        images.sensRetenu(abeille, UUID.fromString(PAUL), album);

        given().when().get("/api/images/" + image + "/sens").then()
                .statusCode(200)
                .body("libelle", contains("à compléter", "abeille", "animal"))
                .body("id", contains(aCompleter.toString(), abeille.toString(), animal.toString()))
                .body("[0].categorie", nullValue())
                .body("[0].aCompleter", equalTo(true))
                .body("[2].categorie", equalTo("nom"))
                .body("[2].aCompleter", equalTo(false));
    }

    @Test
    @TestSecurity(user = PAUL)
    @OidcSecurity(claims = @Claim(key = "sub", value = PAUL))
    void unSensQuiPorteUneImageProposableEstPropose() {
        UUID image = imageDe(PAUL, animal);
        // Une autre Image de Paul rend « solitaire » visible ; une Image versée de Zoé rend « méchant » visible ;
        // l'Image privée de Zoé ne révèle pas « gris ».
        imageDe(PAUL, solitaire);
        imageDe(ZOE, mechant, "versee");
        imageDe(ZOE, gris);

        given().when().get("/api/images/" + image + "/sens").then()
                .statusCode(200)
                .body("libelle", contains("animal", "méchant", "solitaire"));
        changer(image, solitaire).statusCode(200).body("sens.libelle", equalTo("solitaire"));
        assertEquals(solitaire, images.sensId(image));
    }

    private UUID sens(MotVue mot, String libelle, String categorie) {
        return QuarkusTransaction.requiringNew()
                .call(() -> lexique.obtenirOuCreerSens(mot.id(), libelle, categorie)).id();
    }

    private UUID imageDe(String proprietaire, UUID sensId) {
        return imageDe(proprietaire, sensId, "privee");
    }

    private UUID imageDe(String proprietaire, UUID sensId, String etat) {
        return images.image(UUID.fromString(proprietaire), sensId, etat, "image_libre", "cc0_domaine_public",
                "site web", null, null);
    }

    private static ValidatableResponse changer(UUID image, UUID sensId) {
        Map<String, Object> corps = new HashMap<>();
        corps.put("sensId", sensId == null ? null : sensId.toString());
        return given().contentType(ContentType.JSON).body(corps)
                .when().put("/api/images/" + image + "/sens").then();
    }

    private static String reponse(ValidatableResponse reponse) {
        var extraite = reponse.extract().response();
        return extraite.statusCode() < 300 ? String.valueOf(extraite.statusCode())
                : extraite.statusCode() + " " + extraite.path("code");
    }

    private static void refus(ValidatableResponse reponse, int statut, String code) {
        reponse.statusCode(statut)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo(code));
    }
}
