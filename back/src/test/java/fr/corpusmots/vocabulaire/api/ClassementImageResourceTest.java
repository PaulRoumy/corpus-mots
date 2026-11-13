package fr.corpusmots.vocabulaire.api;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import fr.corpusmots.commun.api.EnseignantsDeTest;
import fr.corpusmots.commun.api.ProblemeDto;
import fr.corpusmots.referentiels.api.ReferentielsDeTest;
import fr.corpusmots.referentiels.service.ReferentielsService;
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
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.function.Supplier;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * {@code PUT /images/{id}/classement} (story 2.6, partie 3) : le propriétaire remplace d'un coup Sections, Module et
 * Thèmes ; {@code 403} pour un autre enseignant qui voit l'Image, administrateur compris, {@code 404} pour une Image
 * non consultable. Avec les suppressions de Thème (refusée s'il est porté par une Image) et de Module (retiré des
 * Images), et leur concurrence avec un classement. Une ligne de test par ligne back de la matrice de la spec.
 */
@QuarkusTest
class ClassementImageResourceTest {

    static final String CLAIRE = "0190f0a0-0000-7000-8000-000000000831";
    static final String ZOE = "0190f0a0-0000-7000-8000-000000000832";

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

    @Inject
    ReferentielsService referentielsService;

    UUID legume;
    UUID rouleGalette;
    /** Module 1 de Roule galette, créé par Claire. */
    UUID module1;
    /** « animaux », créé par Claire. */
    UUID animaux;
    /** « forêt », créé par Claire. */
    UUID foret;

    @BeforeEach
    void donnees() {
        enseignants.seulsActifs(CLAIRE, ZOE);
        images.effacer();
        referentiels.effacer();
        rouleGalette = referentiels.album("Roule galette", "Natha Caputo");
        module1 = referentiels.module(rouleGalette, "Module 1", 1, CLAIRE);
        animaux = referentiels.theme("animaux", CLAIRE);
        foret = referentiels.theme("forêt", CLAIRE);
        MotVue citrouille = QuarkusTransaction.requiringNew().call(() -> lexique.obtenirOuCreerMot("citrouille"));
        legume = QuarkusTransaction.requiringNew()
                .call(() -> lexique.obtenirOuCreerSens(citrouille.id(), "légume", "nom")).id();
    }

    // --- Classer ---

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void leProprietaireClasseSonImage() {
        UUID image = imageDe(CLAIRE);
        long version = images.version(image);

        classer(image, classement(List.of("gs", "ms", "gs"), module1, List.of(foret, animaux, foret)))
                .statusCode(200)
                .body("id", equalTo(image.toString()))
                .body("etat", equalTo("privee"))
                .body("sections", contains("ms", "gs"))
                .body("module.id", equalTo(module1.toString()))
                .body("module.nom", equalTo("Module 1"))
                .body("module.albumId", equalTo(rouleGalette.toString()))
                .body("module.titreAlbum", equalTo("Roule galette"))
                .body("themes.nom", contains("animaux", "forêt"))
                .body("themes.id", contains(animaux.toString(), foret.toString()))
                // Le Module ne dépend ni du type ni de l'Album d'origine.
                .body("typeImage", equalTo("image_libre"))
                .body("albumOrigine", nullValue());

        assertTrue(images.version(image) > version);
        given().when().get("/api/images/" + image).then()
                .statusCode(200)
                .body("sections", contains("ms", "gs"))
                .body("module.nom", equalTo("Module 1"))
                .body("themes.nom", contains("animaux", "forêt"));
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void toutRetirerLaisseLaCarteSansClassement() {
        UUID image = imageDe(CLAIRE);
        images.classer(image, module1, List.of(animaux), List.of("ps"));

        classer(image, classement(List.of(), null, List.of()))
                .statusCode(200)
                .body("sections", empty())
                .body("module", nullValue())
                .body("themes", empty());
        assertEquals("|null|", images.classement(image));
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void unThemeInconnuEstRefuse() {
        UUID image = imageClassee(CLAIRE);
        String avant = images.classement(image);

        refus(classer(image, classement(List.of("gs"), null, List.of(foret, UUID.randomUUID()))), 400,
                "image.theme_introuvable");
        assertEquals(avant, images.classement(image));
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void unModuleInconnuEstRefuse() {
        UUID image = imageClassee(CLAIRE);
        String avant = images.classement(image);

        refus(classer(image, classement(List.of("gs"), UUID.randomUUID(), List.of())), 400,
                "image.module_introuvable");
        assertEquals(avant, images.classement(image));
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void uneSectionInvalideOuDesListesAbsentesSontRefusees() {
        UUID image = imageClassee(CLAIRE);
        String avant = images.classement(image);

        refus(classer(image, classement(List.of("cp"), null, List.of())), 400, "requete.invalide");
        refus(classer(image, classement(null, null, List.of())), 400, "requete.invalide");
        refus(classer(image, classement(List.of("ms"), null, null)), 400, "requete.invalide");
        assertEquals(avant, images.classement(image));
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void unCollegueQuiALieLImageNePeutPasLaClasser() {
        UUID deZoe = imageClassee(ZOE);
        images.lien(deZoe, UUID.fromString(CLAIRE), rouleGalette);
        String avant = images.classement(deZoe);

        refus(classer(deZoe, classement(List.of("ps"), null, List.of())), 403, "image.reservee_au_proprietaire");
        assertEquals(avant, images.classement(deZoe));
    }

    @Test
    @TestSecurity(user = ZOE, roles = "admin")
    @OidcSecurity(claims = @Claim(key = "sub", value = ZOE))
    void lAdministrateurNonProprietaireNePeutPasLaClasser() {
        UUID deClaire = imageClassee(CLAIRE);
        images.lien(deClaire, UUID.fromString(ZOE), rouleGalette);
        String avant = images.classement(deClaire);

        refus(classer(deClaire, classement(List.of("ps"), null, List.of())), 403,
                "image.reservee_au_proprietaire");
        assertEquals(avant, images.classement(deClaire));
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void uneImageNonConsultableEstIntrouvable() {
        UUID deZoe = imageClassee(ZOE);
        String avant = images.classement(deZoe);

        refus(classer(deZoe, classement(List.of("ps"), null, List.of())), 404, "ressource.introuvable");
        refus(classer(UUID.randomUUID(), classement(List.of(), null, List.of())), 404, "ressource.introuvable");
        assertEquals(avant, images.classement(deZoe));
    }

    @Test
    void sansJetonLaRequeteEstRefusee() {
        given().contentType(ContentType.JSON).body(classement(List.of(), null, List.of()))
                .when().put("/api/images/" + UUID.randomUUID() + "/classement").then().statusCode(401);
    }

    // --- Supprimer un Thème ou un Module ---

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void unThemePorteParLImageDUnCollegueNEstPasSupprime() {
        UUID deZoe = imageDe(ZOE);
        images.classer(deZoe, null, List.of(animaux), List.of());

        given().when().delete("/api/themes/" + animaux).then()
                .statusCode(409)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo("theme.utilise"));
        assertEquals(List.of("animaux", "forêt"), referentiels.themes());
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void unThemePorteParAucuneImageEstSupprime() {
        UUID image = imageDe(CLAIRE);
        images.classer(image, null, List.of(animaux), List.of());

        given().when().delete("/api/themes/" + foret).then().statusCode(204);
        assertEquals(List.of("animaux"), referentiels.themes());
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void supprimerUnModuleLeRetireDesImagesQuiLePortaient() {
        UUID deClaire = imageDe(CLAIRE);
        UUID deZoe = imageDe(ZOE);
        images.classer(deClaire, module1, List.of(animaux), List.of("ms"));
        images.classer(deZoe, module1, List.of(), List.of());
        UUID module2 = referentiels.module(rouleGalette, "Module 2", 2, CLAIRE);
        UUID autre = imageDe(ZOE);
        images.classer(autre, module2, List.of(), List.of());

        given().when().delete("/api/modules/" + module1).then().statusCode(204);

        assertEquals("ms|null|" + animaux, images.classement(deClaire));
        assertEquals("|null|", images.classement(deZoe));
        assertEquals("|" + module2 + "|", images.classement(autre));
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void unThemeNEstPasAffecteAUneImagePendantSaSuppression() throws Exception {
        UUID image = imageDe(CLAIRE);

        String reponse = pendantSuppression("theme", animaux,
                () -> reponse(classer(image, classement(List.of(), null, List.of(animaux)))));

        assertEquals("400 image.theme_introuvable", reponse);
        assertEquals("|null|", images.classement(image));
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void unModuleNEstPasAffecteAUneImagePendantSaSuppression() throws Exception {
        UUID image = imageDe(CLAIRE);

        String reponse = pendantSuppression("module", module1,
                () -> reponse(classer(image, classement(List.of(), module1, List.of()))));

        assertEquals("400 image.module_introuvable", reponse);
        assertEquals("|null|", images.classement(image));
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void laSuppressionDUnThemeAttendUneAffectationEnCoursPuisEstRefusee() throws Exception {
        UUID image = imageDe(CLAIRE);

        String reponse = pendantAffectation(
                () -> {
                    referentielsService.themesVerrouilles(Set.of(animaux));
                    entityManager.createNativeQuery(
                            "insert into image_theme (image_id, theme_id) values (:image, :theme)")
                            .setParameter("image", image)
                            .setParameter("theme", animaux)
                            .executeUpdate();
                },
                () -> reponse(given().when().delete("/api/themes/" + animaux).then()));

        assertEquals("409 theme.utilise", reponse);
        assertEquals(List.of("animaux", "forêt"), referentiels.themes());
        assertEquals("|null|" + animaux, images.classement(image));
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void laSuppressionDUnModuleAttendUneAffectationEnCoursPuisLeRetireDeLImage() throws Exception {
        UUID image = imageDe(CLAIRE);

        String reponse = pendantAffectation(
                () -> {
                    referentielsService.moduleVerrouille(module1);
                    entityManager.createNativeQuery("update image set module_id = :module where id = :image")
                            .setParameter("module", module1)
                            .setParameter("image", image)
                            .executeUpdate();
                },
                () -> reponse(given().when().delete("/api/modules/" + module1).then()));

        assertEquals("204", reponse);
        assertEquals("|null|", images.classement(image));
    }

    /**
     * Simule une affectation en cours, comme {@code Images.classer} : dans une transaction, {@code affecter} prend le
     * verrou partagé de {@code referentiels} et écrit l'Image ; la suppression est lancée par l'API, doit attendre la
     * fin de cette transaction, puis répond. Rend « statut » ou « statut code » de la suppression.
     */
    private String pendantAffectation(Runnable affecter, Supplier<String> suppression) throws Exception {
        ExecutorService executeur = Executors.newSingleThreadExecutor();
        try {
            List<CompletableFuture<String>> reponses = new ArrayList<>();
            QuarkusTransaction.requiringNew().run(() -> {
                affecter.run();
                reponses.add(CompletableFuture.supplyAsync(suppression, executeur));
                try {
                    // Le temps que la suppression arrive au verrou de la ligne.
                    Thread.sleep(500);
                } catch (InterruptedException interrompu) {
                    Thread.currentThread().interrupt();
                }
                assertTrue(!reponses.get(0).isDone(), "La suppression aurait dû attendre l'affectation");
            });
            return reponses.get(0).get();
        } finally {
            executeur.shutdownNow();
        }
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void lesThemesSontTriesParNomALaFrancaise() {
        UUID ete = referentiels.theme("été", CLAIRE);
        UUID image = imageDe(CLAIRE);

        // Par point de code, « été » (U+00E9) viendrait après « forêt ».
        classer(image, classement(List.of(), null, List.of(foret, ete, animaux)))
                .statusCode(200)
                .body("themes.nom", contains("animaux", "été", "forêt"));
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void modifierLaDescriptionGardeLeClassement() {
        UUID image = imageClassee(CLAIRE);
        String avant = images.classement(image);
        Map<String, Object> description = new HashMap<>();
        description.put("typeImage", "image_libre");
        description.put("licence", "cc0_domaine_public");
        description.put("source", "autre site");

        given().contentType(ContentType.JSON).body(description)
                .when().put("/api/images/" + image + "/description").then()
                .statusCode(200)
                .body("source", equalTo("autre site"))
                .body("sections", contains("gs"))
                .body("module.nom", equalTo("Module 1"))
                .body("themes.nom", contains("forêt"));
        assertEquals(avant, images.classement(image));
    }

    @Test
    @TestSecurity(user = CLAIRE)
    @OidcSecurity(claims = @Claim(key = "sub", value = CLAIRE))
    void uneSectionOuUnThemeNulEstRefuse() {
        UUID image = imageClassee(CLAIRE);
        String avant = images.classement(image);
        Map<String, Object> sectionNulle = new HashMap<>();
        sectionNulle.put("sections", Arrays.asList((String) null));
        sectionNulle.put("themeIds", List.of());
        Map<String, Object> themeNul = new HashMap<>();
        themeNul.put("sections", List.of());
        themeNul.put("themeIds", Arrays.asList((String) null));

        refus(classer(image, sectionNulle), 400, "requete.invalide");
        refus(classer(image, themeNul), 400, "requete.invalide");
        assertEquals(avant, images.classement(image));
    }

    /**
     * Simule une suppression en cours, comme {@code referentiels} : verrouille la ligne ({@code FOR UPDATE}), lance la
     * requête, lui laisse le temps d'arriver au verrou partagé, puis supprime la ligne et valide. La requête, qui a
     * attendu, ne trouve plus la ligne. Rend « statut » ou « statut code ».
     */
    private String pendantSuppression(String table, UUID id, Supplier<String> requete) throws Exception {
        ExecutorService executeur = Executors.newSingleThreadExecutor();
        try {
            List<CompletableFuture<String>> reponses = new ArrayList<>();
            QuarkusTransaction.requiringNew().run(() -> {
                entityManager.createNativeQuery("select id from " + table + " where id = :id for update")
                        .setParameter("id", id)
                        .getSingleResult();
                reponses.add(CompletableFuture.supplyAsync(requete, executeur));
                try {
                    // Le temps que la requête arrive au verrou partagé.
                    Thread.sleep(500);
                } catch (InterruptedException interrompu) {
                    Thread.currentThread().interrupt();
                }
                assertTrue(!reponses.get(0).isDone(), "La requête aurait dû attendre la suppression");
                entityManager.createNativeQuery("delete from " + table + " where id = :id")
                        .setParameter("id", id)
                        .executeUpdate();
            });
            return reponses.get(0).get();
        } finally {
            executeur.shutdownNow();
        }
    }

    private UUID imageDe(String proprietaire) {
        return images.image(UUID.fromString(proprietaire), legume, "privee", "image_libre", "cc0_domaine_public",
                "site web", null, null);
    }

    /** Image classée en GS, avec le Module 1 et le Thème « forêt ». */
    private UUID imageClassee(String proprietaire) {
        UUID image = imageDe(proprietaire);
        images.classer(image, module1, List.of(foret), List.of("gs"));
        return image;
    }

    private static Map<String, Object> classement(List<String> sections, UUID moduleId, List<UUID> themeIds) {
        Map<String, Object> corps = new HashMap<>();
        corps.put("sections", sections);
        corps.put("moduleId", moduleId == null ? null : moduleId.toString());
        corps.put("themeIds", themeIds == null ? null : themeIds.stream().map(UUID::toString).toList());
        return corps;
    }

    private static ValidatableResponse classer(UUID image, Map<String, Object> corps) {
        return given().contentType(ContentType.JSON).body(corps)
                .when().put("/api/images/" + image + "/classement").then();
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
