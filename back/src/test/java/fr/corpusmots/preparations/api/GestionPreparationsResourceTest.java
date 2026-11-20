package fr.corpusmots.preparations.api;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import fr.corpusmots.commun.api.EnseignantsDeTest;
import fr.corpusmots.commun.api.ProblemeDto;
import fr.corpusmots.preparations.service.PreparationSupprimee;
import fr.corpusmots.referentiels.api.ReferentielsDeTest;
import fr.corpusmots.vocabulaire.api.ImagesDeTest;
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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Gérer ses Préparations (story 2.10) : {@code PUT /preparations/{id}/nom}, {@code POST /preparations/{id}/duplication}
 * et {@code DELETE /preparations/{id}}. Une ligne de test par ligne back de la matrice de la spec ; après chaque refus,
 * rien n'est écrit.
 */
@QuarkusTest
@TestSecurity(user = GestionPreparationsResourceTest.PAUL)
@OidcSecurity(claims = @Claim(key = "sub", value = GestionPreparationsResourceTest.PAUL))
class GestionPreparationsResourceTest {

    static final String PAUL = "0190f0a0-0000-7000-8000-0000000009a1";
    static final String ZOE = "0190f0a0-0000-7000-8000-0000000009a2";

    @Inject
    EnseignantsDeTest enseignants;

    @Inject
    ReferentielsDeTest referentiels;

    @Inject
    ImagesDeTest images;

    @Inject
    Lexique lexique;

    @Inject
    EntityManager entityManager;

    @Inject
    ObservateurPreparationSupprimee observateur;

    UUID rouleGalette;
    UUID module1;
    UUID cuisine;
    UUID preparation;

    @BeforeEach
    void donnees() {
        enseignants.seulsActifs(PAUL, ZOE);
        images.effacer();
        QuarkusTransaction.requiringNew().run(() -> {
            entityManager.createNativeQuery("delete from sens_retenu").executeUpdate();
            entityManager.createNativeQuery("delete from preparation").executeUpdate();
            entityManager.createNativeQuery("delete from sens").executeUpdate();
            entityManager.createNativeQuery("delete from mot").executeUpdate();
        });
        referentiels.effacer();
        observateur.effacer();
        rouleGalette = referentiels.album("Roule galette", "Natha Caputo");
        module1 = referentiels.module(rouleGalette, "Module 1", 1);
        cuisine = referentiels.theme("cuisine");
        preparation = preparation(PAUL, "ms");
    }

    // --- Renommer ---

    @Test
    void renommerEnregistreLeNomNettoyeQueLaCarteEtLEnTeteAffichent() {
        renommer(preparation, "  Galette   des MS ")
                .statusCode(200)
                .body("id", equalTo(preparation.toString()))
                .body("nom", equalTo("Galette des MS"))
                .body("titreAlbum", equalTo("Roule galette"))
                .body("section", equalTo("ms"));

        given().when().get("/api/preparations/" + preparation)
                .then().statusCode(200).body("nom", equalTo("Galette des MS"));
        given().when().get("/api/preparations")
                .then().statusCode(200).body("elements[0].nom", equalTo("Galette des MS"));
        assertEquals("Galette des MS", nom(preparation));
    }

    @Test
    void unNomVideOuFaitDEspacesLEfface() {
        for (String vide : new String[] { "", "   ", null }) {
            renommer(preparation, "Galette des MS").statusCode(200);

            renommer(preparation, vide)
                    .statusCode(200)
                    .body("nom", nullValue())
                    .body("titreAlbum", equalTo("Roule galette"));
            assertEquals(null, nom(preparation));
        }
    }

    @Test
    void unNomDePlusDe100CaracteresEstRefuse() {
        renommer(preparation, "a".repeat(100)).statusCode(200).body("nom", equalTo("a".repeat(100)));

        refus(renommer(preparation, "b".repeat(101)), 400, "preparation.nom_trop_long");
        refus(renommer(preparation, " " + "b".repeat(101) + " "), 400, "preparation.nom_trop_long");
        refus(given().contentType(ContentType.JSON).when().put("/api/preparations/" + preparation + "/nom").then(),
                400, "requete.invalide");
        assertEquals("a".repeat(100), nom(preparation));
    }

    @Test
    void lesEspacesUnicodeSontNettoyesCommeLesAutres() {
        renommer(preparation, "  Galette   des　MS ")
                .statusCode(200)
                .body("nom", equalTo("Galette des MS"));
        assertEquals("Galette des MS", nom(preparation));

        renommer(preparation, "   ").statusCode(200).body("nom", nullValue());
        assertEquals(null, nom(preparation));
    }

    // --- Dupliquer ---

    @Test
    void dupliquerUnePreparationSansModuleNiThemeNiMot() {
        String copie = dupliquer(preparation, "gs")
                .statusCode(201)
                .body("section", equalTo("gs"))
                .body("moduleId", nullValue())
                .body("nom", nullValue())
                .body("nombreMots", equalTo(0))
                .body("nombreAIllustrer", equalTo(0))
                .extract().path("id");

        given().when().get("/api/preparations/" + copie)
                .then().statusCode(200)
                .body("themeDefautId", nullValue())
                .body("nombreMots", equalTo(0));
        assertEquals(0L, nombre("select count(*) from preparation_mot") + nombre("select count(*) from sens_retenu")
                + nombre("select count(*) from lien_image"));
    }

    @Test
    void dupliquerCopieMotsSensEtLiensEnReutiliseeSansCopierDImage() {
        regler(preparation, Map.of("moduleId", module1.toString(), "themeDefautId", cuisine.toString(),
                "tempsPasseMinutes", 90));
        renommer(preparation, "Galette des MS").statusCode(200);
        MotVue galette = mot("galette");
        UUID sensGalette = sens(galette, "gâteau", "nom");
        UUID imageGalette = image(sensGalette);
        MotVue renard = mot("renard");
        UUID sensRenard = sens(renard, "animal", "nom");
        UUID imageRenard = image(sensRenard);
        reutiliser(galette, imageGalette);
        reutiliser(renard, imageRenard);
        ajouter("four");
        MotVue ecarte = mot("loup");
        given().when().put("/api/preparations/" + preparation + "/ecartes/" + ecarte.id()).then().statusCode(204);
        long imagesAvant = nombre("select count(*) from image");

        String copie = dupliquer(preparation, "gs")
                .statusCode(201)
                .body("id", not(equalTo(preparation.toString())))
                .body("nom", equalTo("Galette des MS"))
                .body("albumId", equalTo(rouleGalette.toString()))
                .body("section", equalTo("gs"))
                .body("moduleId", equalTo(module1.toString()))
                .body("nombreMots", equalTo(3))
                .body("nombreAIllustrer", equalTo(1))
                .body("creeLe", notNullValue())
                .extract().path("id");
        UUID copieId = UUID.fromString(copie);

        assertEquals(List.of("galette:1:" + cuisine + ":" + sensGalette + ":" + imageGalette + ":reutilisee:gs",
                "renard:2:" + cuisine + ":" + sensRenard + ":" + imageRenard + ":reutilisee:gs",
                "four:3:" + cuisine + ":" + sensFour() + ":null:null:gs"), motsEnBase(copieId));
        assertEquals(imagesAvant, nombre("select count(*) from image"));
        assertEquals(3L, nombre("select count(*) from sens_retenu where preparation_id = '" + copieId
                + "' and enseignant_id = '" + PAUL + "'"));
        assertEquals(2L, nombre("select count(*) from lien_image where preparation_id = '" + copieId
                + "' and enseignant_id = '" + PAUL + "'"));
        assertEquals(0L, nombre("select count(*) from mot_ecarte where preparation_id = '" + copieId + "'"));
        given().when().get("/api/preparations/" + copieId)
                .then().statusCode(200)
                .body("nom", equalTo("Galette des MS"))
                .body("themeDefautId", equalTo(cuisine.toString()))
                .body("tempsPasseMinutes", nullValue())
                .body("nombreIllustres", equalTo(2));
        given().when().get("/api/preparations")
                .then().statusCode(200).body("elements[0].id", equalTo(copie));
        // La source n'a pas changé.
        assertEquals(List.of("galette:1:" + cuisine + ":" + sensGalette + ":" + imageGalette + ":reutilisee:ms",
                "renard:2:" + cuisine + ":" + sensRenard + ":" + imageRenard + ":reutilisee:ms",
                "four:3:" + cuisine + ":" + sensFour() + ":null:null:ms"), motsEnBase(preparation));
    }

    @Test
    void dupliquerCopieLeLienVersUneImageRetiree() {
        MotVue galette = mot("galette");
        UUID imageGalette = image(sens(galette, "gâteau", "nom"));
        reutiliser(galette, imageGalette);
        QuarkusTransaction.requiringNew().run(() -> entityManager
                .createNativeQuery("update image set etat = 'supprimee' where id = :id")
                .setParameter("id", imageGalette)
                .executeUpdate());

        String copie = dupliquer(preparation, "gs").statusCode(201).body("nombreAIllustrer", equalTo(0))
                .extract().path("id");

        assertEquals(1L, nombre("select count(*) from lien_image where preparation_id = '" + copie
                + "' and image_id = '" + imageGalette + "' and origine = 'reutilisee'"));
        assertEquals(1L, nombre("select count(*) from image"));
    }

    @Test
    void dupliquerPourLaMemeSectionCreeUneCopie() {
        ajouter("galette");

        String copie = dupliquer(preparation, "ms")
                .statusCode(201)
                .body("section", equalTo("ms"))
                .body("nombreMots", equalTo(1))
                .extract().path("id");

        assertEquals(2L, nombre("select count(*) from preparation"));
        assertEquals(1L, nombre("select count(*) from preparation_mot where preparation_id = '" + copie + "'"));
    }

    @Test
    void dupliquerVersUneSectionInvalideOuAbsenteEstRefuse() {
        ajouter("galette");
        long avant = toutesLesLignes();

        refus(dupliquer(preparation, "cp"), 400, "requete.invalide");
        refus(dupliquer(preparation, null), 400, "requete.invalide");
        refus(given().contentType(ContentType.JSON)
                .when().post("/api/preparations/" + preparation + "/duplication").then(), 400, "requete.invalide");
        assertEquals(avant, toutesLesLignes());
        assertEquals(1L, nombre("select count(*) from preparation"));
    }

    // --- Supprimer ---

    @Test
    void supprimerLibereLesUsagesEtNeSupprimeNiImageNiMotNiSens() {
        MotVue galette = mot("galette");
        UUID imageGalette = image(sens(galette, "gâteau", "nom"));
        reutiliser(galette, imageGalette);
        ajouter("four");
        MotVue ecarte = mot("loup");
        given().when().put("/api/preparations/" + preparation + "/ecartes/" + ecarte.id()).then().statusCode(204);
        UUID autre = preparation(PAUL, "gs");
        long images = nombre("select count(*) from image");
        long mots = nombre("select count(*) from mot");
        long sens = nombre("select count(*) from sens");

        given().when().delete("/api/preparations/" + preparation).then().statusCode(204);

        for (String table : new String[] { "preparation_mot", "sens_retenu", "lien_image", "mot_ecarte" }) {
            assertEquals(0L, nombre("select count(*) from " + table + " where preparation_id = '" + preparation
                    + "'"), table);
        }
        assertEquals(0L, nombre("select count(*) from preparation where id = '" + preparation + "'"));
        assertEquals(1L, nombre("select count(*) from preparation where id = '" + autre + "'"));
        assertEquals(images, nombre("select count(*) from image"));
        assertEquals(mots, nombre("select count(*) from mot"));
        assertEquals(sens, nombre("select count(*) from sens"));
        given().when().get("/api/preparations/" + preparation).then().statusCode(404);

        List<ObservateurPreparationSupprimee.Reception> receptions = observateur.receptions();
        assertEquals(1, receptions.size());
        assertEquals(new PreparationSupprimee(preparation, UUID.fromString(PAUL)), receptions.get(0).evenement());
        assertTrue(receptions.get(0).preparationPresente(), "émis avant la suppression de la Préparation");
        assertEquals(0L, receptions.get(0).usagesRestants(), "émis après la libération des usages");
    }

    @Test
    void unObservateurEnEchecAnnuleTouteLaSuppression() {
        MotVue galette = mot("galette");
        reutiliser(galette, image(sens(galette, "gâteau", "nom")));
        ajouter("four");
        long avant = toutesLesLignes();
        ObservateurPreparationSupprimee.echouer = true;
        try {
            given().when().delete("/api/preparations/" + preparation).then().statusCode(500);
        } finally {
            ObservateurPreparationSupprimee.echouer = false;
        }

        assertEquals(1, observateur.receptions().size());
        assertEquals(avant, toutesLesLignes());
        assertEquals(1L, nombre("select count(*) from preparation where id = '" + preparation + "'"));
        assertEquals(2L, nombre("select count(*) from preparation_mot where preparation_id = '" + preparation + "'"));
        assertEquals(2L, nombre("select count(*) from sens_retenu where preparation_id = '" + preparation + "'"));
        assertEquals(1L, nombre("select count(*) from lien_image where preparation_id = '" + preparation + "'"));
    }

    // --- Préparation d'un collègue ---

    @Test
    void lesTroisRoutesDUnePreparationDUnCollegueSontIntrouvables() {
        UUID deZoe = preparation(ZOE, "ms");
        QuarkusTransaction.requiringNew().run(() -> entityManager
                .createNativeQuery("update preparation set nom = 'Galette de Zoé' where id = :id")
                .setParameter("id", deZoe)
                .executeUpdate());
        long avant = toutesLesLignes();

        for (UUID id : new UUID[] { deZoe, UUID.randomUUID() }) {
            refus(renommer(id, "Volée"), 404, "ressource.introuvable");
            refus(dupliquer(id, "gs"), 404, "ressource.introuvable");
            refus(given().when().delete("/api/preparations/" + id).then(), 404, "ressource.introuvable");
        }

        assertEquals(avant, toutesLesLignes());
        assertEquals(2L, nombre("select count(*) from preparation"));
        assertEquals("Galette de Zoé", nom(deZoe));
        assertEquals(0, observateur.receptions().size());
    }

    // --- Outils ---

    private static void refus(ValidatableResponse reponse, int statut, String code) {
        reponse.statusCode(statut)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo(code));
    }

    private static ValidatableResponse renommer(UUID preparationId, String nom) {
        Map<String, Object> corps = new HashMap<>();
        corps.put("nom", nom);
        return given().contentType(ContentType.JSON).body(corps)
                .when().put("/api/preparations/" + preparationId + "/nom")
                .then();
    }

    private static ValidatableResponse dupliquer(UUID preparationId, String section) {
        Map<String, Object> corps = new HashMap<>();
        corps.put("section", section);
        return given().contentType(ContentType.JSON).body(corps)
                .when().post("/api/preparations/" + preparationId + "/duplication")
                .then();
    }

    private static void regler(UUID preparationId, Map<String, Object> reglages) {
        given().contentType(ContentType.JSON).body(reglages)
                .when().put("/api/preparations/" + preparationId + "/reglages")
                .then().statusCode(200);
    }

    private void ajouter(String saisie) {
        given().contentType(ContentType.JSON).body(Map.of("saisie", saisie))
                .when().post("/api/preparations/" + preparation + "/mots")
                .then().statusCode(201);
    }

    private void reutiliser(MotVue mot, UUID imageId) {
        given().contentType(ContentType.JSON).body(Map.of("motId", mot.id().toString(), "imageId", imageId.toString()))
                .when().post("/api/preparations/" + preparation + "/mots/reutilisation")
                .then().statusCode(201);
    }

    private MotVue mot(String forme) {
        return QuarkusTransaction.requiringNew().call(() -> lexique.obtenirOuCreerMot(forme));
    }

    private UUID sens(MotVue mot, String libelle, String categorie) {
        return QuarkusTransaction.requiringNew()
                .call(() -> lexique.obtenirOuCreerSens(mot.id(), libelle, categorie)).id();
    }

    /** Sens « à compléter » retenu pour « four », ajouté par la saisie. */
    private UUID sensFour() {
        return QuarkusTransaction.requiringNew().call(() -> (UUID) entityManager.createNativeQuery(
                "select s.id from sens s join mot m on m.id = s.mot_id where m.forme = 'four'")
                .getSingleResult());
    }

    /** Image libre privée de Paul, pour la MS. */
    private UUID image(UUID sensId) {
        UUID id = images.image(UUID.fromString(PAUL), sensId, "privee", new byte[] { 1 }, new byte[] { 2 });
        images.classer(id, null, List.of(), List.of("ms"));
        return id;
    }

    private UUID preparation(String proprietaire, String section) {
        return QuarkusTransaction.requiringNew().call(() -> (UUID) entityManager.createNativeQuery(
                "insert into preparation (proprietaire_id, album_id, section) values (:proprietaire, :album, :section)"
                        + " returning id")
                .setParameter("proprietaire", UUID.fromString(proprietaire))
                .setParameter("album", rouleGalette)
                .setParameter("section", section)
                .getSingleResult());
    }

    private String nom(UUID preparationId) {
        return QuarkusTransaction.requiringNew().call(() -> (String) entityManager
                .createNativeQuery("select nom from preparation where id = :id")
                .setParameter("id", preparationId)
                .getSingleResult());
    }

    /**
     * Mots de cette Préparation en base, dans l'ordre, chacun en
     * « forme:ordre:thème:sens retenu:image liée:origine:section du Sens retenu ».
     */
    private List<String> motsEnBase(UUID preparationId) {
        return QuarkusTransaction.requiringNew().call(() -> {
            @SuppressWarnings("unchecked")
            List<Object[]> lignes = entityManager.createNativeQuery(
                    "select m.forme, p.ordre, p.theme_id, r.sens_id, l.image_id, l.origine, r.section, r.album_id,"
                            + " l.section, l.album_id"
                            + " from preparation_mot p join mot m on m.id = p.mot_id"
                            + " join sens_retenu r on r.preparation_mot_id = p.id"
                            + " left join lien_image l on l.preparation_mot_id = p.id"
                            + " where p.preparation_id = :preparation order by p.ordre")
                    .setParameter("preparation", preparationId)
                    .getResultList();
            return lignes.stream().map(ligne -> {
                assertEquals(rouleGalette, ligne[7]);
                if (ligne[4] != null) {
                    assertEquals(ligne[6], ligne[8]);
                    assertEquals(rouleGalette, ligne[9]);
                }
                return ligne[0] + ":" + ligne[1] + ":" + ligne[2] + ":" + ligne[3] + ":" + ligne[4] + ":" + ligne[5]
                        + ":" + ligne[6];
            }).toList();
        });
    }

    /** Lignes de toutes les tables que ces routes pourraient écrire. */
    private long toutesLesLignes() {
        return nombre("select count(*) from preparation") + nombre("select count(*) from preparation_mot")
                + nombre("select count(*) from sens_retenu") + nombre("select count(*) from lien_image")
                + nombre("select count(*) from mot_ecarte") + nombre("select count(*) from image");
    }

    private long nombre(String requete) {
        return QuarkusTransaction.requiringNew()
                .call(() -> ((Number) entityManager.createNativeQuery(requete).getSingleResult()).longValue());
    }
}
