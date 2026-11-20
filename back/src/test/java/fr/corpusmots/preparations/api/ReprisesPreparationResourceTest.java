package fr.corpusmots.preparations.api;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.assertEquals;

import fr.corpusmots.commun.api.EnseignantsDeTest;
import fr.corpusmots.commun.api.ProblemeDto;
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
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Encart « mots déjà illustrés » (story 2.9) : {@code GET/POST /preparations/{id}/reprises} et
 * {@code PUT/DELETE /preparations/{id}/ecartes/{motId}}. Une ligne de test par ligne back de la matrice de la spec ;
 * après chaque refus, rien n'est écrit.
 */
@QuarkusTest
@TestSecurity(user = ReprisesPreparationResourceTest.PAUL)
@OidcSecurity(claims = @Claim(key = "sub", value = ReprisesPreparationResourceTest.PAUL))
class ReprisesPreparationResourceTest {

    static final String PAUL = "0190f0a0-0000-7000-8000-0000000008a1";
    static final String ZOE = "0190f0a0-0000-7000-8000-0000000008a2";

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

    UUID rouleGalette;
    UUID autreAlbum;
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
        rouleGalette = referentiels.album("Roule galette", "Natha Caputo");
        autreAlbum = referentiels.album("La petite poule rousse", "Byron Barton");
        preparation = preparation(PAUL, rouleGalette, "ms");
    }

    @Test
    void lImageDAlbumVerseeDUnCollegueRendLeMotCandidat() {
        MotVue galette = mot("galette");
        UUID sensGalette = sens(galette, "gâteau", "nom");
        UUID image = imageDAlbum(ZOE, sensGalette, "versee", rouleGalette);

        reprises(preparation)
                .statusCode(200)
                .body("", hasSize(1))
                .body("[0].motId", equalTo(galette.id().toString()))
                .body("[0].forme", equalTo("galette"))
                .body("[0].sens.id", equalTo(sensGalette.toString()))
                .body("[0].sens.libelle", equalTo("gâteau"))
                .body("[0].sens.categorie", equalTo("nom"))
                .body("[0].image.id", equalTo(image.toString()))
                .body("[0].image.proprietaireId", equalTo(ZOE))
                .body("[0].image.albumOrigine.id", equalTo(rouleGalette.toString()));
    }

    @Test
    void unMotIllustreDansUneAutrePreparationDeLEnseignantEstCandidatAvecLImageDeLaSection() {
        MotVue renard = mot("renard");
        UUID sensRenard = sens(renard, "animal", "nom");
        UUID imageGs = image(PAUL, sensRenard, "privee", List.of("gs"));
        UUID imageMs = image(PAUL, sensRenard, "privee", List.of("ms"));
        usageIllustre(PAUL, preparation(PAUL, rouleGalette, "gs"), rouleGalette, sensRenard, imageGs);

        reprises(preparation)
                .statusCode(200)
                .body("motId", contains(renard.id().toString()))
                .body("[0].sens.id", equalTo(sensRenard.toString()))
                .body("[0].image.id", equalTo(imageMs.toString()));
    }

    @Test
    void unMotIllustreDansUneAutrePreparationDUnAutreAlbumNEstPasCandidat() {
        MotVue renard = mot("renard");
        UUID sensRenard = sens(renard, "animal", "nom");
        UUID image = image(PAUL, sensRenard, "privee", List.of("ms"));
        usageIllustre(PAUL, preparation(PAUL, autreAlbum, "ms"), autreAlbum, sensRenard, image);

        reprises(preparation).statusCode(200).body("", empty());
    }

    @Test
    void unSensRetenuSansImageLieeDansUneAutrePreparationNeRendPasLeMotCandidat() {
        MotVue renard = mot("renard");
        UUID sensRenard = sens(renard, "animal", "nom");
        image(PAUL, sensRenard, "privee", List.of("ms"));
        images.sensRetenu(sensRenard, UUID.fromString(PAUL), rouleGalette);

        reprises(preparation).statusCode(200).body("", empty());
    }

    @Test
    void lImageProposeeEstDejaUtiliseeSiLEnseignantLaDejaLiee() {
        MotVue galette = mot("galette");
        UUID imageGalette = imageDAlbum(PAUL, sens(galette, "gâteau", "nom"), "privee", rouleGalette);
        images.lien(imageGalette, UUID.fromString(PAUL), autreAlbum);
        MotVue renard = mot("renard");
        imageDAlbum(PAUL, sens(renard, "animal", "nom"), "privee", rouleGalette);

        reprises(preparation)
                .statusCode(200)
                .body("forme", contains("galette", "renard"))
                .body("[0].image.dejaUtilisee", equalTo(true))
                .body("[1].image.dejaUtilisee", equalTo(false));
    }

    @Test
    void unMotIllustreSeulementDansLaPreparationDUnCollegueNEstPasCandidat() {
        MotVue four = mot("four");
        UUID sensFour = sens(four, "four", "nom");
        UUID image = image(ZOE, sensFour, "versee", List.of("ms"));
        usageIllustre(ZOE, preparation(ZOE, rouleGalette, "ms"), rouleGalette, sensFour, image);

        reprises(preparation).statusCode(200).body("", empty());
    }

    @Test
    void lImageDAlbumPriveeDUnCollegueNeRendPasLeMotCandidat() {
        MotVue galette = mot("galette");
        imageDAlbum(ZOE, sens(galette, "gâteau", "nom"), "privee", rouleGalette);

        reprises(preparation).statusCode(200).body("", empty());
    }

    @Test
    void lImageProposeeEstCelleDuSensLieALAlbumMemeMoinsBienClassee() {
        MotVue cote = mot("côte");
        UUID mer = sens(cote, "mer", "nom");
        UUID boeuf = sens(cote, "côte de bœuf", "nom");
        UUID imageMer = image(PAUL, mer, "privee", List.of());
        image(PAUL, boeuf, "privee", List.of("ms"));
        usageIllustre(PAUL, preparation(PAUL, rouleGalette, "gs"), rouleGalette, mer, imageMer);

        reprises(preparation)
                .statusCode(200)
                .body("motId", contains(cote.id().toString()))
                .body("[0].sens.id", equalTo(mer.toString()))
                .body("[0].image.id", equalTo(imageMer.toString()));
    }

    @Test
    void unMotDejaPresentOuEcarteEstAbsentEtLaListeEstParForme() {
        MotVue galette = mot("galette");
        imageDAlbum(PAUL, sens(galette, "gâteau", "nom"), "privee", rouleGalette);
        MotVue etale = mot("étalé");
        imageDAlbum(PAUL, sens(etale, "chute", "nom"), "privee", rouleGalette);
        MotVue renard = mot("renard");
        imageDAlbum(PAUL, sens(renard, "animal", "nom"), "privee", rouleGalette);

        reprises(preparation).statusCode(200)
                .body("forme", contains("étalé", "galette", "renard"));

        ajouter("galette");
        ecarter(preparation, renard.id()).statusCode(204);
        long avant = nombre("select count(*) from preparation_mot") + nombre("select count(*) from sens_retenu")
                + nombre("select count(*) from lien_image") + nombre("select count(*) from mot_ecarte");

        reprises(preparation).statusCode(200).body("forme", contains("étalé"));
        assertEquals(avant, nombre("select count(*) from preparation_mot") + nombre("select count(*) from sens_retenu")
                + nombre("select count(*) from lien_image") + nombre("select count(*) from mot_ecarte"));
    }

    @Test
    void unMotRetireRedevientCandidatMemeSIlAvaitEteEcarte() {
        MotVue galette = mot("galette");
        imageDAlbum(PAUL, sens(galette, "gâteau", "nom"), "privee", rouleGalette);
        MotVue renard = mot("renard");
        imageDAlbum(PAUL, sens(renard, "animal", "nom"), "privee", rouleGalette);

        String galetteRepris = reprendre(preparation, List.of(galette.id().toString()))
                .statusCode(200).extract().path("[0].id");
        ecarter(preparation, renard.id()).statusCode(204);
        String renardSaisi = given().contentType(ContentType.JSON).body(Map.of("saisie", "renard"))
                .when().post("/api/preparations/" + preparation + "/mots")
                .then().statusCode(201).extract().path("id");
        reprises(preparation).statusCode(200).body("", empty());

        retirer(galetteRepris);
        retirer(renardSaisi);

        reprises(preparation).statusCode(200).body("forme", contains("galette", "renard"));
    }

    @Test
    void toutReprendreAjouteDansLOrdreDeLEncartCeuxQuiSontEncoreCandidats() {
        UUID cuisine = referentiels.theme("cuisine");
        given().contentType(ContentType.JSON).body(Map.of("themeDefautId", cuisine.toString()))
                .when().put("/api/preparations/" + preparation + "/reglages")
                .then().statusCode(200);
        MotVue renard = mot("renard");
        UUID sensRenard = sens(renard, "animal", "nom");
        UUID imageRenard = imageDAlbum(PAUL, sensRenard, "privee", rouleGalette);
        MotVue galette = mot("galette");
        imageDAlbum(ZOE, sens(galette, "gâteau", "nom"), "versee", rouleGalette);
        MotVue etale = mot("étalé");
        UUID sensEtale = sens(etale, "chute", "nom");
        UUID imageEtale = imageDAlbum(ZOE, sensEtale, "versee", rouleGalette);
        ajouter("galette");

        reprendre(preparation, List.of(renard.id().toString(), galette.id().toString(), etale.id().toString()))
                .statusCode(200)
                .body("forme", contains("étalé", "renard"))
                .body("[0].ordre", equalTo(2))
                .body("[0].sens.id", equalTo(sensEtale.toString()))
                .body("[0].image.id", equalTo(imageEtale.toString()))
                .body("[0].themeId", equalTo(cuisine.toString()))
                .body("[1].ordre", equalTo(3))
                .body("[1].sens.id", equalTo(sensRenard.toString()))
                .body("[1].image.id", equalTo(imageRenard.toString()));

        assertEquals(List.of("galette:1:null", "étalé:2:reutilisee", "renard:3:reutilisee"), motsEnBase());
        assertEquals(List.of(sensEtale + "|" + imageEtale, sensRenard + "|" + imageRenard), sensEtImagesLies());
        assertEquals(3L, nombre("select count(*) from image"));
        reprises(preparation).statusCode(200).body("", empty());
    }

    @Test
    void toutReprendreIgnoreLesMotsQuiNeSontPasCandidats() {
        MotVue galette = mot("galette");
        imageDAlbum(PAUL, sens(galette, "gâteau", "nom"), "privee", rouleGalette);
        ecarter(preparation, galette.id()).statusCode(204);

        reprendre(preparation, List.of(galette.id().toString(), UUID.randomUUID().toString()))
                .statusCode(200)
                .body("", empty());
        rienNEstEcrit();
    }

    @Test
    void toutReprendreRefuseUneListeVideAbsenteOuTropLongue() {
        MotVue galette = mot("galette");
        imageDAlbum(PAUL, sens(galette, "gâteau", "nom"), "privee", rouleGalette);
        List<String> tropLongue = new ArrayList<>();
        tropLongue.add(galette.id().toString());
        for (int i = 0; i < 200; i++) {
            tropLongue.add(UUID.randomUUID().toString());
        }

        refus(reprendre(preparation, List.of()), 400, "requete.invalide");
        refus(reprendre(preparation, tropLongue), 400, "requete.invalide");
        refus(reprendre(preparation, null), 400, "requete.invalide");
        List<String> avecNull = new ArrayList<>();
        avecNull.add(null);
        refus(reprendre(preparation, avecNull), 400, "requete.invalide");
        refus(given().contentType(ContentType.JSON)
                .when().post("/api/preparations/" + preparation + "/reprises").then(), 400, "requete.invalide");
        rienNEstEcrit();
    }

    @Test
    void lesQuatreRoutesDUnePreparationDUnCollegueSontIntrouvables() {
        UUID deZoe = preparation(ZOE, rouleGalette, "ms");
        MotVue galette = mot("galette");
        imageDAlbum(ZOE, sens(galette, "gâteau", "nom"), "versee", rouleGalette);

        for (UUID id : new UUID[] { deZoe, UUID.randomUUID() }) {
            refus(reprises(id), 404, "ressource.introuvable");
            refus(reprendre(id, List.of(galette.id().toString())), 404, "ressource.introuvable");
            refus(ecarter(id, galette.id()), 404, "ressource.introuvable");
            refus(given().when().delete("/api/preparations/" + id + "/ecartes/" + galette.id()).then(), 404,
                    "ressource.introuvable");
        }
        rienNEstEcrit();
    }

    @Test
    void ecarterEtAnnulerSontIdempotents() {
        MotVue galette = mot("galette");

        ecarter(preparation, galette.id()).statusCode(204);
        ecarter(preparation, galette.id()).statusCode(204);
        assertEquals(1L, nombre("select count(*) from mot_ecarte"));

        annulerEcart(preparation, galette.id()).statusCode(204);
        annulerEcart(preparation, galette.id()).statusCode(204);
        assertEquals(0L, nombre("select count(*) from mot_ecarte"));
    }

    @Test
    void ecarterUnMotInconnuEstIntrouvable() {
        refus(ecarter(preparation, UUID.randomUUID()), 404, "ressource.introuvable");
        assertEquals(0L, nombre("select count(*) from mot_ecarte"));
    }

    @Test
    void supprimerLaPreparationSupprimeSesEcartes() {
        ecarter(preparation, mot("galette").id()).statusCode(204);

        QuarkusTransaction.requiringNew().run(() -> entityManager
                .createNativeQuery("delete from preparation where id = :id")
                .setParameter("id", preparation)
                .executeUpdate());

        assertEquals(0L, nombre("select count(*) from mot_ecarte"));
    }

    // --- Outils ---

    private void rienNEstEcrit() {
        assertEquals(0L, nombre("select count(*) from preparation_mot"));
        assertEquals(0L, nombre("select count(*) from sens_retenu"));
        assertEquals(0L, nombre("select count(*) from lien_image"));
    }

    private static void refus(ValidatableResponse reponse, int statut, String code) {
        reponse.statusCode(statut)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo(code));
    }

    private static ValidatableResponse reprises(UUID preparationId) {
        return given().when().get("/api/preparations/" + preparationId + "/reprises").then();
    }

    private static ValidatableResponse reprendre(UUID preparationId, List<String> motIds) {
        Map<String, Object> corps = new HashMap<>();
        corps.put("motIds", motIds);
        return given().contentType(ContentType.JSON).body(corps)
                .when().post("/api/preparations/" + preparationId + "/reprises")
                .then();
    }

    private static ValidatableResponse ecarter(UUID preparationId, UUID motId) {
        return given().when().put("/api/preparations/" + preparationId + "/ecartes/" + motId).then();
    }

    private static ValidatableResponse annulerEcart(UUID preparationId, UUID motId) {
        return given().when().delete("/api/preparations/" + preparationId + "/ecartes/" + motId).then();
    }

    private void ajouter(String saisie) {
        given().contentType(ContentType.JSON).body(Map.of("saisie", saisie))
                .when().post("/api/preparations/" + preparation + "/mots")
                .then().statusCode(201);
    }

    private void retirer(String motPreparationId) {
        given().when().delete("/api/preparations/" + preparation + "/mots/" + motPreparationId)
                .then().statusCode(200);
    }

    private MotVue mot(String forme) {
        return QuarkusTransaction.requiringNew().call(() -> lexique.obtenirOuCreerMot(forme));
    }

    private UUID sens(MotVue mot, String libelle, String categorie) {
        return QuarkusTransaction.requiringNew()
                .call(() -> lexique.obtenirOuCreerSens(mot.id(), libelle, categorie)).id();
    }

    /** Image libre de ce propriétaire, à cet état, avec ces Sections. */
    private UUID image(String proprietaire, UUID sensId, String etat, List<String> sections) {
        UUID id = images.image(UUID.fromString(proprietaire), sensId, etat, new byte[] { 1 }, new byte[] { 2 });
        images.classer(id, null, List.of(), sections);
        return id;
    }

    /** Image d'album de ce propriétaire, à cet état, d'Album d'origine {@code albumId}. */
    private UUID imageDAlbum(String proprietaire, UUID sensId, String etat, UUID albumId) {
        return images.image(UUID.fromString(proprietaire), sensId, etat, "image_album", "usage_pedagogique_album",
                null, null, albumId);
    }

    private UUID preparation(String proprietaire, UUID albumId, String section) {
        return QuarkusTransaction.requiringNew().call(() -> (UUID) entityManager.createNativeQuery(
                "insert into preparation (proprietaire_id, album_id, section) values (:proprietaire, :album, :section)"
                        + " returning id")
                .setParameter("proprietaire", UUID.fromString(proprietaire))
                .setParameter("album", albumId)
                .setParameter("section", section)
                .getSingleResult());
    }

    /**
     * Mot illustré dans une Préparation de cet enseignant : un Sens retenu et un lien vers l'Image pour un même Mot de
     * Préparation (identifiant quelconque).
     */
    private void usageIllustre(String enseignant, UUID preparationId, UUID albumId, UUID sensId, UUID imageId) {
        QuarkusTransaction.requiringNew().run(() -> {
            UUID preparationMot = (UUID) entityManager.createNativeQuery("select uuidv7()").getSingleResult();
            entityManager.createNativeQuery(
                    "insert into sens_retenu (preparation_id, preparation_mot_id, sens_id, enseignant_id, album_id,"
                            + " section) values (:preparation, :mot, :sens, :enseignant, :album, 'gs')")
                    .setParameter("preparation", preparationId)
                    .setParameter("mot", preparationMot)
                    .setParameter("sens", sensId)
                    .setParameter("enseignant", UUID.fromString(enseignant))
                    .setParameter("album", albumId)
                    .executeUpdate();
            entityManager.createNativeQuery(
                    "insert into lien_image (preparation_id, preparation_mot_id, image_id, enseignant_id, album_id,"
                            + " section, origine) values (:preparation, :mot, :image, :enseignant, :album, 'gs',"
                            + " 'reutilisee')")
                    .setParameter("preparation", preparationId)
                    .setParameter("mot", preparationMot)
                    .setParameter("image", imageId)
                    .setParameter("enseignant", UUID.fromString(enseignant))
                    .setParameter("album", albumId)
                    .executeUpdate();
        });
    }

    /** Mots de la Préparation de Paul en base, dans l'ordre, chacun en « forme:ordre:origine du lien ». */
    private List<String> motsEnBase() {
        return QuarkusTransaction.requiringNew().call(() -> {
            @SuppressWarnings("unchecked")
            List<Object[]> lignes = entityManager.createNativeQuery(
                    "select m.forme, p.ordre, l.origine from preparation_mot p join mot m on m.id = p.mot_id"
                            + " left join lien_image l on l.preparation_mot_id = p.id"
                            + " where p.preparation_id = :preparation order by p.ordre")
                    .setParameter("preparation", preparation)
                    .getResultList();
            return lignes.stream().map(ligne -> ligne[0] + ":" + ligne[1] + ":" + ligne[2]).toList();
        });
    }

    /** Sens retenu et Image liée des Mots illustrés de la Préparation de Paul, dans l'ordre, en « sens|image ». */
    private List<String> sensEtImagesLies() {
        return QuarkusTransaction.requiringNew().call(() -> {
            @SuppressWarnings("unchecked")
            List<Object[]> lignes = entityManager.createNativeQuery(
                    "select r.sens_id, l.image_id from preparation_mot p"
                            + " join sens_retenu r on r.preparation_mot_id = p.id"
                            + " join lien_image l on l.preparation_mot_id = p.id"
                            + " where p.preparation_id = :preparation order by p.ordre")
                    .setParameter("preparation", preparation)
                    .getResultList();
            return lignes.stream().map(ligne -> ligne[0] + "|" + ligne[1]).toList();
        });
    }

    private long nombre(String requete) {
        return QuarkusTransaction.requiringNew()
                .call(() -> ((Number) entityManager.createNativeQuery(requete).getSingleResult()).longValue());
    }
}
